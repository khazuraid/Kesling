import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/30 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--primary))] text-white shadow-[0_4px_12px_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_16px_hsl(var(--primary)/0.45)] hover:bg-[hsl(var(--primary))]/90",
        destructive: "bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.35)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.45)] hover:bg-red-600",
        outline: "border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-transparent hover:bg-[hsl(var(--primary))]/5",
        secondary: "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/70",
        ghost: "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline shadow-none",
        success: "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:bg-emerald-600",
        warning: "bg-amber-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)] hover:bg-amber-600",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 px-3.5 text-xs rounded-md",
        lg: "h-12 px-8 text-base rounded-xl",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
