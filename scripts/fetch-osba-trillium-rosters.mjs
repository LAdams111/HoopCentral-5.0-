/**
 * Fetch all Trillium Mens roster seasons from Ontario SBA and write JSON for seeding.
 * Run: node scripts/fetch-osba-trillium-rosters.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIVISION_URL = "https://www.ontariosba.ca/division/0/33064/rosters";
const OUT_PATH = path.resolve(__dirname, "data/osba-trillium-all-seasons.json");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; HoopCentral/1.0)" } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
}

function decodeHtml(s) {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function slugify(name) {
  return decodeHtml(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function teamSlug(name) {
  return `${slugify(name)}-ca-on`;
}

function abbrev(name) {
  const words = decodeHtml(name)
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 5).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 5)
    .toUpperCase();
}

/** OSBA "2025-2026" → Hoop Central "2025-26" */
function toHcSeasonLabel(osbaLabel) {
  const m = /^(\d{4})-(\d{4})$/.exec(osbaLabel.trim());
  if (!m) return osbaLabel;
  return `${m[1]}-${m[2].slice(-2)}`;
}

function parseRosterTable(html) {
  const table = html.match(/<table class="w-full table-auto[\s\S]*?<\/table>/);
  if (!table) return { teams: [], roster: [] };
  const rows = [...table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);
  const roster = [];
  const teamSet = new Map();

  for (const m of rows) {
    const row = m[1];
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((x) =>
      decodeHtml(x[1].replace(/<[^>]+>/g, "").trim()),
    );
    if (cells.length < 4) continue;
    const [teamName, jersey, playerName, position] = cells;
    if (!teamName || !playerName || teamName === "Team") continue;
    const tSlug = teamSlug(teamName);
    if (!teamSet.has(tSlug)) {
      teamSet.set(tSlug, { name: teamName, slug: tSlug, abbreviation: abbrev(teamName) });
    }
    roster.push({
      teamSlug: tSlug,
      teamName,
      jersey,
      name: playerName,
      position,
      playerSlug: `${tSlug}-${slugify(playerName)}`.slice(0, 120),
    });
  }

  return { teams: [...teamSet.values()], roster };
}

async function listSeasons(baseHtml) {
  return [...baseHtml.matchAll(/href="(\/division\/0\/33064\/rosters\?sid=(\d+))"[^>]*>([^<]+)<\/a>/g)]
    .map((m) => ({
      sid: m[2],
      osbaSeasonLabel: decodeHtml(m[3].trim()),
      url: `https://www.ontariosba.ca${m[1]}`,
    }))
    .filter((s, i, arr) => arr.findIndex((x) => x.sid === s.sid) === i)
    .sort((a, b) => a.osbaSeasonLabel.localeCompare(b.osbaSeasonLabel));
}

async function main() {
  const baseHtml = await fetch(DIVISION_URL);
  const seasonsMeta = await listSeasons(baseHtml);
  const seasons = [];

  for (const meta of seasonsMeta) {
    const html = meta.sid === "11920" ? baseHtml : await fetch(meta.url);
    const parsed = parseRosterTable(html);
    seasons.push({
      osbaSeasonLabel: meta.osbaSeasonLabel,
      seasonLabel: toHcSeasonLabel(meta.osbaSeasonLabel),
      sourceUrl: meta.url,
      teams: parsed.teams,
      roster: parsed.roster,
    });
    console.log(meta.osbaSeasonLabel, "→", toHcSeasonLabel(meta.osbaSeasonLabel), parsed.roster.length, "players");
  }

  const allTeams = new Map();
  for (const s of seasons) {
    for (const t of s.teams) allTeams.set(t.slug, t);
  }

  const out = {
    sourceUrl: DIVISION_URL,
    division: "Trillium Mens",
    association: "OSBA",
    province: "ON",
    fetchedAt: new Date().toISOString(),
    seasons,
    teams: [...allTeams.values()],
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log("\nWrote", OUT_PATH, "teams", out.teams.length, "season count", seasons.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
