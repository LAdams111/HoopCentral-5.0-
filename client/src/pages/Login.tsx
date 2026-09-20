import { LogIn, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";

export type LoginRole = "player" | "parent" | "coach" | "scout" | "fan";

type AuthMode = "login" | "signup";

const SPECIALIZED_ROLES: { id: LoginRole; label: string }[] = [
  { id: "player", label: "Player" },
  { id: "parent", label: "Parent" },
  { id: "coach", label: "Coach" },
  { id: "scout", label: "Scout" },
];

const GENERAL_ROLE: { id: LoginRole; label: string; description: string } = {
  id: "fan",
  label: "General",
  description: "Browse stats and follow teams — not tied to a roster role.",
};

function parseRole(value: string | null): LoginRole {
  if (
    value === "parent" ||
    value === "coach" ||
    value === "scout" ||
    value === "fan"
  ) {
    return value;
  }
  return "player";
}

function parseMode(value: string | null): AuthMode {
  return value === "signup" ? "signup" : "login";
}

function roleLabel(role: LoginRole): string {
  if (role === "fan") return GENERAL_ROLE.label;
  return SPECIALIZED_ROLES.find((r) => r.id === role)?.label ?? "Player";
}

export function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useMemo(() => parseRole(searchParams.get("role")), [searchParams]);
  const mode = useMemo(() => parseMode(searchParams.get("mode")), [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const activeLabel = roleLabel(role);

  const updateParams = (next: Partial<{ role: LoginRole; mode: AuthMode }>) => {
    const params = new URLSearchParams(searchParams);
    if (next.role !== undefined) params.set("role", next.role);
    if (next.mode !== undefined) params.set("mode", next.mode);
    setSearchParams(params, { replace: true });
    setSubmitted(false);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (isSignup && password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-24">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <BackButton fallback="/" className="mb-8" />

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-6 py-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              {isSignup ? (
                <UserPlus className="h-3.5 w-3.5" />
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              Account
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {isSignup ? "Create account" : "Log in"}
            </h1>
          </div>

          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => updateParams({ mode: "login" })}
              className={`flex-1 py-3 text-center font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                !isSignup
                  ? "border-b-2 border-primary bg-primary/5 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => updateParams({ mode: "signup" })}
              className={`flex-1 py-3 text-center font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                isSignup
                  ? "border-b-2 border-primary bg-primary/5 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="space-y-3 border-b border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Basketball role
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPECIALIZED_ROLES.map((item) => {
                const selected = item.id === role;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateParams({ role: item.id })}
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
            <button
              type="button"
              onClick={() => updateParams({ role: "fan" })}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                role === "fan"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/20 hover:border-primary/30"
              }`}
            >
              <span
                className={`block font-display text-sm font-bold uppercase tracking-wide ${
                  role === "fan" ? "text-primary" : "text-foreground"
                }`}
              >
                {GENERAL_ROLE.label} account
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {GENERAL_ROLE.description}
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 pb-6">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground"
              >
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
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {isSignup ? (
              <div>
                <label
                  htmlFor="login-confirm-password"
                  className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground"
                >
                  Confirm password
                </label>
                <input
                  id="login-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ) : null}

            {validationError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {validationError}
              </p>
            ) : null}

            {submitted ? (
              <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                {isSignup ? "Account creation" : "Sign-in"} for{" "}
                {role === "fan" ? "general" : activeLabel.toLowerCase()} accounts is coming soon.
                Nothing was saved and your credentials were not sent anywhere.
              </p>
            ) : null}

            <button
              type="submit"
              className="hover-elevate w-full rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground"
            >
              {isSignup ? `Create ${activeLabel} account` : `Log in as ${activeLabel}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
