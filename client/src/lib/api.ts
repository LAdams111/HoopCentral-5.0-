export interface PlayerCard {
  id: number;
  name: string;
  position: string;
  team: string;
  teamSlug: string | null;
  height: string;
  weight: string;
  jerseyNumber: string;
  country: string;
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
  teamSlug: string;
  league: string;
  leagueSlug: string;
  leagueGender?: string | null;
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

/** Unknown or missing game counts are stored as 0 and shown as an em dash. */
export function formatGamesPlayed(games: number | null | undefined): string {
  if (games == null || games === 0) return "—";
  return String(games);
}

export interface CareerEntry {
  id: number;
  team: string;
  teamSlug: string;
  league: string;
  leagueSlug: string;
  season: string;
  startDate: string | null;
  endDate: string | null;
}

export interface PlayerProfile extends PlayerCard {
  league: string | null;
  leagueSlug: string | null;
  stats: PlayerStat[];
  awards: { awardName: string; season: string | null; league: string | null }[];
  career: CareerEntry[];
  leaguesPlayed: string[];
}

export interface LeagueSummary {
  id: number;
  name: string;
  slug: string;
  gender?: string | null;
  teamCount: number;
}

export interface LeagueTeam {
  id: number;
  name: string;
  abbreviation: string;
  slug: string;
}

export interface LeagueDetail extends LeagueSummary {
  teams: LeagueTeam[];
}

export interface TeamLeagueInfo {
  id: number;
  name: string;
  slug: string;
}

export interface TeamSummary {
  id: number;
  name: string;
  abbreviation: string;
  slug: string;
  league: TeamLeagueInfo;
}

export interface TeamDetail extends TeamSummary {
  roster: PlayerCard[];
  latestSeasonLabel: string | null;
}

export interface TeamRosterResponse {
  team: { id: number; name: string; abbreviation: string; slug: string };
  seasonLabel: string;
  players: PlayerCard[];
}

export interface TeamRecordResponse {
  id: number;
  team: string;
  season: string;
  wins: number;
  losses: number;
  league: string;
}

export interface BirthYearCount {
  year: number;
  count: number;
}

export interface BirthYearPlayersResponse {
  year: number;
  totalCount: number;
  players: PlayerCard[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getPlayers(q?: string, league?: string, limit?: number): Promise<PlayerCard[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (league) params.set("league", league);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchJson(`/api/players${qs ? `?${qs}` : ""}`);
}

export function getBirthYearCounts(): Promise<BirthYearCount[]> {
  return fetchJson("/api/players/birth-year-counts");
}

export function getPlayersByBirthYear(year: number): Promise<BirthYearPlayersResponse> {
  return fetchJson(`/api/players/birth-year/${year}?limit=50`);
}

export function getPlayer(id: number, league?: string): Promise<PlayerProfile> {
  const qs = league ? `?league=${encodeURIComponent(league)}` : "";
  return fetchJson(`/api/players/${id}${qs}`);
}

export function getFeaturedPlayers(): Promise<PlayerCard[]> {
  return fetchJson("/api/featured-players");
}

export function getProspectPlayers(): Promise<PlayerCard[]> {
  return fetchJson("/api/prospect-players");
}

export function getPlayerCount(): Promise<{ count: number }> {
  return fetchJson("/api/players/count");
}

export function getTeamCount(): Promise<{ count: number }> {
  return fetchJson("/api/teams/count");
}

export function getLeagues(): Promise<LeagueSummary[]> {
  return fetchJson("/api/leagues");
}

export function getFeaturedLeagues(): Promise<LeagueSummary[]> {
  return fetchJson("/api/leagues/featured");
}

export function searchLeagues(q: string, limit?: number): Promise<LeagueSummary[]> {
  const params = new URLSearchParams();
  params.set("q", q);
  if (limit) params.set("limit", String(limit));
  return fetchJson(`/api/leagues/search?${params.toString()}`);
}

export function getLeague(slug: string): Promise<LeagueDetail> {
  return fetchJson(`/api/leagues/${encodeURIComponent(slug)}`);
}

export function getAllTeams(leagueSlug?: string): Promise<TeamSummary[]> {
  const params = new URLSearchParams();
  if (leagueSlug) params.set("league", leagueSlug);
  const qs = params.toString();
  return fetchJson(`/api/teams/all${qs ? `?${qs}` : ""}`);
}

export function searchTeams(q: string, limit?: number): Promise<TeamSummary[]> {
  const params = new URLSearchParams();
  params.set("q", q);
  if (limit) params.set("limit", String(limit));
  return fetchJson(`/api/teams/search?${params.toString()}`);
}

export function getTeam(slug: string): Promise<TeamDetail> {
  return fetchJson(`/api/teams/${encodeURIComponent(slug)}`);
}

export function getTeamRoster(
  team: string,
  season: string,
  league?: string,
): Promise<TeamRosterResponse> {
  const qs = league ? `?league=${encodeURIComponent(league)}` : "";
  return fetchJson(
    `/api/teams/${encodeURIComponent(team)}/roster/${encodeURIComponent(season)}${qs}`,
  );
}

export function getTeamSeasons(team: string): Promise<string[]> {
  return fetchJson(`/api/teams/${encodeURIComponent(team)}/seasons`);
}

export function getTeamRecord(
  team: string,
  season: string,
  league?: string,
): Promise<TeamRecordResponse | null> {
  const qs = league ? `?league=${encodeURIComponent(league)}` : "";
  return fetch(
    `/api/teams/${encodeURIComponent(team)}/record/${encodeURIComponent(season)}${qs}`,
  ).then((res) => (res.ok ? (res.json() as Promise<TeamRecordResponse>) : null));
}

export function getSeasonCount(): Promise<{ count: number }> {
  return fetchJson("/api/seasons/count");
}

export function incrementProfileView(id: number): Promise<{ ok: boolean }> {
  return fetch(`/api/players/${id}/view`, { method: "POST" }).then((r) =>
    r.json(),
  );
}
