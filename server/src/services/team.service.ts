import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { G_LEAGUE_CURRENT_TEAM_SLUGS } from "../data/g-league-teams.js";
import { THE_BASKETBALL_LEAGUE_TEAM_SLUGS } from "../data/the-basketball-league-teams.js";
import { WNBA_CURRENT_TEAM_SLUGS } from "../data/wnba-teams.js";
import { db } from "../db/index.js";
import {
  leagues,
  playerSeasonStats,
  players,
  seasons,
  teamSeasonRecords,
  teams,
} from "../db/schema/index.js";
import { normalizeSlugParam } from "../utils/slug.js";
import { prefixMatch, wordPrefixMatch, compareTeamSearchResults } from "../utils/search-match.js";
import { resolvePublicLeagueSlug, LEGACY_NCAA_MENS_SLUG, canonicalLeagueName } from "../utils/league-slug.js";
import { findLeagueRowBySlug, displaySlugForLeagueRow } from "../utils/league-resolution.js";
import { isBrowsableTeam } from "../utils/league-visibility.js";
import { isLeagueIdPublic } from "./league-visibility.service.js";
import { resolveNcaaTeamSlugVariants } from "../utils/ncaa-team-aliases.js";
import { resolveCcaaTeamSlugVariants } from "../utils/ccaa-team-aliases.js";
import {
  isOsbaTrilliumCanonicalSlug,
  resolveOsbaTrilliumSlugVariants,
} from "../utils/osba-trillium-team-aliases.js";
import { NORTH_AMERICAN_LEAGUE_SLUGS } from "../utils/league-regions.js";
import { type PlayerCard, toPlayerCard } from "./player.service.js";

export interface TeamInfo {
  id: number;
  name: string;
  abbreviation: string;
  slug: string;
}

export interface TeamLeagueInfo {
  id: number;
  name: string;
  slug: string;
}

export interface TeamSummary extends TeamInfo {
  league: TeamLeagueInfo;
}

export interface TeamDetail extends TeamSummary {
  roster: PlayerCard[];
  latestSeasonLabel: string | null;
}

export interface TeamRoster {
  team: TeamInfo;
  seasonLabel: string;
  players: PlayerCard[];
}

export interface TeamRecord {
  id: number;
  team: string;
  season: string;
  wins: number;
  losses: number;
  league: string;
}

async function countTeamSeasonStats(teamId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(playerSeasonStats)
    .where(eq(playerSeasonStats.teamId, teamId));
  return row?.count ?? 0;
}

async function pickBestTeamMatch(
  matches: Array<{ team: typeof teams.$inferSelect }>,
): Promise<typeof teams.$inferSelect> {
  if (matches.length === 1) return matches[0]!.team;

  const withStats = await Promise.all(
    matches.map(async (match) => ({
      team: match.team,
      stats: await countTeamSeasonStats(match.team.id),
    })),
  );

  const scored = withStats.map((entry) => {
    let score = entry.stats;
    if (isOsbaTrilliumCanonicalSlug(entry.team.slug)) score += 10_000;
    return { ...entry, score };
  });

  return scored.reduce((best, current) =>
    current.score > best.score ? current : best,
  ).team;
}

function resolveTeamSlugVariants(slugCandidate: string, leagueSlug: string | undefined): string[] {
  const isNcaaMen =
    leagueSlug === LEGACY_NCAA_MENS_SLUG || leagueSlug === "ncaa-m";
  if (isNcaaMen) return resolveNcaaTeamSlugVariants(slugCandidate);
  if (leagueSlug === "ccaa") return resolveCcaaTeamSlugVariants(slugCandidate);
  if (leagueSlug === "high-school") return resolveOsbaTrilliumSlugVariants(slugCandidate);
  return [slugCandidate];
}

function slugVariantPredicates(slugVariants: string[]) {
  return slugVariants.map((variant) => eq(teams.slug, variant));
}

async function relatedTeamIds(
  team: typeof teams.$inferSelect,
  leagueSlug?: string,
): Promise<number[]> {
  const leagueRow = leagueSlug
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(leagueSlug)),
      )
    : null;

  const slugVariants = resolveTeamSlugVariants(team.slug, leagueRow?.slug);

  const rows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.leagueId, team.leagueId),
        inArray(teams.slug, slugVariants),
      ),
    );

  const ids = rows.map((row) => row.id);
  return ids.length > 0 ? ids : [team.id];
}

