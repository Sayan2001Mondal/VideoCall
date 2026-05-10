"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

/**
 * ChatBox — in-call chat messages
 *
 * Props:
 * - messages       array of { sender, message, timestamp?, type? }
 * - currentUser    string — your name
 */
export default function ChatBox({ messages, currentUser }) {
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-surface-50">
      {/* Empty State */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center text-text-muted">
          <MessageSquare size={90} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs mt-1 text-text-muted max-w-[220px] leading-relaxed">
            Messages are only visible to people in the call
          </p>
        </div>
      )}

      {/* Messages */}
      {messages.map((m, i) => {
        const isMe = m.sender === currentUser;
        const isSystem = m.type === "system";

        // System message
        if (isSystem) {
          return (
            <div key={i} className="flex justify-center">
              <span className="text-xs text-text-secondary bg-surface-200 px-3 py-1 rounded-full">
                {m.message}
              </span>
            </div>
          );
        }

        return (
          <div
            key={i}
            // 1. Flex wrapper guarantees it respects parent padding and scrollbars
            className={`flex w-full ${isMe ? "justify-end" : "justify-start"} `}
          >
            {/* 2. Inner container handles the max-width and vertical stacking */}
            <div
              className={`flex flex-col ${
                isMe ? "items-end" : "items-start"
              } max-w-[85%] `}
            >
              {/* Sender Name */}
              {!isMe && (
                <span className="text-[11px] text-primary-600 font-semibold mb-1 ml-1">
                  {m.sender}
                </span>
              )}

              {/* Chat Bubble */}
              {/* 3. Removed `w-fit`. The parent's flex alignment naturally shrink-wraps the box, keeping padding intact. */}
              {/* Chat Bubble */}
<div
  // THE NUCLEAR TEST: Bypassing Tailwind completely
  style={{ padding: "10px 16px", margin: "8px 0px" }} 
  className={`
    w-fit
    rounded-2xl
    text-sm
    leading-relaxed
    break-words
    shadow-sm
    transition-all
    ${
      isMe
        ? "bg-primary-500 text-white rounded-br-sm"
        : "bg-surface-200 text-text-primary rounded-bl-sm border border-border"
    }
  `}
>
  {m.message}
</div>
              

              {/* Timestamp */}
              {m.timestamp && (
                <span className="text-[10px] text-text-muted mt-1 px-1">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Auto Scroll Anchor */}
      <div ref={bottomRef} />
    </div>
  );
}