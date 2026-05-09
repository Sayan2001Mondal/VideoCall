"use client";

import { useState } from "react";
import EmojiPicker from "./EmojiPicker";

/**
 * MessageInput — chat input with emoji picker and send button.
 *
 * Props:
 *  - onSend(message)  called when user sends a message
 */
export default function MessageInput({ onSend }) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="p-3 border-t border-surface-100/30">
      <div className="relative flex items-center gap-2">
        {/* Emoji picker toggle */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="w-9 h-9 rounded-full hover:bg-surface-100 flex items-center justify-center
                       text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Emoji"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {/* Emoji picker popup */}
          {showEmoji && (
            <EmojiPicker
              onSelect={insertEmoji}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>

        {/* Text input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1 px-3 py-2 rounded-xl bg-surface-400 text-white text-sm
                     placeholder-gray-500 outline-none border border-surface-100/30
                     focus:border-primary-500/50 transition-colors"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-500
                     flex items-center justify-center text-white transition-all duration-200
                     disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}