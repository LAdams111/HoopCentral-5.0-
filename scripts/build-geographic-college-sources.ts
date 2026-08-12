/**
 * Build juco/ccaa conference source JSON from DB team slugs + geographic grouping.
 * Run: node --import tsx/esm scripts/build-geographic-college-sources.ts juco
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync } from "node:fs";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const leagueSlug = process.argv[2]?.trim();
if (!leagueSlug || !["juco", "ccaa"].includes(leagueSlug)) {
  console.error("Usage: ... build-geographic-college-sources.ts <juco|ccaa>");
  process.exit(1);
}

const US_STATE_SLUG_SUFFIX =
  /-(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)(?:-|$)/i;

const STATE_TO_NJCAA_REGION: Record<string, string> = {
  me: "NJCAA Region I",
  nh: "NJCAA Region I",
  vt: "NJCAA Region I",
  ma: "NJCAA Region I",
  ri: "NJCAA Region I",
  ct: "NJCAA Region I",
  ny: "NJCAA Region I",
  pa: "NJCAA Region II",
  md: "NJCAA Region II",
  nj: "NJCAA Region II",
  de: "NJCAA Region II",
  va: "NJCAA Region II",
  wv: "NJCAA Region II",
  dc: "NJCAA Region II",
  nc: "NJCAA Region III",
  sc: "NJCAA Region III",
  al: "NJCAA Region IV",
  fl: "NJCAA Region IV",
  ga: "NJCAA Region IV",
  ms: "NJCAA Region IV",
  tn: "NJCAA Region V",
  ky: "NJCAA Region V",
  wi: "NJCAA Region VI",
  mn: "NJCAA Region VI",
  ia: "NJCAA Region VI",
  il: "NJCAA Region VI",
  mi: "NJCAA Region VII",
  oh: "NJCAA Region VIII",
  in: "NJCAA Region VIII",
  mo: "NJCAA Region IX",
  ks: "NJCAA Region IX",
  la: "NJCAA Region X",
  ar: "NJCAA Region X",
  tx: "NJCAA Region XI",
  ok: "NJCAA Region XIV",
  az: "NJCAA Region XV",
  nm: "NJCAA Region XV",
  ca: "NJCAA Region XVI",
  wa: "NJCAA Region XVIII",
  or: "NJCAA Region XVIII",
  id: "NJCAA Region XVIII",
  mt: "NJCAA Region XVIII",
  co: "NJCAA Region XIX",
  wy: "NJCAA Region XIX",
  ut: "NJCAA Region XIX",
  ne: "NJCAA Region XX",
  sd: "NJCAA Region XX",
  nd: "NJCAA Region XX",
  hi: "NJCAA Region XXI",
};

const PROVINCE_LABELS: Record<string, string> = {
  bc: "British Columbia",
  ab: "Alberta",
  sk: "Saskatchewan",
  mb: "Manitoba",
  on: "Ontario",
  qc: "Quebec",
  nb: "New Brunswick",
  ns: "Nova Scotia",
  pe: "Prince Edward Island",
  nl: "Newfoundland and Labrador",
};

function extractUsState(slug: string, name: string): string | null {
  const slugMatch = slug.match(US_STATE_SLUG_SUFFIX);
  if (slugMatch) return slugMatch[1].toLowerCase();
  const nameMatch = name.match(/\(([A-Z]{2})\)/);
  if (nameMatch) return nameMatch[1].toLowerCase();
  return null;
}

function extractProvince(slug: string, name: string): string | null {
  for (const [code, label] of Object.entries(PROVINCE_LABELS)) {
    if (slug.endsWith(`-${code}`) || slug.includes(`-${code}-`)) return label;
  }
  if (/british columbia|\bbc\b/i.test(name)) return "British Columbia";
  if (/alberta/i.test(name)) return "Alberta";
  if (/saskatchewan/i.test(name)) return "Saskatchewan";
  if (/manitoba/i.test(name)) return "Manitoba";
  if (/ontario/i.test(name)) return "Ontario";
  if (/quebec|québec/i.test(name)) return "Quebec";
  if (/nova scotia/i.test(name)) return "Nova Scotia";
  if (/new brunswick/i.test(name)) return "New Brunswick";
  return null;
}

async function main(): Promise<void> {
  const { db, closeDatabaseConnection } = await import("../server/src/db/index.js");
  const rows = await db.execute(sql`
    SELECT t.name, t.slug
    FROM teams t
    JOIN leagues l ON l.id = t.league_id AND l.slug = ${leagueSlug}
    ORDER BY t.name
  `);

  const teams: Array<{ school: string; nickname: string; conference: string; slug: string }> = [];

  for (const row of rows.rows as Array<{ name: string; slug: string }>) {
    let conference = "Other";
    if (leagueSlug === "juco") {
      const state = extractUsState(row.slug, row.name);
      conference = state ? (STATE_TO_NJCAA_REGION[state] ?? "Other") : "Other";
    } else {
      conference = extractProvince(row.slug, row.name) ?? "Other";
    }

    teams.push({
      school: row.name,
      nickname: "",
      conference,
      slug: row.slug,
    });
  }

  const outDir = path.resolve(__dirname, "college-conference-sources");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, `${leagueSlug}-current-teams.json`);
  writeFileSync(outPath, JSON.stringify(teams, null, 2));

  const conferences = new Set(teams.map((team) => team.conference));
  console.log(`Wrote ${teams.length} teams across ${conferences.size} groups to ${outPath}`);
  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
