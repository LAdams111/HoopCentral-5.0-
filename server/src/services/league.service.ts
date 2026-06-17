import { and, eq, inArray, sql } from "drizzle-orm";
import { G_LEAGUE_CURRENT_TEAM_SLUGS } from "../data/g-league-teams.js";
import { db } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import { normalizeSlugParam } from "../utils/slug.js";

function filterGLeagueTeams<T extends { slug: string }>(teams: T[]): T[] {
  return teams.filter((team) => G_LEAGUE_CURRENT_TEAM_SLUGS.has(team.slug));
}

export interface LeagueSummary {
  id: number;
  name: string;
  slug: string;
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
      teamCount: sql<number>`count(${teams.id})::int`,
    })
    .from(leagues)
    .leftJoin(teams, eq(teams.leagueId, leagues.id))
    .groupBy(leagues.id)
    .orderBy(leagues.name);

  const gLeague = rows.find((row) => row.slug === "g-league");
  if (gLeague) {
    const [countRow] = await db
      .select({ teamCount: sql<number>`count(*)::int` })
      .from(teams)
      .where(
        and(
          eq(teams.leagueId, gLeague.id),
          inArray(teams.slug, [...G_LEAGUE_CURRENT_TEAM_SLUGS]),
        ),
      );
    gLeague.teamCount = countRow?.teamCount ?? 0;
  }

  return rows;
}

export async function getLeagueBySlug(slug: string): Promise<LeagueDetail | null> {
  const normalized = normalizeSlugParam(slug);

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

  const visibleTeams =
    league.slug === "g-league" ? filterGLeagueTeams(leagueTeams) : leagueTeams;

  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    teamCount: visibleTeams.length,
    teams: visibleTeams,
  };
}
