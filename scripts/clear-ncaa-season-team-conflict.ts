/**
 * Remove duplicate NCAA season rows for one player, keeping a canonical team slug.
 *
 * Usage:
 *   npm run db:clear-ncaa-season-conflict -- --player 3801 --season 2018-19 --keep-team duke --dry-run
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { and, eq, inArray, ne } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  leagues,
  playerSeasonPlayoffStats,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../server/src/db/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const playerId = Number(arg("--player"));
  const seasonLabel = arg("--season");
  const keepTeamSlug = arg("--keep-team");
  const leagueSlug = arg("--league") ?? "ncaa";

  if (!Number.isFinite(playerId) || !seasonLabel || !keepTeamSlug) {
    console.error(
      "Usage: --player <id> --season <label> --keep-team <slug> [--league ncaa] [--dry-run]",
    );
    process.exit(1);
  }

  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  const [league] = await db.select().from(leagues).where(eq(leagues.slug, leagueSlug)).limit(1);
  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.leagueId, league!.id), eq(seasons.seasonLabel, seasonLabel)))
    .limit(1);
  const [keepTeam] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.leagueId, league!.id), eq(teams.slug, keepTeamSlug)))
    .limit(1);

  if (!player || !league || !season || !keepTeam) {
    console.error("Player, league, season, or keep-team not found.");
    process.exit(1);
  }

  const conflictingStats = await db
    .select({
      id: playerSeasonStats.id,
      teamId: playerSeasonStats.teamId,
      teamSlug: teams.slug,
      teamName: teams.name,
    })
    .from(playerSeasonStats)
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .where(
      and(
        eq(playerSeasonStats.playerId, playerId),
        eq(playerSeasonStats.leagueId, league.id),
        eq(playerSeasonStats.seasonId, season.id),
        ne(playerSeasonStats.teamId, keepTeam.id),
      ),
    );

  console.log(`${player.displayName} (${playerId}) — ${seasonLabel} ${leagueSlug}`);
  console.log(`Keep team: ${keepTeam.name} (${keepTeam.slug})`);
  console.log(`Remove ${conflictingStats.length} conflicting stat row(s):`);
  for (const row of conflictingStats) {
    console.log(`  - ${row.teamName} (${row.teamSlug}) statId=${row.id}`);
  }

  if (conflictingStats.length === 0) {
    console.log("Nothing to remove.");
    await closeDatabaseConnection();
    return;
  }

  if (dryRun) {
    console.log("Dry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  const conflictingTeamIds = [...new Set(conflictingStats.map((row) => row.teamId))];

  await db.transaction(async (tx) => {
    await tx
      .delete(playerSeasonPlayoffStats)
      .where(
        and(
          eq(playerSeasonPlayoffStats.playerId, playerId),
          eq(playerSeasonPlayoffStats.leagueId, league.id),
          eq(playerSeasonPlayoffStats.seasonId, season.id),
          inArray(playerSeasonPlayoffStats.teamId, conflictingTeamIds),
        ),
      );

    await tx
      .delete(playerSeasonStats)
      .where(
        and(
          eq(playerSeasonStats.playerId, playerId),
          eq(playerSeasonStats.leagueId, league.id),
          eq(playerSeasonStats.seasonId, season.id),
          inArray(playerSeasonStats.teamId, conflictingTeamIds),
        ),
      );

    await tx
      .delete(playerStints)
      .where(
        and(
          eq(playerStints.playerId, playerId),
          eq(playerStints.leagueId, league.id),
          eq(playerStints.seasonId, season.id),
          inArray(playerStints.teamId, conflictingTeamIds),
        ),
      );
  });

  console.log("Removed conflicting rows.");
  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
