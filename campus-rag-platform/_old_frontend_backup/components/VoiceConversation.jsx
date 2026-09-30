"use client";

import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Full-duplex voice conversation: records the mic via MediaRecorder,
 * uploads the blob to POST /api/voice/converse, then plays back the
 * synthesized WAV reply and surfaces the structured chat data (transcript,
 * map, registration status) via onResult — all processing (Whisper STT +
 * Piper TTS) happens on the self-hosted backend, no browser cloud API.
 */
export default function VoiceConversation({ sessionId, onResult }) {
  const [state, setState] = useState("idle"); // idle | recording | processing | speaking
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        handleRecordingComplete();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
    } catch (err) {
      setError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setState("processing");
  };

  const handleRecordingComplete = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    const headers = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/voice/converse?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Voice request failed (${res.status})`);
      }

      const encodedSummary = res.headers.get("X-Chat-Response");
      if (encodedSummary) {
        const summary = JSON.parse(atob(encodedSummary));
        onResult?.(summary);
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setState("speaking");
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => setState("idle");
        await audioRef.current.play();
      }
    } catch (err) {
      setError(err.message || "Voice conversation failed.");
      setState("idle");
    }
  };

  const buttonLabel = {
    idle: "Hold to talk",
    recording: "Recording… tap to stop",
    processing: "Thinking…",
    speaking: "Speaking…",
  }[state];

  return (
    <div className="flex flex-col items-center gap-2">
      <audio ref={audioRef} className="hidden" />
      <button
        type="button"
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "processing" || state === "speaking"}
        className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors ${
          state === "recording"
            ? "bg-red-500 text-white animate-pulse"
            : state === "idle"
            ? "bg-campus-navy text-white hover:bg-campus-blue"
            : "bg-slate-200 text-slate-500"
        } disabled:cursor-not-allowed`}
      >
        {state === "processing" || state === "speaking" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : state === "recording" ? (
          <Square size={16} />
        ) : (
          <Mic size={16} />
        )}
        {buttonLabel}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
