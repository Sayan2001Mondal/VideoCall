"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * useKeyboardShortcut — register global keyboard shortcuts.
 *
 * @param {Array<{ key: string, modifiers?: string[], handler: Function }>} shortcuts
 *   - key:       e.g. "m", "v", "Escape", "Enter"
 *   - modifiers: optional array of "alt", "ctrl", "shift", "meta"
 *   - handler:   callback function (receives the KeyboardEvent)
 *
 * @param {boolean} enabled — set to false to disable all shortcuts (default true)
 *
 * Usage:
 *   useKeyboardShortcut([
 *     { key: "m", modifiers: ["alt"], handler: toggleMic },
 *     { key: "v", modifiers: ["alt"], handler: toggleCam },
 *     { key: "Escape", handler: closePanel },
 *   ]);
 */
export default function useKeyboardShortcut(shortcuts = [], enabled = true) {
  const shortcutsRef = useRef(shortcuts);

  // Keep ref in sync without re-registering the listener
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Don't fire when typing in an input/textarea
      const tag = e.target.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        const modifiers = shortcut.modifiers || [];
        const needsAlt = modifiers.includes("alt");
        const needsCtrl = modifiers.includes("ctrl");
        const needsShift = modifiers.includes("shift");
        const needsMeta = modifiers.includes("meta");

        // Skip global shortcuts when focused on text input (unless it requires modifiers)
        if (isInput && modifiers.length === 0) continue;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          e.altKey === needsAlt &&
          e.ctrlKey === needsCtrl &&
          e.shiftKey === needsShift &&
          e.metaKey === needsMeta
        ) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
