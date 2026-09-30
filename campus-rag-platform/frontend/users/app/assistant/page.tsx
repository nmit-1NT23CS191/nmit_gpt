"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Message = {
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
  map_data?: { lat: number; lng: number; venue: string } | null;
  registration_status?: boolean | null;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check backend health on mount
    checkBackendHealth();

    // Initialize Speech Recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`, { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Backend health check passed:", data);
        setDebugInfo(`Backend OK - ${data.ollama_chat_model} @ ${data.ollama_base_url}`);
      } else {
        console.error("❌ Backend health check failed:", response.status);
        setError(`Backend not responding (${response.status}). Make sure it's running on port 8000.`);
      }
    } catch (err) {
      console.error("❌ Backend unreachable:", err);
      setError("Cannot reach backend. Please start: cd backend && uvicorn main:app --reload --port 8000");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError("Voice recognition not supported in your browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!speechEnabled) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    console.log("📤 Sending message:", userMessage.content);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Fetching from:", `${API_URL}/api/chat`);

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/x-ndjson",
        },
        body: JSON.stringify({
          query: userMessage.content,
          session_id: "public-user-session",
        }),
      });

      console.log("📥 Response status:", response.status, response.statusText);
      console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null - streaming not supported");
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let metadata: any = {};
      let assistantMessageAdded = false;
      let chunkCount = 0;
      let pendingLine = "";

      const processLine = (line: string) => {
        try {
          const data = JSON.parse(line);
          console.log("📋 Parsed data:", data);

          if (data.type === "text") {
            assistantContent += data.content;
            console.log("💬 Accumulated content:", assistantContent.substring(0, 50));

            setMessages((prev) => {
              const newMessages = [...prev];
              if (assistantMessageAdded) {
                const lastIdx = newMessages.length - 1;
                if (newMessages[lastIdx]?.role === "assistant") {
                  newMessages[lastIdx] = {
                    ...newMessages[lastIdx],
                    content: assistantContent,
                  };
                }
              } else {
                newMessages.push({
                  role: "assistant",
                  content: assistantContent,
                  timestamp: new Date(),
                });
                assistantMessageAdded = true;
                console.log("✨ Added new assistant message");
              }
              return newMessages;
            });
          } else if (data.type === "metadata") {
            metadata = data;
            console.log("🏷️ Metadata received:", metadata);
          }
        } catch (parseError) {
          console.error("⚠️ Error parsing response line:", parseError, "Raw:", line);
        }
      };

      console.log("📖 Starting to read stream...");

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("✅ Stream complete. Total chunks:", chunkCount);
          break;
        }

        chunkCount++;
        const chunk = pendingLine + decoder.decode(value, { stream: true });
        console.log(`📦 Chunk ${chunkCount}:`, chunk.substring(0, 100));

        const lines = chunk.split("\n");
        pendingLine = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) {
            processLine(line);
          }
        }
      }

      const finalLine = pendingLine + decoder.decode();
      if (finalLine.trim()) {
        processLine(finalLine);
      }

      // Final message update with metadata
      if (assistantContent) {
        console.log("✅ Final response:", assistantContent);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (newMessages[lastIdx]?.role === "assistant") {
            newMessages[lastIdx] = {
              role: "assistant",
              content: assistantContent,
              timestamp: new Date(),
              map_data: metadata.map_data,
              registration_status: metadata.registration_status,
            };
          }
          return newMessages;
        });

        speak(assistantContent);
      } else {
        console.warn("⚠️ No content received from stream");
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            content: "I received an empty response. The AI might be unavailable. Please check if Ollama is running.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("❌ Chat error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      const errorMessage: Message = {
        role: "error",
        content: `Sorry, I encountered an error: ${errorMsg}. \n\n🔍 Troubleshooting:\n• Is the backend running? (cd backend && uvicorn main:app --reload --port 8000)\n• Is Ollama running? (Check http://localhost:11434)\n• Check browser console for details`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setError(errorMsg);
    } finally {
      setLoading(false);
      console.log("🏁 Message handling complete");
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">AI Campus Assistant</h1>
            <p className="text-purple-100">
              Ask me anything about campus events, venues, and schedules. Voice-enabled!
            </p>
            {debugInfo && (
              <p className="mt-2 text-xs text-purple-200">
                ℹ️ {debugInfo}
              </p>
            )}
          </div>
          <div className="hidden text-6xl lg:block">🤖</div>
        </div>

        {/* Speech Toggle */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              speechEnabled
                ? "bg-white/20 text-white backdrop-blur-sm"
                : "bg-white/10 text-white/70 backdrop-blur-sm"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            {speechEnabled ? "Voice Output: ON" : "Voice Output: OFF"}
          </button>
          <button
            onClick={checkBackendHealth}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
            title="Check if backend is running"
          >
            🔍 Test Connection
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 flex-shrink-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">{error}</div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        {/* Messages - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                  🤖
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-slate-100 px-4 py-3">
                  <p className="text-sm leading-relaxed text-slate-900">
                    Hi! I'm your NMIT Campus Assistant. Ask me about events, venues, schedules, or anything happening on campus. You can type or use the microphone button to speak!
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index}>
                <MessageBubble message={message} />
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                  🤖
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Form - Fixed at Bottom */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-slate-200 p-4">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about events, venues, or schedules..."
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-all ${
                  isListening
                    ? "animate-pulse bg-red-500 text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          {isListening && (
            <p className="mt-2 animate-pulse text-xs text-red-600">
              🎤 Listening... Speak now
            </p>
          )}
        </form>
      </div>

      {/* Help Section - Only show if no messages yet */}
      {messages.length === 0 && (
        <div className="mt-6 flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-slate-900">Try asking:</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "What events are happening today?",
              "Tell me about technical workshops",
              "Where is the auditorium located?",
              "Show me cultural events this week",
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
              >
                💬 {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
            : isError
            ? "bg-red-500 text-white"
            : "bg-gradient-to-br from-purple-500 to-indigo-500 text-white"
        }`}
      >
        {isUser ? "👤" : isError ? "⚠️" : "🤖"}
      </div>

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "rounded-tr-none bg-indigo-600 text-white"
              : isError
              ? "rounded-tl-none border border-red-200 bg-red-50 text-red-900"
              : "rounded-tl-none bg-slate-100 text-slate-900"
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Map Data */}
        {message.map_data && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <div className="mb-1 font-semibold text-slate-900">📍 {message.map_data.venue}</div>
            <div className="text-xs text-slate-600">
              Coordinates: {message.map_data.lat.toFixed(6)}, {message.map_data.lng.toFixed(6)}
            </div>
          </div>
        )}

        {/* Registration Status */}
        {message.registration_status !== undefined && message.registration_status !== null && (
          <div
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              message.registration_status
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {message.registration_status ? "✓ Registration successful!" : "⚠️ Registration requires login"}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-slate-400">
          {message.timestamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
