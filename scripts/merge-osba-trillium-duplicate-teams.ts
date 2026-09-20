/**
 * Merge OSBA Trillium alias teams into canonical slugs (whitelist only).
 *
 * Safety: refuses to merge if both teams have roster stats in the same season.
 *
 *   npm run db:merge-osba-trillium-teams -- --dry-run
 *   npm run db:merge-osba-trillium-teams
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { leagues, playerSeasonStats, seasons, teams } from "../server/src/db/schema/index.js";
import { mergeTeamInto } from "../server/src/services/merge-teams.service.js";
import { OSBA_TRILLIUM_MERGE_GROUPS } from "../server/src/utils/osba-trillium-team-aliases.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function seasonsWithStats(teamId: number): Promise<Map<number, string>> {
  const rows = await db
    .selectDistinct({
      seasonId: playerSeasonStats.seasonId,
      label: seasons.seasonLabel,
    })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerSeasonStats.teamId, teamId));
  return new Map(rows.map((r) => [r.seasonId, r.label]));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const [hsLeague] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, "high-school"))
    .limit(1);
  if (!hsLeague) {
    console.error("high-school league not found.");
    process.exit(1);
  }

  let blocked = 0;
  let merged = 0;

  for (const group of OSBA_TRILLIUM_MERGE_GROUPS) {
    console.log(`\n[${group.id}] ${group.reason}`);

    const [canonical] = await db
      .select({ id: teams.id, slug: teams.slug, name: teams.name })
      .from(teams)
      .where(and(eq(teams.leagueId, hsLeague.id), eq(teams.slug, group.canonicalSlug)))
      .limit(1);

    if (!canonical) {
      console.error(`  SKIP: canonical team missing: ${group.canonicalSlug}`);
      blocked += 1;
      continue;
    }

    const aliases = await db
      .select({ id: teams.id, slug: teams.slug, name: teams.name })
      .from(teams)
      .where(and(eq(teams.leagueId, hsLeague.id), inArray(teams.slug, [...group.aliasSlugs])));

    if (aliases.length === 0) {
      console.log(`  OK: no alias rows left (${group.aliasSlugs.join(", ")})`);
      continue;
    }

    const canonicalSeasons = await seasonsWithStats(canonical.id);

    for (const alias of aliases) {
      console.log(`  canonical #${canonical.id} [${canonical.slug}]`);
      console.log(`  alias     #${alias.id} [${alias.slug}] ${alias.name}`);

      const aliasSeasons = await seasonsWithStats(alias.id);
      const overlap = [...aliasSeasons.keys()].filter((id) => canonicalSeasons.has(id));
      if (overlap.length > 0) {
        const labels = overlap.map((id) => aliasSeasons.get(id) ?? canonicalSeasons.get(id));
        console.error(
          `  BLOCKED: both teams have stats in the same season (${labels.join(", ")}). Not merging.`,
        );
        blocked += 1;
        continue;
      }

      if (dryRun) {
        console.log("  dry-run: would merge alias → canonical");
        continue;
      }

      const result = await mergeTeamInto(alias.id, canonical.id);
      console.log(
        `  merged ${result.removedSlug}: +${result.statsMoved} stats, dropped ${result.statsDropped} dup stats`,
      );
      merged += 1;
      for (const [id, label] of aliasSeasons) {
        canonicalSeasons.set(id, label);
      }
    }
  }

  console.log(`\nDone. Merged ${merged} alias team(s). Blocked/skipped groups: ${blocked}.`);
  if (dryRun) console.log("Dry run — no DB changes.");

  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
