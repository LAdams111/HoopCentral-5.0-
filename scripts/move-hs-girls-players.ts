/**
 * Move known girls players out of the boys high-school league into high-school-w.
 * Use when MaxPreps athlete URLs point at boys team paths (e.g. Anyla Parker).
 *
 * Usage:
 *   npm run db:move-hs-girls-players -- --dry-run
 *   npm run db:move-hs-girls-players
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { and, eq, inArray } from "drizzle-orm";
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
import { fallbackAbbreviation } from "../server/src/utils/maxpreps-team-identity.js";
import { normalizeSlugParam } from "../server/src/utils/slug.js";
import { isPostgresUniqueViolation } from "../server/src/utils/postgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BOYS_HS_SLUG = "high-school";
const GIRLS_HS_SLUG = "high-school-w";
const MAXPREPS_SOURCE = "maxpreps-hs-basketball";

/** MaxPreps career IDs confirmed as girls on boys team URLs. Expand as QA finds more. */
export const MISPLACED_GIRLS_CAREER_IDS = [
  "ntlchdouhq5h1", // Anyla Parker — Montverde Academy Eagles (boys path)
] as const;

function girlsTeamNameFromBoysName(boysName: string): string {
  return boysName
    .replace(/\bBoys\b/g, "Girls")
    .replace(/\bBOYS\b/g, "GIRLS")
    .trim();
}

async function findOrCreateLeague(
  slug: string,
  name: string,
  gender: "male" | "female",
): Promise<number> {
  const [existing] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, slug))
    .limit(1);
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(leagues)
    .values({ slug, name, gender })
    .returning({ id: leagues.id });
  return inserted!.id;
}

async function findOrCreateGirlsSeason(
  girlsLeagueId: number,
  seasonLabel: string,
  dryRun: boolean,
): Promise<number> {
  const [existing] = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(and(eq(seasons.leagueId, girlsLeagueId), eq(seasons.seasonLabel, seasonLabel)))
    .limit(1);
  if (existing) return existing.id;
  if (dryRun) return -1;

  const [inserted] = await db
    .insert(seasons)
    .values({ leagueId: girlsLeagueId, seasonLabel })
    .returning({ id: seasons.id });
  return inserted!.id;
}

