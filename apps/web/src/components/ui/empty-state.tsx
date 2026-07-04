"use client";

import { cn } from "@/lib/utils";

/* ── EmptyState ─────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-24 px-4 fade-in", className)}>
      {/* ── Icon placeholder ── */}
      {icon && (
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
            "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
            "border border-[hsl(var(--border))] shadow-[var(--shadow-xs)]",
            "dark:bg-[hsl(var(--muted))] dark:text-[hsl(var(--muted-foreground))]",
          )}
        >
          {icon}
        </div>
      )}

      {!icon && (
        <div
          className={cn(
            "w-20 h-20 rounded-[var(--radius-xl)] mb-6",
            "bg-[hsl(var(--muted))] dark:bg-[hsl(var(--muted))]",
            "flex items-center justify-center",
          )}
        >
          {/* Illustration placeholder — simple dashed circle */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-[hsl(var(--muted-foreground))]">
            <title>Illustration</title>
            <circle
              cx="20"
              cy="16"
              r="6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="3 2"
            />
            <path
              d="M10 34c0-5.5 4.5-10 10-10s10 4.5 10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="3 2"
            />
          </svg>
        </div>
      )}

      <h3 className={cn("text-[var(--text-lg)] font-bold text-[hsl(var(--foreground))] tracking-tight mb-2")}>
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-[var(--text-sm)] text-[hsl(var(--muted-foreground))] font-medium leading-relaxed",
            "max-w-sm text-center mb-6",
          )}
        >
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
