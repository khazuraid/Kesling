"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  /** hero = dark industrial header matching laporan masthead */
  variant?: "default" | "hero";
}

const SIZE_MAP: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-7xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  className,
  variant = "default",
}: ModalProps) {
  const hero = variant === "hero";
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0C1B16]/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />

        {/* Content */}
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100vw-2rem)] border border-[hsl(var(--border))]/30 shadow-2xl bg-[hsl(var(--background))] rounded-3xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out data-[state=open]:fade-in",
            "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
            "max-h-[88vh] flex flex-col overflow-hidden",
            SIZE_MAP[size],
            className,
          )}
        >
          {/* Header */}
          {hero ? (
            <div className="shrink-0 relative overflow-hidden bg-[#0C1B16] text-white px-6 pt-6 pb-5">
              <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-[#00A876] opacity-[0.16]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_20%,#123527_0%,transparent_60%)]" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <span className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#00A876]/20 border border-[#00A876]/30 text-[#7CF5CE] shrink-0">
                      {icon}
                    </span>
                  )}
                  <div className="min-w-0">
                    <Dialog.Title className="text-[17px] tracking-tight font-black text-white truncate">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="text-[11px] font-semibold text-white/50 mt-1 truncate">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                </div>
                <Dialog.Close className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <div className="shrink-0 flex items-start justify-between gap-4 px-6 pt-6 pb-2">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] shrink-0">
                    {icon}
                  </span>
                )}
                <div className="min-w-0">
                  <Dialog.Title className="text-[16px] tracking-tight font-extrabold text-[hsl(var(--foreground))] truncate">
                    {title}
                  </Dialog.Title>
                  {description && (
                    <Dialog.Description className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1 truncate">
                      {description}
                    </Dialog.Description>
                  )}
                </div>
              </div>
              <Dialog.Close className="w-8 h-8 rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 flex items-center gap-2.5 justify-end px-6 py-4 border-t border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
