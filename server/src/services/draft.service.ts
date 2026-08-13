import { eq, inArray, or, sql } from "drizzle-orm";
import draftHistoryJson from "../data/draft-history.json" with { type: "json" };
import {
  draftTeamLogoFranchise,
  normalizeDraftTeamName,
} from "../data/draft-team-logos.js";
import { db } from "../db/index.js";
import { players, teams } from "../db/schema/index.js";
import { nameToSlug } from "../utils/slug.js";
import {
  getLatestTeamsForPlayers,
  toPlayerCard,
  type PlayerCard,
} from "./player.service.js";

interface DraftPickSeed {
  year: number;
  round: number;
  overallPick: number;
  playerName: string;
  draftTeam: string;
  affiliation: string;
}

interface DraftHistoryFile {
  generatedAt: string;
  startYear: number;
  endYear: number;
  years: Record<string, DraftPickSeed[]>;
}

const draftHistory = draftHistoryJson as DraftHistoryFile;

/** Known draft-name aliases → primary DB display names. */
const DRAFT_NAME_ALIASES: Record<string, string[]> = {
  "bub carrington": ["Carlton Carrington", "Bub Carrington"],
  "akeem olajuwon": ["Hakeem Olajuwon", "Akeem Olajuwon"],
  "ron artest": ["Metta World Peace", "Ron Artest"],
};

export interface DraftPickRow {
  year: number;
  round: number;
  roundPick: number;
  overallPick: number;
  playerName: string;
  draftTeam: string;
  draftTeamLogoName: string;
  affiliation: string;
  player: PlayerCard | null;
}

export interface DraftClassResult {
  year: number;
  pickCount: number;
  picks: DraftPickRow[];
}

type MatchedPlayer = typeof players.$inferSelect & {
  teamName: string | null;
  teamSlug: string | null;
  hasNbaStats: boolean;
  hasProOrCollegeStats: boolean;
  seasonCount: number;
  identityCount: number;
  meaningfulGames: number;
  teamNames: string[];
};

const draftClassCache = new Map<number, { expires: number; value: DraftClassResult }>();
const DRAFT_CACHE_TTL_MS = 5 * 60 * 1000;

export function getDraftYears(): number[] {
  return Object.keys(draftHistory.years)
    .map(Number)
    .filter((year) => Number.isInteger(year) && (draftHistory.years[String(year)]?.length ?? 0) > 0)
    .sort((a, b) => b - a);
}

export function getDefaultDraftYear(): number {
  const years = getDraftYears();
  const currentYear = new Date().getFullYear();
  if (years.includes(currentYear)) return currentYear;
  return years[0] ?? draftHistory.endYear;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function stripNameSuffix(value: string): string {
  return value.replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, "").trim();
}

