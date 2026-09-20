/**
 * Ingest Dalhousie Tigers roster JSON (from fetch-daltigers-roster.mjs) into Hoop Central.
 * Links to existing U Sports players when the match is unique (name + Dal team).
 *
 *   npx tsx --tsconfig server/tsconfig.json scripts/ingest-daltigers-roster.ts
 *   npx tsx --tsconfig server/tsconfig.json scripts/ingest-daltigers-roster.ts --apply
 *   npx tsx --tsconfig server/tsconfig.json scripts/ingest-daltigers-roster.ts --apply --season=2025-26
 */
import "../server/src/load-env.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  ingestPlayerBio,
  parseIngestPlayerBioBody,
} from "../server/src/services/ingest-bio.service.js";
import {
  ingestPlayerSeason,
  parseIngestPlayerSeasonBody,
} from "../server/src/services/ingest.service.js";
import { formatJerseyNumber } from "../server/src/utils/jersey.js";
import {
  isLikelyRealHometown,
  sanitizeIngestHometown,
} from "../server/src/utils/hometown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const SEASON =
  process.argv.find((a) => a.startsWith("--season="))?.slice("--season=".length)?.trim() ||
  "2025-26";
const JSON_PATH =
  process.argv.find((a) => a.startsWith("--json="))?.slice("--json=".length) ??
  path.resolve(__dirname, `data/daltigers-mbkb-${SEASON}.json`);

const SOURCE = "daltigers_mbkb";
const TEAM = {
  slug: "dalhousie-university",
  name: "Dalhousie University Tigers",
  abbreviation: "DALHOU",
};
const LEAGUE = { slug: "u-sports", name: "U Sports" };

type RosterPlayer = {
  name: string;
  externalId: string;
  jersey: string;
  position: string;
  height: string;
  heightCm: number | null;
  hometown: string;
  major?: string;
  eligibilityYear?: string;
  headshotUrl?: string | null;
  seasonStats?: {
    gamesPlayed: number | null;
    pointsPerGame: number | null;
    fieldGoalPct: number | null;
    threePointPct: number | null;
    freeThrowPct: number | null;
    reboundsPerGame: number | null;
    assistsPerGame: number | null;
    stealsPerGame?: number | null;
    blocksPerGame?: number | null;
  };
};

type LinkTarget = { source: string; externalId: string; playerId: number };

type DalCandidate = {
  playerId: number;
  displayName: string;
  jerseyNumber: string | null;
  seasonLabels: string[];
  identitySource: string;
  identityExternalId: string;
};

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NAME_SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function nameTokens(s: string): string[] {
  return normName(s)
    .split(/\s+/)
    .filter((t) => t && !NAME_SUFFIX.has(t));
}

function namesMatch(rosterName: string, dbName: string): boolean {
  const a = nameTokens(rosterName);
  const b = nameTokens(dbName);
  if (!a.length || !b.length) return false;
  if (a.join(" ") === b.join(" ")) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.every((t) => longer.includes(t));
}

function normalizePosition(position: string | null | undefined): string | null {
  if (!position?.trim()) return null;
  const raw = position.trim();
  const map: Record<string, string> = {
    guard: "G",
    forward: "F",
    centre: "C",
    center: "C",
    post: "C",
  };
  const key = raw.toLowerCase();
  if (map[key]) return map[key];
  if (/^(PG|SG|SF|PF|C|G|F|G-F|F-G|F-C|C-F)$/i.test(raw)) return raw.toUpperCase();
  return raw;
}

function countryFromHometown(hometown: string): string | null {
  const h = hometown.toUpperCase();
  if (
    /\b(ON|BC|AB|MB|SK|QC|NS|NB|PE|NL|YT|NT|NU|ONTARIO|QUEBEC|ALBERTA|MANITOBA|SASKATCHEWAN|NOVA SCOTIA|NEW BRUNSWICK|BRITISH COLUMBIA|BAHAMAS)\b/.test(
      h,
    )
  ) {
    return "Canada";
  }
  if (/\b(USA|U\.S\.A|UNITED STATES)\b/.test(h)) return "United States";
  if (/,\s*[A-Z]{2}$/.test(hometown.trim()) && !/,\s*(ON|BC|AB|MB|SK|QC|NS|NB|PE|NL|YT|NT|NU)$/i.test(hometown)) {
    return "United States";
  }
  return null;
}

