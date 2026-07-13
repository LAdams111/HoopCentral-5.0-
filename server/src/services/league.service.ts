import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { FEATURED_LEAGUE_SLUGS, dbSlugForFeaturedLeague } from "../data/featured-leagues.js";
import { G_LEAGUE_CURRENT_TEAM_SLUGS } from "../data/g-league-teams.js";
import { NBA_CURRENT_TEAM_SLUGS } from "../data/nba-teams.js";
import { USPORTS_CURRENT_TEAM_SLUGS, resolveUsportsTeamDisplayName } from "../data/usports-teams.js";
import { WNBA_CURRENT_TEAM_SLUGS } from "../data/wnba-teams.js";
import { db } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import {
  DEPRECATED_PUBLIC_LEAGUE_SLUGS,
  resolvePublicLeagueSlug,
} from "../utils/league-slug.js";
import {
  displaySlugForLeagueRow,
  findLeagueRowBySlug,
  genderForLeagueRow,
} from "../utils/league-resolution.js";
import { normalizeSlugParam } from "../utils/slug.js";
import { prefixMatch, wordPrefixMatch } from "../utils/search-match.js";
import {
  filterVisibleTeams,
  getPublicLeagueIds,
  getTeamsByLeagueId,
} from "./league-visibility.service.js";
import {
  isLeaguePubliclyVisible,
  isWhitelistedLeagueSlug,
} from "../utils/league-visibility.js";

const CANONICAL_TEAM_SLUGS_BY_LEAGUE: Record<string, ReadonlySet<string>> = {
  nba: NBA_CURRENT_TEAM_SLUGS,
  "g-league": G_LEAGUE_CURRENT_TEAM_SLUGS,
  wnba: WNBA_CURRENT_TEAM_SLUGS,
  "u-sports": USPORTS_CURRENT_TEAM_SLUGS,
};

function filterLeagueTeams<T extends { slug: string }>(
  leagueSlug: string,
  teams: T[],
): T[] {
  const canonicalSlugs = CANONICAL_TEAM_SLUGS_BY_LEAGUE[leagueSlug];
  if (canonicalSlugs) {
    return teams.filter((team) => canonicalSlugs.has(team.slug));
  }
  return teams;
}

export interface LeagueSummary {
  id: number;
  name: string;
  slug: string;
  gender: string | null;
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

let cachedPublicLeagues: LeagueSummary[] | null = null;

function applyTeamCountRules(
  row: LeagueSummary,
  leagueTeams: Array<{ name: string; slug: string }>,
): void {
  const canonicalSlugs = CANONICAL_TEAM_SLUGS_BY_LEAGUE[row.slug];
  if (canonicalSlugs) {
    row.teamCount = leagueTeams.filter((team) => canonicalSlugs.has(team.slug)).length;
  } else if (!isWhitelistedLeagueSlug(row.slug)) {
    row.teamCount = filterVisibleTeams(leagueTeams).length;
  }
}

function toPublicLeagueSummary(
  row: {
    id: number;
    name: string;
    slug: string;
    gender: string | null;
    teamCount: number;
  },
  responseSlug?: string,
): LeagueSummary {
  const slug = responseSlug ?? row.slug;
  const name =
    slug === "ncaa-m"
      ? "NCAA Division I (Men)"
      : slug === "ncaa-w"
        ? "NCAA Division I (Women)"
        : row.name;

  return {
    id: row.id,
    name,
    slug,
    gender: genderForLeagueRow(slug, row),
    teamCount: row.teamCount,
  };
}

export async function getFeaturedLeagues(): Promise<LeagueSummary[]> {
  const dbSlugs = [...new Set(FEATURED_LEAGUE_SLUGS.map(dbSlugForFeaturedLeague))];
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      gender: leagues.gender,
      teamCount: sql<number>`count(${teams.id})::int`,
    })
    .from(leagues)
    .leftJoin(teams, eq(teams.leagueId, leagues.id))
    .where(inArray(leagues.slug, dbSlugs))
    .groupBy(leagues.id);

  const teamsByLeagueId = await getTeamsByLeagueId();
  const byDbSlug = new Map(rows.map((row) => [row.slug, row]));
  const featured: LeagueSummary[] = [];

  for (const slug of FEATURED_LEAGUE_SLUGS) {
    const dbSlug = dbSlugForFeaturedLeague(slug);
    const row = byDbSlug.get(dbSlug);
    if (!row) continue;

    const summary = toPublicLeagueSummary(row, slug);
    applyTeamCountRules(summary, teamsByLeagueId.get(row.id) ?? []);
    featured.push(summary);
  }

  return featured;
}

function scoreLeagueSearchMatch(league: LeagueSummary, query: string): number {
  const q = query.trim().toLowerCase();
  const slug = league.slug.toLowerCase();
  const slugSpaced = slug.replace(/-/g, " ");
  const name = league.name.toLowerCase();

  if (name === q || slug === q || slugSpaced === q) return 100;
  if (name.startsWith(q) || slug.startsWith(q) || slugSpaced.startsWith(q)) return 80;
  if (name.includes(q) || slug.includes(q) || slugSpaced.includes(q)) return 50;
  return 0;
}

