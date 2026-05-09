"use client";

import { useEffect, useRef } from "react";

/**
 * ChatBox — slide-in side panel for in-call chat (Google Meet style).
 *
 * Props:
 *  - messages       array of { sender, message, timestamp? }
 *  - currentUser    string — your name
 *  - onClose()      close the chat panel
 */
export default function ChatBox({ messages, currentUser, onClose }) {
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100/30">
        <h3 className="text-base font-semibold text-white">In-call messages</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center
                     text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Messages are only visible to people in the call</p>
          </div>
        )}

        {messages.map((m, i) => {
          const isMe = m.sender === currentUser;
          const isSystem = m.type === "system";

          if (isSystem) {
            return (
              <div key={i} className="text-center">
                <span className="text-xs text-gray-500 bg-surface-400/50 px-3 py-1 rounded-full">
                  {m.message}
                </span>
              </div>
            );
          }

          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {/* Sender name (only for others) */}
              {!isMe && (
                <span className="text-[11px] text-primary-400 font-medium mb-0.5 ml-1">
                  {m.sender}
                </span>
              )}

              {/* Message bubble */}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
                  ${isMe
                    ? "bg-primary-600 text-white rounded-br-md"
                    : "bg-surface-100 text-gray-100 rounded-bl-md"
                  }`}
              >
                {m.message}
              </div>

              {/* Timestamp */}
              {m.timestamp && (
                <span className="text-[10px] text-gray-600 mt-0.5 mx-1">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}