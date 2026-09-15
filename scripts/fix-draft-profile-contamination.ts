/**
 * Remove era-contaminated stats/identities from high-profile draft picks
 * where multiple same-name players were merged onto one slug.
 *
 * Usage:
 *   npx tsx --tsconfig server/tsconfig.json scripts/fix-draft-profile-contamination.ts --dry-run
 *   npx tsx --tsconfig server/tsconfig.json scripts/fix-draft-profile-contamination.ts --apply
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { and, eq, inArray, sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  playerIdentities,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../server/src/db/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const APPLY = process.argv.includes("--apply");

interface FixPlan {
  label: string;
  playerId: number;
  removeIdentityExternalIds?: string[];
  removeSeasonsBefore?: string;
  removeTeamSlugs?: string[];
  profile?: Partial<typeof players.$inferInsert>;
  addNcaaSeason?: {
    teamId: number;
    leagueId: number;
    seasonId: number;
    gamesPlayed: number;
    pointsPerGame: string;
    reboundsPerGame?: string;
    assistsPerGame?: string;
  };
}

const PLANS: FixPlan[] = [
  {
    label: "Tre Johnson (2025 draft)",
    playerId: 4137,
    removeIdentityExternalIds: ["tre-johnson-1"],
    removeTeamSlugs: ["montana-st"],
    profile: {
      hometown: "Garland, TX",
      position: "G",
      jerseyNumber: "20",
      heightCm: 198,
      weightKg: 86,
      extendedProfile: {
        gender: "Men",
        college: "Texas (Men)",
        highSchool: "Lake Highlands (TX)",
        profileUrl: "https://www.sports-reference.com/cbb/players/tre-johnson-2.html",
        schoolSlug: "texas",
        positionLabel: "Guard",
        collegeFullName: "Texas Longhorns",
        collegeLocation: "Austin, Texas",
      },
    },
    addNcaaSeason: {
      teamId: 140236,
      leagueId: 4,
      seasonId: 145,
      gamesPlayed: 33,
      pointsPerGame: "19.9",
      reboundsPerGame: "3.1",
      assistsPerGame: "2.7",
    },
  },
  {
    label: "Brandon Miller (2023 draft)",
    playerId: 50567,
    removeIdentityExternalIds: ["brandon-miller-1"],
    removeSeasonsBefore: "2020-21",
    profile: {
      birthDate: "2002-11-22",
      hometown: "Antioch, TN",
      position: "F",
      jerseyNumber: "24",
      heightCm: 206,
      weightKg: 90,
      extendedProfile: {
        gender: "Men",
        college: "Alabama (Men)",
        highSchool: "Cane Ridge (TN)",
        profileUrl: "https://www.sports-reference.com/cbb/players/brandon-miller-3.html",
        schoolSlug: "alabama",
        positionLabel: "Forward",
        collegeFullName: "Alabama Crimson Tide",
        collegeLocation: "Tuscaloosa, Alabama",
      },
    },
    addNcaaSeason: {
      teamId: 140012,
      leagueId: 4,
      seasonId: 144,
      gamesPlayed: 37,
      pointsPerGame: "18.8",
      reboundsPerGame: "8.2",
      assistsPerGame: "2.1",
    },
  },
  {
    label: "Jamir Watkins (2025 draft)",
    playerId: 4174,
    removeSeasonsBefore: "2010-11",
    removeTeamSlugs: ["fayetteville-patriots"],
  },
];

async function getAlabamaTeamId(): Promise<number> {
  const [row] = await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, "alabama")).limit(1);
  if (!row) throw new Error("Alabama team not found");
  return row.id;
}

async function main(): Promise<void> {
  console.log(APPLY ? "Mode: APPLY" : "Mode: DRY RUN");

  for (const plan of PLANS) {
    console.log(`\n--- ${plan.label} (#${plan.playerId}) ---`);

    let teamIdForAlabama = 140012;
    if (plan.label.includes("Brandon Miller")) {
      teamIdForAlabama = await getAlabamaTeamId();
      if (plan.addNcaaSeason) plan.addNcaaSeason.teamId = teamIdForAlabama;
    }

    const statRows = await db
      .select({
        id: playerSeasonStats.id,
        season: seasons.seasonLabel,
        teamSlug: teams.slug,
        teamId: playerSeasonStats.teamId,
      })
      .from(playerSeasonStats)
      .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
      .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
      .where(eq(playerSeasonStats.playerId, plan.playerId));

    const statIdsToDelete = statRows
      .filter((row) => {
        if (plan.removeTeamSlugs?.includes(row.teamSlug)) return true;
        if (plan.removeSeasonsBefore && row.season < plan.removeSeasonsBefore) return true;
        return false;
      })
      .map((row) => row.id);

    const identities = plan.removeIdentityExternalIds?.length
      ? await db
          .select()
          .from(playerIdentities)
          .where(
            and(
              eq(playerIdentities.playerId, plan.playerId),
              eq(playerIdentities.source, "sports-reference-cbb"),
              inArray(playerIdentities.externalId, plan.removeIdentityExternalIds),
            ),
          )
      : [];

    console.log(`  delete ${statIdsToDelete.length} stat row(s)`);
    console.log(`  delete ${identities.length} identity row(s)`);
    if (plan.profile) console.log(`  update profile fields`);
    if (plan.addNcaaSeason) console.log(`  ensure NCAA season ${plan.addNcaaSeason.seasonId}`);

    if (!APPLY) continue;

    if (statIdsToDelete.length > 0) {
      await db.delete(playerSeasonStats).where(inArray(playerSeasonStats.id, statIdsToDelete));
    }

    if (identities.length > 0) {
      await db
        .delete(playerIdentities)
        .where(inArray(playerIdentities.id, identities.map((row) => row.id)));
    }

    if (plan.removeTeamSlugs?.length) {
      const teamRows = await db
        .select({ id: teams.id })
        .from(teams)
        .where(inArray(teams.slug, plan.removeTeamSlugs));
      if (teamRows.length > 0) {
        await db
          .delete(playerStints)
          .where(
            and(
              eq(playerStints.playerId, plan.playerId),
              inArray(
                playerStints.teamId,
                teamRows.map((row) => row.id),
              ),
            ),
          );
      }
    }

    if (plan.addNcaaSeason) {
      const [existing] = await db
        .select({ id: playerSeasonStats.id })
        .from(playerSeasonStats)
        .where(
          and(
            eq(playerSeasonStats.playerId, plan.playerId),
            eq(playerSeasonStats.teamId, plan.addNcaaSeason.teamId),
            eq(playerSeasonStats.seasonId, plan.addNcaaSeason.seasonId),
            eq(playerSeasonStats.leagueId, plan.addNcaaSeason.leagueId),
          ),
        )
        .limit(1);
      if (!existing) {
        await db.insert(playerSeasonStats).values({
          playerId: plan.playerId,
          teamId: plan.addNcaaSeason.teamId,
          leagueId: plan.addNcaaSeason.leagueId,
          seasonId: plan.addNcaaSeason.seasonId,
          gamesPlayed: plan.addNcaaSeason.gamesPlayed,
          pointsPerGame: plan.addNcaaSeason.pointsPerGame,
          reboundsPerGame: plan.addNcaaSeason.reboundsPerGame,
          assistsPerGame: plan.addNcaaSeason.assistsPerGame,
        });
      }
    }

    if (plan.profile) {
      await db
        .update(players)
        .set({ ...plan.profile, updatedAt: sql`now()` })
        .where(eq(players.id, plan.playerId));
    }
  }

  await closeDatabaseConnection();
}

main().catch(async (err) => {
  console.error(err);
  await closeDatabaseConnection();
  process.exit(1);
});
