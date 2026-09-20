/**
 * Fetch Dalhousie Tigers men's basketball roster + bio pages (Sidearm, AWS WAF).
 *
 *   node scripts/fetch-daltigers-roster.mjs
 *   node scripts/fetch-daltigers-roster.mjs --season=2025-26
 *
 * Requires: npx playwright install chromium (once)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seasonArg = process.argv.find((a) => a.startsWith("--season="))?.slice("--season=".length);
const SEASON = seasonArg?.trim() || "2025-26";
const ROSTER_URL = `https://daltigers.ca/sports/mbkb/${SEASON}/roster`;
const OUT_DIR = path.resolve(__dirname, "data");
const OUT_PATH = path.resolve(OUT_DIR, `daltigers-mbkb-${SEASON}.json`);

function heightToCm(height) {
  if (!height?.trim()) return null;
  const apost = /^(\d+)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?$/.exec(height.trim());
  if (apost) {
    const feet = Number(apost[1]);
    const inches = Number(apost[2]);
    if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
      return Math.round((feet * 12 + inches) * 2.54);
    }
  }
  const normalized = height.trim().replace(/['"]/g, "-");
  const dash = /^(\d+)\s*[-]\s*(\d+(?:\.\d+)?)$/.exec(normalized);
  if (dash) {
    const feet = Number(dash[1]);
    const inches = Number(dash[2]);
    if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
      return Math.round((feet * 12 + inches) * 2.54);
    }
  }
  return null;
}

function parseRosterPage() {
  const table = document.querySelector("table");
  if (!table) return [];
  const ths = [...table.querySelectorAll("th")].map((th) => th.innerText.trim());
  const nameStart = ths.findIndex((h) => h === "HOMETOWN") + 1;
  const names = ths.slice(nameStart);
  const bioLinks = [...document.querySelectorAll('a[aria-label*="full bio"]')].map((a) => ({
    aria: a.getAttribute("aria-label"),
    href: a.href,
  }));
  return [...table.querySelectorAll("tbody tr")].map((tr, i) => {
    const cells = [...tr.querySelectorAll("td")].map((td) => td.innerText.trim());
    const bioHref = bioLinks[i]?.href ?? "";
    const externalId = bioHref.split("/bios/")[1]?.replace(/\/$/, "") ?? "";
    const name =
      names[i] ||
      bioLinks[i]?.aria?.split(":")[0]?.trim() ||
      "";
    return {
      name,
      externalId,
      jersey: cells[0] ?? "",
      position: cells[1] ?? "",
      height: cells[2] ?? "",
      eligibility: cells[3] ?? "",
      major: cells[4] ?? "",
      hometown: cells[5] ?? "",
      bioHref,
    };
  }).filter((r) => r.name && r.externalId);
}

function parseBioPage() {
  const main = document.querySelector("#site-main") || document.body;
  const img =
    main.querySelector('img[src*="/photos/"]')?.src ||
    main.querySelector(".sidearm-roster-player-photo img")?.src ||
    null;

  const detailMap = {};
  for (const li of main.querySelectorAll("li")) {
    const t = li.innerText.trim();
    const m = /^(Height|Hometown|Position|Year|Major):\s*\n?\s*(.+)$/is.exec(t);
    if (m) detailMap[m[1].toLowerCase()] = m[2].trim();
  }

  const stats = {};
  for (const li of main.querySelectorAll("li")) {
    const t = li.innerText.trim();
    const m = /^([A-Za-z0-9/ %]+)\s*\n\s*([\d.]+)$/.exec(t);
    if (!m) continue;
    const key = m[1].replace(/\s+/g, " ").trim().toUpperCase();
    stats[key] = Number(m[2]);
  }

  const tableStats = {};
  for (const table of main.querySelectorAll("table")) {
    for (const tr of table.querySelectorAll("tr")) {
      const cells = [...tr.querySelectorAll("td, th")].map((cell) =>
        cell.innerText.trim(),
      );
      if (cells.length < 2) continue;
      const label = cells[0].toLowerCase();
      const value = cells[1];
      if (label && value && !tableStats[label]) tableStats[label] = value;
    }
  }

  const gamesPlayed =
    stats["GP"] ??
    (tableStats.games ? Number(tableStats.games) : null);
  const gp = gamesPlayed && gamesPlayed > 0 ? gamesPlayed : null;

  let stealsPerGame = null;
  let blocksPerGame = null;
  if (gp) {
    const stealsTotal = Number(tableStats.steals);
    const blocksTotal = Number(tableStats.blocks);
    if (Number.isFinite(stealsTotal)) {
      stealsPerGame = Math.round((stealsTotal / gp) * 10) / 10;
    }
    if (Number.isFinite(blocksTotal)) {
      blocksPerGame = Math.round((blocksTotal / gp) * 10) / 10;
    }
  }

  return {
    headshotUrl: img,
    height: detailMap.height ?? null,
    hometown: detailMap.hometown ?? null,
    position: detailMap.position ?? null,
    eligibilityYear: detailMap.year ?? null,
    major: detailMap.major ?? null,
    stats: {
      gamesPlayed: gp,
      pointsPerGame: stats["PTS/G"] ?? null,
      fieldGoalPct: stats["FG %"] ?? null,
      threePointPct: stats["3PT %"] ?? null,
      freeThrowPct: stats["FT %"] ?? null,
      reboundsPerGame: stats["REB/G"] ?? null,
      assistsPerGame: stats["A/G"] ?? null,
      stealsPerGame,
      blocksPerGame,
    },
  };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "Playwright is required. Run: npm install -D playwright && npx playwright install chromium",
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Fetching roster: ${ROSTER_URL}`);
  await page.goto(ROSTER_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("table tbody tr", { timeout: 60_000 });
  let roster = await page.evaluate(parseRosterPage);
  roster = roster.map((row) => ({
    ...row,
    heightCm: heightToCm(row.height),
  }));
  console.log(`Roster rows: ${roster.length}`);

  for (let i = 0; i < roster.length; i += 1) {
    const row = roster[i];
    if (!row.bioHref) continue;
    process.stdout.write(`Bio ${i + 1}/${roster.length}: ${row.name}\n`);
    await page.goto(row.bioHref, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForSelector("#site-main, .sidearm-roster-player", {
      timeout: 60_000,
    }).catch(() => {});
    await page.waitForTimeout(1200);
    let bio;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        bio = await page.evaluate(parseBioPage);
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await page.waitForTimeout(1500);
      }
    }
    Object.assign(row, {
      headshotUrl: bio.headshotUrl,
      height: bio.height || row.height,
      heightCm: heightToCm(bio.height || row.height),
      hometown: bio.hometown || row.hometown,
      position: bio.position || row.position,
      major: bio.major || row.major,
      eligibilityYear: bio.eligibilityYear || row.eligibility,
      seasonStats: bio.stats,
    });
  }

  await browser.close();

  const payload = {
    fetchedAt: new Date().toISOString(),
    season: SEASON,
    rosterUrl: ROSTER_URL,
    players: roster,
  };
  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
