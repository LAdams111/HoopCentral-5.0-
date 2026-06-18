import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { G_LEAGUE_CURRENT_TEAM_SLUGS } from "../data/g-league-teams.js";
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
import { resolvePublicLeagueSlug } from "../utils/league-slug.js";
import { findLeagueRowBySlug } from "../utils/league-resolution.js";
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

async function findTeam(teamKey: string, leagueSlug?: string) {
  const decoded = decodeURIComponent(teamKey).trim();
  const slugCandidate = normalizeSlugParam(decoded);
  const leagueRow = leagueSlug
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(leagueSlug)),
      )
    : null;

  const matches = await db
    .select({ team: teams })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      and(
        or(
          eq(teams.slug, slugCandidate),
          ilike(teams.abbreviation, decoded),
          ilike(teams.name, decoded),
        ),
        leagueRow ? eq(teams.leagueId, leagueRow.id) : undefined,
      ),
    )
    .limit(leagueRow ? 1 : 2);

  if (matches.length === 0) return null;
  if (matches.length === 1 || leagueRow) return matches[0]!.team;

  return matches[0]!.team;
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
    const [prefix] = await db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.leagueId, leagueId),
          ilike(seasons.seasonLabel, `${decoded}-%`),
        ),
      )
      .orderBy(desc(seasons.seasonLabel))
      .limit(1);

    if (prefix) return prefix;
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
  const normalizedLeague = leagueRow?.slug;
  const canonicalSlugs = normalizedLeague
    ? normalizedLeague === "g-league"
      ? G_LEAGUE_CURRENT_TEAM_SLUGS
      : normalizedLeague === "wnba"
        ? WNBA_CURRENT_TEAM_SLUGS
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

  return rows.map((row) => ({
    ...toTeamInfo(row.team),
    league: {
      id: row.league.id,
      name: row.league.name,
      slug: row.league.slug,
    },
  }));
}

export async function getTeamBySlug(
  slug: string,
  leagueSlug?: string,
): Promise<TeamDetail | null> {
  const normalized = normalizeSlugParam(slug);
  const leagueRow = leagueSlug
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(leagueSlug)),
      )
    : null;

  const rows = await db
    .select({
      team: teams,
      league: leagues,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      and(
        eq(teams.slug, normalized),
        leagueRow ? eq(teams.leagueId, leagueRow.id) : undefined,
      ),
    )
    .limit(leagueRow ? 1 : 2);

  const row = rows[0];
  if (!row) return null;

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

  const season =
    (await findSeason(seasonKey, team.leagueId)) ??
    (await findLatestSeasonForTeam(team.id));

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
        eq(playerSeasonStats.teamId, team.id),
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

  const rows = await db
    .selectDistinct({ label: seasons.seasonLabel })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerSeasonStats.teamId, team.id))
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

  const season =
    (await findSeason(seasonKey, team.leagueId)) ??
    (await findLatestSeasonForTeam(team.id));

  if (!season) return null;

  const [recordRow] = await db
    .select({ record: teamSeasonRecords })
    .from(teamSeasonRecords)
    .where(
      and(
        eq(teamSeasonRecords.teamId, team.id),
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
