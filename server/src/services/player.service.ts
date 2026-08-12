import { and, desc, eq, exists, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { FEATURED_PLAYER_SLUGS } from "../data/featured-players.js";
import { db } from "../db/index.js";
import {
  leagues,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../db/schema/index.js";
import { resolvePublicLeagueSlug, leagueGenderForSlug } from "../utils/league-slug.js";
import { findLeagueRowBySlug } from "../utils/league-resolution.js";
import { normalizeSlugParam } from "../utils/slug.js";
import { wordPrefixMatch } from "../utils/search-match.js";
import { cmToFeetInches, formatStat, kgToLbs } from "../utils/format.js";
import { formatJerseyNumber } from "../utils/jersey.js";
import { sanitizeHeadshotUrl } from "../utils/headshot.js";
import { formatPosition } from "../utils/position.js";

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
  leagueGender: string | null;
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
  teamSlug: string;
  league: string;
  leagueSlug: string;
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
    position: formatPosition(player.position),
    team: teamName ?? "",
    teamSlug,
    height: cmToFeetInches(player.heightCm),
    weight: kgToLbs(player.weightKg),
    jerseyNumber: formatJerseyNumber(player.jerseyNumber),
    country: player.country ?? "",
    headshotUrl: sanitizeHeadshotUrl(player.headshotUrl),
    bio: null,
    profileViews: player.profileViews,
    hometown: player.hometown ?? "",
    birthDate: player.birthDate ?? null,
  };
}

async function getLatestTeamsForPlayers(
  playerIds: number[],
): Promise<Map<number, { teamName: string; teamSlug: string }>> {
  const latestByPlayer = new Map<number, { teamName: string; teamSlug: string; seasonLabel: string }>();
  if (playerIds.length === 0) return new Map();

  const rows = await db
    .select({
      playerId: playerSeasonStats.playerId,
      teamName: teams.name,
      teamSlug: teams.slug,
      seasonLabel: seasons.seasonLabel,
    })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .where(inArray(playerSeasonStats.playerId, playerIds));

  for (const row of rows) {
    const existing = latestByPlayer.get(row.playerId);
    if (!existing || row.seasonLabel.localeCompare(existing.seasonLabel) > 0) {
      latestByPlayer.set(row.playerId, {
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        seasonLabel: row.seasonLabel,
      });
    }
  }

  return new Map(
    [...latestByPlayer.entries()].map(([playerId, { teamName, teamSlug }]) => [
      playerId,
      { teamName, teamSlug },
    ]),
  );
}

