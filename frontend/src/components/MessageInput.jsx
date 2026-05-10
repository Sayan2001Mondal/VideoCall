"use client";

import { useState } from "react";
import { Smile, Send } from "lucide-react";
import { IconButton } from "./ui/icon-button";
import { Input } from "./ui/input";
import EmojiPicker from "./EmojiPicker";
import useKeySubmit from "../hooks/useKeySubmit";

export default function MessageInput({ onSend }) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = useKeySubmit(handleSend);

  const insertEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="p-3 border-t border-border">
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <IconButton size="sm" onClick={() => setShowEmoji((v) => !v)} aria-label="Emoji">
            <Smile size={16} />
          </IconButton>
          {showEmoji && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
          )}
        </div>
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1"
        />
        <IconButton
          size="sm"
          onClick={handleSend}
          disabled={!input.trim()}
          highlight={!!input.trim()}
          aria-label="Send message"
        >
          <Send size={14} />
        </IconButton>
      </div>
    </div>
  );
}