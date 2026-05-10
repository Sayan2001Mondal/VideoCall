"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar — displays a user avatar with a deterministic color fallback.
 *
 * Props:
 *  - name       string — user's name (used for initial + color)
 *  - size       "sm" | "md" | "lg" | "xl" — default "md"
 *  - className  extra classes
 */
const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-2xl",
  xl: "w-20 h-20 text-3xl",
};

function getAvatarColor(name) {
  if (!name) return "hsl(260, 50%, 55%)";
  const hue = name.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

const Avatar = React.forwardRef(
  ({ name = "", size = "md", className, ...props }, ref) => {
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    const bg = getAvatarColor(name);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none",
          sizeMap[size] || sizeMap.md,
          className
        )}
        style={{ backgroundColor: bg }}
        title={name}
        {...props}
      >
        {initial}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar, getAvatarColor };
