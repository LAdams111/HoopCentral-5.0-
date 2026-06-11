import { and, eq, sql } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { playerIdentities, playerSeasonStats, players } from "../db/schema/index.js";

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

    await tx
      .update(players)
      .set({
        profileViews: mergedViews,
        birthDate: keep.birthDate ?? duplicate.birthDate,
        headshotUrl: keep.headshotUrl || duplicate.headshotUrl || "",
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

  return pairs.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function countPlayerSeasonStats(
  playerId: number,
  database: DbClient = db,
): Promise<number> {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(playerSeasonStats)
    .where(eq(playerSeasonStats.playerId, playerId));
  return row?.count ?? 0;
}
