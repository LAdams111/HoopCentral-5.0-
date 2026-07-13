import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import {
  evaluateLeagueVisibility,
  isJunkTeam,
  isLeaguePubliclyVisible,
  type LeagueVisibilityInput,
  type TeamVisibilityInput,
} from "../utils/league-visibility.js";
import { DEPRECATED_PUBLIC_LEAGUE_SLUGS } from "../utils/league-slug.js";

export interface LeagueVisibilityAuditRow {
  id: number;
  slug: string;
  name: string;
  teamCount: number;
  junkTeamCount: number;
  public: boolean;
  reason: string;
}

let publicLeagueIdsCache: Set<number> | null = null;
let teamsByLeagueIdCache: Map<number, TeamVisibilityInput[]> | null = null;

async function loadTeamsByLeagueId(): Promise<Map<number, TeamVisibilityInput[]>> {
  if (teamsByLeagueIdCache) return teamsByLeagueIdCache;

  const rows = await db
    .select({
      leagueId: teams.leagueId,
      name: teams.name,
      slug: teams.slug,
    })
    .from(teams);

  const grouped = new Map<number, TeamVisibilityInput[]>();
  for (const row of rows) {
    const list = grouped.get(row.leagueId) ?? [];
    list.push({ name: row.name, slug: row.slug });
    grouped.set(row.leagueId, list);
  }

  teamsByLeagueIdCache = grouped;
  return grouped;
}

export async function getTeamsByLeagueId(): Promise<Map<number, TeamVisibilityInput[]>> {
  return loadTeamsByLeagueId();
}

export async function buildPublicLeagueIdSet(): Promise<Set<number>> {
  const leagueRows = await db
    .select({
      id: leagues.id,
      slug: leagues.slug,
      name: leagues.name,
    })
    .from(leagues);

  const teamsByLeagueId = await loadTeamsByLeagueId();
  const publicIds = new Set<number>();

  for (const league of leagueRows) {
    if (DEPRECATED_PUBLIC_LEAGUE_SLUGS.has(league.slug)) continue;

    const leagueTeams = teamsByLeagueId.get(league.id) ?? [];
    if (isLeaguePubliclyVisible(league, leagueTeams)) {
      publicIds.add(league.id);
    }
  }

  return publicIds;
}

export async function getPublicLeagueIds(): Promise<Set<number>> {
  if (!publicLeagueIdsCache) {
    publicLeagueIdsCache = await buildPublicLeagueIdSet();
  }
  return publicLeagueIdsCache;
}

export function clearPublicLeagueIdsCache(): void {
  publicLeagueIdsCache = null;
  teamsByLeagueIdCache = null;
}

export async function isLeagueIdPublic(leagueId: number): Promise<boolean> {
  const publicIds = await getPublicLeagueIds();
  return publicIds.has(leagueId);
}

export async function auditLeagueVisibility(): Promise<{
  total: number;
  publicCount: number;
  hiddenCount: number;
  hidden: LeagueVisibilityAuditRow[];
  publicLeagues: LeagueVisibilityAuditRow[];
}> {
  const leagueRows = await db
    .select({
      id: leagues.id,
      slug: leagues.slug,
      name: leagues.name,
    })
    .from(leagues)
    .orderBy(leagues.name);

  const teamsByLeagueId = await loadTeamsByLeagueId();
  const hidden: LeagueVisibilityAuditRow[] = [];
  const publicLeagues: LeagueVisibilityAuditRow[] = [];

  for (const league of leagueRows) {
    if (DEPRECATED_PUBLIC_LEAGUE_SLUGS.has(league.slug)) continue;

    const leagueTeams = teamsByLeagueId.get(league.id) ?? [];
    const junkTeamCount = leagueTeams.filter(isJunkTeam).length;
    const verdict = evaluateLeagueVisibility(league, leagueTeams);
    const row: LeagueVisibilityAuditRow = {
      id: league.id,
      slug: league.slug,
      name: league.name,
      teamCount: leagueTeams.length,
      junkTeamCount,
      public: verdict.public,
      reason: verdict.reason,
    };

    if (verdict.public) publicLeagues.push(row);
    else hidden.push(row);
  }

  return {
    total: hidden.length + publicLeagues.length,
    publicCount: publicLeagues.length,
    hiddenCount: hidden.length,
    hidden: hidden.sort((a, b) => a.teamCount - b.teamCount || a.name.localeCompare(b.name)),
    publicLeagues,
  };
}

export function filterVisibleTeams<T extends TeamVisibilityInput>(teams: T[]): T[] {
  return teams.filter((team) => !isJunkTeam(team));
}

export function countVisibleTeams(
  league: LeagueVisibilityInput,
  teams: TeamVisibilityInput[],
): number {
  if (!isLeaguePubliclyVisible(league, teams)) return 0;
  return filterVisibleTeams(teams).length;
}
