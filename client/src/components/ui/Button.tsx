import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "default" | "outline" | "ghost";
type Size = "default" | "sm" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2";

const variants: Record<Variant, string> = {
  default:
    "border border-[var(--primary-border)] bg-primary text-primary-foreground shadow-xs",
  outline:
    "border border-[var(--button-outline)] bg-transparent text-foreground shadow-xs active:shadow-none",
  ghost: "border border-transparent bg-transparent text-foreground",
};

const sizes: Record<Size, string> = {
  default: "min-h-9 px-4 py-2",
  sm: "min-h-8 rounded-md px-3 text-xs",
  icon: "h-9 w-9 p-0",
};

export function Button({
  children,
  variant = "default",
  size = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  children,
  variant = "default",
  size = "default",
  className = "",
}: {
  to: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
