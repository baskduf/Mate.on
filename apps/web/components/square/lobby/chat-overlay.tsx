"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "./use-square-socket";

interface ChatOverlayProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function ChatOverlay({ messages, onSend }: ChatOverlayProps) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }, [input, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Skip during IME composition (한글 등)
      if (e.nativeEvent.isComposing || e.keyCode === 229) {
        e.stopPropagation();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      // Stop propagation so game input doesn't fire
      e.stopPropagation();
    },
    [handleSend]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-lg mx-auto p-3 pointer-events-auto">
        {/* Messages */}
        {expanded && (
          <div
            ref={scrollRef}
            className="mb-2 max-h-40 overflow-y-auto rounded-xl bg-black/30 backdrop-blur-sm p-3 space-y-1"
          >
            {messages.length === 0 ? (
              <p className="text-white/50 text-xs text-center">아직 대화가 없어요</p>
            ) : (
              messages.map((msg, i) => (
                <div key={`${msg.ts}-${i}`} className="text-xs">
                  <span className="text-white/70 font-medium">
                    {msg.userId === "__self__" ? "나" : `mate_${msg.userId.slice(-6)}`}
                  </span>
                  <span className="text-white/90 ml-1.5">{msg.text}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setExpanded(true)}
            onBlur={() => setTimeout(() => setExpanded(false), 200)}
            placeholder="메시지를 입력하세요..."
            maxLength={200}
            className="flex-1 bg-transparent text-sm text-ghibli-ink outline-none placeholder:text-ghibli-ink-light/50"
          />
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-full bg-ghibli-forest text-white flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
