import { and, eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { playerIdentities, players } from "../db/schema/index.js";
import { isPostgresUniqueViolation } from "../utils/postgres.js";
import { nameToSlug } from "../utils/slug.js";

export function normalizeDisplayName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface FindOrCreatePlayerByIdentityInput {
  source: string;
  externalId: string;
  displayName: string;
  birthDate?: string | null;
  /** Reserved for future ingestion metadata; not persisted yet. */
  metadata?: Record<string, unknown>;
}

export interface PlayerIdentityResult {
  player: typeof players.$inferSelect;
  identity: typeof playerIdentities.$inferSelect;
  created: boolean;
}

async function generateUniquePlayerSlug(
  displayName: string,
  database: DbClient,
): Promise<string> {
  const base = nameToSlug(displayName);
  let candidate = base || "player";
  let suffix = 2;

  while (true) {
    const [existing] = await database
      .select({ id: players.id })
      .from(players)
      .where(eq(players.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function lookupPlayerByIdentity(
  database: DbClient,
  source: string,
  externalId: string,
): Promise<PlayerIdentityResult | null> {
  const [existingIdentity] = await database
    .select()
    .from(playerIdentities)
    .where(
      and(
        eq(playerIdentities.source, source),
        eq(playerIdentities.externalId, externalId),
      ),
    )
    .limit(1);

  if (!existingIdentity) return null;

  const [player] = await database
    .select()
    .from(players)
    .where(eq(players.id, existingIdentity.playerId))
    .limit(1);

  if (!player) {
    throw new Error(
      `Player identity ${existingIdentity.id} references missing player ${existingIdentity.playerId}`,
    );
  }

  return { player, identity: existingIdentity, created: false };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findOrCreatePlayerByIdentity(
  input: FindOrCreatePlayerByIdentityInput,
  database: DbClient = db,
): Promise<PlayerIdentityResult> {
  const source = input.source.trim();
  const externalId = input.externalId.trim();
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const existing = await lookupPlayerByIdentity(database, source, externalId);
    if (existing) return existing;

    try {
      const slug = await generateUniquePlayerSlug(input.displayName, database);

      const [player] = await database
        .insert(players)
        .values({
          slug,
          displayName: input.displayName.trim(),
          birthDate: input.birthDate ?? null,
        })
        .returning();

      const [identity] = await database
        .insert(playerIdentities)
        .values({
          playerId: player.id,
          source,
          externalId,
        })
        .returning();

      return { player, identity, created: true };
    } catch (err) {
      if (!isPostgresUniqueViolation(err)) throw err;
      if (attempt < maxAttempts - 1) {
        await sleep(25 * (attempt + 1));
        continue;
      }
      const raced = await lookupPlayerByIdentity(database, source, externalId);
      if (raced) return raced;
      throw err;
    }
  }

  throw new Error(
    `Failed to find or create player identity for ${source}:${externalId}`,
  );
}

export async function findUniquePlayerByNameAndBirthDate(
  displayName: string,
  birthDate: string,
  database: DbClient = db,
): Promise<(typeof players.$inferSelect) | null> {
  const normalized = normalizeDisplayName(displayName);
  if (!normalized || !birthDate.trim()) return null;

  const rows = await database
    .select()
    .from(players)
    .where(eq(players.birthDate, birthDate));

  const matches = rows.filter(
    (player) => normalizeDisplayName(player.displayName) === normalized,
  );

  if (matches.length === 1) return matches[0];
  return null;
}

export async function upsertPlayerIdentity(
  database: DbClient,
  source: string,
  externalId: string,
  playerId: number,
): Promise<typeof playerIdentities.$inferSelect> {
  const trimmedSource = source.trim();
  const trimmedExternalId = externalId.trim();
  const existing = await lookupPlayerByIdentity(
    database,
    trimmedSource,
    trimmedExternalId,
  );

  if (existing) {
    if (existing.player.id !== playerId) {
      throw new Error(
        `Identity ${trimmedSource}:${trimmedExternalId} is linked to player ${existing.player.id}, not ${playerId}`,
      );
    }
    return existing.identity;
  }

  try {
    const [identity] = await database
      .insert(playerIdentities)
      .values({
        playerId,
        source: trimmedSource,
        externalId: trimmedExternalId,
      })
      .returning();
    return identity;
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) throw err;
    const raced = await lookupPlayerByIdentity(
      database,
      trimmedSource,
      trimmedExternalId,
    );
    if (!raced) throw err;
    if (raced.player.id !== playerId) {
      throw new Error(
        `Identity ${trimmedSource}:${trimmedExternalId} is linked to player ${raced.player.id}, not ${playerId}`,
      );
    }
    return raced.identity;
  }
}
