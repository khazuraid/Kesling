"use client";

import { cn } from "@/lib/utils";

/* ── PageHeader — Tamagui Architecture ─────────────────────────── */

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, icon, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card bg-surface border border-border shadow-subtle p-6 sm:p-7",
        className,
      )}
    >
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              {icon && <span className="inline-flex align-middle text-primary">{icon}</span>}
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main leading-tight">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm font-medium text-text-muted mt-2 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 [&_button]:active:scale-[0.98] [&_button]:transition-transform [&_a]:active:scale-[0.98] [&_a]:transition-transform">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
