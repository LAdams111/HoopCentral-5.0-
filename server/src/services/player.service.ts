import { and, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  leagues,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../db/schema/index.js";
import { cmToFeetInches, formatStat, kgToLbs } from "../utils/format.js";

export interface PlayerCard {
  id: number;
  name: string;
  position: string;
  team: string;
  teamSlug: string | null;
  height: string;
  weight: string;
  jerseyNumber: string;
  country: string;
  headshotUrl: string;
  bio: string | null;
  profileViews: number;
  hometown: string;
  birthDate: string | null;
}

export interface PlayerStatRow {
  id: number;
  season: string;
  team: string;
  teamSlug: string;
  league: string;
  leagueSlug: string;
  games_played: number | null;
  gamesPlayed: number | null;
  pts_per_g: string;
  pointsPerGame: string;
  trb_per_g: string;
  reboundsPerGame: string;
  ast_per_g: string;
  assistsPerGame: string;
  stl_per_g: string;
  stealsPerGame: string;
  blk_per_g: string;
  blocksPerGame: string;
  fg_pct: string;
  fieldGoalPct: string;
}

export interface CareerEntry {
  id: number;
  team: string;
  league: string;
  season: string;
  startDate: string | null;
  endDate: string | null;
}

export interface PlayerProfile extends PlayerCard {
  league: string | null;
  leagueSlug: string | null;
  stats: PlayerStatRow[];
  awards: { awardName: string; season: string | null; league: string | null }[];
  career: CareerEntry[];
  leaguesPlayed: string[];
}

export function toPlayerCard(
  player: typeof players.$inferSelect,
  teamName: string | null,
  teamSlug: string | null = null,
): PlayerCard {
  return {
    id: player.id,
    name: player.displayName,
    position: player.position ?? "",
    team: teamName ?? "",
    teamSlug,
    height: cmToFeetInches(player.heightCm),
    weight: kgToLbs(player.weightKg),
    jerseyNumber: player.jerseyNumber ?? "",
    country: player.country ?? "",
    headshotUrl: player.headshotUrl ?? "",
    bio: null,
    profileViews: player.profileViews,
    hometown: player.hometown ?? "",
    birthDate: player.birthDate ?? null,
  };
}

function toStatRow(
  stat: typeof playerSeasonStats.$inferSelect,
  seasonLabel: string,
  teamName: string,
  teamSlug: string,
  leagueName: string,
  leagueSlug: string,
): PlayerStatRow {
  const pts = formatStat(stat.pointsPerGame);
  const reb = formatStat(stat.reboundsPerGame);
  const ast = formatStat(stat.assistsPerGame);
  const stl = formatStat(stat.stealsPerGame);
  const blk = formatStat(stat.blocksPerGame);

  return {
    id: stat.id,
    season: seasonLabel,
    team: teamName,
    teamSlug,
    league: leagueName,
    leagueSlug,
    games_played: stat.gamesPlayed,
    gamesPlayed: stat.gamesPlayed,
    pts_per_g: pts,
    pointsPerGame: pts,
    trb_per_g: reb,
    reboundsPerGame: reb,
    ast_per_g: ast,
    assistsPerGame: ast,
    stl_per_g: stl,
    stealsPerGame: stl,
    blk_per_g: blk,
    blocksPerGame: blk,
    fg_pct: "—",
    fieldGoalPct: "—",
  };
}

export async function searchPlayers(params: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<PlayerCard[]> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(params.q ? ilike(players.displayName, `%${params.q}%`) : undefined)
    .orderBy(desc(players.profileViews))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => toPlayerCard(r.player, r.teamName, r.teamSlug));
}

export interface BirthYearCount {
  year: number;
  count: number;
}

export interface BirthYearPlayersResult {
  year: number;
  totalCount: number;
  players: PlayerCard[];
}

export const BIRTH_YEAR_TOP_LIMIT = 50;

