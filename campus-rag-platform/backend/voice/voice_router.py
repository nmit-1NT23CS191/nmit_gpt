"""
Full-duplex voice conversation.

POST /api/voice/converse:
  1. Accept an uploaded audio blob (recorded in the browser — webm/wav/ogg).
  2. Transcribe it locally with faster-whisper (voice/stt.py). No audio
     ever leaves this server.
  3. Feed the transcript through the same agentic RAG pipeline used by
     text chat (agents/rag_agent.run_agent_query) — full tool-calling,
     retrieval, and multi-turn memory apply identically to voice.
  4. Synthesize the reply text to speech locally with Piper (voice/tts.py).
  5. Return both the structured chat response (as headers/JSON via a
     multipart-free trick: a JSON summary is returned in the
     X-Chat-Response header, base64-encoded, alongside a streamed WAV
     body) so the frontend can render map/registration data AND play
     audio from a single round trip.

Both legs of the conversation — listening and speaking — run on
self-hosted models (Whisper, Piper). No external speech API is called,
replacing the legacy repo's `speech_recognition.recognize_google()` and
its complete lack of a voice-output path.

Fix (Bug 6): STT/TTS modules are now imported lazily inside the route
handler rather than at module level. This prevents a missing faster-whisper
or Piper install from crashing the entire FastAPI app at startup — chat
and OCR routes work fine even when voice deps are absent.
"""
import asyncio
import base64
import json
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from typing import Optional
from ..auth import CurrentUser, get_optional_user
from ..config import get_settings
from ..agents.rag_agent import run_agent_query

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/voice", tags=["voice"])

_executor = ThreadPoolExecutor(max_workers=2)  # Whisper/Piper are CPU-bound; keep the event loop free

SUPPORTED_AUDIO_EXTENSIONS = {"webm", "wav", "ogg", "mp3", "m4a"}

os.makedirs(settings.VOICE_TMP_DIR, exist_ok=True)


def _get_stt():
    """Lazy import of STT module — avoids startup crash if faster-whisper isn't installed."""
    try:
        from ..voice import stt  # noqa: PLC0415
        return stt
    except ImportError as e:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            f"Voice transcription (faster-whisper) is not installed on this server: {e}",
        )


def _get_tts():
    """Lazy import of TTS module — avoids startup crash if Piper isn't available."""
    try:
        from ..voice import tts  # noqa: PLC0415
        return tts
    except ImportError as e:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            f"Voice synthesis (Piper) is not installed on this server: {e}",
        )


@router.post("/converse")
async def converse(
    audio: UploadFile = File(...),
    session_id: str = "voice-default",
    user: Optional[CurrentUser] = Depends(get_optional_user),
):
    stt = _get_stt()
    tts = _get_tts()

    ext = (audio.filename or "").split(".")[-1].lower()
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported audio format .{ext}. Supported: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}",
        )

    contents = await audio.read()
    local_path = os.path.join(settings.VOICE_TMP_DIR, f"{uuid.uuid4().hex}.{ext}")
    with open(local_path, "wb") as f:
        f.write(contents)

    loop = asyncio.get_running_loop()

    # 1. Transcribe (blocking Whisper call, offloaded to a thread)
    try:
        transcript = await loop.run_in_executor(_executor, stt.transcribe_audio, local_path)
    except Exception as e:
        logger.exception("Whisper transcription failed")
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Transcription failed: {e}")
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

    if not transcript.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Could not understand the audio — no speech detected.")

    # 2. Run the same agentic RAG pipeline used by text chat
    if user:
        user_email = user.email
        thread_key = f"{user.supabase_uid}:{session_id}"
    else:
        user_email = "guest"
        thread_key = f"guest:{session_id}"

    chat_response = await run_agent_query(
        query=transcript,
        user_email=user_email,
        thread_key=thread_key,
    )

    # 3. Synthesize the reply to speech locally
    try:
        wav_path = await loop.run_in_executor(_executor, tts.synthesize_speech, chat_response.reply)
    except tts.TTSError as e:
        logger.exception("Piper synthesis failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Speech synthesis failed: {e}")

    # Encode the structured response into a header so the client gets both
    # the audio stream AND the map/registration/transcript data in one
    # round trip, without needing a multipart response format.
    summary = {
        "transcript": transcript,
        "reply": chat_response.reply,
        "tool_action": chat_response.tool_action,
        "map_data": chat_response.map_data.model_dump() if chat_response.map_data else None,
        "registration_status": chat_response.registration_status,
    }
    encoded_summary = base64.b64encode(json.dumps(summary).encode("utf-8")).decode("ascii")

    response = FileResponse(
        wav_path,
        media_type="audio/wav",
        filename="reply.wav",
        background=BackgroundTask(lambda: os.path.exists(wav_path) and os.remove(wav_path)),
    )
    response.headers["X-Chat-Response"] = encoded_summary
    response.headers["Access-Control-Expose-Headers"] = "X-Chat-Response"
    return response
