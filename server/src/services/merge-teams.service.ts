import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import {
  leagues,
  playerSeasonStats,
  playerStints,
  players,
  teamSeasonRecords,
  teams,
} from "../db/schema/index.js";
import {
  buildNcaaTeamMergeGroups,
  loadNcaaTeamAliasReport,
  resolveCanonicalIdentity,
  type NcaaTeamIdentity,
} from "../utils/ncaa-team-alias-report.js";
import {
  buildUsportsTeamMergeGroups,
  loadUsportsTeamAliasReport,
  resolveCanonicalIdentity as resolveUsportsCanonicalIdentity,
  type UsportsTeamIdentity,
} from "../utils/usports-team-aliases.js";
import { LEGACY_NCAA_MENS_SLUG } from "../utils/league-slug.js";

export type { NcaaTeamIdentity, UsportsTeamIdentity };

export interface TeamMergePlan {
  canonical: NcaaTeamIdentity | UsportsTeamIdentity;
  keepTeamId: number;
  keepSlug: string;
  duplicateTeamIds: number[];
  duplicateSlugs: string[];
}

export interface TeamMergeExecution {
  plan: TeamMergePlan;
  merges: MergeTeamsResult[];
  canonicalUpdated: boolean;
}

export interface NcaaTeamMergePlan extends TeamMergePlan {
  canonical: NcaaTeamIdentity;
}

export interface NcaaTeamMergeExecution extends TeamMergeExecution {
  plan: NcaaTeamMergePlan;
}

export interface UsportsTeamMergePlan extends TeamMergePlan {
  canonical: UsportsTeamIdentity;
}

export interface UsportsTeamMergeExecution extends TeamMergeExecution {
  plan: UsportsTeamMergePlan;
}

export interface MergeTeamsResult {
  keptTeamId: number;
  removedTeamId: number;
  keptSlug: string;
  removedSlug: string;
  statsMoved: number;
  statsDropped: number;
  stintsMoved: number;
  stintsDropped: number;
}

/**
 * Merge duplicateTeam into keepTeam: reassign FKs, drop conflicting rows, delete duplicate.
 */
export async function mergeTeamInto(
  duplicateTeamId: number,
  keepTeamId: number,
  database: DbClient = db,
): Promise<MergeTeamsResult> {
  if (duplicateTeamId === keepTeamId) {
    throw new Error("Cannot merge a team into itself");
  }

  return database.transaction(async (tx) => {
    const [duplicate] = await tx
      .select()
      .from(teams)
      .where(eq(teams.id, duplicateTeamId))
      .limit(1);
    const [keep] = await tx
      .select()
      .from(teams)
      .where(eq(teams.id, keepTeamId))
      .limit(1);

    if (!duplicate || !keep) {
      throw new Error(
        `Missing team(s): duplicate=${duplicateTeamId} keep=${keepTeamId}`,
      );
    }
    if (duplicate.leagueId !== keep.leagueId) {
      throw new Error(
        `Teams are in different leagues: duplicate=${duplicateTeamId} keep=${keepTeamId}`,
      );
    }

    const movedStats = await tx.execute(sql`
      UPDATE player_season_stats AS dup
      SET team_id = ${keepTeamId}
      WHERE dup.team_id = ${duplicateTeamId}
        AND NOT EXISTS (
          SELECT 1
          FROM player_season_stats AS keep_row
          WHERE keep_row.player_id = dup.player_id
            AND keep_row.team_id = ${keepTeamId}
            AND keep_row.league_id = dup.league_id
            AND keep_row.season_id = dup.season_id
        )
    `);

    const droppedStats = await tx.execute(sql`
      DELETE FROM player_season_stats AS dup
      WHERE dup.team_id = ${duplicateTeamId}
        AND EXISTS (
          SELECT 1
          FROM player_season_stats AS keep_row
          WHERE keep_row.player_id = dup.player_id
            AND keep_row.team_id = ${keepTeamId}
            AND keep_row.league_id = dup.league_id
            AND keep_row.season_id = dup.season_id
        )
    `);

    const movedStints = await tx.execute(sql`
      UPDATE player_stints AS dup
      SET team_id = ${keepTeamId}
      WHERE dup.team_id = ${duplicateTeamId}
        AND NOT EXISTS (
          SELECT 1
          FROM player_stints AS keep_row
          WHERE keep_row.player_id = dup.player_id
            AND keep_row.team_id = ${keepTeamId}
            AND keep_row.league_id = dup.league_id
            AND (
              (keep_row.season_id IS NULL AND dup.season_id IS NULL)
              OR keep_row.season_id = dup.season_id
            )
        )
    `);

    const droppedStints = await tx.execute(sql`
      DELETE FROM player_stints AS dup
      WHERE dup.team_id = ${duplicateTeamId}
        AND EXISTS (
          SELECT 1
          FROM player_stints AS keep_row
          WHERE keep_row.player_id = dup.player_id
            AND keep_row.team_id = ${keepTeamId}
            AND keep_row.league_id = dup.league_id
            AND (
              (keep_row.season_id IS NULL AND dup.season_id IS NULL)
              OR keep_row.season_id = dup.season_id
            )
        )
    `);

    await tx.execute(sql`
      UPDATE team_season_records AS dup
      SET team_id = ${keepTeamId}
      WHERE dup.team_id = ${duplicateTeamId}
        AND NOT EXISTS (
          SELECT 1
          FROM team_season_records AS keep_row
          WHERE keep_row.team_id = ${keepTeamId}
            AND keep_row.season_id = dup.season_id
        )
    `);

    await tx.execute(sql`
      DELETE FROM team_season_records AS dup
      WHERE dup.team_id = ${duplicateTeamId}
        AND EXISTS (
          SELECT 1
          FROM team_season_records AS keep_row
          WHERE keep_row.team_id = ${keepTeamId}
            AND keep_row.season_id = dup.season_id
        )
    `);

    await tx
      .update(players)
      .set({ currentTeamId: keepTeamId, updatedAt: new Date() })
      .where(eq(players.currentTeamId, duplicateTeamId));

    await tx.delete(teams).where(eq(teams.id, duplicateTeamId));

    return {
      keptTeamId: keepTeamId,
      removedTeamId: duplicateTeamId,
      keptSlug: keep.slug,
      removedSlug: duplicate.slug,
      statsMoved: Number(movedStats.rowCount ?? 0),
      statsDropped: Number(droppedStats.rowCount ?? 0),
      stintsMoved: Number(movedStints.rowCount ?? 0),
      stintsDropped: Number(droppedStints.rowCount ?? 0),
    };
  });
}

