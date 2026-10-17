import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { getPlayer, getTeam, getTeamRecord, type PlayerStat } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function fieldClassName() {
  return "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
}

function shown(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text || text === "—" || text === "-") return "";
  return text;
}

type StatDraft = {
  id: number;
  season: string;
  team: string;
  gamesPlayed: string;
  points: string;
  rebounds: string;
  assists: string;
  steals: string;
  blocks: string;
  fieldGoal: string;
};

function draftStats(stats: PlayerStat[]): StatDraft[] {
  return stats.map((stat) => ({
    id: stat.id,
    season: stat.season,
    team: stat.team,
    gamesPlayed: stat.gamesPlayed == null || stat.gamesPlayed === 0 ? "" : String(stat.gamesPlayed),
    points: shown(stat.pointsPerGame),
    rebounds: shown(stat.reboundsPerGame),
    assists: shown(stat.assistsPerGame),
    steals: shown(stat.stealsPerGame),
    blocks: shown(stat.blocksPerGame),
    fieldGoal: shown(stat.fieldGoalPct),
  }));
}

function numberOrNull(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  return Number(text);
}

export function AdminEditPlayer() {
  const { id } = useParams();
  const playerId = Number(id);
  const { ready, email, isAdmin, adminChecked, session } = useAuth();
  const queryClient = useQueryClient();
  const playerQuery = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => getPlayer(playerId),
    enabled: Number.isInteger(playerId) && playerId > 0,
  });
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [hometown, setHometown] = useState("");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [jersey, setJersey] = useState("");
  const [bio, setBio] = useState("");
  const [stats, setStats] = useState<StatDraft[]>([]);
  const [filled, setFilled] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const player = playerQuery.data;
    if (!player || filled) return;
    setName(player.name);
    setPosition(shown(player.position));
    setHeight(shown(player.height));
    setWeight(shown(player.weight));
    setHometown(shown(player.hometown));
    setCountry(shown(player.country));
    setBirthDate(player.birthDate?.slice(0, 10) ?? "");
    setJersey(shown(player.jerseyNumber));
    setBio(player.bio ?? "");
    setStats(draftStats(player.stats));
    setFilled(true);
  }, [playerQuery.data, filled]);

  if (!ready || (email && !adminChecked && !isAdmin)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!email) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to={`/players/${playerId}`} replace />;

  const save = async () => {
    const token = session?.access_token;
    if (!token) return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/players/${playerId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          position,
          height,
          weight,
          hometown,
          country,
          birthDate,
          jerseyNumber: jersey,
          bio,
          stats: stats.map((stat) => ({
            id: stat.id,
            gamesPlayed: numberOrNull(stat.gamesPlayed),
            pointsPerGame: numberOrNull(stat.points),
            reboundsPerGame: numberOrNull(stat.rebounds),
            assistsPerGame: numberOrNull(stat.assists),
            stealsPerGame: numberOrNull(stat.steals),
            blocksPerGame: numberOrNull(stat.blocks),
            fieldGoalPct: numberOrNull(stat.fieldGoal),
          })),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setMessage(body?.error?.message || "Could not save.");
        setState("error");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      setState("saved");
    } catch {
      setMessage("Could not save.");
      setState("error");
    }
  };

  const setStat = (statId: number, key: keyof StatDraft, value: string) => {
    setStats((current) => current.map((stat) => (stat.id === statId ? { ...stat, [key]: value } : stat)));
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link to={`/players/${playerId}`} className="font-mono text-xs uppercase tracking-wide text-primary">
        Back to profile
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight">Edit player</h1>
      <p className="mt-2 text-sm text-muted-foreground">Only your admin login can save this. Confirm writes it to the site.</p>
      {state === "saved" ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-display text-2xl font-bold">Saved</p>
          <Link to={`/players/${playerId}`} className="mt-3 inline-block text-sm text-primary">
            View the profile
          </Link>
        </section>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Name
              <input className={fieldClassName()} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block text-sm">
              Position
              <input className={fieldClassName()} value={position} onChange={(event) => setPosition(event.target.value)} />
            </label>
            <label className="block text-sm">
              Jersey
              <input className={fieldClassName()} value={jersey} onChange={(event) => setJersey(event.target.value)} />
            </label>
            <label className="block text-sm">
              Height
              <input className={fieldClassName()} value={height} onChange={(event) => setHeight(event.target.value)} placeholder={`6'7"`} />
            </label>
            <label className="block text-sm">
              Weight
              <input className={fieldClassName()} value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="210 lbs" />
            </label>
            <label className="block text-sm">
              Hometown
              <input className={fieldClassName()} value={hometown} onChange={(event) => setHometown(event.target.value)} />
            </label>
            <label className="block text-sm">
              Country
              <input className={fieldClassName()} value={country} onChange={(event) => setCountry(event.target.value)} />
            </label>
            <label className="block text-sm">
              Birth date
              <input type="date" className={fieldClassName()} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </label>
            <label className="block text-sm sm:col-span-2">
              Bio
              <textarea className={`${fieldClassName()} min-h-28`} value={bio} onChange={(event) => setBio(event.target.value)} />
            </label>
          </div>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Season stats</h2>
            {stats.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">This player has no season stat rows yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {stats.map((stat) => (
                  <div key={stat.id} className="rounded-xl border border-border p-4">
                    <p className="font-display text-lg font-bold">
                      {stat.season} · {stat.team}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(
                        [
                          ["gamesPlayed", "Games"],
                          ["points", "Points"],
                          ["rebounds", "Rebounds"],
                          ["assists", "Assists"],
                          ["steals", "Steals"],
                          ["blocks", "Blocks"],
                          ["fieldGoal", "FG%"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="block text-xs">
                          {label}
                          <input className={fieldClassName()} value={stat[key]} onChange={(event) => setStat(stat.id, key, event.target.value)} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <button
            type="submit"
            disabled={state === "saving" || !name.trim()}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Confirm"}
          </button>
        </form>
      )}
    </div>
  );
}

export function AdminEditTeam() {
  const { id } = useParams();
  const teamId = Number(id);
  const [params] = useSearchParams();
  const slug = params.get("slug") ?? "";
  const season = params.get("season") ?? "";
  const league = params.get("league") ?? "";
  const { ready, email, isAdmin, adminChecked, session } = useAuth();
  const queryClient = useQueryClient();
  const teamQuery = useQuery({
    queryKey: ["team", slug],
    queryFn: () => getTeam(slug),
    enabled: Boolean(slug),
  });
  const recordQuery = useQuery({
    queryKey: ["team-record", slug, season, league],
    queryFn: () => getTeamRecord(slug, season, league || undefined),
    enabled: Boolean(slug && season),
  });
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [wins, setWins] = useState("");
  const [losses, setLosses] = useState("");
  const [filled, setFilled] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (filled || !teamQuery.data) return;
    setName(teamQuery.data.name);
    setAbbreviation(teamQuery.data.abbreviation);
    setFilled(true);
  }, [teamQuery.data, filled]);

  useEffect(() => {
    if (!recordQuery.data) return;
    setWins(String(recordQuery.data.wins));
    setLosses(String(recordQuery.data.losses));
  }, [recordQuery.data]);

  if (!ready || (email && !adminChecked && !isAdmin)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!email) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const save = async () => {
    const token = session?.access_token;
    if (!token) return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          abbreviation,
          season,
          wins: numberOrNull(wins),
          losses: numberOrNull(losses),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setMessage(body?.error?.message || "Could not save.");
        setState("error");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["team", slug] });
      await queryClient.invalidateQueries({ queryKey: ["team-record", slug, season, league] });
      await queryClient.invalidateQueries({ queryKey: ["team-roster"] });
      setState("saved");
    } catch {
      setMessage("Could not save.");
      setState("error");
    }
  };

  const back = slug && season
    ? `/roster/${encodeURIComponent(slug)}/${encodeURIComponent(season)}${league ? `?league=${encodeURIComponent(league)}` : ""}`
    : "/";

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link to={back} className="font-mono text-xs uppercase tracking-wide text-primary">
        Back to team
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight">Edit team</h1>
      <p className="mt-2 text-sm text-muted-foreground">Only your admin login can save this.</p>
      {state === "saved" ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-display text-2xl font-bold">Saved</p>
          <Link to={back} className="mt-3 inline-block text-sm text-primary">
            View the team
          </Link>
        </section>
      ) : (
        <form
          className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="block text-sm">
            Name
            <input className={fieldClassName()} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-sm">
            Abbreviation
            <input className={fieldClassName()} value={abbreviation} onChange={(event) => setAbbreviation(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              Wins {season ? `(${season})` : ""}
              <input className={fieldClassName()} value={wins} onChange={(event) => setWins(event.target.value)} />
            </label>
            <label className="block text-sm">
              Losses
              <input className={fieldClassName()} value={losses} onChange={(event) => setLosses(event.target.value)} />
            </label>
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <button
            type="submit"
            disabled={state === "saving" || !name.trim()}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Confirm"}
          </button>
        </form>
      )}
    </div>
  );
}
