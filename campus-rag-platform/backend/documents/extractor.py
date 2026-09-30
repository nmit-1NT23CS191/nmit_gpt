"""
Structured event-field extraction from raw OCR text, using the local
Ollama LLM (llama3) instead of OpenAI.

The legacy repo's extractor.py called `from openai import OpenAI` to turn
raw OCR text into structured fields — that dependency and the file itself
are discarded per the migration instructions. This module reimplements
the same "raw text -> structured event JSON" job entirely against the
self-hosted Ollama chat endpoint.
"""
import json
import logging
import re

import httpx

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

EXTRACTION_PROMPT = """You are a data-extraction assistant for a college event system.
Given the raw OCR text below (extracted from an event poster, circular, or schedule),
extract the following fields as STRICT JSON only — no markdown, no commentary, no
code fences, no explanation before or after the JSON object:

{{
  "title": string or null,
  "department": string or null,
  "venue": string or null,
  "event_date": string or null (ISO 8601 date-time if determinable, else your best-effort raw text),
  "end_date": string or null (ISO 8601 date-time if the poster gives an end time/date, else null),
  "description": string or null (1-3 sentence summary of what the event is about),
  "capacity": integer or null (if the poster states a seat/participant limit),
  "category": string or null (e.g. Hackathon, Seminar, Workshop, Sports, Cultural),
  "tags": string or null (comma-separated list of keywords, e.g. coding, AI, tech)
}}

If a field is not present in the text, set it to null. Respond with ONLY the JSON object.

RAW OCR TEXT:
---
{raw_text}
---
"""


class ExtractionError(RuntimeError):
    pass


def _extract_json_block(raw: str) -> dict:
    # Strip markdown code fences the model sometimes emits despite instructions.
    # Handles ```json ... ``` and ``` ... ``` wrappers.
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        # Remove the opening fence line (```json or ```) and closing ```
        lines = cleaned.splitlines()
        # Drop first line (fence open) and last line if it's a fence close
        inner_lines = lines[1:]
        if inner_lines and inner_lines[-1].strip().startswith("```"):
            inner_lines = inner_lines[:-1]
        cleaned = "\n".join(inner_lines).strip()

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ExtractionError(f"No JSON object found in model output: {raw[:300]}")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise ExtractionError(f"Model returned invalid JSON: {e}. Raw: {raw[:300]}") from e


async def extract_event(raw_text: str) -> dict:
    """Send raw OCR text to the local Ollama chat model and get back
    structured event fields. Raises ExtractionError if the model can't
    produce parseable JSON after being given the raw text."""
    if not raw_text or not raw_text.strip():
        raise ExtractionError("Cannot extract from empty OCR text")

    prompt = EXTRACTION_PROMPT.format(raw_text=raw_text[:6000])  # guard against runaway prompt size

    async with httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=120.0) as client:
        resp = await client.post(
            "/api/generate",
            json={
                "model": settings.OLLAMA_CHAT_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            },
        )
        if resp.status_code != 200:
            raise ExtractionError(f"Ollama call failed: {resp.status_code} {resp.text}")

        raw_response = resp.json().get("response", "")
        try:
            structured = _extract_json_block(raw_response)
        except json.JSONDecodeError as e:
            raise ExtractionError(f"Model returned invalid JSON: {e}") from e

    return structured
