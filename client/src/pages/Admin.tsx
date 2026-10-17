import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type ClaimRequest = {
  id: number;
  user_email: string | null;
  kind: string;
  player_name: string | null;
  team_name: string | null;
  status: string;
};

export function Admin() {
  const { ready, email, isAdmin, adminChecked, session, signOut } = useAuth();
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-claims", session?.access_token],
    enabled: Boolean(isAdmin && session?.access_token),
    queryFn: async () => {
      const response = await fetch("/api/claims", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (!response.ok) return [];
      const body = (await response.json()) as { requests?: ClaimRequest[] };
      return body.requests ?? [];
    },
  });
  const pending = requests.filter((request) => request.status === "pending");

  if (!ready || (email && !isAdmin && !adminChecked)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-start gap-6 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Your account</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 break-all text-sm text-muted-foreground">{email}</p>
          <nav className="mt-6 space-y-1">
            <div className="rounded-xl bg-primary/10 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-primary">
              Claim requests
            </div>
          </nav>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 w-full rounded-xl border border-border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Log out
          </button>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pending</p>
              <p className="mt-2 font-display text-4xl font-bold">{pending.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Claim requests</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Approved</p>
              <p className="mt-2 font-display text-4xl font-bold">0</p>
              <p className="mt-1 text-sm text-muted-foreground">Players linked</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Access</p>
              <p className="mt-2 flex items-center gap-2 font-display text-2xl font-bold">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Admin
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Only this login</p>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Claim requests</h2>
              </div>
              <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {pending.length === 0 ? "None waiting" : `${pending.length} waiting`}
              </span>
            </div>
            {requests.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="font-display text-2xl font-bold">No requests yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  When a player or parent asks to claim a profile, the request will show here for you to approve or deny. Bio edits stay off until you approve. Stats stay off this page.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {requests.map((request) => (
                  <li key={request.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <span>
                      <span className="block font-display text-lg font-bold">
                        {request.kind === "team" ? request.team_name : request.player_name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {request.kind} · {request.user_email ?? "Account"}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {request.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