async function countTeamStints(teamId: number, database: DbClient): Promise<number> {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(playerStints)
    .where(eq(playerStints.teamId, teamId));
  return row?.count ?? 0;
}

async function countTeamSeasonStats(teamId: number, database: DbClient): Promise<number> {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(playerSeasonStats)
    .where(eq(playerSeasonStats.teamId, teamId));
  return row?.count ?? 0;
}

export async function findNcaaMensDuplicateMergePlans(
  database: DbClient = db,
): Promise<NcaaTeamMergePlan[]> {
  const report = loadNcaaTeamAliasReport();
  const mergeGroups = buildNcaaTeamMergeGroups(report);

  const [league] = await database
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, LEGACY_NCAA_MENS_SLUG))
    .limit(1);

  if (!league) return [];

  const plans: NcaaTeamMergePlan[] = [];

  for (const group of mergeGroups) {
    const matchedTeams = await database
      .select({
        id: teams.id,
        slug: teams.slug,
      })
      .from(teams)
      .where(and(eq(teams.leagueId, league.id), inArray(teams.slug, group.slugVariants)));

    if (matchedTeams.length <= 1) continue;

    const withCounts = await Promise.all(
      matchedTeams.map(async (team) => ({
        ...team,
        stats: await countTeamSeasonStats(team.id, database),
        stints: await countTeamStints(team.id, database),
      })),
    );

    const keep = withCounts.reduce((best, current) =>
      current.stats !== best.stats
        ? current.stats > best.stats
          ? current
          : best
        : current.stints > best.stints
          ? current
          : best,
    );

    const duplicates = withCounts.filter((t) => t.id !== keep.id);
    if (duplicates.length === 0) continue;

    plans.push({
      canonical: group.identity,
      keepTeamId: keep.id,
      keepSlug: keep.slug,
      duplicateTeamIds: duplicates.map((t) => t.id),
      duplicateSlugs: duplicates.map((t) => t.slug),
    });
  }

  return plans.sort((a, b) => a.canonical.name.localeCompare(b.canonical.name));
}

