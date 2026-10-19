"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-xs", className)}
      {...props}
    />
  ),
);
SheetOverlay.displayName = "SheetOverlay";

const SheetContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "left" | "right" }
>(({ className, children, side = "left", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 h-full bg-surface border-border text-foreground shadow-float transition-transform",
        side === "left" ? "left-0 top-0 w-64 border-r" : "right-0 top-0 w-64 border-l",
        className,
      )}
      {...props}
    >
      <DialogPrimitive.Title className="sr-only">Navigasi Panel</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">Menu panel samping</DialogPrimitive.Description>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-button p-1 text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition-colors">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

export { Sheet, SheetClose, SheetContent, SheetTrigger };
