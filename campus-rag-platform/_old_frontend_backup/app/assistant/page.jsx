"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, CheckCircle2, MapPinned, Keyboard, AudioLines } from "lucide-react";
import SpeechInput from "@/components/SpeechInput";
import MapWidget from "@/components/MapWidget";
import VoiceConversation from "@/components/VoiceConversation";
import { apiRequest } from "@/lib/api";

function sessionId() {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("campus_chat_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("campus_chat_session_id", id);
  }
  return id;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the NMIT Smart Campus Assistant. Ask me about upcoming events, check a venue for conflicts, or ask me to register you for something.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState("text"); // "text" | "voice"
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleVoiceResult = useCallback((summary) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: summary.transcript },
      {
        role: "assistant",
        content: summary.reply,
        toolAction: summary.tool_action,
        mapData: summary.map_data,
        registrationStatus: summary.registration_status,
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setSending(true);

      try {
        const { createClient } = await import("@/lib/supabase-client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({ query: trimmed, session_id: sessionId() })
        });

        if (!res.body) throw new Error("No response body");

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        
        let assistantContent = "";
        let mapData = null;
        let registrationStatus = null;
        let toolAction = null;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split("\n");
            
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.type === "text") {
                  assistantContent += data.content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantContent;
                    return newMessages;
                  });
                } else if (data.type === "metadata") {
                  toolAction = data.tool_action;
                  mapData = data.map_data;
                  registrationStatus = data.registration_status;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].toolAction = toolAction;
                    newMessages[newMessages.length - 1].mapData = mapData;
                    newMessages[newMessages.length - 1].registrationStatus = registrationStatus;
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore incomplete JSON chunks or parse errors for individual lines
              }
            }
          }
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't reach the assistant right now. Please try again shortly.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-campus-navy text-white rounded-br-sm"
                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
              }`}
            >
              <p>{msg.content}</p>

              {msg.registrationStatus === true && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 w-fit">
                  <CheckCircle2 size={13} /> Registration confirmed
                </div>
              )}

              {msg.mapData?.lat && msg.mapData?.lng && (
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                    <MapPinned size={13} /> {msg.mapData.venue}
                  </div>
                  <MapWidget venue={msg.mapData.venue} latitude={msg.mapData.lat} longitude={msg.mapData.lng} />
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-400">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex justify-center gap-1 mb-3">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
            mode === "text" ? "bg-campus-navy text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Keyboard size={13} /> Type
        </button>
        <button
          onClick={() => setMode("voice")}
          className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
            mode === "voice" ? "bg-campus-navy text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <AudioLines size={13} /> Talk (full conversation)
        </button>
      </div>

      {mode === "text" ? (
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2 border-t border-slate-200 pt-4"
        >
          <SpeechInput onTranscript={(text) => sendMessage(text)} disabled={sending} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about events, venues, or say 'register me for...'"
            disabled={sending}
            className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-campus-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-campus-navy text-white rounded-full p-2.5 hover:bg-campus-blue transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className="border-t border-slate-200 pt-4 flex justify-center">
          <VoiceConversation sessionId={sessionId()} onResult={handleVoiceResult} />
        </div>
      )}
    </div>
  );
}
