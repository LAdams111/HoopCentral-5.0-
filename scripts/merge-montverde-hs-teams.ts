/**
 * Merge duplicate Montverde Academy high-school teams into the canonical MaxPreps team.
 *
 * Usage:
 *   npm run db:merge-montverde-hs-teams -- --dry-run
 *   npm run db:merge-montverde-hs-teams
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { leagues, teams } from "../server/src/db/schema/index.js";
import { mergeTeamInto } from "../server/src/services/merge-teams.service.js";
import {
  MONTEVERDE_HS_CANONICAL_SLUG,
  MONTEVERDE_HS_JUNK_DUPLICATE_SLUGS,
} from "../server/src/utils/maxpreps-team-aliases.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

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

  const [canonical] = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(and(eq(teams.leagueId, hsLeague.id), eq(teams.slug, MONTEVERDE_HS_CANONICAL_SLUG)))
    .limit(1);

  if (!canonical) {
    console.error(`Canonical team not found: ${MONTEVERDE_HS_CANONICAL_SLUG}`);
    process.exit(1);
  }

  const duplicates = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(and(eq(teams.leagueId, hsLeague.id), inArray(teams.slug, [...MONTEVERDE_HS_JUNK_DUPLICATE_SLUGS])));

  if (duplicates.length === 0) {
    console.log("No Montverde duplicate teams to merge.");
    await closeDatabaseConnection();
    return;
  }

  console.log(`Canonical: #${canonical.id} [${canonical.slug}] ${canonical.name}`);
  for (const dup of duplicates) {
    console.log(`  merge <- #${dup.id} [${dup.slug}] ${dup.name}`);
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  console.log("");
  for (const dup of duplicates) {
    const result = await mergeTeamInto(dup.id, canonical.id);
    console.log(
      `Merged ${result.removedSlug} (#${result.removedTeamId}) into ${result.keptSlug}: +${result.statsMoved} stats, dropped ${result.statsDropped} dup stats`,
    );
  }

  await closeDatabaseConnection();
  console.log("\nDone.");
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error("Merge failed:", err);
    process.exit(1);
  });
}
