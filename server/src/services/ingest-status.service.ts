import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  playerIdentities,
  playerSeasonStats,
  players,
  seasons,
} from "../db/schema/index.js";

export interface IngestedSeasonStat {
  seasonLabel: string;
  gamesPlayed: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
}

export interface IngestedPlayerStatus {
  playerId: number;
  externalId: string;
  displayName: string;
  birthDate: string | null;
  seasons: IngestedSeasonStat[];
}

export async function getCompletionStatusBySource(
  source: string,
): Promise<IngestedPlayerStatus[]> {
  const rows = await db
    .select({
      externalId: playerIdentities.externalId,
      playerId: players.id,
      displayName: players.displayName,
      birthDate: players.birthDate,
      seasonLabel: seasons.seasonLabel,
      gamesPlayed: playerSeasonStats.gamesPlayed,
      pointsPerGame: playerSeasonStats.pointsPerGame,
      reboundsPerGame: playerSeasonStats.reboundsPerGame,
      assistsPerGame: playerSeasonStats.assistsPerGame,
    })
    .from(playerIdentities)
    .innerJoin(players, eq(playerIdentities.playerId, players.id))
    .leftJoin(playerSeasonStats, eq(playerSeasonStats.playerId, players.id))
    .leftJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerIdentities.source, source));

  const byExternalId = new Map<string, IngestedPlayerStatus>();

  for (const row of rows) {
    let entry = byExternalId.get(row.externalId);
    if (!entry) {
      entry = {
        playerId: row.playerId,
        externalId: row.externalId,
        displayName: row.displayName,
        birthDate: row.birthDate ?? null,
        seasons: [],
      };
      byExternalId.set(row.externalId, entry);
    }

    if (!row.seasonLabel || row.gamesPlayed == null) continue;

    entry.seasons.push({
      seasonLabel: row.seasonLabel,
      gamesPlayed: row.gamesPlayed,
      pointsPerGame: Number(row.pointsPerGame ?? 0),
      reboundsPerGame: Number(row.reboundsPerGame ?? 0),
      assistsPerGame: Number(row.assistsPerGame ?? 0),
    });
  }

  return [...byExternalId.values()];
}
