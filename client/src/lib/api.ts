export interface PlayerCard {
  id: number;
  name: string;
  position: string;
  team: string;
  height: string;
  weight: string;
  jerseyNumber: number;
  headshotUrl: string;
  bio: string | null;
  profileViews: number;
  hometown: string;
  birthDate: string | null;
}

export interface PlayerStat {
  id: number;
  season: string;
  team: string;
  league: string;
  games_played: number | null;
  gamesPlayed: number | null;
  pts_per_g: string;
  pointsPerGame: string;
  trb_per_g: string;
  reboundsPerGame: string;
  ast_per_g: string;
  assistsPerGame: string;
  stl_per_g: string;
  stealsPerGame: string;
  blk_per_g: string;
  blocksPerGame: string;
  fg_pct: string;
  fieldGoalPct: string;
}

export interface CareerEntry {
  team: string;
  league: string;
  fromSeason: string;
  toSeason: string | null;
}

export interface PlayerProfile extends PlayerCard {
  stats: PlayerStat[];
  awards: { awardName: string; season: string | null; league: string | null }[];
  career: CareerEntry[];
  leaguesPlayed: string[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getPlayers(q?: string): Promise<PlayerCard[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  return fetchJson(`/api/players${qs ? `?${qs}` : ""}`);
}

export function getPlayer(id: number): Promise<PlayerProfile> {
  return fetchJson(`/api/players/${id}`);
}

export function getFeaturedPlayers(): Promise<PlayerCard[]> {
  return fetchJson("/api/featured-players");
}

export function getPlayerCount(): Promise<{ count: number }> {
  return fetchJson("/api/players/count");
}

export function getTeamCount(): Promise<{ count: number }> {
  return fetchJson("/api/teams/count");
}

export function getSeasonCount(): Promise<{ count: number }> {
  return fetchJson("/api/seasons/count");
}

export function incrementProfileView(id: number): Promise<{ ok: boolean }> {
  return fetch(`/api/players/${id}/view`, { method: "POST" }).then((r) =>
    r.json(),
  );
}
