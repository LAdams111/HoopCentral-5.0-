import { and, eq, sql } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import {
  playerIdentities,
  playerSeasonStats,
  playerStints,
  players,
} from "../db/schema/index.js";

export interface MergePlayersResult {
  keptPlayerId: number;
  removedPlayerId: number;
  displayName: string;
  profileViewsTransferred: number;
  slugTransferred: boolean;
}

/**
 * Merge duplicatePlayer into keepPlayer: transfer views + canonical slug, delete duplicate.
 * Duplicate season rows are dropped (keep player's backfill data wins).
 */
export async function mergePlayerInto(
  duplicatePlayerId: number,
  keepPlayerId: number,
  database: DbClient = db,
): Promise<MergePlayersResult> {
  if (duplicatePlayerId === keepPlayerId) {
    throw new Error("Cannot merge a player into itself");
  }

  return database.transaction(async (tx) => {
    const [duplicate] = await tx
      .select()
      .from(players)
      .where(eq(players.id, duplicatePlayerId))
      .limit(1);
    const [keep] = await tx
      .select()
      .from(players)
      .where(eq(players.id, keepPlayerId))
      .limit(1);

    if (!duplicate || !keep) {
      throw new Error(
        `Missing player(s): duplicate=${duplicatePlayerId} keep=${keepPlayerId}`,
      );
    }

    const duplicateSlug = duplicate.slug;
    const keepSlug = keep.slug;
    const preferDuplicateSlug =
      duplicateSlug.length < keepSlug.length ||
      (keepSlug.includes("-") && !duplicateSlug.includes("-"));

    const mergedViews = keep.profileViews + duplicate.profileViews;

    // Move season rows that exist only on the duplicate (e.g. seed 2023-24 before backfill catches up).
    const duplicateStats = await tx
      .select()
      .from(playerSeasonStats)
      .where(eq(playerSeasonStats.playerId, duplicatePlayerId));

    for (const stat of duplicateStats) {
      const [existingOnKeep] = await tx
        .select({ id: playerSeasonStats.id })
        .from(playerSeasonStats)
        .where(
          and(
            eq(playerSeasonStats.playerId, keepPlayerId),
            eq(playerSeasonStats.teamId, stat.teamId),
            eq(playerSeasonStats.leagueId, stat.leagueId),
            eq(playerSeasonStats.seasonId, stat.seasonId),
          ),
        )
        .limit(1);

      if (existingOnKeep) continue;

      await tx
        .update(playerSeasonStats)
        .set({ playerId: keepPlayerId })
        .where(eq(playerSeasonStats.id, stat.id));

      const duplicateStints = await tx
        .select()
        .from(playerStints)
        .where(
          and(
            eq(playerStints.playerId, duplicatePlayerId),
            eq(playerStints.teamId, stat.teamId),
            eq(playerStints.leagueId, stat.leagueId),
            eq(playerStints.seasonId, stat.seasonId),
          ),
        );

      for (const stint of duplicateStints) {
        if (stint.seasonId == null) continue;
        const [stintOnKeep] = await tx
          .select({ id: playerStints.id })
          .from(playerStints)
          .where(
            and(
              eq(playerStints.playerId, keepPlayerId),
              eq(playerStints.teamId, stint.teamId),
              eq(playerStints.leagueId, stint.leagueId),
              eq(playerStints.seasonId, stint.seasonId),
            ),
          )
          .limit(1);
        if (stintOnKeep) continue;
        await tx
          .update(playerStints)
          .set({ playerId: keepPlayerId })
          .where(eq(playerStints.id, stint.id));
      }
    }

    await tx
      .update(players)
      .set({
        profileViews: mergedViews,
        birthDate: keep.birthDate ?? duplicate.birthDate,
        headshotUrl: keep.headshotUrl || duplicate.headshotUrl || "",
        position: keep.position || duplicate.position,
        hometown: keep.hometown || duplicate.hometown,
        heightCm: keep.heightCm ?? duplicate.heightCm,
        weightKg: keep.weightKg ?? duplicate.weightKg,
        updatedAt: new Date(),
      })
      .where(eq(players.id, keepPlayerId));

    if (preferDuplicateSlug && duplicateSlug !== keepSlug) {
      await tx
        .update(players)
        .set({ slug: `_merged_${duplicatePlayerId}` })
        .where(eq(players.id, duplicatePlayerId));

      await tx
        .update(players)
        .set({ slug: duplicateSlug, updatedAt: new Date() })
        .where(eq(players.id, keepPlayerId));
    }

    await tx.delete(players).where(eq(players.id, duplicatePlayerId));

    return {
      keptPlayerId: keepPlayerId,
      removedPlayerId: duplicatePlayerId,
      displayName: keep.displayName,
      profileViewsTransferred: duplicate.profileViews,
      slugTransferred: preferDuplicateSlug && duplicateSlug !== keepSlug,
    };
  });
}

