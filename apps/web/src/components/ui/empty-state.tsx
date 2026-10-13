import type { LucideIcon } from "lucide-react";
import { isValidElement } from "react";

interface EmptyStateProps {
  icon: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const Icon = icon as LucideIcon;
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-16 ${className ?? ""}`}
    >
      {/* Decorative glow */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#00A876] opacity-[0.06] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        {/* Icon stack */}
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-[#0C1B16] flex items-center justify-center text-[#7CF5CE] [&>svg]:w-7 [&>svg]:h-7">
            {isValidElement(icon) ? icon : <Icon />}
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#BEF264] flex items-center justify-center">
            <span className="text-[12px] font-black text-[#06281E] leading-none">0</span>
          </div>
        </div>

        <div>
          <p className="text-[15px] font-extrabold text-[hsl(var(--foreground))]">{title}</p>
          {description && (
            <p className="text-[12px] font-medium text-[hsl(var(--muted-foreground))] mt-1.5 max-w-[320px]">
              {description}
            </p>
          )}
        </div>

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-1 inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
