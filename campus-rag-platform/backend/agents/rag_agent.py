"""
Task 3.3 — Agentic Tools & LangGraph Engine.

Builds a LangGraph agent (memory-checkpointed, per session_id) whose tools
are the four functions in tools/event_tools.py, bound to Ollama's llama3
via LangChain's ChatOllama wrapper. Exposes POST /api/chat.

No external AI APIs are used — ChatOllama talks to the self-hosted Ollama
container over HTTP, same as embeddings and OCR structuring elsewhere in
this backend.
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import json
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_ollama import ChatOllama
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel

from ..auth import CurrentUser, get_current_user, get_optional_user
from ..config import get_settings
from ..tools import event_tools

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api", tags=["chat"])

SYSTEM_PROMPT = """You are the NMIT Smart Campus Assistant. Provide direct, concise answers in 2-3 sentences maximum.

Core Instructions:
1. EVENT SEARCH: When users ask about events, schedules, or "what's happening", use `search_campus_events` tool to find information, then provide a natural conversational summary. List 2-3 most relevant events with dates and venues.
2. EVENT REGISTRATION: Only if user explicitly says "register me", "sign me up", or "book", check their email. If email is 'guest', politely say they need to login. Otherwise use `register_user_for_event`.
3. VENUES: For venue location questions, use `get_venue_coordinates`.
4. CONFLICTS: For venue availability questions, use `check_schedule_conflicts`.

CRITICAL: After calling any tool and receiving results, you MUST generate a natural language response. Never return raw tool calls or JSON to the user. Always speak conversationally based on the tool results.
"""


def _sync_wrapper(async_fn):
    """LangGraph's create_react_agent expects sync-callable tools by default
    in some versions; StructuredTool.from_function supports async natively
    via coroutine=, so this just documents the wiring choice below."""
    return async_fn


def build_tools() -> list[StructuredTool]:
    return [
        StructuredTool.from_function(
            coroutine=event_tools.search_campus_events,
            name="search_campus_events",
            description=event_tools.search_campus_events.__doc__,
        ),
        StructuredTool.from_function(
            coroutine=event_tools.register_user_for_event,
            name="register_user_for_event",
            description=event_tools.register_user_for_event.__doc__,
        ),
        StructuredTool.from_function(
            coroutine=event_tools.get_venue_coordinates,
            name="get_venue_coordinates",
            description=event_tools.get_venue_coordinates.__doc__,
        ),
        StructuredTool.from_function(
            coroutine=event_tools.check_schedule_conflicts,
            name="check_schedule_conflicts",
            description=event_tools.check_schedule_conflicts.__doc__,
        ),
    ]


_checkpointer = MemorySaver()


def get_agent():
    llm = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_CHAT_MODEL,
        temperature=0.3,
        num_ctx=2048,
        num_predict=150,  # Reduced for faster generation
        streaming=True  # Enable streaming
    )
    tools = build_tools()
    return create_react_agent(llm, tools, checkpointer=_checkpointer)


_agent = None


def get_or_build_agent():
    global _agent
    if _agent is None:
        try:
            _agent = get_agent()
        except Exception as e:
            logger.error(
                "Failed to build LangGraph agent (is Ollama running at %s?): %s",
                settings.OLLAMA_BASE_URL, e,
            )
            raise RuntimeError(
                f"RAG agent unavailable — Ollama may not be running at {settings.OLLAMA_BASE_URL}. "
                f"Start Ollama and retry. Error: {e}"
            ) from e
    return _agent


class ChatRequest(BaseModel):
    query: str
    session_id: str = "default"   # optional — defaults to "default" if omitted
    user_id: Optional[str] = None  # optional — present when user is logged in


class MapData(BaseModel):
    lat: float | None = None
    lng: float | None = None
    venue: str | None = None


class ChatResponse(BaseModel):
    reply: str
    tool_action: str | None = None
    map_data: MapData | None = None
    registration_status: bool | None = None


async def run_agent_query(query: str, user_email: str, thread_key: str) -> ChatResponse:
    """
    Core agent invocation, shared by the text /api/chat route and the
    voice/converse route in voice_router.py — both need identical
    retrieval -> tool-calling -> reply behavior, just with different
    input/output modalities wrapped around this.
    """
    agent = get_or_build_agent()
    contextual_query = f"[Authenticated user email: {user_email}]\n{query}"

    config = {"configurable": {"thread_id": thread_key}}
    result = await agent.ainvoke(
        {"messages": [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=contextual_query)]},
        config=config,
    )

    messages = result["messages"]
    final_message = messages[-1]
    reply_text = final_message.content if isinstance(final_message, AIMessage) else str(final_message.content)

    tool_action = None
    map_data = None
    registration_status = None

    for msg in messages:
        if isinstance(msg, ToolMessage):
            tool_action = msg.name
            if msg.name == "get_venue_coordinates":
                try:
                    payload_data = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                    if payload_data.get("found"):
                        map_data = MapData(
                            lat=payload_data.get("latitude"),
                            lng=payload_data.get("longitude"),
                            venue=payload_data.get("venue"),
                        )
                except Exception:
                    pass
            if msg.name == "register_user_for_event":
                try:
                    payload_data = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                    registration_status = payload_data.get("success")
                except Exception:
                    pass

    return ChatResponse(
        reply=reply_text,
        tool_action=tool_action,
        map_data=map_data,
        registration_status=registration_status,
    )


async def stream_agent_query(query: str, user_email: str, thread_key: str):
    agent = get_or_build_agent()
    contextual_query = f"[Authenticated user email: {user_email}]\n{query}"
    config = {"configurable": {"thread_id": thread_key}}

    tool_action = None
    map_data = None
    registration_status = None
    
    try:
        async for event in agent.astream_events(
            {"messages": [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=contextual_query)]},
            config=config,
            version="v2"
        ):
            kind = event.get("event")
            if kind == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                if chunk and chunk.content:
                    yield json.dumps({"type": "text", "content": chunk.content}) + "\n"
            elif kind == "on_tool_end":
                name = event.get("name")
                tool_action = name
                output = event["data"].get("output")
                if output:
                    if name == "get_venue_coordinates" and output.get("found"):
                        map_data = {"lat": output.get("latitude"), "lng": output.get("longitude"), "venue": output.get("venue")}
                    elif name == "register_user_for_event":
                        registration_status = output.get("success")
    except Exception as e:
        logger.error(f"Streaming error: {e}")

    yield json.dumps({
        "type": "metadata",
        "tool_action": tool_action,
        "map_data": map_data,
        "registration_status": registration_status
    }) + "\n"

# ---------------------------------------------------------------------------
# Public endpoint
# ---------------------------------------------------------------------------

@router.post("/chat")
async def chat(
    payload: ChatRequest,
    user: Optional[CurrentUser] = Depends(get_optional_user),
):
    """
    Public endpoint — no login required.
    - Anonymous guests: can search events, check venues, ask questions.
    - Authenticated users: additionally get personalised registration via
      the 'register me for X' agent tool.
    """
    if user:
        user_email = user.email
        thread_key = f"{user.supabase_uid}:{payload.session_id}"
    else:
        user_email = "guest"
        thread_key = f"guest:{payload.session_id}"

    try:
        return StreamingResponse(
            stream_agent_query(
                query=payload.query,
                user_email=user_email,
                thread_key=thread_key,
            ),
            media_type="application/x-ndjson"
        )
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))
    except Exception as e:
        logger.exception("Unhandled error in /api/chat")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Chat error: {e}")

