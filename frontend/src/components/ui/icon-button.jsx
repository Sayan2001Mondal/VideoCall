"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IconButton — circular button for media controls.
 *
 * Props:
 *  - active       boolean — normal state (non-danger)
 *  - danger       boolean — red background (e.g., mic/cam off)
 *  - highlight    boolean — indigo background (e.g., active panel)
 *  - badge        number  — notification count
 *  - size         "sm" | "md" | "lg"
 *  - children     icon element
 */
const sizeMap = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-14 h-14",
};

const IconButton = React.forwardRef(
  (
    {
      children,
      active = true,
      danger = false,
      highlight = false,
      badge = 0,
      size = "md",
      className,
      ...props
    },
    ref
  ) => {
    let bgClass;
    if (danger) {
      bgClass = "bg-red-500 hover:bg-red-600 text-white";
    } else if (highlight) {
      bgClass = "bg-primary-500 hover:bg-primary-600 text-white";
    } else {
      bgClass =
        "bg-surface-200 hover:bg-surface-300 text-text-secondary hover:text-text-primary";
    }

    return (
      <button
        ref={ref}
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
          "hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          sizeMap[size] || sizeMap.md,
          bgClass,
          className
        )}
        {...props}
      >
        {children}

        {/* Notification badge */}
        {badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full
                        bg-danger text-white text-[10px] font-bold
                        flex items-center justify-center px-1 shadow-sm"
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export { IconButton };
