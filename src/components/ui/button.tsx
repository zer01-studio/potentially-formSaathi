import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-lift",
  secondary:
    "border border-border-strong bg-card/80 text-foreground hover:-translate-y-0.5 hover:bg-muted",
  ghost: "text-foreground/75 hover:bg-muted hover:text-foreground",
  accent:
    "bg-accent text-accent-foreground shadow-soft hover:-translate-y-0.5 hover:brightness-105 hover:shadow-lift",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonStyles(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium",
    "transition-[transform,background-color,color,box-shadow,border-color] duration-200 ease-out",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    variantClasses[options?.variant ?? "primary"],
    sizeClasses[options?.size ?? "md"],
    options?.className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
