import { and, eq, inArray } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import {
  leagues,
  playerIdentities,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../db/schema/index.js";

export interface DetachUsbasketIdentityInput {
  hoopPlayerId: number;
  externalId: string;
  sources: string[];
  removeStats?: {
    leagueSlugs: string[];
    seasonLabels: string[];
    teamSlug?: string;
  };
}

export interface DetachUsbasketIdentityResult {
  identitiesRemoved: number;
  statsRemoved: number;
  stintsRemoved: number;
}

export async function detachUsbasketIdentityFromPlayer(
  input: DetachUsbasketIdentityInput,
  database: DbClient = db,
): Promise<DetachUsbasketIdentityResult> {
  return database.transaction(async (tx) => {
    const deletedIdentities = await tx
      .delete(playerIdentities)
      .where(
        and(
          eq(playerIdentities.playerId, input.hoopPlayerId),
          eq(playerIdentities.externalId, input.externalId),
          inArray(playerIdentities.source, input.sources),
        ),
      )
      .returning({ id: playerIdentities.id });

    let statsRemoved = 0;
    let stintsRemoved = 0;

    if (input.removeStats) {
      const leagueRows = await tx
        .select({ id: leagues.id })
        .from(leagues)
        .where(inArray(leagues.slug, input.removeStats.leagueSlugs));

      const leagueIds = leagueRows.map((row) => row.id);
      const seasonRows = await tx
        .select({ id: seasons.id })
        .from(seasons)
        .where(inArray(seasons.seasonLabel, input.removeStats.seasonLabels));

      const seasonIds = seasonRows.map((row) => row.id);

      let teamIds: number[] | null = null;
      if (input.removeStats.teamSlug) {
        const teamRows = await tx
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.slug, input.removeStats.teamSlug));
        teamIds = teamRows.map((row) => row.id);
      }

      if (leagueIds.length && seasonIds.length) {
        const statRows = await tx
          .select({
            statId: playerSeasonStats.id,
            stintId: playerStints.id,
          })
          .from(playerSeasonStats)
          .innerJoin(
            playerStints,
            and(
              eq(playerStints.playerId, playerSeasonStats.playerId),
              eq(playerStints.teamId, playerSeasonStats.teamId),
              eq(playerStints.leagueId, playerSeasonStats.leagueId),
              eq(playerStints.seasonId, playerSeasonStats.seasonId),
            ),
          )
          .where(
            and(
              eq(playerSeasonStats.playerId, input.hoopPlayerId),
              inArray(playerSeasonStats.leagueId, leagueIds),
              inArray(playerSeasonStats.seasonId, seasonIds),
              ...(teamIds?.length ? [inArray(playerSeasonStats.teamId, teamIds)] : []),
            ),
          );

        const statIds = statRows.map((row) => row.statId);
        const stintIds = [...new Set(statRows.map((row) => row.stintId))];

        if (statIds.length) {
          const removedStats = await tx
            .delete(playerSeasonStats)
            .where(inArray(playerSeasonStats.id, statIds))
            .returning({ id: playerSeasonStats.id });
          statsRemoved = removedStats.length;
        }

        if (stintIds.length) {
          const removedStints = await tx
            .delete(playerStints)
            .where(inArray(playerStints.id, stintIds))
            .returning({ id: playerStints.id });
          stintsRemoved = removedStints.length;
        }
      }
    }

    await tx
      .update(players)
      .set({ updatedAt: new Date() })
      .where(eq(players.id, input.hoopPlayerId));

    return {
      identitiesRemoved: deletedIdentities.length,
      statsRemoved,
      stintsRemoved,
    };
  });
}
