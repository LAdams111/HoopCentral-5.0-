/** Leagues that show a curated US-college team list (display only — DB rows unchanged). */
export const NCAA_COLLEGE_PAGE_LEAGUES = new Set<string>([
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
]);

const MIN_ROSTER_PLAYERS_BY_LEAGUE: Readonly<Record<string, number>> = {
  "ncaa-d2": 3,
  "ncaa-d3": 3,
  naia: 3,
  juco: 3,
};

/** Obvious non-US / mis-routed clubs on NCAA division pages. */
const FOREIGN_TEAM_PATTERNS: RegExp[] = [
  /\bbbc\b/i,
  /\bkk[\s-]/i,
  /^kk-/i,
  /\bbcm\b/i,
  /\bskopje\b/i,
  /\bbursa\b/i,
  /\bkrakow\b/i,
  /\bostrav/i,
  /\bantwerp\b/i,
  /\bbrussels\b/i,
  /\bwaregem\b/i,
  /\bsecond team\b/i,
  /\b1liga\b/i,
  /\bnatoye\b/i,
  /\bhaantjes\b/i,
  /\bliverpool mersey\b/i,
  /\bderby trailblazers\b/i,
  /\bworcester wolves\b/i,
  /\bsolent kestrels\b/i,
  /\btofas\b/i,
  /\bczestochowa\b/i,
  /\bkominki\b/i,
  /\bgembo\b/i,
  /\bbaganuur\b/i,
  /\bjunior team\b/i,
  /\bassistant coach\b/i,
  /\bsarajevo\b/i,
];

const US_STATE_SLUG_SUFFIX =
  /-(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)(?:-|$)/i;

const US_STATE_NAME_SUFFIX = /\([A-Z]{2}\)/;

const USBASKET_STATE_ABBREV =
  /^(wisc|mich|minn|penn|mass|conn|cal|fla|colo|ariz|ore|wash|tenn|kent|miss|neb|iowa|idaho|mont|wyom|utah|maine|verm|del|md|va|nc|sc|ga|ala|la|ark|okla|tex|kan|mo|ill|ind|ohio|wva)\b/i;

export function isNcaaCollegePageLeague(leagueSlug: string): boolean {
  return NCAA_COLLEGE_PAGE_LEAGUES.has(leagueSlug.toLowerCase());
}

export function looksLikeUsCollegeTeam(name: string, slug: string): boolean {
  const haystack = `${name} ${slug}`;
  if (FOREIGN_TEAM_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return false;
  }
  if (US_STATE_NAME_SUFFIX.test(name)) return true;
  if (/\b(university|college|institute|tech)\b/i.test(name)) return true;
  if (/\b(junior college|community college)\b/i.test(name)) return true;
  if (/\bj[\s.-]?c\b/i.test(name)) return true;
  if (/\bstate\b/i.test(name)) return true;
  if (US_STATE_SLUG_SUFFIX.test(slug)) return true;
  if (USBASKET_STATE_ABBREV.test(name)) return true;
  return false;
}

export function canonicalNcaaCollegeSchoolKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([a-z]{2}\)\s*$/i, "")
    .replace(/,\s*[a-z]{2,3}\.?$/i, "")
    .replace(/\b(the|university|college|state|institute|of technology|tech)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayNameScore(name: string): number {
  let score = 0;
  if (/\bUniversity\b/i.test(name)) score += 3;
  if (/\bCollege\b/i.test(name)) score += 2;
  if (US_STATE_NAME_SUFFIX.test(name)) score -= 1;
  return score;
}

export function dedupeNcaaCollegeTeamsForDisplay<T extends { id: number; slug: string; name: string }>(
  teams: T[],
  playerCounts: Map<number, number>,
): T[] {
  const byKey = new Map<string, T>();

  for (const team of teams) {
    const key = canonicalNcaaCollegeSchoolKey(team.name);
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, team);
      continue;
    }

    const existingCount = playerCounts.get(existing.id) ?? 0;
    const teamCount = playerCounts.get(team.id) ?? 0;
    if (teamCount > existingCount) {
      byKey.set(key, team);
      continue;
    }
    if (teamCount < existingCount) continue;

    if (displayNameScore(team.name) > displayNameScore(existing.name)) {
      byKey.set(key, team);
    }
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterNcaaCollegeTeamsForPage<T extends { id: number; slug: string; name: string }>(
  leagueSlug: string,
  teams: T[],
  playerCounts?: Map<number, number>,
): T[] {
  if (!isNcaaCollegePageLeague(leagueSlug)) return teams;

  const minPlayers = MIN_ROSTER_PLAYERS_BY_LEAGUE[leagueSlug] ?? 3;
  let filtered = teams.filter((team) => looksLikeUsCollegeTeam(team.name, team.slug));

  if (playerCounts) {
    filtered = filtered.filter((team) => (playerCounts.get(team.id) ?? 0) >= minPlayers);
    filtered = dedupeNcaaCollegeTeamsForDisplay(filtered, playerCounts);
  } else {
    const counts = new Map<number, number>();
    filtered = dedupeNcaaCollegeTeamsForDisplay(filtered, counts);
  }

  return filtered;
}

export function countNcaaCollegeTeamsForPage(
  leagueSlug: string,
  teams: Array<{ id: number; slug: string; name: string }>,
  playerCounts?: Map<number, number>,
): number {
  return filterNcaaCollegeTeamsForPage(leagueSlug, teams, playerCounts).length;
}