function toStatRow(
  stat: typeof playerSeasonStats.$inferSelect,
  seasonLabel: string,
  teamName: string,
  teamSlug: string,
  leagueName: string,
  leagueSlug: string,
  leagueGender: string | null,
): PlayerStatRow {
  const pts = formatStat(stat.pointsPerGame);
  const reb = formatStat(stat.reboundsPerGame);
  const ast = formatStat(stat.assistsPerGame);
  const stl = formatStat(stat.stealsPerGame);
  const blk = formatStat(stat.blocksPerGame);
  const fg = formatStat(stat.fieldGoalPct);

  return {
    id: stat.id,
    season: seasonLabel,
    team: teamName,
    teamSlug,
    league: leagueName,
    leagueSlug,
    leagueGender,
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
  league?: string;
}): Promise<PlayerCard[]> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = (page - 1) * limit;
  const leagueRow = params.league
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(params.league)),
      )
    : null;

  const leagueFilter = leagueRow
    ? exists(
        db
          .select({ one: sql`1` })
          .from(playerSeasonStats)
          .where(
            and(
              eq(playerSeasonStats.playerId, players.id),
              eq(playerSeasonStats.leagueId, leagueRow.id),
            ),
          ),
      )
    : undefined;

  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(
      and(
        params.q ? wordPrefixMatch(players.displayName, params.q) : undefined,
        leagueFilter,
      ),
    )
    .orderBy(desc(players.profileViews))
    .limit(limit)
    .offset(offset);

  const latestTeams = await getLatestTeamsForPlayers(rows.map((r) => r.player.id));

  return rows.map((r) => {
    const latestTeam = latestTeams.get(r.player.id);
    const teamName = r.teamName ?? latestTeam?.teamName ?? "";
    const teamSlug = r.teamSlug ?? latestTeam?.teamSlug ?? null;
    return toPlayerCard(r.player, teamName, teamSlug);
  });
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
  const slugs = FEATURED_PLAYER_SLUGS.slice(0, limit);
  const rows = await db
    .select({
      player: players,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(players)
    .leftJoin(teams, eq(players.currentTeamId, teams.id))
    .where(inArray(players.slug, slugs));

  const bySlug = new Map(rows.map((row) => [row.player.slug, row]));
  const featured: PlayerCard[] = [];

  for (const slug of slugs) {
    const row = bySlug.get(slug);
    if (!row) continue;

    let teamName = row.teamName;
    let teamSlug = row.teamSlug;
    if (!teamName) {
      const latestTeams = await getLatestTeamsForPlayers([row.player.id]);
      const latest = latestTeams.get(row.player.id);
      teamName = latest?.teamName ?? null;
      teamSlug = latest?.teamSlug ?? null;
    }

    featured.push(toPlayerCard(row.player, teamName, teamSlug));
  }

  return featured;
}

export async function getMostViewedPlayers(limit = 5): Promise<PlayerCard[]> {
  return getFeaturedPlayers(limit);
}

export async function getPlayerById(
  id: number,
  options?: { league?: string },
): Promise<PlayerProfile | null> {
  const leagueRow = options?.league
    ? await findLeagueRowBySlug(
        db,
        resolvePublicLeagueSlug(normalizeSlugParam(options.league)),
      )
    : null;

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
      leagueGender: leagues.gender,
    })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
    .innerJoin(leagues, eq(playerSeasonStats.leagueId, leagues.id))
    .where(
      and(
        eq(playerSeasonStats.playerId, id),
        leagueRow ? eq(playerSeasonStats.leagueId, leagueRow.id) : undefined,
      ),
    )
    .orderBy(desc(seasons.seasonLabel));

  const stintRows = await db
    .select({
      stint: playerStints,
      teamName: teams.name,
      teamSlug: teams.slug,
      leagueName: leagues.name,
      leagueSlug: leagues.slug,
      seasonLabel: seasons.seasonLabel,
    })
    .from(playerStints)
    .innerJoin(teams, eq(playerStints.teamId, teams.id))
    .innerJoin(leagues, eq(playerStints.leagueId, leagues.id))
    .leftJoin(seasons, eq(playerStints.seasonId, seasons.id))
    .where(
      and(
        eq(playerStints.playerId, id),
        leagueRow ? eq(playerStints.leagueId, leagueRow.id) : undefined,
      ),
    )
    .orderBy(desc(seasons.seasonLabel));

  const career: CareerEntry[] = stintRows.map((s) => ({
    id: s.stint.id,
    team: s.teamName,
    teamSlug: s.teamSlug,
    league: s.leagueName,
    leagueSlug: s.leagueSlug,
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
        leagueGenderForSlug(s.leagueSlug) ?? s.leagueGender ?? null,
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

/** Add 1–6 synthetic views per player once per calendar day (UTC). Idempotent. */
export async function runDailySyntheticProfileViews(): Promise<{
  updated: number;
  skipped: boolean;
}> {
  const claimed = await db.execute<{ run_date: string }>(sql`
    INSERT INTO profile_view_daily_runs (run_date, players_updated)
    VALUES (current_date, 0)
    ON CONFLICT (run_date) DO NOTHING
    RETURNING run_date
  `);

  if (claimed.rows.length === 0) {
    return { updated: 0, skipped: true };
  }

  const bumped = await db.execute<{ count: number }>(sql`
    WITH updated AS (
      UPDATE players
      SET
        profile_views = profile_views + (1 + (abs(hashtext(concat(id::text, current_date::text))) % 6)),
        updated_at = NOW()
      RETURNING id
    )
    SELECT count(*)::int AS count FROM updated
  `);

  const updated = bumped.rows[0]?.count ?? 0;

  await db.execute(sql`
    UPDATE profile_view_daily_runs
    SET players_updated = ${updated}
    WHERE run_date = current_date
  `);

  return { updated, skipped: false };
}

export async function getSeasonCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(seasons);
  return row?.count ?? 0;
}
