"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";

const EMOJI_DATA = {
  "😀 Smileys": [
    "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
    "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
    "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
    "🫡","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬",
    "😮‍💨","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕",
    "🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸",
    "😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳",
    "🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖",
    "😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬",
  ],
  "👋 Gestures": [
    "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞",
    "🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍",
    "👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝",
    "🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠",
  ],
  "❤️ Hearts": [
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
    "❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
    "😻","💑","💏","👩‍❤️‍👨","👨‍❤️‍👨","👩‍❤️‍👩",
  ],
  "🎉 Objects": [
    "🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","⚽",
    "🏀","🏈","⚾","🎾","🏐","🎮","🕹️","🎲","🎯","🎪",
    "🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🔔","📱",
    "💻","⌨️","🖥️","🖨️","📷","📹","🎥","📺","📻","⏰",
    "💡","🔦","📚","📖","✏️","📝","📌","📎","🔍","🔒",
  ],
  "🐱 Animals": [
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
    "🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔",
    "🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴",
    "🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦗","🕷️","🦂",
  ],
  "🍕 Food": [
    "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒",
    "🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬",
    "🥒","🌶️","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🥐",
    "🍕","🍔","🍟","🌭","🍿","🧂","🥚","🍳","🥞","🧇",
  ],
};

const CATEGORY_NAMES = Object.keys(EMOJI_DATA);

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_NAMES[0]);
  const [search, setSearch] = useState("");
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    }
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const displayEmojis = search.trim()
    ? Object.values(EMOJI_DATA).flat()
    : EMOJI_DATA[activeCategory] || [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 w-72 max-h-80 rounded-2xl overflow-hidden
                  bg-white border border-border shadow-2xl shadow-black/10
                  animate-[slideUp_0.2s_ease-out] flex flex-col z-50"
    >
      <div className="p-2 border-b border-border">
        <Input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
          autoFocus
        />
      </div>

      {!search.trim() && (
        <div className="flex border-b border-border px-1">
          {CATEGORY_NAMES.map((cat) => {
            const icon = cat.split(" ")[0];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-1 py-2 text-center text-base transition-colors cursor-pointer
                  ${activeCategory === cat
                    ? "border-b-2 border-primary-500"
                    : "hover:bg-surface-200"
                  }`}
                title={cat}
              >
                {icon}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {!search.trim() && (
          <p className="text-[10px] text-text-muted uppercase tracking-wider px-1 mb-1">
            {activeCategory}
          </p>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {displayEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-md
                         hover:bg-surface-200 text-lg transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
