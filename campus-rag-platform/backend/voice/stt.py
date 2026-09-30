"""
Speech-to-text using faster-whisper — a CTranslate2-backed reimplementation
of OpenAI's Whisper that runs entirely locally (CPU or GPU), with no calls
to any external speech API. This replaces the legacy repo's voice.py, which
used `speech_recognition`'s `recognize_google()` — a call out to Google's
cloud speech API, exactly the kind of external dependency this migration
is removing.

The model is loaded once per process and reused across requests.
"""
import logging
from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from faster_whisper import WhisperModel

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache
def get_whisper_model() -> "WhisperModel":
    from faster_whisper import WhisperModel

    logger.info(
        "Loading faster-whisper model '%s' (device=%s, compute_type=%s)",
        settings.WHISPER_MODEL_SIZE,
        settings.WHISPER_DEVICE,
        settings.WHISPER_COMPUTE_TYPE,
    )
    return WhisperModel(
        settings.WHISPER_MODEL_SIZE,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )


def transcribe_audio(audio_path: str) -> str:
    """Transcribe a local audio file (wav/mp3/webm/ogg — anything ffmpeg
    can decode) to text. Blocking/CPU-bound; call via a threadpool from
    async route handlers (see voice/converse endpoint in main.py)."""
    model = get_whisper_model()
    segments, info = model.transcribe(audio_path, beam_size=5, language="en")
    text = " ".join(segment.text.strip() for segment in segments)

    if not text.strip():
        logger.warning("Whisper produced no transcript for %s (detected lang confidence=%.2f)", audio_path, info.language_probability)

    return text.strip()
