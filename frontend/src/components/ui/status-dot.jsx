"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StatusDot — small colored dot with optional label.
 *
 * Props:
 *  - status     "connected" | "connecting" | "disconnected"
 *  - label      optional text label
 *  - className  extra classes
 */
const statusStyles = {
  connected: "bg-success",
  connecting: "bg-warning animate-pulse",
  disconnected: "bg-danger",
};

const statusLabels = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
};

const StatusDot = React.forwardRef(
  ({ status = "connecting", label, className, ...props }, ref) => {
    const displayLabel = label || statusLabels[status];

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...props}
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            statusStyles[status] || statusStyles.connecting
          )}
        />
        {displayLabel && (
          <span className="text-xs text-text-muted">{displayLabel}</span>
        )}
      </div>
    );
  }
);
StatusDot.displayName = "StatusDot";

export { StatusDot };