async function findTeam(teamKey: string, leagueSlug?: string) {
  const decoded = decodeURIComponent(teamKey).trim();
  const slugCandidate = normalizeSlugParam(decoded);
  const leagueRow = leagueSlug
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(leagueSlug)),
      )
    : null;

  const slugVariants = leagueRow
    ? resolveTeamSlugVariants(slugCandidate, leagueRow.slug)
    : [
        ...new Set([
          slugCandidate,
          ...resolveOsbaTrilliumSlugVariants(slugCandidate),
          ...resolveNcaaTeamSlugVariants(slugCandidate),
          ...resolveCcaaTeamSlugVariants(slugCandidate),
        ]),
      ];

  const matchPredicates = [
    ...slugVariantPredicates(slugVariants),
    eq(teams.name, decoded),
  ];

  const matches = await db
    .select({ team: teams })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      and(
        or(...matchPredicates),
        leagueRow ? eq(teams.leagueId, leagueRow.id) : undefined,
      ),
    )
    .limit(leagueRow ? 20 : 40);

  if (matches.length === 0) return null;
  if (matches.length === 1 || !leagueRow) {
    return matches.length === 1
      ? matches[0]!.team
      : pickBestTeamMatch(matches);
  }

  return pickBestTeamMatch(matches);
}

function canonicalSeasonLabelFromStartYear(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

async function findSeason(seasonKey: string, leagueId: number) {
  const decoded = decodeURIComponent(seasonKey).trim();

  const [exact] = await db
    .select()
    .from(seasons)
    .where(
      and(eq(seasons.leagueId, leagueId), eq(seasons.seasonLabel, decoded)),
    )
    .limit(1);

  if (exact) return exact;

  if (/^\d{4}$/.test(decoded)) {
    const canonicalLabel = canonicalSeasonLabelFromStartYear(
      Number.parseInt(decoded, 10),
    );

    const [canonical] = await db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.leagueId, leagueId),
          eq(seasons.seasonLabel, canonicalLabel),
        ),
      )
      .limit(1);

    if (canonical) return canonical;
  }

  return null;
}

async function findLatestSeasonForTeam(teamId: number) {
  const [row] = await db
    .select({ season: seasons })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerSeasonStats.teamId, teamId))
    .orderBy(desc(seasons.seasonLabel))
    .limit(1);

  return row?.season ?? null;
}

function toSearchLeagueInfo(league: typeof leagues.$inferSelect): TeamLeagueInfo {
  const slug = displaySlugForLeagueRow("ncaa-m", league.slug);
  return {
    id: league.id,
    name:
      slug === "ncaa-m"
        ? canonicalLeagueName("ncaa-m", league.name)
        : league.name,
    slug,
  };
}

async function isTeamSearchableLeague(league: typeof leagues.$inferSelect): Promise<boolean> {
  if (league.slug === LEGACY_NCAA_MENS_SLUG) return true;
  return isLeagueIdPublic(league.id);
}

function toTeamInfo(team: typeof teams.$inferSelect): TeamInfo {
  return {
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    slug: team.slug,
  };
}

export async function getAllTeams(leagueSlug?: string): Promise<TeamSummary[]> {
  const leagueRow = leagueSlug
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(leagueSlug)),
      )
    : null;

  if (leagueRow && !(await isLeagueIdPublic(leagueRow.id))) {
    return [];
  }

  const normalizedLeague = leagueRow?.slug;
  const canonicalSlugs = normalizedLeague
    ? normalizedLeague === "g-league"
      ? G_LEAGUE_CURRENT_TEAM_SLUGS
      : normalizedLeague === "wnba"
        ? WNBA_CURRENT_TEAM_SLUGS
        : normalizedLeague === "the-basketball-league"
          ? THE_BASKETBALL_LEAGUE_TEAM_SLUGS
          : null
    : null;

  const rows = await db
    .select({
      team: teams,
      league: leagues,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      leagueRow
        ? canonicalSlugs
          ? and(
              eq(teams.leagueId, leagueRow.id),
              inArray(teams.slug, [...canonicalSlugs]),
            )
          : eq(teams.leagueId, leagueRow.id)
        : undefined,
    )
    .orderBy(teams.name);

  return rows
    .filter((row) => isBrowsableTeam({ name: row.team.name, slug: row.team.slug }))
    .map((row) => ({
      ...toTeamInfo(row.team),
      league: {
        id: row.league.id,
        name: row.league.name,
        slug: row.league.slug,
      },
    }));
}

