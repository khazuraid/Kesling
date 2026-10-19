import type { LucideIcon } from "lucide-react";
import { isValidElement } from "react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "relative overflow-hidden rounded-card bg-surface border border-border shadow-subtle p-10 sm:p-14 text-center",
        className,
      )}
    >
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        {/* Icon stack */}
        <div className="w-14 h-14 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted [&>svg]:w-7 [&>svg]:h-7 mb-1">
          {isValidElement(icon) ? icon : <Icon />}
        </div>

        <div>
          <p className="text-[15px] font-extrabold text-text-main">{title}</p>
          {description && (
            <p className="text-xs font-medium text-text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>
          )}
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex items-center justify-center gap-2 h-9 px-5 rounded-button bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all shadow-xs cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
