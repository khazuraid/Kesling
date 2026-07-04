import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border border-[hsl(var(--border))] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/30 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90",
        destructive: "bg-[hsl(var(--error))] text-white border-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/90",
        outline:
          "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] bg-transparent hover:bg-[hsl(var(--muted))]/50",
        secondary: "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/70",
        ghost: "border-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
        link: "border-transparent text-[hsl(var(--primary))] underline-offset-4 hover:underline",
        success: "bg-[hsl(var(--success))] text-white border-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90",
        warning: "bg-[hsl(var(--warning))] text-white border-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90",
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
