import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { getPlayer } from "@/lib/api";
import { Admin } from "@/pages/Admin";
import { useAuth, type LoginRole } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { onHeadshotError, resolvePlayerHeadshot } from "@/lib/headshot";

type ClaimedPlayer = {
  id: number;
  name: string;
  position: string;
  headshotUrl: string;
  team: string;
};

type ClaimGame = {
  date: string | null;
  opponent: string;
  homeAway: string;
  result: string | null;
  minutes: string | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
};

type ClaimDashboardPlayer = ClaimedPlayer & {
  hometown: string;
  height: string;
  weight: string;
  profileViews: number;
  weeklyViews: number;
  games: ClaimGame[];
};

function gameStat(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function gameDate(value: string | null): string {
  if (!value) return "Date not listed";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ClaimDashboard({ player }: { player: ClaimDashboardPlayer }) {
  const details = [player.team, player.position, player.height, player.weight, player.hometown].filter(Boolean);
  return (
    <article className="mb-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to={`/players/${player.id}`} className="flex min-w-0 items-center gap-3 transition-colors hover:text-primary">
          <img
            src={resolvePlayerHeadshot(player.headshotUrl)}
            alt=""
            className="h-16 w-16 rounded-full object-cover object-top"
            onError={onHeadshotError}
          />
          <span>
            <span className="block font-display text-2xl font-bold leading-none">{player.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{details.join(" · ") || "Claimed player"}</span>
          </span>
        </Link>
        <div className="rounded-xl border border-primary/30 px-4 py-3 text-right">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Views this week</p>
          <p className="font-display text-3xl font-bold leading-none text-primary">{player.weeklyViews.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{player.profileViews.toLocaleString()} all time</p>
        </div>
      </div>
      <h3 className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Last 5 games</h3>
      {player.games.length === 0 ? (
        <p className="text-sm text-muted-foreground">No games on this profile yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {player.games.map((game, index) => (
            <li key={`${game.date ?? "game"}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
              <span>
                <span className="font-medium">{gameDate(game.date)}</span>
                <span className="text-muted-foreground"> {`${game.homeAway}${game.opponent}`.trim()}</span>
                {game.result ? <span className="text-muted-foreground"> · {game.result}</span> : null}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {gameStat(game.points)} PTS · {gameStat(game.rebounds)} REB · {gameStat(game.assists)} AST
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={`/players/${player.id}/claim?edit=player`}
        className="mt-4 inline-flex rounded-xl border border-primary/40 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary"
      >
        Request an edit
      </Link>
    </article>
  );
}

const ROLE_LABELS: Record<LoginRole, string> = {
  player: "Player",
  parent: "Parent",
  coach: "Coach",
  scout: "Scout",
  fan: "General",
};

export function Account() {
  const { ready, email, role, session, isAdmin, adminChecked, signOut } = useAuth();
  const claimedPlayers = useQuery({
    queryKey: ["claimed-players", session?.user.id],
    enabled: Boolean(session?.access_token),
    queryFn: async () => {
      const response = await fetch("/api/claims/mine", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        cache: "no-store",
      });
      if (!response.ok) return { players: [] as ClaimedPlayer[], pending: 0 };
      return (await response.json()) as { players: ClaimedPlayer[]; pending: number };
    },
  });
  const showClaimDashboard = (role === "player" || role === "parent") && Boolean(claimedPlayers.data?.players.length);
  const claimDashboard = useQuery({
    queryKey: ["claim-dashboard", session?.user.id],
    enabled: showClaimDashboard && Boolean(session?.access_token),
    queryFn: async () => {
      const response = await fetch("/api/claims/mine/dashboard", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        cache: "no-store",
      });
      if (!response.ok) return { players: [] as ClaimDashboardPlayer[] };
      return (await response.json()) as { players: ClaimDashboardPlayer[] };
    },
  });
  const claimedTeams = useQuery({
    queryKey: ["coach-teams", session?.user.id],
    enabled: role === "coach" && Boolean(session?.access_token),
    queryFn: async () => {
      const response = await fetch("/api/coach/teams", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        cache: "no-store",
      });
      if (!response.ok) return { teams: [] as { slug: string; name: string; leagueSlug: string; leagueName: string }[] };
      return (await response.json()) as { teams: { slug: string; name: string; leagueSlug: string; leagueName: string }[] };
    },
  });
  const { players: favoritePlayers, teams: favoriteTeams, isLoading: storedFavoritesLoading } = useFavorites();

  const playerQueries = useQueries({
    queries: favoritePlayers.map((player) => ({
      queryKey: ["player", player.id],
      queryFn: () => getPlayer(player.id),
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

  if (isAdmin || !adminChecked) {
    if (!adminChecked && !isAdmin) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }
    if (isAdmin) return <Admin />;
  }

  const players = favoritePlayers.map((player, index) => {
    const loaded = playerQueries[index]?.data;
    return loaded ?? { ...player, team: "", position: "" };
  });
  const favoritesLoading = storedFavoritesLoading || playerQueries.some((query) => query.isLoading);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Account</p>
        <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
          {ROLE_LABELS[role]} <span className="text-primary">Profile</span>
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
              Approved teams show up under Claim a team. Open one to edit that roster.
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

        {(role === "player" || role === "parent") && claimedPlayers.isLoading ? (
          <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Loading your player…</p>
          </section>
        ) : showClaimDashboard ? (
          <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-display text-xl font-bold uppercase tracking-wide">Your player</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This stays on this account. Weekly views count page visits from the last seven days.
            </p>
            {claimDashboard.isLoading ? <p className="text-sm text-muted-foreground">Loading your player…</p> : null}
            {claimDashboard.data?.players.map((player) => <ClaimDashboard key={player.id} player={player} />)}
            {claimedPlayers.data?.pending ? (
              <p className="mb-4 text-sm text-muted-foreground">
                {claimedPlayers.data.pending === 1
                  ? "1 player claim is waiting for approval."
                  : `${claimedPlayers.data.pending} player claims are waiting for approval.`}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-display text-xl font-bold uppercase tracking-wide">Claim a player</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Search for the player page and claim it as yours. A photo of a government-issued ID is required.
              Once it is approved, that player stays on this profile. Only this account can see it here.
            </p>
            {role === "coach" || role === "scout" || role === "fan" ? (
              claimedPlayers.data?.players.length ? (
                <ul className="mb-4 divide-y divide-border">
                  {claimedPlayers.data.players.map((player) => (
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
                            {[player.team, player.position].filter(Boolean).join(" · ") || "Claimed player"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null
            ) : null}
            {claimedPlayers.data?.pending ? (
              <p className="mb-4 text-sm text-muted-foreground">
                {claimedPlayers.data.pending === 1
                  ? "1 player claim is waiting for approval."
                  : `${claimedPlayers.data.pending} player claims are waiting for approval.`}
              </p>
            ) : null}
            <Link
              to="/search?claim=player"
              className="inline-flex rounded-xl border border-primary/40 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
            >
              Claim a player
            </Link>
          </section>
        )}

        {role === "coach" ? (
          <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-display text-xl font-bold uppercase tracking-wide">Claim a team</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Search for the team page and claim it as yours. A photo of a government-issued ID is required.
              Approved teams stay on this profile.
            </p>
            {claimedTeams.data?.teams.length ? (
              <div className="mb-4 space-y-2">
                {claimedTeams.data.teams.map((team) => (
                  <Link
                    key={`${team.leagueSlug}:${team.slug}`}
                    to={`/coach/team/${encodeURIComponent(team.slug)}?league=${encodeURIComponent(team.leagueSlug)}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <span>
                      <span className="block font-display text-lg font-bold uppercase tracking-tight">{team.name}</span>
                      <span className="text-xs text-muted-foreground">{team.leagueName}</span>
                    </span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">Open</span>
                  </Link>
                ))}
              </div>
            ) : null}
            <Link
              to="/search?claim=team"
              className="inline-flex rounded-xl border border-primary/40 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
            >
              Claim a team
            </Link>
          </section>
        ) : null}

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
                <li key={`${team.leagueSlug ?? ""}:${team.slug}`}>
                  <Link
                    to={`/teams/${encodeURIComponent(team.slug)}`}
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {team.name}
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
