import { eq, notInArray, sql } from "drizzle-orm";
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

export async function getAllLeagues(): Promise<LeagueSummary[]> {
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

  return visibleResults.sort((a, b) => a.name.localeCompare(b.name));
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
