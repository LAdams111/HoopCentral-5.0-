import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const leagueSlug = process.argv[2]?.trim();
if (!leagueSlug) {
  console.error("Usage: npx tsx scripts/build-college-db-aliases.ts <league-slug>");
  process.exit(1);
}

const sourcesDir = path.resolve(__dirname, "college-conference-sources");
const sourcePath = path.resolve(sourcesDir, `${leagueSlug}-current-teams.json`);
const outputPath = path.resolve(sourcesDir, `${leagueSlug}-db-aliases.json`);

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['.]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bst\b/g, "state")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 2),
  );
}

function expandUsbasketName(value: string): string {
  return value
    .replace(/\bAl\.-/gi, "Alabama ")
    .replace(/\bArk\.-/gi, "Arkansas ")
    .replace(/\bFl\.-/gi, "Florida ")
    .replace(/\bGa\.-/gi, "Georgia ")
    .replace(/\bKy\.-/gi, "Kentucky ")
    .replace(/\bLa\.-/gi, "Louisiana ")
    .replace(/\bMiss\.-/gi, "Mississippi ")
    .replace(/\bMo\.-/gi, "Missouri ")
    .replace(/\bN\.-/gi, "North ")
    .replace(/\bS\.-/gi, "South ")
    .replace(/\bE\.-/gi, "East ")
    .replace(/\bW\.-/gi, "West ")
    .replace(/\bSt\./g, "State")
    .replace(/\bUniv\./g, "University")
    .replace(/\bIntl\./g, "International")
    .replace(/\bAmer\./g, "American")
    .replace(/\bInternat\./g, "International")
    .replace(/\bAnch\./g, "Anchorage")
    .replace(/\bFairb\./g, "Fairbanks")
    .replace(/-/g, " ");
}

function scoreMatch(dbName: string, school: string, nickname: string, slugHint?: string): number {
  const candidates = [dbName, expandUsbasketName(dbName)];
  let best = 0;
  for (const candidate of candidates) {
    const dbNorm = normalize(candidate);
    const schoolNorm = normalize(school);
    const nicknameNorm = normalize(nickname);
    const slugNorm = slugHint ? normalize(slugHint.replace(/-/g, " ")) : "";

    if (dbNorm === schoolNorm) best = Math.max(best, 1);
    if (slugNorm && dbNorm === slugNorm) best = Math.max(best, 0.98);
    if (nicknameNorm && dbNorm === nicknameNorm) best = Math.max(best, 0.95);
    if (schoolNorm.startsWith(`${dbNorm} `) || dbNorm.startsWith(`${schoolNorm} `)) {
      best = Math.max(best, 0.92);
    }

    const schoolTokenSet = tokens(school);
    const dbTokenSet = tokens(candidate);
    let overlap = 0;
    for (const token of dbTokenSet) {
      if (schoolTokenSet.has(token)) overlap += 1;
    }
    const tokenScore = overlap / Math.max(dbTokenSet.size, 1);
    best = Math.max(best, tokenScore);
  }
  return best;
}

async function main(): Promise<void> {
  mkdirSync(sourcesDir, { recursive: true });
  const sourceTeams = JSON.parse(readFileSync(sourcePath, "utf8")) as Array<{
    school: string;
    nickname?: string;
    conference: string;
    slug?: string;
  }>;

  const { db, closeDatabaseConnection } = await import("../server/src/db/index.js");
  const rows = await db.execute(sql`
    SELECT t.name, t.abbreviation, t.slug,
           MAX(s.season_label) AS latest_season
    FROM teams t
    JOIN leagues l ON l.id = t.league_id AND l.slug = ${leagueSlug}
    LEFT JOIN player_season_stats pss ON pss.team_id = t.id
    LEFT JOIN seasons s ON s.id = pss.season_id
    GROUP BY t.id, t.name, t.abbreviation, t.slug
    ORDER BY t.name
  `);

  const aliases: Record<string, string> = {};
  const currentSlugs = new Set<string>();
  const matches: Array<Record<string, string | number>> = [];
  const minScore = leagueSlug === "u-sports" || leagueSlug === "ccaa" ? 0.65 : 0.72;

  for (const row of rows.rows as Array<{
    name: string;
    abbreviation: string;
    slug: string;
    latest_season: string | null;
  }>) {
    let bestSchool = "";
    let bestScore = 0;
    let bestConference = "";

    for (const entry of sourceTeams) {
      const score = scoreMatch(
        row.name,
        entry.school,
        entry.nickname ?? "",
        entry.slug ?? entry.school,
      );
      if (score > bestScore) {
        bestScore = score;
        bestSchool = entry.school;
        bestConference = entry.conference;
      }
    }

    if (bestScore >= minScore && bestSchool) {
      const canonical = slugify(bestSchool);
      for (const key of [row.name, row.slug, row.abbreviation, slugify(row.name)]) {
        if (key) aliases[key.trim().toLowerCase()] = canonical;
      }
      if (
        !row.latest_season ||
        row.latest_season === "2024-25" ||
        row.latest_season === "2025-26"
      ) {
        currentSlugs.add(row.slug);
      }
      matches.push({
        dbName: row.name,
        dbSlug: row.slug,
        school: bestSchool,
        conference: bestConference,
        score: Number(bestScore.toFixed(3)),
        latestSeason: row.latest_season ?? "",
      });
    }
  }

  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        aliases,
        currentSlugs: [...currentSlugs].sort(),
        matches,
      },
      null,
      2,
    ),
  );

  console.log(
    `[${leagueSlug}] Wrote ${Object.keys(aliases).length} alias keys, ${currentSlugs.size} current slugs, ${matches.length} matches`,
  );
  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