export interface SeedDuplicatePair {
  seedPlayerId: number;
  balldontliePlayerId: number;
  displayName: string;
  seedSeasons: number;
  balldontlieSeasons: number;
}

const KNOWN_SEED_TO_BDL: Record<number, number> = {
  4: 22, // Victor Wembanyama — keep balldontlie even if seed has more seasons (for now)
};

/** Find seed-profile duplicates where a balldontlie profile has more season history. */
export async function findSeedBalldontlieDuplicates(
  database: DbClient = db,
): Promise<SeedDuplicatePair[]> {
  const seedIdentities = await database
    .select({
      playerId: playerIdentities.playerId,
      displayName: players.displayName,
    })
    .from(playerIdentities)
    .innerJoin(players, eq(playerIdentities.playerId, players.id))
    .where(eq(playerIdentities.source, "seed"));

  const bdlIdentities = await database
    .select({
      playerId: playerIdentities.playerId,
      displayName: players.displayName,
    })
    .from(playerIdentities)
    .innerJoin(players, eq(playerIdentities.playerId, players.id))
    .where(eq(playerIdentities.source, "balldontlie"));

  const bdlByName = new Map<string, number[]>();
  for (const row of bdlIdentities) {
    const key = row.displayName.trim().toLowerCase();
    const list = bdlByName.get(key) ?? [];
    list.push(row.playerId);
    bdlByName.set(key, list);
  }

  const pairs: SeedDuplicatePair[] = [];

  for (const seed of seedIdentities) {
    const key = seed.displayName.trim().toLowerCase();
    const bdlIds = bdlByName.get(key);
    if (!bdlIds?.length) continue;

    const [seedCount] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(playerSeasonStats)
      .where(eq(playerSeasonStats.playerId, seed.playerId));

    let bestBdlId = bdlIds[0];
    let bestCount = 0;
    for (const bdlId of bdlIds) {
      const [row] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(playerSeasonStats)
        .where(eq(playerSeasonStats.playerId, bdlId));
      const count = row?.count ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestBdlId = bdlId;
      }
    }

    const seedSeasons = seedCount?.count ?? 0;
    if (bestCount > seedSeasons) {
      pairs.push({
        seedPlayerId: seed.playerId,
        balldontliePlayerId: bestBdlId,
        displayName: seed.displayName,
        seedSeasons,
        balldontlieSeasons: bestCount,
      });
    }
  }

  for (const [seedId, bdlId] of Object.entries(KNOWN_SEED_TO_BDL)) {
    const seedPlayerId = Number(seedId);
    const balldontliePlayerId = Number(bdlId);
    if (pairs.some((p) => p.seedPlayerId === seedPlayerId)) continue;

    const [seedRow] = await database
      .select({ displayName: players.displayName })
      .from(players)
      .where(eq(players.id, seedPlayerId))
      .limit(1);
    if (!seedRow) continue;

    const seedSeasons = await countPlayerSeasonStats(seedPlayerId, database);
    const balldontlieSeasons = await countPlayerSeasonStats(balldontliePlayerId, database);

    pairs.push({
      seedPlayerId,
      balldontliePlayerId,
      displayName: seedRow.displayName,
      seedSeasons,
      balldontlieSeasons,
    });
  }

  return pairs.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function countPlayerSeasonStatsInner(
  playerId: number,
  database: DbClient,
): Promise<number> {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(playerSeasonStats)
    .where(eq(playerSeasonStats.playerId, playerId));
  return row?.count ?? 0;
}

export async function countPlayerSeasonStats(
  playerId: number,
  database: DbClient = db,
): Promise<number> {
  return countPlayerSeasonStatsInner(playerId, database);
}