function isRealJersey(v: string | null | undefined): boolean {
  const t = v?.trim() ?? "";
  if (!t) return false;
  if (/^(rs|n\/a|na|-|—)$/i.test(t)) return false;
  return /^\d{1,2}$/.test(t);
}

async function loadDalCandidates(): Promise<DalCandidate[]> {
  const result = await db.execute(sql`
    WITH dal_rows AS (
      SELECT
        p.id AS player_id,
        p.display_name,
        p.jersey_number,
        s.season_label
      FROM players p
      JOIN player_season_stats pss ON pss.player_id = p.id
      JOIN teams t ON t.id = pss.team_id
      JOIN leagues l ON l.id = pss.league_id
      JOIN seasons s ON s.id = pss.season_id
      WHERE l.slug = 'u-sports'
        AND (t.slug IN ('dalhousie-university', 'dalhousie') OR t.name ILIKE 'dalhousie%')
    ),
    ranked_identities AS (
      SELECT
        pi.player_id,
        pi.source,
        pi.external_id,
        ROW_NUMBER() OVER (
          PARTITION BY pi.player_id
          ORDER BY CASE pi.source
            WHEN 'usbasket-u-sports' THEN 1
            WHEN 'usbasket-profile' THEN 2
            WHEN 'manual' THEN 3
            WHEN 'daltigers_mbkb' THEN 8
            ELSE 9
          END,
          pi.id
        ) AS rn
      FROM player_identities pi
      WHERE pi.player_id IN (SELECT DISTINCT player_id FROM dal_rows)
    )
    SELECT
      dr.player_id,
      dr.display_name,
      dr.jersey_number,
      dr.season_label,
      ri.source,
      ri.external_id
    FROM dal_rows dr
    JOIN ranked_identities ri ON ri.player_id = dr.player_id AND ri.rn = 1
  `);

  const rows = (result.rows ?? result) as {
    player_id: number;
    display_name: string;
    jersey_number: string | null;
    season_label: string;
    source: string;
    external_id: string;
  }[];

  const byId = new Map<number, DalCandidate>();
  for (const row of rows) {
    const existing = byId.get(row.player_id) ?? {
      playerId: row.player_id,
      displayName: row.display_name,
      jerseyNumber: row.jersey_number,
      seasonLabels: [],
      identitySource: row.source,
      identityExternalId: row.external_id,
    };
    if (!existing.seasonLabels.includes(row.season_label)) {
      existing.seasonLabels.push(row.season_label);
    }
    byId.set(row.player_id, existing);
  }
  return [...byId.values()];
}

function resolveLinkForPlayer(
  player: RosterPlayer,
  candidates: DalCandidate[],
): LinkTarget | null {
  const jersey = isRealJersey(player.jersey)
    ? formatJerseyNumber(player.jersey) || player.jersey.trim()
    : null;

  let matches = candidates.filter((c) => namesMatch(player.name, c.displayName));
  if (!matches.length) return null;

  const onSeason = matches.filter((c) => c.seasonLabels.includes(SEASON));
  if (onSeason.length === 1) {
    matches = onSeason;
  } else if (onSeason.length > 1) {
    matches = onSeason;
  }

  if (matches.length > 1 && jersey) {
    const byJersey = matches.filter(
      (c) => c.jerseyNumber && formatJerseyNumber(c.jerseyNumber) === jersey,
    );
    if (byJersey.length === 1) matches = byJersey;
  }

  if (matches.length !== 1) return null;

  const m = matches[0]!;
  return {
    playerId: m.playerId,
    source: m.identitySource,
    externalId: m.identityExternalId,
  };
}