function normalizePersonKey(value: string): string {
  return stripNameSuffix(stripDiacritics(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function playerNameCandidates(name: string): string[] {
  const cleaned = stripDiacritics(name)
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const noSuffix = stripNameSuffix(cleaned);

  const slugs = new Set<string>();
  for (const variant of [name, cleaned, noSuffix]) {
    slugs.add(nameToSlug(variant));
  }
  const compactInitials = cleaned.replace(/\b([A-Za-z])\s+(?=[A-Za-z]\b)/g, "$1");
  slugs.add(nameToSlug(compactInitials));
  return [...slugs].filter(Boolean);
}

function displayNameVariants(name: string): string[] {
  const cleaned = stripDiacritics(name).replace(/\./g, " ").replace(/\s+/g, " ").trim();
  const noSuffix = stripNameSuffix(cleaned);
  const aliases = DRAFT_NAME_ALIASES[normalizePersonKey(name)] ?? [];
  return [...new Set([name, cleaned, noSuffix, ...aliases].map((v) => v.trim()).filter(Boolean))];
}

function affiliationTokens(affiliation: string): string[] {
  const raw = stripDiacritics(affiliation || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return [];
  const stop = new Set(["university", "college", "the", "of", "st", "saint"]);
  return raw
    .split(" ")
    .filter((t) => t.length >= 3 && !stop.has(t));
}

function scoreMatch(
  playerName: string,
  affiliation: string,
  row: MatchedPlayer,
): number {
  const target = nameToSlug(stripNameSuffix(stripDiacritics(playerName)));
  const displaySlug = nameToSlug(stripNameSuffix(stripDiacritics(row.displayName)));
  let score = 0;

  if (row.slug === nameToSlug(playerName) || row.slug === target) score += 120;
  else if (displaySlug === target) score += 100;

  if (normalizePersonKey(row.displayName) === normalizePersonKey(playerName)) score += 40;
  if (row.hasNbaStats) score += 80;
  if (row.hasProOrCollegeStats) score += 60;
  // Prefer real box-score seasons over empty roster stubs / contaminated HS piles
  score += Math.min(100, row.meaningfulGames);
  score += Math.min(40, row.seasonCount * 2);
  score += Math.min(40, row.identityCount * 8);
  score += Math.min(10, Math.floor(row.profileViews / 1000));

  const tokens = affiliationTokens(affiliation);
  if (tokens.length > 0) {
    const haystack = row.teamNames.join(" ").toLowerCase();
    const hits = tokens.filter((t) => haystack.includes(t)).length;
    score += hits * 35;
  }

  if (!row.hasProOrCollegeStats && row.seasonCount <= 2) score -= 120;
  if (row.meaningfulGames === 0 && row.seasonCount > 0) score -= 40;
  return score;
}

async function resolvePlayersByNames(
  picks: { playerName: string; affiliation: string }[],
): Promise<Map<string, MatchedPlayer>> {
  const result = new Map<string, MatchedPlayer>();
  if (picks.length === 0) return result;

  const slugSet = new Set<string>();
  const nameSet = new Set<string>();
  for (const pick of picks) {
    for (const slug of playerNameCandidates(pick.playerName)) slugSet.add(slug);
    for (const variant of displayNameVariants(pick.playerName)) {
      nameSet.add(variant.toLowerCase());
      nameSet.add(normalizePersonKey(variant));
    }
  }

  const slugs = [...slugSet];
  const names = [...nameSet];

  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
      hasNbaStats: sql<boolean>`exists (
        select 1 from player_season_stats pss
        join leagues l on l.id = pss.league_id
        where pss.player_id = ${players.id} and lower(l.slug) = 'nba'
      )`,
      hasProOrCollegeStats: sql<boolean>`exists (
        select 1 from player_season_stats pss
        join leagues l on l.id = pss.league_id
        where pss.player_id = ${players.id}
          and lower(l.slug) not in ('high-school', 'high-school-w', 'aau')
      )`,
      seasonCount: sql<number>`(
        select count(*)::int from player_season_stats pss where pss.player_id = ${players.id}
      )`,
      meaningfulGames: sql<number>`(
        select coalesce(sum(pss.games_played), 0)::int
        from player_season_stats pss
        join leagues l on l.id = pss.league_id
        where pss.player_id = ${players.id}
          and lower(l.slug) not in ('high-school', 'high-school-w', 'aau')
          and coalesce(pss.games_played, 0) > 0
      )`,
      identityCount: sql<number>`(
        select count(*)::int from player_identities pi where pi.player_id = ${players.id}
      )`,
      teamNames: sql<string>`coalesce((
        select string_agg(distinct tm.name, '||')
        from player_season_stats pss
        join teams tm on tm.id = pss.team_id
        where pss.player_id = ${players.id}
      ), '')`,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(
      or(
        slugs.length > 0 ? inArray(players.slug, slugs) : sql`false`,
        names.length > 0
          ? sql`lower(${players.displayName}) in (${sql.join(
              names.map((n) => sql`${n}`),
              sql`, `,
            )})`
          : sql`false`,
        names.length > 0
          ? sql`lower(regexp_replace(${players.displayName}, '\\s+(jr|sr|ii|iii|iv|v)\\.?$', '', 'i')) in (${sql.join(
              names.map((n) => sql`${n}`),
              sql`, `,
            )})`
          : sql`false`,
      ),
    );

  const candidates: MatchedPlayer[] = rows.map((r) => ({
    ...r.player,
    teamName: r.teamName,
    teamSlug: r.teamSlug,
    hasNbaStats: Boolean(r.hasNbaStats),
    hasProOrCollegeStats: Boolean(r.hasProOrCollegeStats),
    seasonCount: Number(r.seasonCount ?? 0),
    identityCount: Number(r.identityCount ?? 0),
    meaningfulGames: Number(r.meaningfulGames ?? 0),
    teamNames: (r.teamNames ?? "").split("||").filter(Boolean),
  }));

  for (const pick of picks) {
    const nameSlugs = new Set(playerNameCandidates(pick.playerName));
    const keys = new Set(displayNameVariants(pick.playerName).map(normalizePersonKey));
    const matches = candidates.filter((c) => {
      if (nameSlugs.has(c.slug)) return true;
      return keys.has(normalizePersonKey(c.displayName));
    });
    if (matches.length === 0) continue;
    matches.sort(
      (a, b) =>
        scoreMatch(pick.playerName, pick.affiliation, b) -
        scoreMatch(pick.playerName, pick.affiliation, a),
    );
    result.set(pick.playerName, matches[0]!);
  }

  return result;
}

export async function getDraftClass(year: number): Promise<DraftClassResult | null> {
  if (!Number.isInteger(year) || year < draftHistory.startYear || year > draftHistory.endYear + 1) {
    return null;
  }

  const cached = draftClassCache.get(year);
  if (cached && cached.expires > Date.now()) return cached.value;

  const seeds = draftHistory.years[String(year)] ?? [];
  if (seeds.length === 0) return null;

  const matched = await resolvePlayersByNames(
    seeds.map((s) => ({ playerName: s.playerName, affiliation: s.affiliation })),
  );
  const playerIds = [...matched.values()].map((p) => p.id);
  const latestTeams = await getLatestTeamsForPlayers(playerIds);

  const roundCounters = new Map<number, number>();
  const picks: DraftPickRow[] = [];

  for (const seed of seeds) {
    const roundPick = (roundCounters.get(seed.round) ?? 0) + 1;
    roundCounters.set(seed.round, roundPick);

    const draftTeam = normalizeDraftTeamName(seed.draftTeam);
    const matchedPlayer = matched.get(seed.playerName) ?? null;
    let playerCard: PlayerCard | null = null;

    if (matchedPlayer) {
      let teamName = matchedPlayer.teamName;
      let teamSlug = matchedPlayer.teamSlug;
      if (!teamName) {
        const latest = latestTeams.get(matchedPlayer.id);
        teamName = latest?.teamName ?? null;
        teamSlug = latest?.teamSlug ?? null;
      }
      playerCard = toPlayerCard(matchedPlayer, teamName, teamSlug);
    }

    picks.push({
      year: seed.year,
      round: seed.round,
      roundPick,
      overallPick: seed.overallPick,
      playerName: seed.playerName,
      draftTeam,
      draftTeamLogoName: draftTeamLogoFranchise(draftTeam),
      affiliation: seed.affiliation,
      player: playerCard,
    });
  }

  const value = {
    year,
    pickCount: picks.length,
    picks,
  };
  draftClassCache.set(year, { expires: Date.now() + DRAFT_CACHE_TTL_MS, value });
  return value;
}

/** Test helper / maintenance */
export function clearDraftClassCache(): void {
  draftClassCache.clear();
}
