/**
 * Merge the plain "Chino Hills High School" / "Chino Hills HS" rows into the
 * MaxPreps Huskies roster so the school exists once.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { leagues, teams } from "../server/src/db/schema/index.js";
import { mergeTeamInto } from "../server/src/services/merge-teams.service.js";

const CANONICAL_SLUG = "chino-hills-huskies-ca";
const DUPLICATE_SLUGS = ["chino-hills-high-school", "chino-hills-hs"] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
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
    .where(and(eq(teams.leagueId, hsLeague.id), eq(teams.slug, CANONICAL_SLUG)))
    .limit(1);

  if (!canonical) {
    console.error(`Canonical team not found: ${CANONICAL_SLUG}`);
    process.exit(1);
  }

  const duplicates = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(and(eq(teams.leagueId, hsLeague.id), inArray(teams.slug, [...DUPLICATE_SLUGS])));

  console.log(`Canonical: #${canonical.id} [${canonical.slug}] ${canonical.name}`);
  if (duplicates.length === 0) {
    console.log("No Chino Hills duplicate teams to merge.");
    await closeDatabaseConnection();
    return;
  }

  for (const dup of duplicates) {
    console.log(`  merge <- #${dup.id} [${dup.slug}] ${dup.name}`);
    const result = await mergeTeamInto(dup.id, canonical.id);
    console.log(
      `Merged ${result.removedSlug} (#${result.removedTeamId}) into ${result.keptSlug}: +${result.statsMoved} stats, dropped ${result.statsDropped} dup stats`,
    );
  }

  await closeDatabaseConnection();
  console.log("Done.");
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
