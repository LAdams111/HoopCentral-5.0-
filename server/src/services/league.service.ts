import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { G_LEAGUE_CURRENT_TEAM_SLUGS } from "../data/g-league-teams.js";
import { WNBA_CURRENT_TEAM_SLUGS } from "../data/wnba-teams.js";
import { db } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import {
  DEPRECATED_PUBLIC_LEAGUE_SLUGS,
  resolvePublicLeagueSlug,
} from "../utils/league-slug.js";
import { normalizeSlugParam } from "../utils/slug.js";

const CANONICAL_TEAM_SLUGS_BY_LEAGUE: Record<string, ReadonlySet<string>> = {
  "g-league": G_LEAGUE_CURRENT_TEAM_SLUGS,
  wnba: WNBA_CURRENT_TEAM_SLUGS,
};

function filterLeagueTeams<T extends { slug: string }>(
  leagueSlug: string,
  teams: T[],
): T[] {
  const canonicalSlugs = CANONICAL_TEAM_SLUGS_BY_LEAGUE[leagueSlug];
  if (!canonicalSlugs) return teams;
  return teams.filter((team) => canonicalSlugs.has(team.slug));
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

  for (const row of rows) {
    const canonicalSlugs = CANONICAL_TEAM_SLUGS_BY_LEAGUE[row.slug];
    if (!canonicalSlugs) continue;

    const [countRow] = await db
      .select({ teamCount: sql<number>`count(*)::int` })
      .from(teams)
      .where(
        and(
          eq(teams.leagueId, row.id),
          inArray(teams.slug, [...canonicalSlugs]),
        ),
      );
    row.teamCount = countRow?.teamCount ?? 0;
  }

  return rows;
}

export async function getLeagueBySlug(slug: string): Promise<LeagueDetail | null> {
  const normalized = resolvePublicLeagueSlug(normalizeSlugParam(slug));

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.slug, normalized))
    .limit(1);

  if (!league) return null;

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

  const visibleTeams = filterLeagueTeams(league.slug, leagueTeams);

  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    gender: league.gender ?? null,
    teamCount: visibleTeams.length,
    teams: visibleTeams,
  };
}
