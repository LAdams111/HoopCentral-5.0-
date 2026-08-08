import { mergePlayerInto } from "./merge-players.service.js";
import { IngestValidationError } from "./ingest.service.js";

export interface MergePlayersInput {
  keepPlayerId: number;
  removePlayerId: number;
}

export interface MergePlayersResult {
  ok: true;
  keepPlayerId: number;
  removePlayerId: number;
  displayName: string;
  identitiesMoved: number;
  stintsMoved: number;
  statsMoved: number;
}

function requirePlayerId(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new IngestValidationError(`${field} must be a positive integer`);
  }
  return value;
}

export function parseMergePlayersBody(body: unknown): MergePlayersInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new IngestValidationError("Request body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  return {
    keepPlayerId: requirePlayerId(payload.keepPlayerId, "keepPlayerId"),
    removePlayerId: requirePlayerId(payload.removePlayerId, "removePlayerId"),
  };
}

export async function ingestMergePlayers(
  input: MergePlayersInput,
): Promise<MergePlayersResult> {
  const result = await mergePlayerInto(input.removePlayerId, input.keepPlayerId);
  return {
    ok: true,
    keepPlayerId: result.keptPlayerId,
    removePlayerId: result.removedPlayerId,
    displayName: result.displayName,
    identitiesMoved: result.identitiesMoved,
    stintsMoved: result.stintsMoved,
    statsMoved: result.statsMoved,
  };
}
