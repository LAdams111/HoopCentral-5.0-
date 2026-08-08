import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  leagues,
  playerSeasonPlayoffStats,
  playerSeasonStats,
  playerStints,
  players,
} from "../db/schema/index.js";
import { IngestValidationError } from "./ingest.service.js";

const NCAA_LEAGUE_SLUGS = ["ncaa", "ncaa-w"] as const;

export interface ClearPlayerNcaaSeasonsInput {
  playerId: number;
}

export interface ClearPlayerNcaaSeasonsResult {
  ok: true;
  playerId: number;
  statsRemoved: number;
  stintsRemoved: number;
  playoffStatsRemoved: number;
}

function requirePlayerId(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new IngestValidationError(`${field} must be a positive integer`);
  }
  return value;
}

export function parseClearPlayerNcaaSeasonsBody(body: unknown): ClearPlayerNcaaSeasonsInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new IngestValidationError("Request body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  return {
    playerId: requirePlayerId(payload.playerId, "playerId"),
  };
}

export async function clearPlayerNcaaSeasons(
  input: ClearPlayerNcaaSeasonsInput,
): Promise<ClearPlayerNcaaSeasonsResult> {
  const [player] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.id, input.playerId))
    .limit(1);

  if (!player) {
    throw new IngestValidationError(`Player ${input.playerId} not found`);
  }

  const leagueRows = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(inArray(leagues.slug, [...NCAA_LEAGUE_SLUGS]));

  const leagueIds = leagueRows.map((row) => row.id);
  if (leagueIds.length === 0) {
    return {
      ok: true,
      playerId: input.playerId,
      statsRemoved: 0,
      stintsRemoved: 0,
      playoffStatsRemoved: 0,
    };
  }

  return db.transaction(async (tx) => {
    const statRows = await tx
      .select({ id: playerSeasonStats.id })
      .from(playerSeasonStats)
      .where(
        and(
          eq(playerSeasonStats.playerId, input.playerId),
          inArray(playerSeasonStats.leagueId, leagueIds),
        ),
      );

    const stintRows = await tx
      .select({ id: playerStints.id })
      .from(playerStints)
      .where(
        and(
          eq(playerStints.playerId, input.playerId),
          inArray(playerStints.leagueId, leagueIds),
        ),
      );

    const playoffRows = await tx
      .select({ id: playerSeasonPlayoffStats.id })
      .from(playerSeasonPlayoffStats)
      .where(
        and(
          eq(playerSeasonPlayoffStats.playerId, input.playerId),
          inArray(playerSeasonPlayoffStats.leagueId, leagueIds),
        ),
      );

    if (playoffRows.length > 0) {
      await tx
        .delete(playerSeasonPlayoffStats)
        .where(
          and(
            eq(playerSeasonPlayoffStats.playerId, input.playerId),
            inArray(playerSeasonPlayoffStats.leagueId, leagueIds),
          ),
        );
    }

    if (statRows.length > 0) {
      await tx
        .delete(playerSeasonStats)
        .where(
          and(
            eq(playerSeasonStats.playerId, input.playerId),
            inArray(playerSeasonStats.leagueId, leagueIds),
          ),
        );
    }

    if (stintRows.length > 0) {
      await tx
        .delete(playerStints)
        .where(
          and(
            eq(playerStints.playerId, input.playerId),
            inArray(playerStints.leagueId, leagueIds),
          ),
        );
    }

    return {
      ok: true,
      playerId: input.playerId,
      statsRemoved: statRows.length,
      stintsRemoved: stintRows.length,
      playoffStatsRemoved: playoffRows.length,
    };
  });
}
