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
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />

        {/* Content */}
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100vw-2rem)] rounded-card border border-border shadow-float bg-surface",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2 duration-200",
            "max-h-[90vh] flex flex-col overflow-hidden",
            SIZE_MAP[size],
            className,
          )}
        >
          {/* Header */}
          {hero ? (
            <div className="shrink-0 relative overflow-hidden bg-dock text-white px-6 pt-5 pb-5 border-b border-dock-border">
              <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-primary opacity-20 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_20%,rgba(5,150,105,0.15)_0%,transparent_60%)] pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <span className="w-10 h-10 flex items-center justify-center rounded-button bg-primary/20 border border-primary/30 text-accent shrink-0">
                      {icon}
                    </span>
                  )}
                  <div className="min-w-0">
                    <Dialog.Title className="text-base sm:text-lg tracking-tight font-extrabold text-white truncate">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="text-xs text-white/60 mt-0.5 truncate">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                </div>
                <Dialog.Close className="w-8 h-8 rounded-button flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <div className="shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border bg-surface">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <span className="w-10 h-10 flex items-center justify-center rounded-button bg-primary-subtle text-primary border border-primary/20 shrink-0">
                    {icon}
                  </span>
                )}
                <div className="min-w-0">
                  <Dialog.Title className="text-base sm:text-lg tracking-tight font-bold text-foreground truncate">
                    {title}
                  </Dialog.Title>
                  {description ? (
                    <Dialog.Description className="text-xs text-muted-foreground mt-0.5 truncate">
                      {description}
                    </Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  )}
                </div>
              </div>
              <Dialog.Close className="w-8 h-8 rounded-button flex items-center justify-center text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors shrink-0 cursor-pointer">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 flex items-center gap-2.5 justify-end px-6 py-3.5 border-t border-border bg-surface-subtle/50">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
