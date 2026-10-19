"use client";

import { cn } from "@/lib/utils";

/* ── StatCard — Tamagui Bento Architecture ───────────────────────── */

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

const TREND_BADGES: Record<TrendDirection, { badge: string; arrow: string }> = {
  up: {
    badge: "bg-success-light text-success border-success/20",
    arrow: "↑",
  },
  down: {
    badge: "bg-error-light text-error border-error/20",
    arrow: "↓",
  },
  neutral: {
    badge: "bg-surface-subtle text-muted-foreground border-border",
    arrow: "↔",
  },
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

  return (
    <Wrapper
      href={href}
      className={cn(
        "rounded-card border transition-all duration-200 group block",
        accent
          ? "border-primary/25 bg-gradient-to-br from-primary-subtle/70 via-surface to-surface shadow-subtle"
          : "border-border bg-surface shadow-subtle",
        href && "cursor-pointer hover:border-border-hover hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="p-5 flex flex-col gap-3 h-full">
        {/* ── Top row: label + icon ── */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
          {icon && (
            <div className="w-9 h-9 rounded-button flex items-center justify-center shrink-0 bg-surface-subtle text-muted-foreground border border-border/60 transition-colors group-hover:text-primary group-hover:border-primary/20">
              {icon}
            </div>
          )}
        </div>

        {/* ── Value + trend ── */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground leading-none">
            {value}
          </p>
          {trend && trendValue && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums leading-none border",
                TREND_BADGES[trend].badge,
              )}
            >
              <span>{TREND_BADGES[trend].arrow}</span>
              <span>{trendValue}</span>
            </span>
          )}
        </div>

        {/* ── Subtitle ── */}
        {subtitle && <p className="text-xs text-muted-foreground font-medium leading-relaxed">{subtitle}</p>}

        {/* ── Link hint ── */}
        {href && (
          <div className="mt-auto pt-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Lihat detail
            <span className="translate-x-0 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
