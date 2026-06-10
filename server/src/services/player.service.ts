import { desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  leagues,
  playerAwards,
  playerBiographical,
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
  height: string;
  weight: string;
  jerseyNumber: number;
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
  league: string;
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
  team: string;
  league: string;
  fromSeason: string;
  toSeason: string | null;
}

export interface PlayerProfile extends PlayerCard {
  stats: PlayerStatRow[];
  awards: { awardName: string; season: string | null; league: string | null }[];
  career: CareerEntry[];
  leaguesPlayed: string[];
}

async function toPlayerCard(
  player: typeof players.$inferSelect,
  bio: typeof playerBiographical.$inferSelect | undefined,
  teamName: string | null,
): Promise<PlayerCard> {
  return {
    id: player.id,
    name: player.displayName,
    position: bio?.position ?? "",
    team: teamName ?? "",
    height: cmToFeetInches(bio?.heightCm),
    weight: kgToLbs(bio?.weightKg),
    jerseyNumber: bio?.jerseyNumber ?? 0,
    headshotUrl: player.headshotUrl ?? "",
    bio: bio?.bio ?? null,
    profileViews: player.profileViews,
    hometown: bio?.hometown ?? "",
    birthDate: bio?.birthDate ?? null,
  };
}

function toStatRow(
  stat: typeof playerSeasonStats.$inferSelect,
  seasonLabel: string,
  teamName: string,
  leagueName: string,
): PlayerStatRow {
  const pts = formatStat(stat.pointsPerGame);
  const reb = formatStat(stat.reboundsPerGame);
  const ast = formatStat(stat.assistsPerGame);
  const stl = formatStat(stat.stealsPerGame);
  const blk = formatStat(stat.blocksPerGame);
  const fg = formatStat(stat.fgPct);

  return {
    id: stat.id,
    season: seasonLabel,
    team: teamName,
    league: leagueName,
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
    fg_pct: fg,
    fieldGoalPct: fg,
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
      bio: playerBiographical,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(playerBiographical, eq(players.id, playerBiographical.playerId))
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(params.q ? ilike(players.displayName, `%${params.q}%`) : undefined)
    .orderBy(desc(players.profileViews))
    .limit(limit)
    .offset(offset);

  return Promise.all(
    rows.map((r) => toPlayerCard(r.player, r.bio ?? undefined, r.teamName)),
  );
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
      bio: playerBiographical,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(playerBiographical, eq(players.id, playerBiographical.playerId))
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .orderBy(desc(players.profileViews))
    .limit(limit);

  return Promise.all(
    rows.map((r) => toPlayerCard(r.player, r.bio ?? undefined, r.teamName)),
  );
}

export async function getMostViewedPlayers(limit = 5): Promise<PlayerCard[]> {
  return getFeaturedPlayers(limit);
}

export async function getPlayerById(id: number): Promise<PlayerProfile | null> {
  const [row] = await db
    .select({
      player: players,
      bio: playerBiographical,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(playerBiographical, eq(players.id, playerBiographical.playerId))
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(eq(players.id, id))
    .limit(1);

  if (!row) return null;

  const statRows = await db
    .select({
      stat: playerSeasonStats,
      seasonLabel: seasons.label,
      teamName: teams.name,
      leagueName: leagues.name,
    })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .innerJoin(leagues, eq(playerSeasonStats.leagueId, leagues.id))
    .where(eq(playerSeasonStats.playerId, id))
    .orderBy(desc(seasons.label));

  const awardRows = await db
    .select({
      award: playerAwards,
      seasonLabel: seasons.label,
      leagueName: leagues.name,
    })
    .from(playerAwards)
    .leftJoin(seasons, eq(playerAwards.seasonId, seasons.id))
    .leftJoin(leagues, eq(playerAwards.leagueId, leagues.id))
    .where(eq(playerAwards.playerId, id));

  const stintRows = await db
    .select({
      stint: playerStints,
      teamName: teams.name,
      leagueName: leagues.name,
      seasonLabel: seasons.label,
    })
    .from(playerStints)
    .innerJoin(teams, eq(playerStints.teamId, teams.id))
    .innerJoin(leagues, eq(playerStints.leagueId, leagues.id))
    .leftJoin(seasons, eq(playerStints.seasonId, seasons.id))
    .where(eq(playerStints.playerId, id))
    .orderBy(seasons.label);

  const careerMap = new Map<string, CareerEntry & { seasons: string[] }>();
  for (const s of stintRows) {
    const key = `${s.teamName}-${s.leagueName}`;
    const existing = careerMap.get(key);
    const season = s.seasonLabel ?? "";
    if (existing) {
      if (season) existing.seasons.push(season);
    } else {
      careerMap.set(key, {
        team: s.teamName,
        league: s.leagueName,
        fromSeason: season,
        toSeason: season || null,
        seasons: season ? [season] : [],
      });
    }
  }

  const career: CareerEntry[] = [...careerMap.values()].map((c) => {
    const sorted = [...c.seasons].sort();
    return {
      team: c.team,
      league: c.league,
      fromSeason: sorted[0] ?? c.fromSeason,
      toSeason: sorted.length > 0 ? sorted[sorted.length - 1] : c.toSeason,
    };
  });

  const leaguesPlayed = [...new Set(statRows.map((s) => s.leagueName))];

  const card = await toPlayerCard(row.player, row.bio ?? undefined, row.teamName);

  return {
    ...card,
    stats: statRows.map((s) =>
      toStatRow(s.stat, s.seasonLabel, s.teamName, s.leagueName),
    ),
    awards: awardRows.map((a) => ({
      awardName: a.award.awardName,
      season: a.seasonLabel,
      league: a.leagueName,
    })),
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
