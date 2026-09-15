/**
 * Fix Cameron Boozer (2026 draft) profile contamination:
 * - Remove Jacksonville (cameron-boozer-2) identity + stats from Duke prospect #69678
 * - Dedupe duplicate season rows
 * - Add missing Duke 2025-26 season from CBB reference data
 *
 * Usage:
 *   npx tsx --tsconfig server/tsconfig.json scripts/fix-cameron-boozer.ts --dry-run
 *   npx tsx --tsconfig server/tsconfig.json scripts/fix-cameron-boozer.ts --apply
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { and, eq, inArray, sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  leagues,
  playerIdentities,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../server/src/db/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const CAMERON_ID = 69678;
const WRONG_SR_IDENTITY = "cameron-boozer-2";

const DUKE_SEASON = {
  teamId: 139978,
  leagueId: 4,
  seasonId: 138,
  gamesPlayed: 38,
  pointsPerGame: "22.5",
  reboundsPerGame: "10.2",
  assistsPerGame: "4.1",
  stealsPerGame: "1.4",
  blocksPerGame: "0.6",
  fieldGoalPct: "55.6",
  threePointPct: "39.1",
  freeThrowPct: "78.9",
} as const;

const PROFILE_UPDATE = {
  displayName: "Cameron Boozer",
  slug: "cameron-boozer",
  birthDate: "2007-07-18",
  hometown: "Miami, FL",
  position: "F",
  jerseyNumber: "12",
  heightCm: 206,
  weightKg: 113,
  extendedProfile: {
    gender: "Men",
    college: "Duke (Men)",
    highSchool: "Columbus (FL)",
    profileUrl: "https://www.sports-reference.com/cbb/players/cameron-boozer-3.html",
    schoolSlug: "duke",
    positionLabel: "Forward",
    collegeFullName: "Duke Blue Devils",
    collegeLocation: "Durham, North Carolina",
  },
} as const;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "Mode: APPLY" : "Mode: DRY RUN");

  const [player] = await db.select().from(players).where(eq(players.id, CAMERON_ID)).limit(1);
  if (!player) throw new Error(`Player ${CAMERON_ID} not found`);

  const wrongIdentity = await db
    .select()
    .from(playerIdentities)
    .where(
      and(
        eq(playerIdentities.playerId, CAMERON_ID),
        eq(playerIdentities.source, "sports-reference-cbb"),
        eq(playerIdentities.externalId, WRONG_SR_IDENTITY),
      ),
    );

  const jacksonvilleStats = await db
    .select({ id: playerSeasonStats.id, season: seasons.seasonLabel })
    .from(playerSeasonStats)
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(and(eq(playerSeasonStats.playerId, CAMERON_ID), eq(teams.slug, "jacksonville")));

  const allStats = await db
    .select({
      id: playerSeasonStats.id,
      teamId: playerSeasonStats.teamId,
      leagueId: playerSeasonStats.leagueId,
      seasonId: playerSeasonStats.seasonId,
      season: seasons.seasonLabel,
      team: teams.slug,
    })
    .from(playerSeasonStats)
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerSeasonStats.playerId, CAMERON_ID));

  const seen = new Map<string, number>();
  const duplicateIds: number[] = [];
  for (const row of allStats) {
    const key = `${row.teamId}:${row.leagueId}:${row.seasonId}`;
    const existing = seen.get(key);
    if (existing != null) duplicateIds.push(row.id);
    else seen.set(key, row.id);
  }

  const [dukeRow] = await db
    .select({ id: playerSeasonStats.id })
    .from(playerSeasonStats)
    .where(
      and(
        eq(playerSeasonStats.playerId, CAMERON_ID),
        eq(playerSeasonStats.teamId, DUKE_SEASON.teamId),
        eq(playerSeasonStats.seasonId, DUKE_SEASON.seasonId),
        eq(playerSeasonStats.leagueId, DUKE_SEASON.leagueId),
      ),
    )
    .limit(1);

  console.log(`Wrong SR identity rows: ${wrongIdentity.length}`);
  console.log(`Jacksonville stat rows to remove: ${jacksonvilleStats.length}`);
  console.log(`Duplicate stat rows to remove: ${duplicateIds.length}`);
  console.log(`Duke 2025-26 exists: ${Boolean(dukeRow)}`);

  if (!apply) {
    await closeDatabaseConnection();
    return;
  }

  if (wrongIdentity.length > 0) {
    await db
      .delete(playerIdentities)
      .where(inArray(playerIdentities.id, wrongIdentity.map((row) => row.id)));
  }

  const statIdsToDelete = [
    ...jacksonvilleStats.map((row) => row.id),
    ...duplicateIds,
  ];
  if (statIdsToDelete.length > 0) {
    await db.delete(playerSeasonStats).where(inArray(playerSeasonStats.id, statIdsToDelete));
  }

  const jacksonvilleTeam = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, "jacksonville"))
    .limit(1);
  if (jacksonvilleTeam[0]) {
    await db
      .delete(playerStints)
      .where(
        and(
          eq(playerStints.playerId, CAMERON_ID),
          eq(playerStints.teamId, jacksonvilleTeam[0].id),
        ),
      );
  }

  if (!dukeRow) {
    await db.insert(playerSeasonStats).values({
      playerId: CAMERON_ID,
      teamId: DUKE_SEASON.teamId,
      leagueId: DUKE_SEASON.leagueId,
      seasonId: DUKE_SEASON.seasonId,
      gamesPlayed: DUKE_SEASON.gamesPlayed,
      pointsPerGame: DUKE_SEASON.pointsPerGame,
      reboundsPerGame: DUKE_SEASON.reboundsPerGame,
      assistsPerGame: DUKE_SEASON.assistsPerGame,
      stealsPerGame: DUKE_SEASON.stealsPerGame,
      blocksPerGame: DUKE_SEASON.blocksPerGame,
      fieldGoalPct: DUKE_SEASON.fieldGoalPct,
      threePointPct: DUKE_SEASON.threePointPct,
      freeThrowPct: DUKE_SEASON.freeThrowPct,
    });
  }

  await db
    .update(players)
    .set({
      displayName: PROFILE_UPDATE.displayName,
      slug: PROFILE_UPDATE.slug,
      birthDate: PROFILE_UPDATE.birthDate,
      hometown: PROFILE_UPDATE.hometown,
      position: PROFILE_UPDATE.position,
      jerseyNumber: PROFILE_UPDATE.jerseyNumber,
      heightCm: PROFILE_UPDATE.heightCm,
      weightKg: PROFILE_UPDATE.weightKg,
      extendedProfile: PROFILE_UPDATE.extendedProfile,
      updatedAt: sql`now()`,
    })
    .where(eq(players.id, CAMERON_ID));

  console.log("Cameron Boozer profile repaired.");
  await closeDatabaseConnection();
}

main().catch(async (err) => {
  console.error(err);
  await closeDatabaseConnection();
  process.exit(1);
});
