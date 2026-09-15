/**
 * Audit draft page profile links for era mismatches (wrong person merged).
 *
 * Usage:
 *   npx tsx --tsconfig server/tsconfig.json scripts/audit-draft-profile-matches.ts
 *   npx tsx --tsconfig server/tsconfig.json scripts/audit-draft-profile-matches.ts --year=2026
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  leagues,
  playerSeasonStats,
  players,
  seasons,
  teams,
} from "../server/src/db/schema/index.js";
import { clearDraftClassCache, getDraftClass } from "../server/src/services/draft.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function seasonStart(label: string): number {
  return Number.parseInt(label.slice(0, 4), 10);
}

async function auditYear(year: number): Promise<void> {
  clearDraftClassCache();
  const draft = await getDraftClass(year);
  if (!draft) {
    console.log(`No draft data for ${year}`);
    return;
  }

  const issues: string[] = [];

  for (const pick of draft.picks) {
    if (!pick.player) {
      issues.push(`${pick.playerName} (#${pick.overallPick}): no linked profile`);
      continue;
    }

    const stats = await db
      .select({
        season: seasons.seasonLabel,
        league: leagues.slug,
        team: teams.name,
        gp: playerSeasonStats.gamesPlayed,
      })
      .from(playerSeasonStats)
      .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
      .innerJoin(leagues, eq(playerSeasonStats.leagueId, leagues.id))
      .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
      .where(eq(playerSeasonStats.playerId, pick.player.id))
      .orderBy(seasons.seasonLabel);

    const collegeStats = stats.filter(
      (row) =>
        !["high-school", "high-school-w", "aau"].includes(row.league) &&
        (row.gp ?? 0) > 0,
    );
    const earliest = collegeStats[0]?.season;
    const earliestYear = earliest ? seasonStart(earliest) : null;

    const affiliation = pick.affiliation.toLowerCase();
    const teamHaystack = stats.map((row) => row.team.toLowerCase()).join(" ");
    const affiliationMiss =
      affiliation.length > 0 &&
      collegeStats.length > 0 &&
      !teamHaystack.includes(affiliation.split(/\s+/)[0] ?? "___");

    const eraMismatch =
      earliestYear != null && year - earliestYear > 12;

    const born = pick.player.birthDate
      ? Number.parseInt(pick.player.birthDate.slice(0, 4), 10)
      : null;
    const ageMismatch =
      born != null && (year - born < 17 || year - born > 28);

    if (eraMismatch || affiliationMiss || ageMismatch) {
      issues.push(
        `${pick.playerName} (#${pick.overallPick}) -> id=${pick.player.id} slug=${pick.player.slug ?? "?"} earliest=${earliest ?? "—"} born=${pick.player.birthDate ?? "—"}${eraMismatch ? " ERA" : ""}${affiliationMiss ? " AFFIL" : ""}${ageMismatch ? " AGE" : ""}`,
      );
    }
  }

  console.log(`\n=== ${year} draft (${draft.pickCount} picks) ===`);
  if (issues.length === 0) {
    console.log("No suspicious matches.");
  } else {
    console.log(`${issues.length} issue(s):`);
    for (const line of issues) console.log(`  ${line}`);
  }
}

async function main(): Promise<void> {
  const yearArg = process.argv.find((arg) => arg.startsWith("--year="));
  const years = yearArg
    ? [Number.parseInt(yearArg.split("=")[1] ?? "", 10)]
    : [2026, 2025, 2024, 2023];

  for (const year of years) {
    if (Number.isInteger(year)) await auditYear(year);
  }

  await closeDatabaseConnection();
}

main().catch(async (err) => {
  console.error(err);
  await closeDatabaseConnection();
  process.exit(1);
});
