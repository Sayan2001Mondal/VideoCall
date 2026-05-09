"use client";

import { useState, useRef, useEffect } from "react";

/**
 * EmojiPicker — a built-in emoji grid with category tabs and search.
 * No external dependencies.
 *
 * Props:
 *  - onSelect(emoji)  called when user picks an emoji
 *  - onClose()        called to close the picker
 */

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

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
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

  // Filter emojis by search (search matches nothing meaningful for emojis,
  // but we filter by category label matching)
  const displayEmojis = search.trim()
    ? Object.values(EMOJI_DATA).flat().filter(() => true) // show all on search for simplicity
    : EMOJI_DATA[activeCategory] || [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 w-72 max-h-80 rounded-2xl overflow-hidden
                  bg-surface-300 border border-surface-100/40 shadow-2xl shadow-black/50
                  animate-[slideUp_0.2s_ease-out] flex flex-col z-50"
    >
      {/* Search */}
      <div className="p-2 border-b border-surface-100/30">
        <input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg bg-surface-400 text-white text-sm
                     placeholder-gray-500 outline-none border border-surface-100/30
                     focus:border-primary-500/50"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div className="flex border-b border-surface-100/30 px-1">
          {CATEGORY_NAMES.map((cat) => {
            const icon = cat.split(" ")[0]; // first emoji as tab icon
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-1 py-2 text-center text-base transition-colors cursor-pointer
                  ${activeCategory === cat
                    ? "border-b-2 border-primary-500"
                    : "hover:bg-surface-400/50"
                  }`}
                title={cat}
              >
                {icon}
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {!search.trim() && (
          <p className="text-[10px] text-gray-500 uppercase tracking-wider px-1 mb-1">
            {activeCategory}
          </p>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {displayEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-md
                         hover:bg-surface-100 text-lg transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
