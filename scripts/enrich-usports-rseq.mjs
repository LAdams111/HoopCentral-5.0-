/**
 * Attach RSEQ StatCrew season totals + game boxes onto an official roster JSON.
 *   node scripts/enrich-usports-rseq.mjs --team=concordia-university --season=2025-26
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachRseqToRoster, fetchRseqTeam } from "./lib/parse-rseq-statcrew.mjs";
import { normalizeSeasonLabel } from "./lib/usports-season-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEASON = normalizeSeasonLabel(
  process.argv.find((a) => a.startsWith("--season="))?.slice("--season=".length)?.trim() ||
    "2025-26",
);
const TEAM_SLUG = process.argv.find((a) => a.startsWith("--team="))?.slice("--team=".length)?.trim();

const RSEQ_TEAMS = {
  "concordia-university": {
    schoolName: "Concordia",
    page: (yy) =>
      `http://www.rseq-stats.ca/universitaire/basketball-m/stats/${yy}/conc.htm`,
  },
};

function seasonCode(label) {
  const [start, end] = String(label).split("-");
  const a = String(start).slice(2);
  const b = end.length === 2 ? end : String(end).slice(2);
  return `${a}${b}`;
}

async function main() {
  if (!TEAM_SLUG) throw new Error("Pass --team=concordia-university");
  const spec = RSEQ_TEAMS[TEAM_SLUG];
  if (!spec) throw new Error(`No RSEQ mapping for ${TEAM_SLUG}`);
  const jsonPath = path.resolve(__dirname, "data/official-rosters", `${TEAM_SLUG}-${SEASON}.json`);
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  const url = spec.page(seasonCode(SEASON));
  console.log(`RSEQ ${TEAM_SLUG} ${SEASON}: ${url}`);
  const rseq = await fetchRseqTeam(url, spec.schoolName);
  data.players = attachRseqToRoster(data.players ?? [], rseq, SEASON);
  data.rseqUrl = url;
  data.rseqFetchedAt = new Date().toISOString();
  writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  const withLogs = data.players.filter((p) => (p.gameLogs?.length ?? 0) > 0).length;
  const withStats = data.players.filter((p) => p.seasonStats?.gamesPlayed).length;
  console.log(
    `Wrote ${jsonPath} (${withStats} season lines, ${withLogs} players with boxes, ${rseq.games.length} games)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
