import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import {
  evaluateLeagueVisibility,
  isBrowsableTeam,
  isJunkTeam,
  isLeaguePubliclyVisible,
  junkTeamReason,
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
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
    })
    .from(teams);

  const grouped = new Map<number, TeamVisibilityInput[]>();
  for (const row of rows) {
    const list = grouped.get(row.leagueId) ?? [];
    list.push({ id: row.id, name: row.name, slug: row.slug });
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

export function filterVisibleTeams<T extends TeamVisibilityInput & { id?: number }>(
  teams: T[],
  playerCountByTeamId?: Map<number, number>,
): T[] {
  return teams.filter((team) =>
    isBrowsableTeam(team, {
      distinctPlayerCount:
        team.id != null ? playerCountByTeamId?.get(team.id) : undefined,
    }),
  );
}

export async function getDistinctPlayerCountByTeamId(
  teamIds: number[],
): Promise<Map<number, number>> {
  if (teamIds.length === 0) return new Map();

  const counts = new Map<number, number>();
  const chunkSize = 500;

  for (let offset = 0; offset < teamIds.length; offset += chunkSize) {
    const chunk = teamIds.slice(offset, offset + chunkSize);
    const idList = sql.join(chunk.map((id) => sql`${id}`), sql`, `);
    const result = await db.execute<{ team_id: number; player_count: number }>(sql`
      SELECT team_id, COUNT(DISTINCT player_id)::int AS player_count
      FROM (
        SELECT team_id, player_id FROM player_season_stats
        WHERE team_id IN (${idList})
        UNION
        SELECT team_id, player_id FROM player_stints
        WHERE team_id IN (${idList})
      ) combined
      GROUP BY team_id
    `);

    for (const row of result.rows) {
      counts.set(Number(row.team_id), Number(row.player_count));
    }
  }

  return counts;
}

export async function auditHiddenTeams(limit = 40): Promise<{
  hiddenByReason: Record<string, number>;
  samples: Array<{
    leagueSlug: string;
    leagueName: string;
    teamName: string;
    teamSlug: string;
    playerCount: number;
    reason: string;
  }>;
}> {
  const publicIds = await getPublicLeagueIds();
  if (publicIds.size === 0) {
    return { hiddenByReason: {}, samples: [] };
  }

  const publicIdList = [...publicIds];
  const idList = sql.join(publicIdList.map((id) => sql`${id}`), sql`, `);

  const teamRows = await db.execute<{
    id: number;
    name: string;
    slug: string;
    league_slug: string;
    league_name: string;
  }>(sql`
    SELECT t.id, t.name, t.slug, l.slug AS league_slug, l.name AS league_name
    FROM teams t
    INNER JOIN leagues l ON l.id = t.league_id
    WHERE t.league_id IN (${idList})
  `);

  const playerCounts = await getDistinctPlayerCountByTeamId(
    teamRows.rows.map((row) => Number(row.id)),
  );

  const hiddenByReason: Record<string, number> = {};
  const samples: Array<{
    leagueSlug: string;
    leagueName: string;
    teamName: string;
    teamSlug: string;
    playerCount: number;
    reason: string;
  }> = [];

  for (const row of teamRows.rows) {
    const team = { name: row.name, slug: row.slug };
    const context = { distinctPlayerCount: playerCounts.get(Number(row.id)) ?? 0 };
    const reason = junkTeamReason(team, context);
    if (!reason) continue;

    hiddenByReason[reason] = (hiddenByReason[reason] ?? 0) + 1;
    if (samples.length < limit) {
      samples.push({
        leagueSlug: row.league_slug,
        leagueName: row.league_name,
        teamName: row.name,
        teamSlug: row.slug,
        playerCount: context.distinctPlayerCount,
        reason,
      });
    }
  }

  return { hiddenByReason, samples };
}

export function countVisibleTeams(
  league: LeagueVisibilityInput,
  teams: TeamVisibilityInput[],
): number {
  if (!isLeaguePubliclyVisible(league, teams)) return 0;
  return filterVisibleTeams(teams).length;
}