export async function searchTeams(params: {
  q: string;
  limit?: number;
}): Promise<TeamSummary[]> {
  const trimmed = params.q.trim();
  if (!trimmed) return [];

  const limit = Math.min(25, Math.max(1, params.limit ?? 10));
  const regionOrder =
    NORTH_AMERICAN_LEAGUE_SLUGS.length > 0
      ? sql`CASE WHEN ${leagues.slug} IN (${sql.join(
          NORTH_AMERICAN_LEAGUE_SLUGS.map((slug) => sql`${slug}`),
          sql`, `,
        )}) THEN 0 ELSE 1 END`
      : sql`1`;

  const rows = await db
    .select({
      team: teams,
      league: leagues,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      or(
        wordPrefixMatch(teams.name, trimmed),
        prefixMatch(teams.abbreviation, trimmed),
        wordPrefixMatch(teams.slug, trimmed),
      ),
    )
    .orderBy(regionOrder, teams.name)
    .limit(limit * 25);

  const candidates: TeamSummary[] = [];
  for (const row of rows) {
    if (!isBrowsableTeam({ name: row.team.name, slug: row.team.slug })) continue;
    if (!(await isTeamSearchableLeague(row.league))) continue;

    candidates.push({
      ...toTeamInfo(row.team),
      league: toSearchLeagueInfo(row.league),
    });
  }

  candidates.sort((a, b) => compareTeamSearchResults(a, b, trimmed));
  return candidates.slice(0, limit);
}

export async function getTeamBySlug(
  slug: string,
  leagueSlug?: string,
): Promise<TeamDetail | null> {
  const team = await findTeam(slug, leagueSlug);
  if (!team) return null;

  const leagueRow = leagueSlug
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(leagueSlug)),
      )
    : await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, team.leagueId))
        .limit(1)
        .then((r) => r[0] ?? null);

  if (!leagueRow) return null;

  const row = { team, league: leagueRow };

  const latestSeason = await findLatestSeasonForTeam(row.team.id);
  let roster: PlayerCard[] = [];

  if (latestSeason) {
    const statRows = await db
      .select({
        player: players,
        teamName: teams.name,
      })
      .from(playerSeasonStats)
      .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
      .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
      .where(
        and(
          eq(playerSeasonStats.teamId, row.team.id),
          eq(playerSeasonStats.seasonId, latestSeason.id),
        ),
      )
      .orderBy(players.displayName);

    roster = statRows.map((statRow) =>
      toPlayerCard(statRow.player, statRow.teamName),
    );
  } else {
    const currentRows = await db
      .select({
        player: players,
        teamName: teams.name,
      })
      .from(players)
      .innerJoin(teams, eq(players.currentTeamId, teams.id))
      .where(eq(players.currentTeamId, row.team.id))
      .orderBy(players.displayName);

    roster = currentRows.map((currentRow) =>
      toPlayerCard(currentRow.player, currentRow.teamName),
    );
  }

  return {
    ...toTeamInfo(row.team),
    league: {
      id: row.league.id,
      name: row.league.name,
      slug: row.league.slug,
    },
    roster,
    latestSeasonLabel: latestSeason?.seasonLabel ?? null,
  };
}

export async function getTeamRoster(
  teamKey: string,
  seasonKey: string,
  leagueSlug?: string,
): Promise<TeamRoster | null> {
  const team = await findTeam(teamKey, leagueSlug);
  if (!team) return null;

  const teamIds = await relatedTeamIds(team, leagueSlug);

  const season = await findSeason(seasonKey, team.leagueId);

  if (!season) {
    return {
      team: toTeamInfo(team),
      seasonLabel: decodeURIComponent(seasonKey).trim(),
      players: [],
    };
  }

  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
    })
    .from(playerSeasonStats)
    .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .where(
      and(
        inArray(playerSeasonStats.teamId, teamIds),
        eq(playerSeasonStats.seasonId, season.id),
      ),
    )
    .orderBy(players.displayName);

  return {
    team: toTeamInfo(team),
    seasonLabel: season.seasonLabel,
    players: rows.map((row) => toPlayerCard(row.player, row.teamName)),
  };
}

export async function getTeamSeasons(
  teamKey: string,
  leagueSlug?: string,
): Promise<string[]> {
  const team = await findTeam(teamKey, leagueSlug);
  if (!team) return [];

  const teamIds = await relatedTeamIds(team, leagueSlug);

  const rows = await db
    .selectDistinct({ label: seasons.seasonLabel })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(inArray(playerSeasonStats.teamId, teamIds))
    .orderBy(desc(seasons.seasonLabel));

  return rows.map((row) => row.label);
}

export async function getTeamRecord(
  teamKey: string,
  seasonKey: string,
  leagueSlug?: string,
): Promise<TeamRecord | null> {
  const team = await findTeam(teamKey, leagueSlug);
  if (!team) return null;

  const teamIds = await relatedTeamIds(team, leagueSlug);

  const season = await findSeason(seasonKey, team.leagueId);

  if (!season) return null;

  const [recordRow] = await db
    .select({ record: teamSeasonRecords })
    .from(teamSeasonRecords)
    .where(
      and(
        inArray(teamSeasonRecords.teamId, teamIds),
        eq(teamSeasonRecords.seasonId, season.id),
      ),
    )
    .limit(1);

  if (!recordRow) return null;

  const [leagueRow] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, team.leagueId))
    .limit(1);

  return {
    id: recordRow.record.id,
    team: team.name,
    season: season.seasonLabel,
    wins: recordRow.record.wins,
    losses: recordRow.record.losses,
    league: leagueRow?.name ?? "",
  };
}
