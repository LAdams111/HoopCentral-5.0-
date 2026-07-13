import { auditLeagueVisibility } from "../server/src/services/league-visibility.service.js";

async function main() {
  const report = await auditLeagueVisibility();

  console.log("=== League Visibility Audit ===\n");
  console.log(`Total leagues: ${report.total}`);
  console.log(`Public: ${report.publicCount}`);
  console.log(`Hidden: ${report.hiddenCount}`);

  const byReason = new Map<string, number>();
  for (const row of report.hidden) {
    byReason.set(row.reason, (byReason.get(row.reason) ?? 0) + 1);
  }

  console.log("\n--- Hidden by reason ---");
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(5)}  ${reason}`);
  }

  console.log("\n--- Hidden samples (first 25) ---");
  for (const row of report.hidden.slice(0, 25)) {
    console.log(
      `  [${row.slug}] "${row.name}" — ${row.teamCount} teams (${row.junkTeamCount} junk) — ${row.reason}`,
    );
  }

  console.log("\n--- Public discovered samples (non-whitelist, first 15) ---");
  const discoveredPublic = report.publicLeagues
    .filter((row) => row.reason === "passed quality bar")
    .sort((a, b) => b.teamCount - a.teamCount)
    .slice(0, 15);
  for (const row of discoveredPublic) {
    console.log(`  [${row.slug}] "${row.name}" — ${row.teamCount} teams`);
  }

  const caa = report.hidden.find((row) => row.slug === "caa");
  if (caa) {
    console.log(`\nCAA example: hidden — ${caa.reason} (${caa.teamCount} teams)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
