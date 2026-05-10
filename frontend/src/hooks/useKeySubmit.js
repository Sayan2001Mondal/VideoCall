"use client";

import { useCallback } from "react";

/**
 * useKeySubmit — returns an onKeyDown handler for input fields.
 *
 * @param {Function} onSubmit   — called on Enter (without Shift)
 * @param {Object}   options
 *   - onEscape:        Function — called on Escape key
 *   - allowShiftEnter: boolean  — if true, Shift+Enter won't trigger onSubmit (default true)
 *
 * Usage:
 *   const handleKeyDown = useKeySubmit(handleSend, { onEscape: closeChat });
 *   <input onKeyDown={handleKeyDown} />
 */
export default function useKeySubmit(onSubmit, options = {}) {
  const { onEscape, allowShiftEnter = true } = options;

  return useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (allowShiftEnter && e.shiftKey) return; // allow newline
        e.preventDefault();
        onSubmit?.(e);
      }

      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape(e);
      }
    },
    [onSubmit, onEscape, allowShiftEnter]
  );
}
