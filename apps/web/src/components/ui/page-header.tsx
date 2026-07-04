"use client";

import { cn } from "@/lib/utils";

/* ── PageHeader ─────────────────────────────────────────────────── */

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
    <div className={cn("page-header", className)}>
      {/* ── Left: title block ── */}
      <div className="space-y-2">
        {eyebrow && (
          <div className="eyebrow">
            {icon && <span className="mr-1.5 inline-flex align-middle">{icon}</span>}
            {eyebrow}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle max-w-xl">{description}</p>}
      </div>

      {/* ── Right: action slot ── */}
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
