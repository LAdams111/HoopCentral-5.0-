import { auditHiddenTeams } from "../server/src/services/league-visibility.service.js";
import { isBrowsableTeam } from "../server/src/utils/league-visibility.js";

async function main() {
  const example = "USC HEIDELBER<LEFT IN JAN.'12";
  console.log(
    `Example "${example}" hidden:`,
    !isBrowsableTeam({ name: example, slug: "usc-heidelber-left-in-jan-12" }, { distinctPlayerCount: 1 }),
  );

  console.log("\nScanning public leagues for hidden teams...\n");
  const report = await auditHiddenTeams(30);

  console.log("--- Hidden by reason ---");
  for (const [reason, count] of Object.entries(report.hiddenByReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(6)}  ${reason}`);
  }

  console.log("\n--- Samples ---");
  for (const row of report.samples) {
    console.log(
      `  [${row.leagueSlug}] "${row.teamName}" (${row.playerCount} players) — ${row.reason}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
