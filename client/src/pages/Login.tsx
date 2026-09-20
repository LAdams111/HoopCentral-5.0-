import { LogIn } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";

export type LoginRole = "player" | "parent" | "coach" | "scout";

const ROLES: { id: LoginRole; label: string }[] = [
  { id: "player", label: "Player" },
  { id: "parent", label: "Parent" },
  { id: "coach", label: "Coach" },
  { id: "scout", label: "Scout" },
];

function parseRole(value: string | null): LoginRole {
  if (value === "parent" || value === "coach" || value === "scout") return value;
  return "player";
}

export function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useMemo(() => parseRole(searchParams.get("role")), [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];

  const selectRole = (next: LoginRole) => {
    setSearchParams({ role: next }, { replace: true });
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-24">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <BackButton fallback="/" className="mb-8" />

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-6 py-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              <LogIn className="h-3.5 w-3.5" />
              Account
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Log in</h1>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-border p-4 sm:grid-cols-4">
            {ROLES.map((item) => {
              const selected = item.id === role;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectRole(item.id)}
                  className={`rounded-xl border px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide transition-colors sm:text-[11px] ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 pb-6">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {submitted ? (
              <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                Sign-in for {activeRole.label.toLowerCase()} accounts is coming soon. Your credentials
                were not sent anywhere yet.
              </p>
            ) : null}

            <button
              type="submit"
              className="hover-elevate w-full rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground"
            >
              Log in as {activeRole.label}
            </button>

            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-border bg-muted/40 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-foreground underline decoration-primary/60 underline-offset-4 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              Create account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
