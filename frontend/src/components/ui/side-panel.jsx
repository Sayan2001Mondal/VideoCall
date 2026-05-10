"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SidePanel — reusable slide-in panel with header and close button.
 *
 * Props:
 *  - title       string — panel header text
 *  - onClose     function — close handler
 *  - children    panel content
 *  - className   extra wrapper classes
 */
const SidePanel = React.forwardRef(
  ({ title, onClose, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col h-full bg-white border-l border-border",
          "animate-[slideInRight_0.25s_ease-out]",
          "shadow-xl",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-200 flex items-center justify-center
                       text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    );
  }
);
SidePanel.displayName = "SidePanel";

export { SidePanel };
