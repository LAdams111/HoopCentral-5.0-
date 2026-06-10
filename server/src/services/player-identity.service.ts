import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { playerIdentities, players } from "../db/schema/index.js";
import { nameToSlug } from "../utils/slug.js";

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

async function generateUniquePlayerSlug(displayName: string): Promise<string> {
  const base = nameToSlug(displayName);
  let candidate = base || "player";
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function findOrCreatePlayerByIdentity(
  input: FindOrCreatePlayerByIdentityInput,
): Promise<PlayerIdentityResult> {
  const source = input.source.trim();
  const externalId = input.externalId.trim();

  const [existingIdentity] = await db
    .select()
    .from(playerIdentities)
    .where(
      and(
        eq(playerIdentities.source, source),
        eq(playerIdentities.externalId, externalId),
      ),
    )
    .limit(1);

  if (existingIdentity) {
    const [player] = await db
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

  const slug = await generateUniquePlayerSlug(input.displayName);

  const [player] = await db
    .insert(players)
    .values({
      slug,
      displayName: input.displayName.trim(),
      birthDate: input.birthDate ?? null,
    })
    .returning();

  const [identity] = await db
    .insert(playerIdentities)
    .values({
      playerId: player.id,
      source,
      externalId,
    })
    .returning();

  return { player, identity, created: true };
}