export async function applyNcaaTeamCanonicalIdentity(
  teamId: number,
  identity: NcaaTeamIdentity,
  database: DbClient = db,
): Promise<boolean> {
  const [team] = await database
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return false;

  if (
    team.slug === identity.slug &&
    team.name === identity.name &&
    team.abbreviation === identity.abbreviation
  ) {
    return false;
  }

  await database
    .update(teams)
    .set({
      slug: identity.slug,
      name: identity.name,
      abbreviation: identity.abbreviation,
    })
    .where(eq(teams.id, teamId));

  return true;
}

export async function executeNcaaMensTeamMergePlan(
  plan: NcaaTeamMergePlan,
  database: DbClient = db,
): Promise<NcaaTeamMergeExecution> {
  const merges: MergeTeamsResult[] = [];
  let keepTeamId = plan.keepTeamId;

  for (const duplicateId of plan.duplicateTeamIds) {
    const result = await mergeTeamInto(duplicateId, keepTeamId, database);
    merges.push(result);
    keepTeamId = result.keptTeamId;
  }

  const canonicalUpdated = await applyNcaaTeamCanonicalIdentity(
    keepTeamId,
    plan.canonical,
    database,
  );

  return { plan, merges, canonicalUpdated };
}

export async function mergeAllNcaaMensDuplicateTeams(
  database: DbClient = db,
): Promise<NcaaTeamMergeExecution[]> {
  const plans = await findNcaaMensDuplicateMergePlans(database);
  const results: NcaaTeamMergeExecution[] = [];

  for (const plan of plans) {
    results.push(await executeNcaaMensTeamMergePlan(plan, database));
  }

  return results;
}

export interface NcaaTeamIdentityUpdate {
  teamId: number;
  fromSlug: string;
  to: NcaaTeamIdentity;
}

/** Rename lone alias teams (no duplicate row) to canonical slug/name. */
export async function findNcaaMensCanonicalIdentityUpdates(
  database: DbClient = db,
): Promise<NcaaTeamIdentityUpdate[]> {
  const report = loadNcaaTeamAliasReport();
  const mergeGroups = buildNcaaTeamMergeGroups(report);

  const [league] = await database
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, LEGACY_NCAA_MENS_SLUG))
    .limit(1);

  if (!league) return [];

  const updates: NcaaTeamIdentityUpdate[] = [];

  for (const group of mergeGroups) {
    const matchedTeams = await database
      .select({
        id: teams.id,
        slug: teams.slug,
        name: teams.name,
        abbreviation: teams.abbreviation,
      })
      .from(teams)
      .where(and(eq(teams.leagueId, league.id), inArray(teams.slug, group.slugVariants)));

    if (matchedTeams.length !== 1) continue;

    const team = matchedTeams[0];
    const identity = group.identity;
    if (
      team.slug === identity.slug &&
      team.name === identity.name &&
      team.abbreviation === identity.abbreviation
    ) {
      continue;
    }

    updates.push({
      teamId: team.id,
      fromSlug: team.slug,
      to: identity,
    });
  }

  return updates.sort((a, b) => a.to.name.localeCompare(b.to.name));
}

export async function applyNcaaMensCanonicalIdentityUpdates(
  database: DbClient = db,
): Promise<NcaaTeamIdentityUpdate[]> {
  const updates = await findNcaaMensCanonicalIdentityUpdates(database);
  for (const update of updates) {
    await applyNcaaTeamCanonicalIdentity(update.teamId, update.to, database);
  }
  return updates;
}

async function findDuplicateMergePlansForLeague<T extends NcaaTeamIdentity | UsportsTeamIdentity>(
  leagueSlug: string,
  mergeGroups: Array<{
    slugVariants: string[];
    identity: T;
  }>,
  database: DbClient,
): Promise<Array<TeamMergePlan & { canonical: T }>> {
  const [league] = await database
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, leagueSlug))
    .limit(1);

  if (!league) return [];

  const plans: Array<TeamMergePlan & { canonical: T }> = [];

  for (const group of mergeGroups) {
    const matchedTeams = await database
      .select({
        id: teams.id,
        slug: teams.slug,
      })
      .from(teams)
      .where(and(eq(teams.leagueId, league.id), inArray(teams.slug, group.slugVariants)));

    if (matchedTeams.length <= 1) continue;

    const withCounts = await Promise.all(
      matchedTeams.map(async (team) => ({
        ...team,
        stats: await countTeamSeasonStats(team.id, database),
        stints: await countTeamStints(team.id, database),
      })),
    );

    const keep = withCounts.reduce((best, current) =>
      current.stats !== best.stats
        ? current.stats > best.stats
          ? current
          : best
        : current.stints > best.stints
          ? current
          : best,
    );

    const duplicates = withCounts.filter((t) => t.id !== keep.id);
    if (duplicates.length === 0) continue;

    plans.push({
      canonical: group.identity,
      keepTeamId: keep.id,
      keepSlug: keep.slug,
      duplicateTeamIds: duplicates.map((t) => t.id),
      duplicateSlugs: duplicates.map((t) => t.slug),
    });
  }

  return plans.sort((a, b) => a.canonical.name.localeCompare(b.canonical.name));
}