export async function getBirthYearCounts(): Promise<BirthYearCount[]> {
  const rows = await db
    .select({
      year: sql<number>`extract(year from ${players.birthDate})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(players)
    .where(isNotNull(players.birthDate))
    .groupBy(sql`extract(year from ${players.birthDate})`)
    .orderBy(desc(sql`extract(year from ${players.birthDate})`));

  return rows;
}

export async function getPlayersByBirthYear(
  year: number,
  params?: { page?: number; limit?: number },
): Promise<BirthYearPlayersResult> {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.min(BIRTH_YEAR_TOP_LIMIT, Math.max(1, params?.limit ?? BIRTH_YEAR_TOP_LIMIT));
  const offset = (page - 1) * limit;

  const birthYearFilter = and(
    isNotNull(players.birthDate),
    sql`extract(year from ${players.birthDate}) = ${year}`,
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(birthYearFilter);

  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(birthYearFilter)
    .orderBy(desc(players.profileViews))
    .limit(limit)
    .offset(offset);

  return {
    year,
    totalCount: countRow?.count ?? 0,
    players: rows.map((r) => toPlayerCard(r.player, r.teamName, r.teamSlug)),
  };
}

export async function getPlayerCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(players);
  return row?.count ?? 0;
}

export async function getTeamCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(teams);
  return row?.count ?? 0;
}

export async function getFeaturedPlayers(limit = 5): Promise<PlayerCard[]> {
  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .orderBy(desc(players.profileViews))
    .limit(limit);

  return rows.map((r) => toPlayerCard(r.player, r.teamName, r.teamSlug));
}

export async function getMostViewedPlayers(limit = 5): Promise<PlayerCard[]> {
  return getFeaturedPlayers(limit);
}

export async function getPlayerById(id: number): Promise<PlayerProfile | null> {
  const [row] = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
      leagueName: leagues.name,
      leagueSlug: leagues.slug,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(players.id, id))
    .limit(1);

  if (!row) return null;

  const statRows = await db
    .select({
      stat: playerSeasonStats,
      seasonLabel: seasons.seasonLabel,
      teamName: teams.name,
      teamSlug: teams.slug,
      leagueName: leagues.name,
      leagueSlug: leagues.slug,
    })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .innerJoin(leagues, eq(playerSeasonStats.leagueId, leagues.id))
    .where(eq(playerSeasonStats.playerId, id))
    .orderBy(desc(seasons.seasonLabel));

  const stintRows = await db
    .select({
      stint: playerStints,
      teamName: teams.name,
      leagueName: leagues.name,
      seasonLabel: seasons.seasonLabel,
    })
    .from(playerStints)
    .innerJoin(teams, eq(playerStints.teamId, teams.id))
    .innerJoin(leagues, eq(playerStints.leagueId, leagues.id))
    .leftJoin(seasons, eq(playerStints.seasonId, seasons.id))
    .where(eq(playerStints.playerId, id))
    .orderBy(desc(seasons.seasonLabel));

  const career: CareerEntry[] = stintRows.map((s) => ({
    id: s.stint.id,
    team: s.teamName,
    league: s.leagueName,
    season: s.seasonLabel ?? "—",
    startDate: s.stint.startDate ?? null,
    endDate: s.stint.endDate ?? null,
  }));

  const leaguesPlayed = [...new Set(statRows.map((s) => s.leagueName))];

  return {
    ...toPlayerCard(row.player, row.teamName, row.teamSlug),
    league: row.leagueName ?? null,
    leagueSlug: row.leagueSlug ?? null,
    stats: statRows.map((s) =>
      toStatRow(
        s.stat,
        s.seasonLabel,
        s.teamName,
        s.teamSlug,
        s.leagueName,
        s.leagueSlug,
      ),
    ),
    awards: [],
    career,
    leaguesPlayed,
  };
}

export async function incrementProfileViews(id: number): Promise<void> {
  await db
    .update(players)
    .set({
      profileViews: sql`${players.profileViews} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(players.id, id));
}

export async function getSeasonCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(seasons);
  return row?.count ?? 0;
}
