import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { getNcaaTeamAliasReportPath, loadNcaaTeamAliasReport } = await import(
    "../server/src/utils/ncaa-team-alias-report.js"
  );
  const {
    applyNcaaMensCanonicalIdentityUpdates,
    findNcaaMensCanonicalIdentityUpdates,
    findNcaaMensDuplicateMergePlans,
    mergeAllNcaaMensDuplicateTeams,
  } = await import("../server/src/services/merge-teams.service.js");

  const reportPath = getNcaaTeamAliasReportPath();
  const report = loadNcaaTeamAliasReport(reportPath);
  console.log(`Using alias report: ${reportPath}`);
  console.log(
    `  ${Object.keys(report.aliasMap).length} aliasMap entries, ${report.suspectedDuplicates.length} suspected pairs, ${report.allTeams.length} teams in inventory`,
  );

  const plans = await findNcaaMensDuplicateMergePlans();
  const identityUpdates = await findNcaaMensCanonicalIdentityUpdates();

  if (plans.length === 0 && identityUpdates.length === 0) {
    console.log("No NCAA men's duplicate teams or alias renames found.");
    await closeDatabaseConnection();
    return;
  }

  if (plans.length > 0) {
    console.log(`Found ${plans.length} duplicate group(s) to merge:`);
    for (const plan of plans) {
      console.log(
        `  ${plan.canonical.name} (${plan.canonical.slug}): keep #${plan.keepTeamId} [${plan.keepSlug}] <- ${plan.duplicateSlugs.map((slug, i) => `#${plan.duplicateTeamIds[i]} [${slug}]`).join(", ")}`,
      );
    }
  }

  if (identityUpdates.length > 0) {
    console.log(`\nFound ${identityUpdates.length} lone alias team(s) to rename:`);
    for (const update of identityUpdates) {
      console.log(
        `  #${update.teamId} [${update.fromSlug}] -> [${update.to.slug}] ${update.to.name}`,
      );
    }
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  console.log("");
  if (plans.length > 0) {
    const results = await mergeAllNcaaMensDuplicateTeams();
    for (const result of results) {
      for (const merge of result.merges) {
        console.log(
          `Merged ${merge.removedSlug} (#${merge.removedTeamId}) into ${merge.keptSlug} (#${merge.keptTeamId}): +${merge.statsMoved} stats, dropped ${merge.statsDropped} dup stats`,
        );
      }
      if (result.canonicalUpdated) {
        console.log(
          `  Updated canonical identity -> ${result.plan.canonical.slug} (${result.plan.canonical.name})`,
        );
      }
    }
  }

  const appliedRenames = await applyNcaaMensCanonicalIdentityUpdates();
  for (const rename of appliedRenames) {
    console.log(
      `Renamed #${rename.teamId} [${rename.fromSlug}] -> [${rename.to.slug}] ${rename.to.name}`,
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
