import type { ReactNode } from "react";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center whitespace-nowrap rounded-md border border-[var(--badge-outline)] px-2.5 py-0.5 font-semibold shadow-xs transition-colors hover-elevate focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  );
}
