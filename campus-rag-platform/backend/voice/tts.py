"""
Text-to-speech using Piper — a fast, fully local neural TTS engine (runs
as a small ONNX model via a native binary, no network calls). Used for
the "assistant speaks back" half of full-duplex voice conversation.

Piper binary + a voice model (.onnx + .onnx.json) must be present in the
container image — see backend/Dockerfile, which downloads
en_US-lessac-medium during the build.
"""
import logging
import os
import subprocess
import uuid

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class TTSError(RuntimeError):
    pass


def synthesize_speech(text: str) -> str:
    """Run Piper on `text`, write a WAV file to VOICE_TMP_DIR, and return
    its path. Caller is responsible for cleaning up the file after
    streaming it back to the client (see main.py's /api/voice/converse)."""
    if not text or not text.strip():
        raise TTSError("Cannot synthesize empty text")

    os.makedirs(settings.VOICE_TMP_DIR, exist_ok=True)
    output_path = os.path.join(settings.VOICE_TMP_DIR, f"{uuid.uuid4().hex}.wav")

    try:
        result = subprocess.run(
            [
                settings.PIPER_BINARY_PATH,
                "--model", settings.PIPER_MODEL_PATH,
                "--config", settings.PIPER_MODEL_CONFIG_PATH,
                "--output_file", output_path,
            ],
            input=text.encode("utf-8"),
            capture_output=True,
            timeout=60,
        )
    except FileNotFoundError as e:
        raise TTSError(f"Piper binary not found at {settings.PIPER_BINARY_PATH}: {e}") from e
    except subprocess.TimeoutExpired as e:
        raise TTSError("Piper synthesis timed out") from e

    if result.returncode != 0:
        raise TTSError(f"Piper exited with code {result.returncode}: {result.stderr.decode(errors='ignore')}")

    if not os.path.exists(output_path):
        raise TTSError("Piper did not produce an output file")

    return output_path
