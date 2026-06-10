import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import { normalizeSlugParam } from "../utils/slug.js";

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

  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    teamCount: leagueTeams.length,
    teams: leagueTeams,
  };
}
