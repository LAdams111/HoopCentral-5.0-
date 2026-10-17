import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const FIELD_LABELS: Record<string, string> = {
  position: "Position",
  height: "Height",
  weight: "Weight",
  hometown: "Hometown",
  country: "Country",
  birthDate: "Birth date",
  jerseyNumber: "Jersey",
  bio: "Bio",
  note: "Team note",
};

function readProposed(value: ClaimRequest["proposed"] | string | null): Record<string, string> {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

type ClaimRequest = {
  id: number;
  user_email: string | null;
  kind: string;
  player_id: number | null;
  player_name: string | null;
  team_name: string | null;
  status: string;
  proof: string | null;
  proposed: Record<string, string> | null;
  has_photo: boolean | null;
};

function ClaimPhoto({ id, token }: { id: number; token: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let url = "";
    let cancelled = false;
    void fetch(`/api/claims/${id}/photo`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok || cancelled) return;
      url = URL.createObjectURL(await response.blob());
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, token]);

  if (!src) return null;
  return <img src={src} alt="" className="mt-3 h-40 w-40 rounded-xl object-cover" />;
}

export function Admin() {
  const { ready, email, isAdmin, adminChecked, session, signOut, refreshAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: requests = [], isError, isLoading } = useQuery({
    queryKey: ["admin-claims", session?.access_token],
    enabled: Boolean(isAdmin && session?.access_token),
    refetchOnMount: "always",
    refetchInterval: 5000,
    queryFn: async () => {
      const load = (token: string) =>
        fetch("/api/claims", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      let token = session?.access_token ?? "";
      let response = await load(token);
      if (response.status === 401) {
        const next = await refreshAccessToken();
        if (next) response = await load(next);
      }
      if (!response.ok) throw new Error("Could not load requests");
      const body = (await response.json()) as { requests?: ClaimRequest[] };
      return Array.isArray(body.requests) ? body.requests : [];
    },
  });
  const [photoUsed, setPhotoUsed] = useState<number[]>([]);
  const pending = requests.filter((request) => request.status === "pending");
  const approved = requests.filter((request) => request.status === "approved");

  const setStatus = async (id: number, status: "approved" | "denied") => {
    const token = session?.access_token;
    if (!token) return;
    const response = await fetch(`/api/claims/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (response.ok) {
      await queryClient.invalidateQueries({ queryKey: ["admin-claims"] });
    }
  };

  const usePhoto = async (id: number) => {
    const token = session?.access_token;
    if (!token) return;
    const response = await fetch(`/api/claims/${id}/use-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) setPhotoUsed((current) => (current.includes(id) ? current : [...current, id]));
  };

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
              <p className="mt-2 font-display text-4xl font-bold">{isLoading || isError ? "—" : pending.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Claim requests</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Approved</p>
              <p className="mt-2 font-display text-4xl font-bold">{approved.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Marked checked</p>
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
                {isLoading ? "Checking" : isError ? "Could not load" : pending.length === 0 ? "None waiting" : `${pending.length} waiting`}
              </span>
            </div>
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">Loading requests…</div>
            ) : isError ? (
              <div className="px-6 py-16 text-center">
                <p className="font-display text-2xl font-bold">Could not load requests</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Refresh this page. A failed load no longer looks like an empty list.
                </p>
              </div>
            ) : requests.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="font-display text-2xl font-bold">No requests yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Bio changes and proof show up here. Stats are not part of a request.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {requests.map((request) => {
                  const changes = Object.entries(readProposed(request.proposed)).filter(
                    ([key, value]) => FIELD_LABELS[key] && String(value).trim(),
                  );
                  return (
                    <li key={request.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <span>
                          {request.kind === "player" && request.player_id ? (
                            <Link to={`/players/${request.player_id}`} className="block font-display text-lg font-bold hover:text-primary">
                              {request.player_name}
                            </Link>
                          ) : (
                            <span className="block font-display text-lg font-bold">
                              {request.kind === "team" ? request.team_name : request.player_name}
                            </span>
                          )}
                          <span className="block text-xs text-muted-foreground">
                            {request.kind} · {request.user_email ?? "Account"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm">
                        <span className="font-medium">Proof. </span>
                        {request.proof?.trim() ? request.proof : "None sent with this request."}
                      </p>
                      {request.has_photo && session?.access_token ? (
                        <div className="mt-3">
                          <ClaimPhoto id={request.id} token={session.access_token} />
                          {request.kind === "player" && request.player_id ? (
                            <button
                              type="button"
                              onClick={() => void usePhoto(request.id)}
                              disabled={photoUsed.includes(request.id)}
                              className="mt-3 rounded-xl border border-border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground disabled:opacity-60"
                            >
                              {photoUsed.includes(request.id) ? "On the profile" : "Use as profile photo"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {changes.length > 0 ? (
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          {changes.map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{FIELD_LABELS[key]}</dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">No bio changes were included.</p>
                      )}
                      {request.status === "pending" ? (
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void setStatus(request.id, "approved")}
                            className="rounded-xl bg-primary px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void setStatus(request.id, "denied")}
                            className="rounded-xl border border-border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            Deny
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
