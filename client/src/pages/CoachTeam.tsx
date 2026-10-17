import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type CoachPlayer = {
  id: number;
  name: string;
  position: string;
  jerseyNumber: string;
  height: string;
  weight: string;
  hometown: string;
  country: string;
  birthDate: string;
  gamesPlayed: number | null;
  pointsPerGame: string | null;
  reboundsPerGame: string | null;
  assistsPerGame: string | null;
};

type CoachDashboard = {
  team: {
    id: number;
    name: string;
    slug: string;
    abbreviation: string;
    leagueSlug: string;
    leagueName: string;
  };
  season: string;
  seasons: string[];
  record: { wins: number | null; losses: number | null };
  players: CoachPlayer[];
};

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

async function coachFetch(token: string, path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || "Could not update the team");
  }
  return response;
}

export function CoachTeam() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const league = params.get("league") ?? "";
  const season = params.get("season") ?? "";
  const { ready, email, session } = useAuth();
  const token = session?.access_token ?? "";
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["coach-team", slug, league, season, token],
    enabled: Boolean(email && token && slug),
    queryFn: async () => {
      const search = new URLSearchParams();
      if (league) search.set("league", league);
      if (season) search.set("season", season);
      const response = await coachFetch(token, `/api/coach/teams/${encodeURIComponent(slug)}?${search.toString()}`);
      return (await response.json()) as CoachDashboard;
    },
  });

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!email) return <Navigate to="/login" replace />;

  const data = query.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["coach-team", slug] });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-24">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/profile" className="font-mono text-xs uppercase tracking-wide text-primary">
          Back to profile
        </Link>
        {query.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading team…</p>
        ) : query.isError || !data ? (
          <p className="mt-8 text-sm text-destructive">{query.error instanceof Error ? query.error.message : "This team is not on your account."}</p>
        ) : (
          <Dashboard key={`${data.team.slug}-${data.season}`} data={data} token={token} onChange={refresh} setSeason={(next) => {
            const updated = new URLSearchParams(params);
            updated.set("league", data.team.leagueSlug);
            if (next) updated.set("season", next);
            setParams(updated, { replace: true });
          }} />
        )}
      </div>
    </div>
  );
}