async function findOrCreateGirlsTeam(
  girlsLeagueId: number,
  boysTeam: { id: number; slug: string; name: string; abbreviation: string },
  dryRun: boolean,
): Promise<number> {
  const slug = normalizeSlugParam(boysTeam.slug);
  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.leagueId, girlsLeagueId), eq(teams.slug, slug)))
    .limit(1);
  if (existing) return existing.id;

  const name = girlsTeamNameFromBoysName(boysTeam.name);
  const abbreviation = fallbackAbbreviation(name);

  if (dryRun) return -1;

  try {
    const [inserted] = await db
      .insert(teams)
      .values({
        leagueId: girlsLeagueId,
        slug,
        name,
        abbreviation,
      })
      .returning({ id: teams.id });
    return inserted!.id;
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) throw error;
    const [raced] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.leagueId, girlsLeagueId), eq(teams.slug, slug)))
      .limit(1);
    if (!raced) throw error;
    return raced.id;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const boysLeagueId = await findOrCreateLeague(
    BOYS_HS_SLUG,
    "High School (Boys)",
    "male",
  );
  const girlsLeagueId = await findOrCreateLeague(
    GIRLS_HS_SLUG,
    "High School (Girls)",
    "female",
  );

  console.log(`Boys HS league id: ${boysLeagueId}`);
  console.log(`Girls HS league id: ${girlsLeagueId}`);
  console.log(`Career IDs to move: ${MISPLACED_GIRLS_CAREER_IDS.length}`);

  let movedPlayers = 0;
  let movedStats = 0;
  let movedStints = 0;

  for (const careerId of MISPLACED_GIRLS_CAREER_IDS) {
    const [identity] = await db
      .select({
        id: playerIdentities.id,
        playerId: playerIdentities.playerId,
      })
      .from(playerIdentities)
      .where(
        and(
          eq(playerIdentities.source, MAXPREPS_SOURCE),
          eq(playerIdentities.externalId, careerId),
        ),
      )
      .limit(1);

    if (!identity) {
      console.log(`[skip] no identity for ${careerId}`);
      continue;
    }

    const [player] = await db
      .select({ id: players.id, displayName: players.displayName })
      .from(players)
      .where(eq(players.id, identity.playerId))
      .limit(1);

    if (!player) continue;

    const statRows = await db
      .select({
        statId: playerSeasonStats.id,
        teamId: playerSeasonStats.teamId,
        seasonId: playerSeasonStats.seasonId,
        seasonLabel: seasons.seasonLabel,
        leagueId: playerSeasonStats.leagueId,
      })
      .from(playerSeasonStats)
      .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
      .where(eq(playerSeasonStats.playerId, identity.playerId));

    const boysStatRows = statRows.filter((row) => row.leagueId === boysLeagueId);
    const girlsStatRows = statRows.filter((row) => row.leagueId === girlsLeagueId);

    const stintRows = await db
      .select({ stintId: playerStints.id, teamId: playerStints.teamId, leagueId: playerStints.leagueId })
      .from(playerStints)
      .where(eq(playerStints.playerId, identity.playerId));

    const boysStintRows = stintRows.filter((row) => row.leagueId === boysLeagueId);

    const boysTeamIds = [
      ...new Set([
        ...boysStatRows.map((r) => r.teamId),
        ...boysStintRows.map((r) => r.teamId),
        ...girlsStatRows.map((r) => r.teamId),
      ]),
    ];

    const teamIdMap = new Map<number, number>();
    for (const boysTeamId of boysTeamIds) {
      const [boysTeam] = await db
        .select({
          id: teams.id,
          slug: teams.slug,
          name: teams.name,
          abbreviation: teams.abbreviation,
        })
        .from(teams)
        .where(eq(teams.id, boysTeamId))
        .limit(1);
      if (!boysTeam) continue;
      const girlsTeamId = await findOrCreateGirlsTeam(girlsLeagueId, boysTeam, dryRun);
      teamIdMap.set(boysTeamId, girlsTeamId);
      if (dryRun) {
        console.log(
          `[dry-run] ${player.displayName}: ${boysTeam.slug} → girls league (${girlsTeamNameFromBoysName(boysTeam.name)})`,
        );
      }
    }

    if (!dryRun) {
      const seasonIdMap = new Map<string, number>();
      for (const row of [...boysStatRows, ...girlsStatRows]) {
        const label = row.seasonLabel;
        if (!seasonIdMap.has(label)) {
          seasonIdMap.set(label, await findOrCreateGirlsSeason(girlsLeagueId, label, dryRun));
        }
      }

      for (const row of boysStatRows) {
        const targetTeamId = teamIdMap.get(row.teamId);
        const targetSeasonId = seasonIdMap.get(row.seasonLabel);
        if (targetTeamId == null || targetTeamId < 0) continue;
        if (targetSeasonId == null || targetSeasonId < 0) continue;
        await db
          .update(playerSeasonStats)
          .set({
            leagueId: girlsLeagueId,
            teamId: targetTeamId,
            seasonId: targetSeasonId,
          })
          .where(eq(playerSeasonStats.id, row.statId));
        movedStats += 1;
      }

      for (const row of girlsStatRows) {
        const targetSeasonId = seasonIdMap.get(row.seasonLabel);
        if (targetSeasonId == null || targetSeasonId < 0) continue;
        if (row.seasonId === targetSeasonId) continue;
        await db
          .update(playerSeasonStats)
          .set({ seasonId: targetSeasonId })
          .where(eq(playerSeasonStats.id, row.statId));
        movedStats += 1;
      }

      for (const row of boysStintRows) {
        const targetTeamId = teamIdMap.get(row.teamId);
        if (targetTeamId == null || targetTeamId < 0) continue;
        await db
          .update(playerStints)
          .set({ leagueId: girlsLeagueId, teamId: targetTeamId })
          .where(eq(playerStints.id, row.stintId));
        movedStints += 1;
      }

      await db
        .update(playerIdentities)
        .set({ leagueId: girlsLeagueId })
        .where(eq(playerIdentities.id, identity.id));

      const latestGirlsTeamId = [...teamIdMap.values()].filter((id) => id >= 0).at(-1);
      if (latestGirlsTeamId != null) {
        await db
          .update(players)
          .set({ currentTeamId: latestGirlsTeamId, updatedAt: new Date() })
          .where(eq(players.id, identity.playerId));
      }
    } else {
      movedStats += boysStatRows.length + girlsStatRows.length;
      movedStints += boysStintRows.length;
    }

    movedPlayers += 1;
    console.log(
      `${dryRun ? "[dry-run] " : ""}Moved ${player.displayName} (${careerId}): ${boysStatRows.length} boys stats, ${girlsStatRows.length} girls stats, ${boysStintRows.length} stints`,
    );
  }

  console.log("");
  console.log(`Players moved: ${movedPlayers}`);
  console.log(`Stats moved:   ${movedStats}`);
  console.log(`Stints moved:  ${movedStints}`);
  if (dryRun) console.log("\nDry run — no changes made.");

  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error("Move failed:", err);
    process.exit(1);
  });
}
