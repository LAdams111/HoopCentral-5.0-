import { FormEvent, useState, type ReactNode } from "react";

const UNLOCK_KEY = "hc-site-open";
const PASSWORD = "9999";

function alreadyOpen(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function SiteLock({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(alreadyOpen);
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);

  if (open) return children;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password.trim() === PASSWORD) {
      try {
        localStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        // Still open this visit if storage is blocked.
      }
      setOpen(true);
      return;
    }
    setWrong(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <h1 className="text-5xl tracking-widest">
          HOOP<span className="text-primary">CENTRAL</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Enter the password to view the site.</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setWrong(false);
          }}
          className="mt-6 w-full rounded-md border border-border bg-card px-3 py-3 text-lg outline-none focus:ring-2 focus:ring-ring"
          placeholder="Password"
        />
        {wrong ? <p className="mt-2 text-sm text-destructive">Wrong password.</p> : <p className="mt-2 h-5" />}
        <button
          type="submit"
          className="mt-2 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
