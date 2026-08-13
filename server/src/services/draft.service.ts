import { eq, ilike, inArray, or, sql } from "drizzle-orm";
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
};

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

function playerNameCandidates(name: string): string[] {
  const cleaned = stripDiacritics(name)
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const slugs = new Set<string>();
  slugs.add(nameToSlug(name));
  slugs.add(nameToSlug(cleaned));

  const compactInitials = cleaned.replace(/\b([A-Za-z])\s+(?=[A-Za-z]\b)/g, "$1");
  slugs.add(nameToSlug(compactInitials));

  const withoutSuffix = cleaned.replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, "").trim();
  if (withoutSuffix) slugs.add(nameToSlug(withoutSuffix));

  return [...slugs].filter(Boolean);
}

function scoreMatch(playerName: string, row: MatchedPlayer): number {
  const target = nameToSlug(playerName);
  const displaySlug = nameToSlug(row.displayName);
  let score = 0;
  if (row.slug === target || displaySlug === target) score += 100;
  if (row.displayName.toLowerCase() === playerName.toLowerCase()) score += 40;
  if (row.hasNbaStats) score += 25;
  score += Math.min(10, Math.floor(row.profileViews / 1000));
  return score;
}

async function resolvePlayersByNames(names: string[]): Promise<Map<string, MatchedPlayer>> {
  const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const result = new Map<string, MatchedPlayer>();
  if (uniqueNames.length === 0) return result;

  const slugSet = new Set<string>();
  for (const name of uniqueNames) {
    for (const slug of playerNameCandidates(name)) slugSet.add(slug);
  }
  const slugs = [...slugSet];

  const nameFilters = uniqueNames.flatMap((name) => {
    const cleaned = stripDiacritics(name).replace(/\./g, "").trim();
    return [ilike(players.displayName, name), ilike(players.displayName, cleaned)];
  });

  const whereClause = or(
    slugs.length > 0 ? inArray(players.slug, slugs) : sql`false`,
    nameFilters.length > 0 ? or(...nameFilters) : sql`false`,
  );

  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
      hasNbaStats: sql<boolean>`exists (
        select 1
        from player_season_stats pss
        join leagues l on l.id = pss.league_id
        where pss.player_id = ${players.id}
          and lower(l.slug) = 'nba'
      )`,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(whereClause);

  const candidates: MatchedPlayer[] = rows.map((r) => ({
    ...r.player,
    teamName: r.teamName,
    teamSlug: r.teamSlug,
    hasNbaStats: Boolean(r.hasNbaStats),
  }));

  for (const name of uniqueNames) {
    const nameSlugs = new Set(playerNameCandidates(name));
    const compact = stripDiacritics(name).replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
    const matches = candidates.filter((c) => {
      if (nameSlugs.has(c.slug)) return true;
      if (nameSlugs.has(nameToSlug(stripDiacritics(c.displayName)))) return true;
      if (c.displayName.toLowerCase() === name.toLowerCase()) return true;
      return (
        stripDiacritics(c.displayName).replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase() ===
        compact
      );
    });

    if (matches.length === 0) continue;
    matches.sort((a, b) => scoreMatch(name, b) - scoreMatch(name, a));
    result.set(name, matches[0]!);
  }

  return result;
}

export async function getDraftClass(year: number): Promise<DraftClassResult | null> {
  if (!Number.isInteger(year) || year < draftHistory.startYear || year > draftHistory.endYear + 1) {
    return null;
  }

  const seeds = draftHistory.years[String(year)] ?? [];
  if (seeds.length === 0) return null;

  const matched = await resolvePlayersByNames(seeds.map((s) => s.playerName));
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

  return {
    year,
    pickCount: picks.length,
    picks,
  };
}