function Dashboard({
  data,
  token,
  onChange,
  setSeason,
}: {
  data: CoachDashboard;
  token: string;
  onChange: () => void;
  setSeason: (season: string) => void;
}) {
  const [name, setName] = useState(data.team.name);
  const [abbreviation, setAbbreviation] = useState(data.team.abbreviation);
  const [wins, setWins] = useState(data.record.wins == null ? "" : String(data.record.wins));
  const [losses, setLosses] = useState(data.record.losses == null ? "" : String(data.record.losses));
  const [year, setYear] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const publicRoster = data.season
    ? `/roster/${encodeURIComponent(data.team.name)}/${encodeURIComponent(data.season)}?league=${encodeURIComponent(data.team.leagueSlug)}`
    : `/teams/${encodeURIComponent(data.team.slug)}`;

  const saveTeam = async () => {
    setSaving(true);
    setMessage("");
    try {
      await coachFetch(token, `/api/coach/teams/${encodeURIComponent(data.team.slug)}`, {
        method: "PATCH",
        body: JSON.stringify({
          leagueSlug: data.team.leagueSlug,
          season: data.season,
          name,
          abbreviation,
          wins,
          losses,
        }),
      });
      setMessage("Team page saved.");
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the team.");
    } finally {
      setSaving(false);
    }
  };

  const addSeason = async () => {
    setMessage("");
    try {
      await coachFetch(token, `/api/coach/teams/${encodeURIComponent(data.team.slug)}/seasons`, {
        method: "POST",
        body: JSON.stringify({ leagueSlug: data.team.leagueSlug, season: year }),
      });
      setYear("");
      setSeason(year);
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add that season.");
    }
  };

  return (
    <>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{data.team.leagueName}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight md:text-6xl">{data.team.name}</h1>
        <Link to={publicRoster} className="font-mono text-xs uppercase tracking-wide text-primary">
          View public page
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="block text-sm">
            Season
            <select
              className={`${inputClass} mt-1 min-w-40`}
              value={data.season}
              onChange={(event) => setSeason(event.target.value)}
            >
              {data.seasons.length === 0 ? <option value="">No season yet</option> : null}
              {data.seasons.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <label className="block text-sm">
              Add a year
              <input className={`${inputClass} mt-1 w-32`} placeholder="2025-26" value={year} onChange={(event) => setYear(event.target.value)} />
            </label>
            <button type="button" onClick={() => void addSeason()} className="h-10 rounded-xl border border-border px-3 font-mono text-[10px] font-semibold uppercase tracking-wide">
              Add
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <label className="block text-sm sm:col-span-2">
            Team name
            <input className={`${inputClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-sm">
            Abbreviation
            <input className={`${inputClass} mt-1`} value={abbreviation} onChange={(event) => setAbbreviation(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              Wins
              <input className={`${inputClass} mt-1`} value={wins} onChange={(event) => setWins(event.target.value)} />
            </label>
            <label className="block text-sm">
              Losses
              <input className={`${inputClass} mt-1`} value={losses} onChange={(event) => setLosses(event.target.value)} />
            </label>
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveTeam()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save team page"}
        </button>
        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight">Roster</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.players.length} player{data.players.length === 1 ? "" : "s"} in {data.season || "this season"}.
        </p>
        <div className="mt-4 space-y-3">
          {data.players.map((player) => (
            <PlayerCard key={player.id} player={player} team={data.team} season={data.season} token={token} onChange={onChange} />
          ))}
          {data.players.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              No players on this roster yet.
            </p>
          ) : null}
        </div>
      </section>

      <AddPlayer team={data.team} season={data.season} token={token} onChange={onChange} />
    </>
  );
}

function PlayerCard({
  player,
  team,
  season,
  token,
  onChange,
}: {
  player: CoachPlayer;
  team: CoachDashboard["team"];
  season: string;
  token: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(player);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof CoachPlayer, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await coachFetch(token, `/api/coach/teams/${encodeURIComponent(team.slug)}/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, leagueSlug: team.leagueSlug, season }),
      });
      setMessage("Saved.");
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this player.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setMessage("");
    try {
      const search = new URLSearchParams({ league: team.leagueSlug, season });
      await coachFetch(token, `/api/coach/teams/${encodeURIComponent(team.slug)}/players/${player.id}?${search.toString()}`, {
        method: "DELETE",
      });
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this player.");
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/players/${player.id}`} className="font-display text-xl font-bold uppercase tracking-tight hover:text-primary">
            {player.name}
          </Link>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {[player.position, player.jerseyNumber ? `#${player.jerseyNumber}` : "", player.height, player.weight, player.hometown]
              .filter(Boolean)
              .join(" · ") || "No details yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {player.gamesPlayed ?? "—"} GP · {player.pointsPerGame ?? "—"} PPG · {player.reboundsPerGame ?? "—"} RPG · {player.assistsPerGame ?? "—"} APG
          </p>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-xl border border-primary/40 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-2">Name<input className={`${inputClass} mt-1`} value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
          <label className="block text-sm">Position<input className={`${inputClass} mt-1`} value={form.position} onChange={(event) => set("position", event.target.value)} /></label>
          <label className="block text-sm">Jersey<input className={`${inputClass} mt-1`} value={form.jerseyNumber} onChange={(event) => set("jerseyNumber", event.target.value)} /></label>
          <label className="block text-sm">Height<input className={`${inputClass} mt-1`} placeholder={`6'7"`} value={form.height} onChange={(event) => set("height", event.target.value)} /></label>
          <label className="block text-sm">Weight<input className={`${inputClass} mt-1`} placeholder="210 lbs" value={form.weight} onChange={(event) => set("weight", event.target.value)} /></label>
          <label className="block text-sm">Hometown<input className={`${inputClass} mt-1`} value={form.hometown} onChange={(event) => set("hometown", event.target.value)} /></label>
          <label className="block text-sm">Country<input className={`${inputClass} mt-1`} value={form.country} onChange={(event) => set("country", event.target.value)} /></label>
          <label className="block text-sm">Birth date<input className={`${inputClass} mt-1`} placeholder="2004-06-14" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} /></label>
          <div className="flex items-end gap-2 sm:col-span-3">
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-primary px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60">
              {saving ? "Saving…" : "Save player"}
            </button>
            <button type="button" onClick={() => void remove()} className="rounded-xl border border-border px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Remove from roster
            </button>
          </div>
          {message ? <p className="text-sm text-muted-foreground sm:col-span-3">{message}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function AddPlayer({
  team,
  season,
  token,
  onChange,
}: {
  team: CoachDashboard["team"];
  season: string;
  token: string;
  onChange: () => void;
}) {
  const [form, setForm] = useState({ name: "", position: "", jerseyNumber: "", height: "", weight: "", hometown: "", country: "", birthDate: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const add = async () => {
    setSaving(true);
    setMessage("");
    try {
      await coachFetch(token, `/api/coach/teams/${encodeURIComponent(team.slug)}/players`, {
        method: "POST",
        body: JSON.stringify({ ...form, leagueSlug: team.leagueSlug, season }),
      });
      setForm({ name: "", position: "", jerseyNumber: "", height: "", weight: "", hometown: "", country: "", birthDate: "" });
      setMessage("Player added to the roster.");
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this player.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-2xl font-bold uppercase tracking-tight">Add a player</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-2">Name<input className={`${inputClass} mt-1`} value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
        <label className="block text-sm">Position<input className={`${inputClass} mt-1`} placeholder="PG" value={form.position} onChange={(event) => set("position", event.target.value)} /></label>
        <label className="block text-sm">Jersey<input className={`${inputClass} mt-1`} value={form.jerseyNumber} onChange={(event) => set("jerseyNumber", event.target.value)} /></label>
        <label className="block text-sm">Height<input className={`${inputClass} mt-1`} placeholder={`6'7"`} value={form.height} onChange={(event) => set("height", event.target.value)} /></label>
        <label className="block text-sm">Weight<input className={`${inputClass} mt-1`} placeholder="210 lbs" value={form.weight} onChange={(event) => set("weight", event.target.value)} /></label>
        <label className="block text-sm">Hometown<input className={`${inputClass} mt-1`} value={form.hometown} onChange={(event) => set("hometown", event.target.value)} /></label>
        <label className="block text-sm">Country<input className={`${inputClass} mt-1`} value={form.country} onChange={(event) => set("country", event.target.value)} /></label>
        <label className="block text-sm">Birth date<input className={`${inputClass} mt-1`} placeholder="2004-06-14" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} /></label>
      </div>
      <button type="button" disabled={saving || !season} onClick={() => void add()} className="mt-4 rounded-xl bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60">
        {saving ? "Adding…" : "Add to roster"}
      </button>
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
