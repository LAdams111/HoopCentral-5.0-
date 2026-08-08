import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  leagues,
  playerSeasonPlayoffStats,
  playerSeasonStats,
  playerStints,
  players,
} from "../server/src/db/schema/index.js";
import { clearPlayerNcaaSeasons } from "../server/src/services/ingest-clear-ncaa.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PLAYER_ID = Number(process.argv[2] ?? "191");

async function main(): Promise<void> {
  const [player] = await db.select().from(players).where(eq(players.id, PLAYER_ID)).limit(1);
  if (!player) throw new Error(`Player ${PLAYER_ID} not found`);

  const hsLeagues = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(inArray(leagues.slug, ["high-school", "high-school-w"]));
  const hsLeagueIds = hsLeagues.map((row) => row.id);

  let hsStatsRemoved = 0;
  let hsStintsRemoved = 0;

  if (hsLeagueIds.length > 0) {
    const hsStats = await db
      .select({ id: playerSeasonStats.id })
      .from(playerSeasonStats)
      .where(
        and(
          eq(playerSeasonStats.playerId, PLAYER_ID),
          inArray(playerSeasonStats.leagueId, hsLeagueIds),
        ),
      );
    hsStatsRemoved = hsStats.length;

    const hsStints = await db
      .select({ id: playerStints.id })
      .from(playerStints)
      .where(
        and(
          eq(playerStints.playerId, PLAYER_ID),
          inArray(playerStints.leagueId, hsLeagueIds),
        ),
      );
    hsStintsRemoved = hsStints.length;

    await db.transaction(async (tx) => {
      await tx
        .delete(playerSeasonStats)
        .where(
          and(
            eq(playerSeasonStats.playerId, PLAYER_ID),
            inArray(playerSeasonStats.leagueId, hsLeagueIds),
          ),
        );
      await tx
        .delete(playerStints)
        .where(
          and(
            eq(playerStints.playerId, PLAYER_ID),
            inArray(playerStints.leagueId, hsLeagueIds),
          ),
        );
    });
  }

  const clearResult = await clearPlayerNcaaSeasons({ playerId: PLAYER_ID });

  console.log(`${player.displayName} (${PLAYER_ID}) cleaned:`);
  console.log(`  high-school stats removed: ${hsStatsRemoved}`);
  console.log(`  high-school stints removed: ${hsStintsRemoved}`);
  console.log(`  clear API:`, clearResult);

  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
