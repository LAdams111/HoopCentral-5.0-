import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const leagueArg = process.argv.find((arg) => arg.startsWith("--league="));
  const leagueSlugs = leagueArg
    ? [leagueArg.split("=")[1]?.trim()].filter(Boolean)
    : undefined;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const {
    findCollegeDuplicateMergePlans,
    mergeAllCollegeDuplicateTeams,
  } = await import("../server/src/services/college-duplicate-team-merge.service.js");

  const plans = await findCollegeDuplicateMergePlans(leagueSlugs);
  if (plans.length === 0) {
    console.log("No duplicate college teams found.");
    await closeDatabaseConnection();
    return;
  }

  const byLeague = new Map<string, number>();
  for (const plan of plans) {
    byLeague.set(plan.leagueSlug, (byLeague.get(plan.leagueSlug) ?? 0) + 1);
  }

  console.log(`Found ${plans.length} duplicate group(s):`);
  for (const [leagueSlug, count] of [...byLeague.entries()].sort()) {
    console.log(`  ${leagueSlug}: ${count}`);
  }

  for (const plan of plans) {
    console.log(
      `  [${plan.leagueSlug}] ${plan.keepName}: keep #${plan.keepTeamId} [${plan.keepSlug}] <- ${plan.duplicateSlugs.map((slug, i) => `#${plan.duplicateTeamIds[i]} [${slug}]`).join(", ")}`,
    );
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  console.log("");
  const results = await mergeAllCollegeDuplicateTeams(leagueSlugs);
  for (const result of results) {
    for (const merge of result.merges) {
      console.log(
        `[${result.plan.leagueSlug}] Merged ${merge.removedSlug} (#${merge.removedTeamId}) into ${merge.keptSlug} (#${merge.keptTeamId}): +${merge.statsMoved} stats, dropped ${merge.statsDropped} dup stats, +${merge.stintsMoved} stints, dropped ${merge.stintsDropped} dup stints`,
      );
    }
    if (result.nameUpdated) {
      console.log(`  Updated display name -> ${result.plan.keepName}`);
    }
  }

  await closeDatabaseConnection();
  console.log(`\nDone. Merged ${results.length} group(s).`);
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
