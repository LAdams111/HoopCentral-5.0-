/**
 * Fixed-roster / pro leagues: only teams with enough linked players belong on
 * the league browse page (filters one-off mis-ingested career rows).
 */
export const DEFAULT_MIN_ROSTER_PLAYERS = 2;

/** Pro leagues with larger historical rosters — require more linked players. */
export const MIN_ROSTER_PLAYERS_BY_LEAGUE: Readonly<Record<string, number>> = {
  acb: 10,
  "lnb-pro-a": 10,
  "lnb-u21": 5,
  euroleague: 10,
  nbl: 5,
  cba: 5,
  "b-league": 5,
  bal: 2,
  ote: 2,
  aau: 2,
};

/** College / HS / allowlisted leagues keep full team lists from ingest. */
export const ROSTER_FILTER_EXCLUDED_LEAGUE_SLUGS = new Set<string>([
  "nba",
  "wnba",
  "g-league",
  "the-basketball-league",
  "ncaa",
  "ncaa-m",
  "ncaa-w",
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
  "ccaa",
  "u-sports",
  "high-school",
  "high-school-w",
]);

export function isRosterFilteredLeague(leagueSlug: string): boolean {
  const normalized = leagueSlug.toLowerCase();
  if (ROSTER_FILTER_EXCLUDED_LEAGUE_SLUGS.has(normalized)) return false;
  if (normalized.startsWith("ncaa-")) return false;
  return true;
}

export function minRosterPlayersForLeague(leagueSlug: string): number | null {
  if (!isRosterFilteredLeague(leagueSlug)) return null;
  return MIN_ROSTER_PLAYERS_BY_LEAGUE[leagueSlug] ?? DEFAULT_MIN_ROSTER_PLAYERS;
}

export function filterLeagueRosterTeams<T extends { id?: number; slug: string }>(
  leagueSlug: string,
  teams: T[],
  playerCountByTeamId?: Map<number, number>,
): T[] {
  const minPlayers = minRosterPlayersForLeague(leagueSlug);
  if (minPlayers == null || !playerCountByTeamId) return teams;

  return teams.filter((team) => {
    if (team.id == null) return true;
    return (playerCountByTeamId.get(team.id) ?? 0) >= minPlayers;
  });
}
