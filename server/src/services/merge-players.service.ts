import { and, eq, isNull, sql } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import {
  playerIdentities,
  playerSeasonStats,
  playerStints,
  players,
} from "../db/schema/index.js";
import { normalizeDisplayName, displayNamesLikelySamePerson } from "./player-identity.service.js";

export interface MergePlayersResult {
  keptPlayerId: number;
  removedPlayerId: number;
  displayName: string;
  profileViewsTransferred: number;
  slugTransferred: boolean;
  identitiesMoved: number;
  stintsMoved: number;
  statsMoved: number;
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

    let identitiesMoved = 0;
    let stintsMoved = 0;
    let statsMoved = 0;

    const duplicateIdentities = await tx
      .select()
      .from(playerIdentities)
      .where(eq(playerIdentities.playerId, duplicatePlayerId));

    for (const identity of duplicateIdentities) {
      const keepIdentityConflict = identity.leagueId
        ? await tx
            .select({ id: playerIdentities.id })
            .from(playerIdentities)
            .where(
              and(
                eq(playerIdentities.playerId, keepPlayerId),
                eq(playerIdentities.leagueId, identity.leagueId),
                eq(playerIdentities.source, identity.source),
              ),
            )
            .limit(1)
        : await tx
            .select({ id: playerIdentities.id })
            .from(playerIdentities)
            .where(
              and(
                eq(playerIdentities.playerId, keepPlayerId),
                isNull(playerIdentities.leagueId),
                eq(playerIdentities.source, identity.source),
              ),
            )
            .limit(1);

      if (keepIdentityConflict.length) {
        await tx
          .delete(playerIdentities)
          .where(eq(playerIdentities.id, identity.id));
        continue;
      }

      await tx
        .update(playerIdentities)
        .set({ playerId: keepPlayerId, updatedAt: new Date() })
        .where(eq(playerIdentities.id, identity.id));
      identitiesMoved += 1;
    }

    const duplicateStints = await tx
      .select()
      .from(playerStints)
      .where(eq(playerStints.playerId, duplicatePlayerId));

    for (const stint of duplicateStints) {
      const stintConflict =
        stint.seasonId == null
          ? await tx
              .select({ id: playerStints.id })
              .from(playerStints)
              .where(
                and(
                  eq(playerStints.playerId, keepPlayerId),
                  eq(playerStints.teamId, stint.teamId),
                  eq(playerStints.leagueId, stint.leagueId),
                  isNull(playerStints.seasonId),
                ),
              )
              .limit(1)
          : await tx
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

      if (stintConflict.length) {
        await tx.delete(playerStints).where(eq(playerStints.id, stint.id));
        continue;
      }

      await tx
        .update(playerStints)
        .set({ playerId: keepPlayerId })
        .where(eq(playerStints.id, stint.id));
      stintsMoved += 1;
    }

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

      if (existingOnKeep) {
        await tx
          .delete(playerSeasonStats)
          .where(eq(playerSeasonStats.id, stat.id));
        continue;
      }

      await tx
        .update(playerSeasonStats)
        .set({ playerId: keepPlayerId })
        .where(eq(playerSeasonStats.id, stat.id));
      statsMoved += 1;
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
      identitiesMoved,
      stintsMoved,
      statsMoved,
    };
  });
}

export interface D2DuplicatePair {
  d2PlayerId: number;
  balldontliePlayerId: number;
  displayName: string;
  birthDate: string | null;
  d2ExternalId: string;
  balldontlieExternalId: string;
}

