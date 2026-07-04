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
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[hsl(var(--background))]/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />

        {/* Content */}
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100vw-2rem)] border border-[hsl(var(--border))]/30 shadow-2xl bg-[hsl(var(--background))] rounded-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out data-[state=open]:fade-in",
            "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
            "max-h-[85vh] flex flex-col overflow-hidden",
            SIZE_MAP[size],
            className,
          )}
        >
          {/* Header */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 flex items-center gap-3 justify-end px-6 py-4 bg-[hsl(var(--muted))]/30">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
