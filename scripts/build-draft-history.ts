/**
 * Build NBA draft history JSON (1960–latest) from Wikipedia draft pages.
 *
 * Usage: npx tsx --tsconfig server/tsconfig.json scripts/build-draft-history.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../server/src/data/draft-history.json");

const START_YEAR = 1960;
const END_YEAR = new Date().getFullYear();
const USER_AGENT = "HoopCentralDraftBot/1.0 (https://hoopcentral.app; draft history seed)";

export interface DraftPickSeed {
  year: number;
  round: number;
  overallPick: number;
  playerName: string;
  draftTeam: string;
  affiliation: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#160;/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[\s*[a-z0-9]+\s*\]/gi, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function cleanPlayerName(name: string): string {
  return name
    .replace(/[.]*\s*[~^*#+]+$/g, "")
    .replace(/[~^*#+]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTeamName(team: string): string {
  return team
    .replace(/\.mw-parser-output[\s\S]*$/i, "")
    .replace(/\*+/g, "")
    .replace(/\s+traded to\b.*$/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAffiliation(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRoundCell(value: string): number | null {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function isDraftTable(html: string): boolean {
  const header = stripHtml(html.match(/<tr[\s\S]*?<\/tr>/)?.[0] ?? "");
  const hasPlayer = /\bPlayer\b/i.test(header);
  const hasPick = /\bPick\b|\bOverall\b/i.test(header);
  const hasTeam = /\bTeam\b/i.test(header);
  const rowCount = (html.match(/<tr/g) ?? []).length;
  return hasPlayer && hasPick && hasTeam && rowCount >= 5;
}

function parseDraftTable(tableHtml: string, year: number): DraftPickSeed[] {
  const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/g)].slice(1);
  const picks: DraftPickSeed[] = [];
  let currentRound = 1;

  for (const row of rows) {
    const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) =>
      stripHtml(m[1]),
    );

    if (cells.length === 1 && /round/i.test(cells[0] ?? "")) {
      const round = parseRoundCell(cells[0] ?? "");
      if (round) currentRound = round;
      continue;
    }

    if (cells.length < 4) continue;

    const numeric = cells.map((c) => (/^\d+$/.test(c) ? Number(c) : null));
    let round: number | null = null;
    let overallPick: number | null = null;
    let playerName = "";
    let draftTeam = "";
    let affiliation = "";

    if (numeric[0] != null && numeric[1] != null) {
      round = numeric[0];
      overallPick = numeric[1];
      playerName = cells[2] ?? "";
      if (cells.length >= 7) {
        draftTeam = cells[5] ?? "";
        affiliation = cells[6] ?? "";
      } else if (cells.length >= 6) {
        draftTeam = cells[4] ?? "";
        affiliation = cells[5] ?? "";
      } else {
        draftTeam = cells[cells.length - 2] ?? "";
        affiliation = cells[cells.length - 1] ?? "";
      }
    } else if (numeric[0] == null && numeric[1] != null && parseRoundCell(cells[0] ?? "") != null) {
      // e.g. "T /1", "1"
      round = parseRoundCell(cells[0] ?? "");
      overallPick = numeric[1];
      playerName = cells[2] ?? "";
      draftTeam = cells[5] ?? cells[cells.length - 2] ?? "";
      affiliation = cells[6] ?? cells[cells.length - 1] ?? "";
    } else if (numeric[0] != null) {
      overallPick = numeric[0];
      round = currentRound;
      playerName = cells[1] ?? "";
      draftTeam = cells[cells.length - 2] ?? "";
      affiliation = cells[cells.length - 1] ?? "";
    } else {
      continue;
    }

    playerName = cleanPlayerName(playerName);
    draftTeam = cleanTeamName(draftTeam);
    affiliation = cleanAffiliation(affiliation);

    if (!playerName || overallPick == null || overallPick < 1) continue;

    picks.push({
      year,
      round: round ?? currentRound,
      overallPick,
      playerName,
      draftTeam,
      affiliation,
    });
  }

  return picks;
}

async function fetchYearPicks(year: number): Promise<DraftPickSeed[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=parse&page=${year}_NBA_draft` +
    `&prop=text&format=json&formatversion=2`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Wikipedia HTTP ${res.status} for ${year}`);
  }
  const json = (await res.json()) as { parse?: { text?: string }; error?: { info?: string } };
  if (json.error || !json.parse?.text) {
    throw new Error(`Wikipedia missing page for ${year}: ${json.error?.info ?? "no text"}`);
  }

  const tables = [...json.parse.text.matchAll(/<table class="wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/g)];
  const picks: DraftPickSeed[] = [];
  const seen = new Set<number>();

  for (const match of tables) {
    const tableHtml = match[1] ?? "";
    if (!isDraftTable(tableHtml)) continue;
    for (const pick of parseDraftTable(tableHtml, year)) {
      if (seen.has(pick.overallPick)) continue;
      seen.add(pick.overallPick);
      picks.push(pick);
    }
  }

  picks.sort((a, b) => a.overallPick - b.overallPick);
  return picks;
}

async function main() {
  const byYear: Record<string, DraftPickSeed[]> = {};
  const failures: string[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    process.stdout.write(`Fetching ${year}... `);
    try {
      const picks = await fetchYearPicks(year);
      byYear[String(year)] = picks;
      console.log(`${picks.length} picks`);
      if (picks.length === 0) failures.push(`${year}: 0 picks`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED (${message})`);
      failures.push(`${year}: ${message}`);
      byYear[String(year)] = [];
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    startYear: START_YEAR,
    endYear: END_YEAR,
    source: "Wikipedia NBA draft pages",
    years: byYear,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  const total = Object.values(byYear).reduce((sum, picks) => sum + picks.length, 0);
  console.log(`\nWrote ${total} picks across ${END_YEAR - START_YEAR + 1} years → ${OUT_PATH}`);
  if (failures.length) {
    console.warn("Issues:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
