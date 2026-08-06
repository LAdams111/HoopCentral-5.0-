/**
 * Remove bogus MaxPreps high-school season rows (0 GP placeholders from live scrape).
 *
 * Usage:
 *   npm run db:cleanup-maxpreps-placeholders -- --dry-run
 *   npm run db:cleanup-maxpreps-placeholders
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { eq, inArray } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { leagues } from "../server/src/db/schema/leagues.js";
import { playerSeasonStats } from "../server/src/db/schema/player-season-stats.js";
import { seasons } from "../server/src/db/schema/seasons.js";
import { isEmptySeasonStat } from "../server/src/utils/season-stat-empty.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type StatRow = {
  id: number;
  playerId: number;
  teamId: number;
  seasonLabel: string;
  gamesPlayed: number | null;
  pointsPerGame: string | null;
  reboundsPerGame: string | null;
  assistsPerGame: string | null;
  stealsPerGame: string | null;
  blocksPerGame: string | null;
  fieldGoalPct: string | null;
  threePointPct: string | null;
  freeThrowPct: string | null;
};

function groupKey(playerId: number, teamId: number): string {
  return `${playerId}:${teamId}`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const [hsLeague] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, "high-school"))
    .limit(1);

  if (!hsLeague) {
    console.error("high-school league not found.");
    process.exit(1);
  }

  const rows = await db
    .select({
      id: playerSeasonStats.id,
      playerId: playerSeasonStats.playerId,
      teamId: playerSeasonStats.teamId,
      seasonLabel: seasons.seasonLabel,
      gamesPlayed: playerSeasonStats.gamesPlayed,
      pointsPerGame: playerSeasonStats.pointsPerGame,
      reboundsPerGame: playerSeasonStats.reboundsPerGame,
      assistsPerGame: playerSeasonStats.assistsPerGame,
      stealsPerGame: playerSeasonStats.stealsPerGame,
      blocksPerGame: playerSeasonStats.blocksPerGame,
      fieldGoalPct: playerSeasonStats.fieldGoalPct,
      threePointPct: playerSeasonStats.threePointPct,
      freeThrowPct: playerSeasonStats.freeThrowPct,
    })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerSeasonStats.leagueId, hsLeague.id));

  const byGroup = new Map<string, StatRow[]>();
  for (const row of rows) {
    const key = groupKey(row.playerId, row.teamId);
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  }

  const toDelete = new Set<number>();

  for (const group of byGroup.values()) {
    const empty = group.filter((row) => isEmptySeasonStat(row));
    const real = group.filter((row) => !isEmptySeasonStat(row));

    if (empty.length === 0) continue;

    if (real.length > 0) {
      for (const row of empty) toDelete.add(row.id);
      continue;
    }

    if (empty.length <= 1) continue;

    empty.sort((a, b) => a.seasonLabel.localeCompare(b.seasonLabel));
    for (const row of empty.slice(0, -1)) toDelete.add(row.id);
  }

  const deleteIds = [...toDelete];
  console.log(`High-school season rows scanned: ${rows.length.toLocaleString()}`);
  console.log(`Placeholder rows to remove: ${deleteIds.length.toLocaleString()}`);

  if (deleteIds.length === 0) {
    console.log("Nothing to clean up.");
    await closeDatabaseConnection();
    return;
  }

  const sampleRyan = rows.filter((r) => r.playerId === 572462);
  if (sampleRyan.length > 0) {
    const ryanDeletes = sampleRyan.filter((r) => deleteIds.includes(r.id)).length;
    console.log(`Ryan Lindsey (572462): ${ryanDeletes} of ${sampleRyan.length} HS rows marked for removal`);
  }

  if (dryRun) {
    console.log("Dry run — no rows deleted.");
    await closeDatabaseConnection();
    return;
  }

  const batchSize = 500;
  let deleted = 0;
  for (let i = 0; i < deleteIds.length; i += batchSize) {
    const batch = deleteIds.slice(i, i + batchSize);
    await db.delete(playerSeasonStats).where(inArray(playerSeasonStats.id, batch));
    deleted += batch.length;
    console.log(`Deleted ${deleted.toLocaleString()} / ${deleteIds.length.toLocaleString()}`);
  }

  console.log("Cleanup complete.");
  await closeDatabaseConnection();
}

main().catch(async (err) => {
  console.error(err);
  await closeDatabaseConnection();
  process.exit(1);
});
