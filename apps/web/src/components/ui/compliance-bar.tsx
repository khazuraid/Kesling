"use client";

import { cn } from "@/lib/utils";

/* ── ComplianceBar ──────────────────────────────────────────────── */

interface ComplianceBarProps {
  /** 0–100 */
  value: number;
  /** Target threshold, default 80 */
  target?: number;
  /** Label shown above the bar */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Compact mode: only show bar, no labels */
  compact?: boolean;
}

const HEIGHT_MAP: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

function getFillClass(value: number, threshold: number): string {
  if (value >= threshold) return "bg-[hsl(var(--accent))]";
  if (value >= 60) return "bg-[hsl(var(--warning))]";
  if (value > 0) return "bg-[hsl(var(--error))]";
  return "bg-[hsl(var(--muted))]";
}

function getValueColor(value: number, threshold: number): string {
  if (value >= threshold) return "text-[hsl(var(--accent))] dark:text-[hsl(var(--accent-muted))]";
  if (value >= 60) return "text-[hsl(var(--warning))]";
  return "text-[hsl(var(--error))]";
}

export function ComplianceBar({
  value,
  target = 80,
  label = "Compliance",
  size = "md",
  className,
  compact = false,
}: ComplianceBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const fillClass = getFillClass(clamped, target);

  // Compact: only the bar
  if (compact) {
    return (
      <div
        className={cn(
          "relative w-full rounded-full overflow-hidden",
          "bg-[hsl(var(--muted))]",
          HEIGHT_MAP[size],
          className,
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            "transition-all duration-700 ease-[var(--ease-out)]",
            fillClass,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[var(--text-xs)] font-bold uppercase tracking-[0.1em]",
            "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {label}
        </span>
        <span className={cn("text-[var(--text-sm)] font-bold tabular-nums", getValueColor(clamped, target))}>
          {clamped.toFixed(1)}%
        </span>
      </div>

      {/* ── Bar ── */}
      <div className={cn("relative w-full rounded-full overflow-hidden", "bg-[hsl(var(--muted))]", HEIGHT_MAP[size])}>
        {/* Fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            "transition-all duration-700 ease-[var(--ease-out)]",
            fillClass,
          )}
          style={{ width: `${clamped}%` }}
        />

        {/* Target marker */}
        <div
          className={cn(
            "absolute inset-y-0",
            "border-l-2 border-dashed",
            "border-[hsl(var(--foreground)/0.3)]",
            "dark:border-[hsl(var(--foreground)/0.2)]",
          )}
          style={{ left: `${Math.min(target, 100)}%` }}
        />
      </div>

      {/* ── Target label ── */}
      <div className="flex justify-end">
        <span className={cn("text-[var(--text-xs)] font-medium tabular-nums", "text-[hsl(var(--muted-foreground))]")}>
          Target: {target}%
        </span>
      </div>
    </div>
  );
}