/** D2 profiles whose name + birthDate match exactly one balldontlie player on a different id. */
export async function findD2BalldontlieDuplicates(
  database: DbClient = db,
): Promise<D2DuplicatePair[]> {
  const d2Identities = await database
    .select({
      playerId: playerIdentities.playerId,
      externalId: playerIdentities.externalId,
      displayName: players.displayName,
      birthDate: players.birthDate,
    })
    .from(playerIdentities)
    .innerJoin(players, eq(playerIdentities.playerId, players.id))
    .where(eq(playerIdentities.source, "usbasket-ncaa-d2"));

  const bdlIdentities = await database
    .select({
      playerId: playerIdentities.playerId,
      externalId: playerIdentities.externalId,
      displayName: players.displayName,
      birthDate: players.birthDate,
    })
    .from(playerIdentities)
    .innerJoin(players, eq(playerIdentities.playerId, players.id))
    .where(eq(playerIdentities.source, "balldontlie"));

  const bdlByKey = new Map<string, typeof bdlIdentities>();
  for (const row of bdlIdentities) {
    if (!row.birthDate) continue;
    const key = `${normalizeDisplayName(row.displayName)}|${row.birthDate}`;
    const list = bdlByKey.get(key) ?? [];
    list.push(row);
    bdlByKey.set(key, list);
  }

  const pairs: D2DuplicatePair[] = [];

  for (const d2 of d2Identities) {
    if (!d2.birthDate) continue;
    const key = `${normalizeDisplayName(d2.displayName)}|${d2.birthDate}`;
    const matches = bdlByKey.get(key);
    if (!matches || matches.length !== 1) continue;

    const bdl = matches[0];
    if (bdl.playerId === d2.playerId) continue;

    pairs.push({
      d2PlayerId: d2.playerId,
      balldontliePlayerId: bdl.playerId,
      displayName: d2.displayName,
      birthDate: d2.birthDate,
      d2ExternalId: d2.externalId,
      balldontlieExternalId: bdl.externalId,
    });
  }

  return pairs.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export interface NbaSplitDuplicatePair {
  sparsePlayerId: number;
  keepPlayerId: number;
  displayName: string;
  sparseIdentities: number;
  keepIdentities: number;
  sparseStats: number;
  keepStats: number;
}

const PRO_KEEP_IDENTITY_SOURCES = new Set([
  "balldontlie",
  "basketball-reference",
  "sports-reference-cbb",
  "seed",
  "usbasket-ncaa-d1",
  "usbasket-profile",
]);

function parseIdentitySources(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((entry) => entry.split(":")[0]?.trim()).filter(Boolean);
}

function isValidKeepCandidate(
  sparse: { birth_date: string | null },
  candidate: { birth_date: string | null },
  candidateSources: string[],
): boolean {
  const hasMaxpreps = candidateSources.includes("maxpreps-hs-basketball");
  const hasCorePro = candidateSources.some((source) =>
    ["basketball-reference", "sports-reference-cbb", "balldontlie", "seed"].includes(
      source,
    ),
  );
  if (hasMaxpreps && !hasCorePro) return false;

  if (candidateSources.some((source) => PRO_KEEP_IDENTITY_SOURCES.has(source))) {
    return true;
  }
  return Boolean(candidate.birth_date && !sparse.birth_date);
}

function playerRichnessScore(player: {
  birthDate: string | null;
  hometown: string | null;
  headshotUrl: string | null;
  identityCount: number;
  statCount: number;
}): number {
  return (
    player.identityCount * 1000 +
    player.statCount * 10 +
    (player.birthDate ? 50 : 0) +
    (player.hometown ? 20 : 0) +
    (player.headshotUrl ? 10 : 0)
  );
}

/** BDL-created sparse NBA records that match a richer profile under a variant name. */
export async function findNbaBalldontlieSplitDuplicates(
  database: DbClient = db,
): Promise<NbaSplitDuplicatePair[]> {
  const sparseCandidates = await database.execute(sql`
    SELECT
      p.id,
      p.display_name,
      p.birth_date,
      p.hometown,
      p.headshot_url,
      (SELECT COUNT(*)::int FROM player_identities pi WHERE pi.player_id = p.id) AS identity_count,
      (SELECT COUNT(*)::int FROM player_season_stats pss WHERE pss.player_id = p.id) AS stat_count,
      (SELECT string_agg(pi.source, ',') FROM player_identities pi WHERE pi.player_id = p.id) AS identity_sources
    FROM players p
    WHERE EXISTS (
      SELECT 1 FROM player_identities pi
      WHERE pi.player_id = p.id AND pi.source = 'balldontlie'
    )
    AND (SELECT COUNT(*)::int FROM player_identities pi WHERE pi.player_id = p.id) <= 2
    AND (
      p.birth_date IS NULL
      OR p.hometown IS NULL
      OR COALESCE(p.headshot_url, '') = ''
    )
    AND NOT EXISTS (
      SELECT 1
      FROM player_identities pi
      WHERE pi.player_id = p.id
        AND pi.source IN (
          'sports-reference-cbb',
          'basketball-reference',
          'seed'
        )
    )
    AND EXISTS (
      SELECT 1
      FROM player_season_stats pss
      JOIN leagues l ON l.id = pss.league_id
      JOIN seasons s ON s.id = pss.season_id
      WHERE pss.player_id = p.id
        AND l.slug = 'nba'
        AND s.season_label >= '2024-25'
    )
  `);

  const allCandidates = await database.execute(sql`
    SELECT
      p.id,
      p.display_name,
      p.birth_date,
      p.hometown,
      p.headshot_url,
      (SELECT COUNT(*)::int FROM player_identities pi WHERE pi.player_id = p.id) AS identity_count,
      (SELECT COUNT(*)::int FROM player_season_stats pss WHERE pss.player_id = p.id) AS stat_count,
      (SELECT string_agg(pi.source, ',') FROM player_identities pi WHERE pi.player_id = p.id) AS identity_sources
    FROM players p
    WHERE p.birth_date IS NOT NULL
      OR (SELECT COUNT(*)::int FROM player_identities pi WHERE pi.player_id = p.id) >= 2
  `);

  const sparseRows = sparseCandidates.rows as Array<{
    id: number;
    display_name: string;
    birth_date: string | null;
    hometown: string | null;
    headshot_url: string | null;
    identity_count: number;
    stat_count: number;
    identity_sources: string | null;
  }>;

  const allRows = allCandidates.rows as typeof sparseRows;

  const pairs: NbaSplitDuplicatePair[] = [];
  const usedSparse = new Set<number>();
  const usedKeep = new Set<number>();

  for (const sparse of sparseRows) {
    let bestKeep: (typeof allRows)[number] | null = null;
    let bestScore = -1;

    for (const candidate of allRows) {
      if (candidate.id === sparse.id) continue;
      if (!displayNamesLikelySamePerson(sparse.display_name, candidate.display_name)) {
        continue;
      }
      if (
        sparse.birth_date &&
        candidate.birth_date &&
        sparse.birth_date !== candidate.birth_date
      ) {
        continue;
      }

      const score = playerRichnessScore({
        birthDate: candidate.birth_date,
        hometown: candidate.hometown,
        headshotUrl: candidate.headshot_url,
        identityCount: candidate.identity_count,
        statCount: candidate.stat_count,
      });

      const sparseScore = playerRichnessScore({
        birthDate: sparse.birth_date,
        hometown: sparse.hometown,
        headshotUrl: sparse.headshot_url,
        identityCount: sparse.identity_count,
        statCount: sparse.stat_count,
      });

      if (score <= sparseScore) continue;

      const keepIsRicher =
        candidate.identity_count > sparse.identity_count ||
        candidate.stat_count > sparse.stat_count ||
        Boolean(candidate.birth_date && !sparse.birth_date);
      if (!keepIsRicher) continue;
      if (candidate.identity_count < 2 && !candidate.birth_date) continue;

      const candidateSources = parseIdentitySources(candidate.identity_sources);
      if (!isValidKeepCandidate(sparse, candidate, candidateSources)) continue;

      if (score > bestScore) {
        bestScore = score;
        bestKeep = candidate;
      }
    }

    if (!bestKeep) continue;
    if (usedSparse.has(sparse.id) || usedKeep.has(bestKeep.id)) continue;

    usedSparse.add(sparse.id);
    usedKeep.add(bestKeep.id);

    pairs.push({
      sparsePlayerId: sparse.id,
      keepPlayerId: bestKeep.id,
      displayName: bestKeep.display_name,
      sparseIdentities: sparse.identity_count,
      keepIdentities: bestKeep.identity_count,
      sparseStats: sparse.stat_count,
      keepStats: bestKeep.stat_count,
    });
  }

  return pairs.sort((a, b) => a.displayName.localeCompare(b.displayName));
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
