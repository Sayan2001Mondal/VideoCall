"use client";

import * as React from "react";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function LabeledInput({
  label,
  id,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  className = "",
  options = [],
  rows = 3,
  icon,
  iconRight,
  // New props
  errorMessage,
  hint,
  disabled = false,
  loading = false,
  prefix,
  suffix,
  valid = false,
  validMessage,
  ...props
}) {
  const identifier = name || id;
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";

  const hasIcon = !!icon;
  const hasIconRight = !!iconRight || isPasswordType || loading || valid;
  const hasPrefix = !!prefix;
  const hasSuffix = !!suffix;

  const baseInputClass = cn(
    "w-full px-3 py-2 text-sm border rounded-xl bg-white text-text-primary",
    "placeholder:text-text-muted",
    "focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200",
    errorMessage
      ? "border-red-400 focus:ring-red-300"
      : valid
      ? "border-success focus:ring-success/30"
      : "border-border focus:ring-primary-500/30 focus:border-primary-400",
    disabled && "opacity-50 cursor-not-allowed bg-surface-200",
    (hasIcon && !label) && "!pl-10",
    hasIconRight && "!pr-10",
    hasPrefix && "!pl-9",
    hasSuffix && "!pr-9",
    className
  );

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <Label
          htmlFor={identifier}
          className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary mb-1.5"
        >
          {icon && (
            <span className="text-text-muted">{icon}</span>
          )}
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* Textarea */}
      {type === "textarea" ? (
        <textarea
          id={identifier}
          name={identifier}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          rows={rows}
          className={cn(
            "w-full px-3 py-2 text-sm border rounded-xl bg-white resize-none",
            "focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200",
            "text-text-primary placeholder:text-text-muted",
            errorMessage
              ? "border-red-400 focus:ring-red-300"
              : "border-border focus:ring-primary-500/30 focus:border-primary-400",
            disabled && "opacity-50 cursor-not-allowed bg-surface-200",
            className
          )}
          {...props}
        />
      ) : type === "select" ? (
        <select
          id={identifier}
          name={identifier}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 text-sm border rounded-xl bg-white",
            "focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200",
            "text-text-primary",
            errorMessage
              ? "border-red-400 focus:ring-red-300"
              : "border-border focus:ring-primary-500/30 focus:border-primary-400",
            disabled && "opacity-50 cursor-not-allowed bg-surface-200",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        /* Text / Number / Password / Email etc. */
        <div className="relative group">
          {/* Prefix */}
          {hasPrefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none select-none">
              {prefix}
            </span>
          )}

          {/* Left icon — only when label is absent (avoids double icon) */}
          {hasIcon && !label && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-500 transition-colors pointer-events-none">
              {icon}
            </span>
          )}

          <Input
            id={identifier}
            name={identifier}
            type={isPasswordType ? (showPassword ? "text" : "password") : type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled || loading}
            className={baseInputClass}
            onKeyDown={
              type === "number"
                ? (e) => {
                    if (
                      [
                        "Backspace", "Delete", "Tab", "Escape", "Enter",
                        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                        ".", "-",
                      ].includes(e.key)
                    )
                      return;
                    if (
                      (e.ctrlKey || e.metaKey) &&
                      ["a", "c", "v", "x"].includes(e.key.toLowerCase())
                    )
                      return;
                    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                  }
                : undefined
            }
            {...props}
          />

          {/* Suffix */}
          {hasSuffix && !hasIconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none select-none">
              {suffix}
            </span>
          )}

          {/* Right slot: loading spinner > password toggle > iconRight */}
          {hasIconRight && (
            <span
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors",
                !loading && !isPasswordType && "pointer-events-none",
                "group-focus-within:text-primary-500"
              )}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : valid ? (
                <CheckCircle2 size={16} className="text-success" />
              ) :
              
              isPasswordType ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              ) : (
                iconRight
              )}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
      )}

      {!errorMessage && valid && validMessage && (
        <p className="mt-1 text-xs text-success">{validMessage}</p>
      )}

      {/* Hint — only shown when no error */}
      {!errorMessage && !valid && hint && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}