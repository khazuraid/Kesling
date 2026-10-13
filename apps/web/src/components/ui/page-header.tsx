"use client";

import { cn } from "@/lib/utils";

/* ── PageHeader — hero gelap warm-industrial ───────────────────── */

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
    <div className={cn("relative overflow-hidden rounded-3xl bg-[#0C1B16] text-white px-8 py-7", className)}>
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#00A876] opacity-[0.14]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#123527_0%,transparent_60%)]" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2 flex items-center gap-1.5">
              {icon && <span className="inline-flex align-middle">{icon}</span>}
              {eyebrow}
            </p>
          )}
          <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">{title}</h1>
          {description && <p className="text-[13px] font-medium text-white/50 mt-2">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
