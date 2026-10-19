import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary hover:bg-primary-hover text-white border border-primary shadow-xs font-semibold",
        destructive: "bg-error hover:bg-error/90 text-white border border-error shadow-xs",
        outline: "border border-border bg-surface text-foreground hover:bg-surface-subtle hover:border-border-hover",
        secondary: "border border-border/60 bg-surface-subtle text-foreground hover:bg-border/60",
        ghost: "border border-transparent text-foreground hover:bg-surface-subtle",
        link: "border border-transparent text-primary underline-offset-4 hover:underline cursor-pointer",
        success: "bg-success hover:bg-success/90 text-white border border-success shadow-xs",
        warning: "bg-warning hover:bg-warning/90 text-white border border-warning shadow-xs",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
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
