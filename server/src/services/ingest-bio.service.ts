import { eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { players } from "../db/schema/index.js";
import {
  findOrCreatePlayerByIdentity,
  findUniquePlayerByNameAndBirthDate,
  lookupPlayerByIdentity,
  upsertPlayerIdentity,
} from "./player-identity.service.js";
import {
  isPostgresTransientError,
} from "../utils/postgres.js";
import { sanitizeHeadshotUrl } from "../utils/headshot.js";
import { formatJerseyNumber } from "../utils/jersey.js";
import { pickBetterHometown, sanitizeIngestHometown } from "../utils/hometown.js";
import { IngestValidationError } from "./ingest.service.js";

export interface IngestPlayerBioInput {
  source: string;
  externalId: string;
  player: {
    displayName: string;
    birthDate?: string | null;
    position?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    jerseyNumber?: string | null;
    hometown?: string | null;
    country?: string | null;
    headshotUrl?: string | null;
    extendedProfile?: Record<string, unknown> | null;
  };
  linkTo?: {
    source: string;
    externalId: string;
  };
}

export interface IngestPlayerBioResult {
  ok: true;
  playerId: number;
  created: {
    player: boolean;
    identity: boolean;
  };
  linkedVia: "linkTo" | "identity" | "fuzzy" | "created";
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new IngestValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new IngestValidationError("Expected string value");
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function optionalNumber(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new IngestValidationError(`${field} must be a number`);
  }
  return value;
}

function optionalExtendedRecord(
  value: unknown,
  field: string,
): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IngestValidationError(`${field} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

export function parseIngestPlayerBioBody(body: unknown): IngestPlayerBioInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new IngestValidationError("Request body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  const player = payload.player;
  if (!player || typeof player !== "object" || Array.isArray(player)) {
    throw new IngestValidationError("player is required");
  }

  const playerObj = player as Record<string, unknown>;
  let linkTo: IngestPlayerBioInput["linkTo"];

  if (payload.linkTo !== undefined && payload.linkTo !== null) {
    if (typeof payload.linkTo !== "object" || Array.isArray(payload.linkTo)) {
      throw new IngestValidationError("linkTo must be an object");
    }
    const linkObj = payload.linkTo as Record<string, unknown>;
    linkTo = {
      source: requireString(linkObj.source, "linkTo.source"),
      externalId: requireString(linkObj.externalId, "linkTo.externalId"),
    };
  }

  return {
    source: requireString(payload.source, "source"),
    externalId: requireString(payload.externalId, "externalId"),
    player: {
      displayName: requireString(playerObj.displayName, "player.displayName"),
      birthDate: optionalString(playerObj.birthDate),
      position: optionalString(playerObj.position),
      heightCm: optionalNumber(playerObj.heightCm, "player.heightCm"),
      weightKg: optionalNumber(playerObj.weightKg, "player.weightKg"),
      jerseyNumber: optionalString(playerObj.jerseyNumber),
      hometown: optionalString(playerObj.hometown),
      country: optionalString(playerObj.country),
      headshotUrl: optionalString(playerObj.headshotUrl),
      extendedProfile: optionalExtendedRecord(
        playerObj.extendedProfile,
        "player.extendedProfile",
      ),
    },
    linkTo,
  };
}

type ResolveResult = {
  playerId: number;
  createdPlayer: boolean;
  createdIdentity: boolean;
  linkedVia: IngestPlayerBioResult["linkedVia"];
};

async function resolvePlayerForBioIngest(
  input: IngestPlayerBioInput,
  database: DbClient,
): Promise<ResolveResult> {
  const source = input.source.trim();
  const externalId = input.externalId.trim();

  if (input.linkTo) {
    const linked = await lookupPlayerByIdentity(
      database,
      input.linkTo.source,
      input.linkTo.externalId,
    );
    if (!linked) {
      throw new IngestValidationError(
        `linkTo identity not found: ${input.linkTo.source}:${input.linkTo.externalId}`,
      );
    }

    const hadIdentity = await lookupPlayerByIdentity(database, source, externalId);
    await upsertPlayerIdentity(
      database,
      source,
      externalId,
      linked.player.id,
    );

    return {
      playerId: linked.player.id,
      createdPlayer: false,
      createdIdentity: !hadIdentity,
      linkedVia: "linkTo",
    };
  }

  const existing = await lookupPlayerByIdentity(database, source, externalId);
  if (existing) {
    return {
      playerId: existing.player.id,
      createdPlayer: false,
      createdIdentity: false,
      linkedVia: "identity",
    };
  }

  if (input.player.birthDate) {
    const fuzzyMatch = await findUniquePlayerByNameAndBirthDate(
      input.player.displayName,
      input.player.birthDate,
      database,
    );
    if (fuzzyMatch) {
      const hadIdentity = await lookupPlayerByIdentity(database, source, externalId);
      await upsertPlayerIdentity(database, source, externalId, fuzzyMatch.id);
      return {
        playerId: fuzzyMatch.id,
        createdPlayer: false,
        createdIdentity: !hadIdentity,
        linkedVia: "fuzzy",
      };
    }
  }

  const created = await findOrCreatePlayerByIdentity(
    {
      source,
      externalId,
      displayName: input.player.displayName,
      birthDate: input.player.birthDate ?? null,
    },
    database,
  );

  return {
    playerId: created.player.id,
    createdPlayer: created.created,
    createdIdentity: created.created,
    linkedVia: "created",
  };
}

function buildBioUpdate(
  input: IngestPlayerBioInput,
  existingHometown: string | null = null,
): Partial<typeof players.$inferInsert> {
  const update: Partial<typeof players.$inferInsert> = {
    displayName: input.player.displayName,
    updatedAt: new Date(),
  };

  if (input.player.birthDate !== undefined) update.birthDate = input.player.birthDate;
  if (input.player.position !== undefined) update.position = input.player.position;
  if (input.player.heightCm !== undefined) update.heightCm = input.player.heightCm;
  if (input.player.weightKg !== undefined) update.weightKg = input.player.weightKg;
  if (input.player.jerseyNumber !== undefined) {
    const jersey =
      input.player.jerseyNumber != null
        ? formatJerseyNumber(input.player.jerseyNumber) || input.player.jerseyNumber
        : input.player.jerseyNumber;
    update.jerseyNumber = jersey;
  }
  if (input.player.hometown !== undefined) {
    if (input.player.hometown === null) {
      update.hometown = null;
    } else {
      const sanitized = sanitizeIngestHometown(input.player.hometown);
      const picked = pickBetterHometown(existingHometown, sanitized);
      if (picked) update.hometown = picked;
    }
  }
  if (input.player.country !== undefined) update.country = input.player.country;

  if (input.player.headshotUrl) {
    const sanitized = sanitizeHeadshotUrl(input.player.headshotUrl);
    if (sanitized) update.headshotUrl = sanitized;
  }
  if (input.player.extendedProfile != null && Object.keys(input.player.extendedProfile).length > 0) {
    update.extendedProfile = input.player.extendedProfile;
  }

  return update;
}

async function ingestPlayerBioOnce(
  input: IngestPlayerBioInput,
): Promise<IngestPlayerBioResult> {
  return db.transaction(async (tx) => {
    const resolved = await resolvePlayerForBioIngest(input, tx);

    const [existing] = await tx
      .select({ hometown: players.hometown })
      .from(players)
      .where(eq(players.id, resolved.playerId))
      .limit(1);

    await tx
      .update(players)
      .set(buildBioUpdate(input, existing?.hometown ?? null))
      .where(eq(players.id, resolved.playerId));

    return {
      ok: true,
      playerId: resolved.playerId,
      created: {
        player: resolved.createdPlayer,
        identity: resolved.createdIdentity,
      },
      linkedVia: resolved.linkedVia,
    };
  });
}

export async function ingestPlayerBio(
  input: IngestPlayerBioInput,
): Promise<IngestPlayerBioResult> {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await ingestPlayerBioOnce(input);
    } catch (err) {
      if (!isPostgresTransientError(err) || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }

  throw new Error("ingestPlayerBio failed after retries");
}