function buildBioPayload(player: RosterPlayer, linkTo?: LinkTarget) {
  let hometown = player.hometown?.trim() || null;
  if (hometown) hometown = sanitizeIngestHometown(hometown);
  if (hometown && !isLikelyRealHometown(hometown)) hometown = null;

  const jersey = isRealJersey(player.jersey)
    ? formatJerseyNumber(player.jersey) || player.jersey.trim()
    : null;

  const extendedProfile: Record<string, unknown> = {
    daltigersBioUrl: `https://daltigers.ca/sports/mbkb/${SEASON}/bios/${player.externalId}`,
  };
  if (player.major?.trim()) extendedProfile.major = player.major.trim();
  if (player.eligibilityYear?.trim()) {
    extendedProfile.eligibilityYear = player.eligibilityYear.trim();
  }

  const body: Record<string, unknown> = {
    source: SOURCE,
    externalId: player.externalId,
    player: {
      displayName: player.name,
      position: normalizePosition(player.position),
      heightCm: player.heightCm,
      jerseyNumber: jersey,
      hometown,
      country: hometown ? countryFromHometown(hometown) : null,
      headshotUrl: player.headshotUrl ?? null,
      extendedProfile,
    },
  };
  if (linkTo && linkTo.source !== SOURCE && linkTo.externalId) {
    body.linkTo = { source: linkTo.source, externalId: linkTo.externalId };
  }
  return parseIngestPlayerBioBody(body);
}

function buildSeasonPayload(player: RosterPlayer) {
  const st = player.seasonStats ?? {};
  const gp = st.gamesPlayed ?? 0;
  const pts = st.pointsPerGame ?? 0;
  const reb = st.reboundsPerGame ?? 0;
  const ast = st.assistsPerGame ?? 0;

  let hometown = player.hometown?.trim() || undefined;
  if (hometown) hometown = sanitizeIngestHometown(hometown) ?? undefined;

  const statsPayload: Record<string, number> = {
    gamesPlayed: gp,
    pointsPerGame: pts,
    reboundsPerGame: reb,
    assistsPerGame: ast,
  };
  if (st.fieldGoalPct != null) statsPayload.fieldGoalPct = st.fieldGoalPct;
  if (st.threePointPct != null) statsPayload.threePointPct = st.threePointPct;
  if (st.freeThrowPct != null) statsPayload.freeThrowPct = st.freeThrowPct;
  if (st.stealsPerGame != null) statsPayload.stealsPerGame = st.stealsPerGame;
  if (st.blocksPerGame != null) statsPayload.blocksPerGame = st.blocksPerGame;

  return parseIngestPlayerSeasonBody({
    source: SOURCE,
    externalId: player.externalId,
    player: {
      displayName: player.name,
      position: normalizePosition(player.position) ?? undefined,
      heightCm: player.heightCm ?? undefined,
      hometown,
      headshotUrl: player.headshotUrl ?? undefined,
    },
    league: LEAGUE,
    team: TEAM,
    season: { label: SEASON },
    stats: statsPayload,
  });
}

async function main(): Promise<void> {
  console.log(APPLY ? "Mode: APPLY" : "Mode: DRY RUN (pass --apply to write)");
  console.log(`JSON: ${JSON_PATH}`);

  const raw = JSON.parse(readFileSync(JSON_PATH, "utf8")) as { players: RosterPlayer[] };
  const players = raw.players ?? [];
  console.log(`Players in file: ${players.length}`);

  const candidates = await loadDalCandidates();
  console.log(`Dal U Sports candidate profiles: ${candidates.length}`);

  let bios = 0;
  let seasons = 0;
  let linked = 0;
  let created = 0;

  for (const player of players) {
    if (!player.externalId || !player.name) continue;
    const link = resolveLinkForPlayer(player, candidates);
    const bioPayload = buildBioPayload(player, link ?? undefined);
    const seasonPayload = buildSeasonPayload(player);

    if (link) {
      linked += 1;
      console.log(
        `  ${player.name} → player #${link.playerId} via ${link.source}:${link.externalId}`,
      );
    } else {
      created += 1;
      console.log(`  ${player.name} → NEW (daltigers_mbkb:${player.externalId})`);
    }

    if (APPLY) {
      await ingestPlayerBio(bioPayload);
      bios += 1;
      await ingestPlayerSeason(seasonPayload);
      seasons += 1;
    }
  }

  console.log(
    APPLY
      ? `Done. Bios: ${bios}, seasons: ${seasons}, linked: ${linked}, new profiles: ${created}`
      : `Dry run complete. Would link ${linked}, create ${created}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => closeDatabaseConnection());
