import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { getCcaaManualAliasesPath, loadCcaaManualAliases } = await import(
    "../server/src/utils/ccaa-team-aliases.js"
  );
  const {
    findCcaaDuplicateMergePlans,
    mergeAllCcaaDuplicateTeams,
  } = await import("../server/src/services/merge-teams.service.js");

  const aliasesPath = getCcaaManualAliasesPath();
  const aliases = loadCcaaManualAliases(aliasesPath);
  console.log(`Using CCAA manual aliases: ${aliasesPath}`);
  console.log(`  ${Object.keys(aliases).length} alias entries`);

  const plans = await findCcaaDuplicateMergePlans();
  if (plans.length === 0) {
    console.log("No CCAA duplicate teams found to merge.");
    await closeDatabaseConnection();
    return;
  }

  console.log(`Found ${plans.length} duplicate group(s) to merge:`);
  for (const plan of plans) {
    console.log(
      `  ${plan.canonical.name} (${plan.canonical.slug}): keep #${plan.keepTeamId} [${plan.keepSlug}] <- ${plan.duplicateSlugs.map((slug, i) => `#${plan.duplicateTeamIds[i]} [${slug}]`).join(", ")}`,
    );
  }

  if (dryRun) {
    console.log("\nDry run — no changes written.");
    await closeDatabaseConnection();
    return;
  }

  const results = await mergeAllCcaaDuplicateTeams();
  console.log(`\nMerged ${results.length} group(s).`);
  await closeDatabaseConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
