import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { getPlayer } from "@/lib/api";
import { useAuth, type LoginRole } from "@/lib/auth";
import { onHeadshotError, resolvePlayerHeadshot } from "@/lib/headshot";

const FAVORITES_KEY = "hoopcentral-favorites";
const PLAYER_FAVORITES_KEY = "player_favorites";
const TEAM_FAVORITES_KEY = "team_favorites";

const ROLE_LABELS: Record<LoginRole, string> = {
  player: "Player",
  parent: "Parent",
  coach: "Coach",
  scout: "Scout",
  fan: "General",
};

function readFavoritePlayerIds(): number[] {
  const ids = new Set<number>();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        const num = Number(id);
        if (Number.isInteger(num)) ids.add(num);
      }
    }
  } catch {
    /* ignore broken local favorites */
  }
  try {
    const raw = localStorage.getItem(PLAYER_FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === "object" && "id" in item) {
          const num = Number((item as { id: unknown }).id);
          if (Number.isInteger(num)) ids.add(num);
        }
      }
    }
  } catch {
    /* ignore broken local favorites */
  }
  return [...ids];
}

function readFavoriteTeams(): string[] {
  try {
    const raw = localStorage.getItem(TEAM_FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((team): team is string => typeof team === "string" && team.trim().length > 0);
  } catch {
    return [];
  }
}

export function Account() {
  const { ready, email, role, signOut } = useAuth();
  const favoriteIds = useMemo(() => readFavoritePlayerIds(), []);
  const favoriteTeams = useMemo(() => readFavoriteTeams(), []);
  const playerQueries = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: ["player", id],
      queryFn: () => getPlayer(id),
    })),
  });

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const players = playerQueries.flatMap((query) => (query.data ? [query.data] : []));
  const favoritesLoading = playerQueries.some((query) => query.isLoading);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Account</p>
        <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
          Your <span className="text-primary">Profile</span>
        </h1>

        <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">About you</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-mono text-xs uppercase text-muted-foreground">Email</dt>
              <dd className="text-right">{email}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-mono text-xs uppercase text-muted-foreground">Account</dt>
              <dd>{ROLE_LABELS[role]}</dd>
            </div>
          </dl>
          {role === "coach" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Coach accounts can sign in. Entering players and stats stays off until you are approved.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 rounded-xl border border-border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Log out
          </button>
        </section>

        <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Favorite players</h2>
          {favoritesLoading ? (
            <p className="text-sm text-muted-foreground">Loading favorites…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Players you favorite on their page will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {players.map((player) => (
                <li key={player.id}>
                  <Link
                    to={`/players/${player.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                  >
                    <img
                      src={resolvePlayerHeadshot(player.headshotUrl)}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover object-top"
                      onError={onHeadshotError}
                    />
                    <span>
                      <span className="block font-display text-lg font-bold leading-tight">{player.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[player.team, player.position].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Favorite teams</h2>
          {favoriteTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Teams you favorite will show up here.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {favoriteTeams.map((team) => (
                <li key={team}>
                  <Link
                    to={`/players?q=${encodeURIComponent(team)}`}
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {team}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
