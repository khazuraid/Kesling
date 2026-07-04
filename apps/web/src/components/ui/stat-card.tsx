"use client";

import { cn } from "@/lib/utils";

/* ── StatCard — Doppelrand Architecture ─────────────────────────── */

type TrendDirection = "up" | "down" | "neutral";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: TrendDirection;
  trendValue?: string;
  href?: string;
  accent?: boolean;
  className?: string;
}

const TREND_STYLES: Record<TrendDirection, string> = {
  up: "text-[hsl(var(--accent))] dark:text-[hsl(var(--accent-muted))]",
  down: "text-[hsl(var(--error))]",
  neutral: "text-[hsl(var(--muted-foreground))]",
};

const TREND_ARROWS: Record<TrendDirection, string> = {
  up: "\u2191",
  down: "\u2193",
  neutral: "\u2194",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  href,
  accent = false,
  className,
}: StatCardProps) {
  const Wrapper = href ? "a" : "div";
  const shellClass = accent ? "card-accent" : "card-shell";
  const innerClass = accent ? "card-accent-inner" : "card-inner";

  return (
    <Wrapper
      href={href}
      className={cn(
        shellClass,
        "group block",
        href && "cursor-pointer hover:border-[hsl(var(--accent)/0.3)]",
        className,
      )}
    >
      <div className={cn(innerClass, "flex flex-col gap-3")}>
        {/* ── Top row: label + icon ── */}
        <div className="flex items-start justify-between gap-3">
          <p className="stat-label">{title}</p>
          {icon && (
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                "dark:bg-[hsl(var(--muted))] dark:text-[hsl(var(--muted-foreground))]",
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {/* ── Value + trend ── */}
        <div className="flex items-end gap-2">
          <p className="stat-number text-[hsl(var(--foreground))]">{value}</p>
          {trend && trendValue && (
            <span
              className={cn("text-[var(--text-sm)] font-bold inline-flex items-center gap-0.5", TREND_STYLES[trend])}
            >
              {TREND_ARROWS[trend]} {trendValue}
            </span>
          )}
        </div>

        {/* ── Subtitle ── */}
        {subtitle && (
          <p className="text-[var(--text-xs)] text-[hsl(var(--muted-foreground))] font-medium leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* ── Link hint ── */}
        {href && (
          <div
            className={cn(
              "mt-auto flex items-center gap-1",
              "text-[var(--text-xs)] font-bold uppercase tracking-widest text-[hsl(var(--accent))]",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity duration-300 ease-[var(--ease-out)]",
            )}
          >
            Lihat detail
            <span
              className={cn(
                "translate-x-0 group-hover:translate-x-1",
                "transition-transform duration-300 ease-[var(--ease-out)]",
              )}
            >
              &#8594;
            </span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
