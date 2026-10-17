import { Link } from "react-router-dom";

export function ClaimButton({ to, label = "Claim" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-primary bg-primary px-4 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground"
    >
      {label}
    </Link>
  );
}
