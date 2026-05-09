import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[color:var(--color-accent)] text-black font-medium hover:opacity-90",
  secondary:
    "bg-[color:var(--color-surface-2)] text-[color:var(--color-text)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)]",
  ghost:
    "bg-transparent text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-2)]",
  danger:
    "bg-[color:var(--color-error)] text-black font-medium hover:opacity-90",
} as const;

type Variant = keyof typeof variants;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          className,
        )}
        {...rest}
      />
    );
  },
);
