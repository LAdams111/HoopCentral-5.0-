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

/** usbasket-profile noise — not authoritative for CBB CSV replace. */
const JUNK_COLLEGE_LEAGUE_SLUGS = [
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
  "uscaa",
  "university-league",
  "high-school",
  "high-school-w",
] as const;

export interface ClearPlayerNcaaSeasonsInput {
  playerId: number;
}

export interface ClearPlayerNcaaSeasonsResult {
  ok: true;
  playerId: number;
  statsRemoved: number;
  stintsRemoved: number;
  playoffStatsRemoved: number;
  junkStatsRemoved: number;
  zeroGpStatsRemoved: number;
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

  return db.transaction(async (tx) => {
    const ncaaLeagueRows = await tx
      .select({ id: leagues.id })
      .from(leagues)
      .where(inArray(leagues.slug, [...NCAA_LEAGUE_SLUGS]));
    const ncaaLeagueIds = ncaaLeagueRows.map((row) => row.id);

    const junkLeagueRows = await tx
      .select({ id: leagues.id })
      .from(leagues)
      .where(inArray(leagues.slug, [...JUNK_COLLEGE_LEAGUE_SLUGS]));
    const junkLeagueIds = junkLeagueRows.map((row) => row.id);

    const ncaaStatRows =
      ncaaLeagueIds.length > 0
        ? await tx
            .select({ id: playerSeasonStats.id, teamId: playerSeasonStats.teamId, leagueId: playerSeasonStats.leagueId, seasonId: playerSeasonStats.seasonId })
            .from(playerSeasonStats)
            .where(
              and(
                eq(playerSeasonStats.playerId, input.playerId),
                inArray(playerSeasonStats.leagueId, ncaaLeagueIds),
              ),
            )
        : [];

    const junkStatRows =
      junkLeagueIds.length > 0
        ? await tx
            .select({ id: playerSeasonStats.id, teamId: playerSeasonStats.teamId, leagueId: playerSeasonStats.leagueId, seasonId: playerSeasonStats.seasonId })
            .from(playerSeasonStats)
            .where(
              and(
                eq(playerSeasonStats.playerId, input.playerId),
                inArray(playerSeasonStats.leagueId, junkLeagueIds),
              ),
            )
        : [];

    const zeroGpStatRows = await tx
      .select({ id: playerSeasonStats.id, teamId: playerSeasonStats.teamId, leagueId: playerSeasonStats.leagueId, seasonId: playerSeasonStats.seasonId })
      .from(playerSeasonStats)
      .where(
        and(eq(playerSeasonStats.playerId, input.playerId), eq(playerSeasonStats.gamesPlayed, 0)),
      );

    const statIdsToDelete = new Set<number>();
    for (const row of [...ncaaStatRows, ...junkStatRows, ...zeroGpStatRows]) {
      statIdsToDelete.add(row.id);
    }

    if (statIdsToDelete.size > 0) {
      await tx
        .delete(playerSeasonStats)
        .where(
          and(
            eq(playerSeasonStats.playerId, input.playerId),
            inArray(playerSeasonStats.id, [...statIdsToDelete]),
          ),
        );
    }

    const ncaaStintRows =
      ncaaLeagueIds.length > 0
        ? await tx
            .select({ id: playerStints.id })
            .from(playerStints)
            .where(
              and(
                eq(playerStints.playerId, input.playerId),
                inArray(playerStints.leagueId, ncaaLeagueIds),
              ),
            )
        : [];

    const junkStintRows =
      junkLeagueIds.length > 0
        ? await tx
            .select({ id: playerStints.id })
            .from(playerStints)
            .where(
              and(
                eq(playerStints.playerId, input.playerId),
                inArray(playerStints.leagueId, junkLeagueIds),
              ),
            )
        : [];

    const stintIdsToDelete = new Set<number>([
      ...ncaaStintRows.map((row) => row.id),
      ...junkStintRows.map((row) => row.id),
    ]);

    if (stintIdsToDelete.size > 0) {
      await tx
        .delete(playerStints)
        .where(
          and(
            eq(playerStints.playerId, input.playerId),
            inArray(playerStints.id, [...stintIdsToDelete]),
          ),
        );
    }

    const playoffRows =
      ncaaLeagueIds.length > 0
        ? await tx
            .select({ id: playerSeasonPlayoffStats.id })
            .from(playerSeasonPlayoffStats)
            .where(
              and(
                eq(playerSeasonPlayoffStats.playerId, input.playerId),
                inArray(playerSeasonPlayoffStats.leagueId, ncaaLeagueIds),
              ),
            )
        : [];

    if (playoffRows.length > 0 && ncaaLeagueIds.length > 0) {
      await tx
        .delete(playerSeasonPlayoffStats)
        .where(
          and(
            eq(playerSeasonPlayoffStats.playerId, input.playerId),
            inArray(playerSeasonPlayoffStats.leagueId, ncaaLeagueIds),
          ),
        );
    }

    const junkOnlyIds = new Set(junkStatRows.map((row) => row.id));
    const zeroOnlyIds = new Set(
      zeroGpStatRows.filter((row) => !junkOnlyIds.has(row.id)).map((row) => row.id),
    );

    return {
      ok: true,
      playerId: input.playerId,
      statsRemoved: ncaaStatRows.length,
      stintsRemoved: ncaaStintRows.length,
      playoffStatsRemoved: playoffRows.length,
      junkStatsRemoved: junkOnlyIds.size,
      zeroGpStatsRemoved: zeroOnlyIds.size,
    };
  });
}
