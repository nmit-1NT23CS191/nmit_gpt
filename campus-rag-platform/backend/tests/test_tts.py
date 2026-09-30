"""
Unit tests for voice/tts.py's validation logic. Actual Piper subprocess
execution is not exercised here (no binary in the CI runner) — these
cover the pure-Python guard clauses.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")

import pytest

from voice import tts


def test_synthesize_speech_rejects_empty_text():
    with pytest.raises(tts.TTSError):
        tts.synthesize_speech("")


def test_synthesize_speech_rejects_whitespace_only_text():
    with pytest.raises(tts.TTSError):
        tts.synthesize_speech("   ")


def test_synthesize_speech_raises_when_binary_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(tts.settings, "PIPER_BINARY_PATH", str(tmp_path / "nonexistent-piper-binary"))
    with pytest.raises(tts.TTSError):
        tts.synthesize_speech("Hello, this is a test.")