export async function applyUsportsTeamCanonicalIdentity(
  teamId: number,
  identity: UsportsTeamIdentity,
  database: DbClient = db,
): Promise<boolean> {
  const [team] = await database
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return false;

  if (
    team.slug === identity.slug &&
    team.name === identity.name &&
    team.abbreviation === identity.abbreviation
  ) {
    return false;
  }

  await database
    .update(teams)
    .set({
      slug: identity.slug,
      name: identity.name,
      abbreviation: identity.abbreviation,
    })
    .where(eq(teams.id, teamId));

  return true;
}

export async function findUsportsDuplicateMergePlans(
  database: DbClient = db,
): Promise<UsportsTeamMergePlan[]> {
  const report = loadUsportsTeamAliasReport();
  const mergeGroups = buildUsportsTeamMergeGroups(report);
  return findDuplicateMergePlansForLeague("u-sports", mergeGroups, database);
}

export async function executeUsportsTeamMergePlan(
  plan: UsportsTeamMergePlan,
  database: DbClient = db,
): Promise<UsportsTeamMergeExecution> {
  const merges: MergeTeamsResult[] = [];
  let keepTeamId = plan.keepTeamId;

  for (const duplicateId of plan.duplicateTeamIds) {
    const result = await mergeTeamInto(duplicateId, keepTeamId, database);
    merges.push(result);
    keepTeamId = result.keptTeamId;
  }

  const canonicalUpdated = await applyUsportsTeamCanonicalIdentity(
    keepTeamId,
    plan.canonical,
    database,
  );

  return { plan, merges, canonicalUpdated };
}

export async function mergeAllUsportsDuplicateTeams(
  database: DbClient = db,
): Promise<UsportsTeamMergeExecution[]> {
  const plans = await findUsportsDuplicateMergePlans(database);
  const results: UsportsTeamMergeExecution[] = [];

  for (const plan of plans) {
    results.push(await executeUsportsTeamMergePlan(plan, database));
  }

  return results;
}

export interface UsportsTeamIdentityUpdate {
  teamId: number;
  fromSlug: string;
  to: UsportsTeamIdentity;
}

export async function findUsportsCanonicalIdentityUpdates(
  database: DbClient = db,
): Promise<UsportsTeamIdentityUpdate[]> {
  const report = loadUsportsTeamAliasReport();
  const mergeGroups = buildUsportsTeamMergeGroups(report);

  const [league] = await database
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, "u-sports"))
    .limit(1);

  if (!league) return [];

  const updates: UsportsTeamIdentityUpdate[] = [];

  for (const group of mergeGroups) {
    const matchedTeams = await database
      .select({
        id: teams.id,
        slug: teams.slug,
        name: teams.name,
        abbreviation: teams.abbreviation,
      })
      .from(teams)
      .where(and(eq(teams.leagueId, league.id), inArray(teams.slug, group.slugVariants)));

    if (matchedTeams.length !== 1) continue;

    const team = matchedTeams[0];
    const identity = group.identity;
    if (
      team.slug === identity.slug &&
      team.name === identity.name &&
      team.abbreviation === identity.abbreviation
    ) {
      continue;
    }

    updates.push({
      teamId: team.id,
      fromSlug: team.slug,
      to: identity,
    });
  }

  return updates.sort((a, b) => a.to.name.localeCompare(b.to.name));
}

export async function applyUsportsCanonicalIdentityUpdates(
  database: DbClient = db,
): Promise<UsportsTeamIdentityUpdate[]> {
  const updates = await findUsportsCanonicalIdentityUpdates(database);
  for (const update of updates) {
    await applyUsportsTeamCanonicalIdentity(update.teamId, update.to, database);
  }
  return updates;
}

export { resolveCanonicalIdentity, resolveUsportsCanonicalIdentity };