export async function searchLeagues(params: {
  q: string;
  limit?: number;
}): Promise<LeagueSummary[]> {
  const trimmed = params.q.trim();
  if (!trimmed) return [];

  const limit = Math.min(50, Math.max(1, params.limit ?? 25));
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      gender: leagues.gender,
      teamCount: sql<number>`count(${teams.id})::int`,
    })
    .from(leagues)
    .leftJoin(teams, eq(teams.leagueId, leagues.id))
    .where(publicLeagueSearchWhere(trimmed))
    .groupBy(leagues.id)
    .orderBy(leagues.name)
    .limit(limit * 4);

  const publicLeagueIds = await getPublicLeagueIds();
  const teamsByLeagueId = await getTeamsByLeagueId();
  const matches: LeagueSummary[] = [];

  for (const row of rows) {
    if (!publicLeagueIds.has(row.id)) continue;

    const responseSlug = displaySlugForLeagueRow(row.slug, row.slug);
    const summary = toPublicLeagueSummary(
      row,
      responseSlug !== row.slug ? responseSlug : undefined,
    );
    applyTeamCountRules(summary, teamsByLeagueId.get(row.id) ?? []);

    const score = scoreLeagueSearchMatch(summary, trimmed);
    if (score === 0) continue;
    matches.push(summary);
    if (matches.length >= limit) break;
  }

  return matches.sort((a, b) => scoreLeagueSearchMatch(b, trimmed) - scoreLeagueSearchMatch(a, trimmed));
}

function publicLeagueSearchWhere(query: string) {
  return and(
    notInArray(leagues.slug, [...DEPRECATED_PUBLIC_LEAGUE_SLUGS]),
    or(
      wordPrefixMatch(leagues.name, query),
      prefixMatch(leagues.slug, query),
      wordPrefixMatch(leagues.slug, query),
    ),
  );
}

export async function getAllLeagues(): Promise<LeagueSummary[]> {
  if (cachedPublicLeagues) return cachedPublicLeagues;
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      gender: leagues.gender,
      teamCount: sql<number>`count(${teams.id})::int`,
    })
    .from(leagues)
    .leftJoin(teams, eq(teams.leagueId, leagues.id))
    .where(notInArray(leagues.slug, [...DEPRECATED_PUBLIC_LEAGUE_SLUGS]))
    .groupBy(leagues.id)
    .orderBy(leagues.name);

  const results: LeagueSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    gender: genderForLeagueRow(row.slug, row),
    teamCount: row.teamCount,
  }));

  const hasNcaaM = results.some((row) => row.slug === "ncaa-m");
  const legacyNcaa = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      gender: leagues.gender,
      teamCount: sql<number>`count(${teams.id})::int`,
    })
    .from(leagues)
    .leftJoin(teams, eq(teams.leagueId, leagues.id))
    .where(eq(leagues.slug, "ncaa"))
    .groupBy(leagues.id)
    .limit(1);

  if (!hasNcaaM && legacyNcaa[0]) {
    const legacy = legacyNcaa[0];
    results.push({
      id: legacy.id,
      name: "NCAA Division I (Men)",
      slug: "ncaa-m",
      gender: genderForLeagueRow("ncaa-m", legacy),
      teamCount: legacy.teamCount,
    });
  }

  if (!results.some((row) => row.slug === "ncaa-w")) {
    const [ncaaW] = await db
      .select({ id: leagues.id, teamCount: sql<number>`count(${teams.id})::int` })
      .from(leagues)
      .leftJoin(teams, eq(teams.leagueId, leagues.id))
      .where(eq(leagues.slug, "ncaa-w"))
      .groupBy(leagues.id)
      .limit(1);

    results.push({
      id: ncaaW?.id ?? 0,
      name: "NCAA Division I (Women)",
      slug: "ncaa-w",
      gender: "female",
      teamCount: ncaaW?.teamCount ?? 0,
    });
  }

  const teamsByLeagueId = await getTeamsByLeagueId();
  const publicLeagueIds = await getPublicLeagueIds();
  const visibleResults: LeagueSummary[] = [];

  for (const row of results) {
    const leagueTeams = teamsByLeagueId.get(row.id) ?? [];
    if (!publicLeagueIds.has(row.id)) continue;

    const canonicalSlugs = CANONICAL_TEAM_SLUGS_BY_LEAGUE[row.slug];
    if (canonicalSlugs) {
      row.teamCount = leagueTeams.filter((team) => canonicalSlugs.has(team.slug)).length;
    } else if (!isWhitelistedLeagueSlug(row.slug)) {
      row.teamCount = filterVisibleTeams(leagueTeams).length;
    }

    visibleResults.push(row);
  }

  cachedPublicLeagues = visibleResults.sort((a, b) => a.name.localeCompare(b.name));
  return cachedPublicLeagues;
}

export async function getLeagueBySlug(slug: string): Promise<LeagueDetail | null> {
  const normalized = resolvePublicLeagueSlug(normalizeSlugParam(slug));
  const league = await findLeagueRowBySlug(db, normalized);
  if (!league) return null;

  const responseSlug = displaySlugForLeagueRow(normalized, league.slug);
  const responseName =
    responseSlug === "ncaa-m"
      ? "NCAA Division I (Men)"
      : responseSlug === "ncaa-w"
        ? "NCAA Division I (Women)"
        : league.name;

  const leagueTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      abbreviation: teams.abbreviation,
      slug: teams.slug,
    })
    .from(teams)
    .where(eq(teams.leagueId, league.id))
    .orderBy(teams.name);

  if (!isLeaguePubliclyVisible({ slug: league.slug, name: league.name }, leagueTeams)) {
    return null;
  }

  const browsableTeams = filterVisibleTeams(leagueTeams);
  const visibleTeams = filterLeagueTeams(responseSlug, browsableTeams).map((team) => {
    if (responseSlug !== "u-sports") return team;
    const displayName = resolveUsportsTeamDisplayName(team.slug, team.name);
    return displayName ? { ...team, name: displayName } : team;
  });

  return {
    id: league.id,
    name: responseName,
    slug: responseSlug,
    gender: genderForLeagueRow(responseSlug, league),
    teamCount: visibleTeams.length,
    teams: visibleTeams,
  };
}
