"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Sparkles, Loader2, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
}

const SUGGESTIONS = [
  "Summarise today's leads",
  "How do I create a quotation?",
  "What's the best margin on Maldives packages?",
  "Help me write a follow-up message",
];

export function CopilotDrawer({ isOpen, onClose, context }: CopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm **NAMA Copilot** ✨\n\nAsk me anything about your leads, quotes, bookings, itineraries, or travel planning. I'm here to help.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help?",
        timestamp: new Date(),
      },
    ]);
    setInput("");
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/v1/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history, context: context ?? null }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "delta") {
              accumulated += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: accumulated,
                };
                return updated;
              });
            } else if (data.type === "error") {
              accumulated = `⚠️ ${data.content}`;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated };
                return updated;
              });
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Sorry, I couldn't connect right now. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Simple markdown-ish rendering for bold and newlines
  function renderContent(text: string) {
    return text.split("\n").map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">NAMA Copilot</h3>
              <p className="text-xs text-slate-500">Claude · AI assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={resetChat}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 bg-teal-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-200 rounded-bl-sm"
                }`}
              >
                {msg.content ? (
                  renderContent(msg.content)
                ) : streaming && i === messages.length - 1 ? (
                  <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Thinking...
                  </span>
                ) : null}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (show only when no user messages yet) */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex gap-2 items-end bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:border-teal-500/60 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (↵ to send)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none outline-none max-h-[120px] py-1 px-1 leading-relaxed"
              style={{ minHeight: "22px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="w-7 h-7 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            >
              {streaming ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-700 mt-1 text-center">Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
