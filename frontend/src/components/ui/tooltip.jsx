"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip — simple CSS-only tooltip wrapper.
 *
 * Props:
 *  - content    string — tooltip text
 *  - side       "top" | "bottom" — default "top"
 *  - children   trigger element
 */
const Tooltip = React.forwardRef(
  ({ content, side = "top", children, className, ...props }, ref) => {
    if (!content) return children;

    return (
      <div ref={ref} className={cn("relative group inline-flex", className)} {...props}>
        {children}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-medium",
            "bg-surface-300 text-text-primary whitespace-nowrap",
            "opacity-0 group-hover:opacity-100 pointer-events-none",
            "transition-opacity duration-200 z-50",
            "shadow-lg",
            side === "top" && "bottom-full mb-2",
            side === "bottom" && "top-full mt-2"
          )}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-300 rotate-45",
              side === "top" && "top-full -mt-1",
              side === "bottom" && "bottom-full -mb-1"
            )}
          />
        </div>
      </div>
    );
  }
);
Tooltip.displayName = "Tooltip";

export { Tooltip };
