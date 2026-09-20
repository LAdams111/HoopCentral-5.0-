import { and, asc, eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import {
  leagues,
  playerGameLogs,
  seasons,
  teams,
} from "../db/schema/index.js";

export type GameLogEntry = {
  date: string | null;
  homeAway: string;
  opponent: string;
  result: string | null;
  gs: boolean | null;
  mp: string | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  fg: string | null;
  fg3: string | null;
  ft: string | null;
  plusMinus: string | null;
  playoffs: boolean;
};

export type GameLogInput = {
  source: string;
  externalId: string;
  playerId: number;
  teamId: number;
  leagueId: number;
  seasonId: number;
  gameDate?: string | null;
  opponent: string;
  homeAway?: string | null;
  result?: string | null;
  started?: boolean | null;
  minutes?: string | null;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  fouls?: number | null;
  fgMade?: number | null;
  fgAtt?: number | null;
  fg3Made?: number | null;
  fg3Att?: number | null;
  ftMade?: number | null;
  ftAtt?: number | null;
  plusMinus?: string | null;
  playoffs?: boolean;
  extended?: Record<string, unknown> | null;
};

function toNum(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pair(made: number | null, att: number | null): string | null {
  if (made == null && att == null) return null;
  return `${made ?? "—"}-${att ?? "—"}`;
}

function numOrNull(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return String(value);
}

export async function getGameLogSeasonsForPlayer(playerId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ label: seasons.seasonLabel })
    .from(playerGameLogs)
    .innerJoin(seasons, eq(playerGameLogs.seasonId, seasons.id))
    .where(eq(playerGameLogs.playerId, playerId))
    .orderBy(asc(seasons.seasonLabel));
  return rows.map((row) => row.label);
}

export async function getPlayerGameLogs(
  playerId: number,
  seasonLabel: string,
): Promise<GameLogEntry[]> {
  const rows = await db
    .select({
      log: playerGameLogs,
      seasonLabel: seasons.seasonLabel,
    })
    .from(playerGameLogs)
    .innerJoin(seasons, eq(playerGameLogs.seasonId, seasons.id))
    .where(
      and(eq(playerGameLogs.playerId, playerId), eq(seasons.seasonLabel, seasonLabel)),
    )
    .orderBy(asc(playerGameLogs.gameDate), asc(playerGameLogs.id));

  return rows.map(({ log }) => ({
    date: log.gameDate,
    homeAway: log.homeAway ?? "",
    opponent: log.opponent,
    result: log.result,
    gs: log.started,
    mp: log.minutes,
    pts: toNum(log.points),
    reb: toNum(log.rebounds),
    ast: toNum(log.assists),
    stl: toNum(log.steals),
    blk: toNum(log.blocks),
    tov: toNum(log.turnovers),
    pf: toNum(log.fouls),
    fg: pair(log.fgMade, log.fgAtt),
    fg3: pair(log.fg3Made, log.fg3Att),
    ft: pair(log.ftMade, log.ftAtt),
    plusMinus: log.plusMinus,
    playoffs: Boolean(log.playoffs),
  }));
}

export async function deletePlayerGameLogsForSeason(params: {
  playerId: number;
  seasonId: number;
  source: string;
}, database: DbClient = db): Promise<number> {
  const result = await database
    .delete(playerGameLogs)
    .where(
      and(
        eq(playerGameLogs.playerId, params.playerId),
        eq(playerGameLogs.seasonId, params.seasonId),
        eq(playerGameLogs.source, params.source),
      ),
    );
  return result.rowCount ?? 0;
}

export async function upsertPlayerGameLogs(
  inputs: GameLogInput[],
  database: DbClient = db,
): Promise<number> {
  if (inputs.length === 0) return 0;
  let written = 0;

  for (const input of inputs) {
    const values = {
      playerId: input.playerId,
      teamId: input.teamId,
      leagueId: input.leagueId,
      seasonId: input.seasonId,
      gameDate: input.gameDate ?? null,
      opponent: input.opponent,
      homeAway: input.homeAway ?? null,
      result: input.result ?? null,
      started: input.started ?? null,
      minutes: input.minutes ?? null,
      points: numOrNull(input.points),
      rebounds: numOrNull(input.rebounds),
      assists: numOrNull(input.assists),
      steals: numOrNull(input.steals),
      blocks: numOrNull(input.blocks),
      turnovers: numOrNull(input.turnovers),
      fouls: numOrNull(input.fouls),
      fgMade: input.fgMade ?? null,
      fgAtt: input.fgAtt ?? null,
      fg3Made: input.fg3Made ?? null,
      fg3Att: input.fg3Att ?? null,
      ftMade: input.ftMade ?? null,
      ftAtt: input.ftAtt ?? null,
      plusMinus: input.plusMinus ?? null,
      playoffs: input.playoffs ?? false,
      source: input.source,
      externalId: input.externalId,
      extended: input.extended ?? null,
    };

    await database
      .insert(playerGameLogs)
      .values(values)
      .onConflictDoUpdate({
        target: [playerGameLogs.source, playerGameLogs.externalId],
        set: {
          ...values,
        },
      });
    written += 1;
  }

  return written;
}

export async function resolveSeasonTeamForGameLogs(params: {
  seasonLabel: string;
  leagueSlug: string;
  teamSlug: string;
}): Promise<{ teamId: number; leagueId: number; seasonId: number } | null> {
  const [row] = await db
    .select({
      teamId: teams.id,
      leagueId: leagues.id,
      seasonId: seasons.id,
    })
    .from(teams)
    .innerJoin(leagues, eq(leagues.id, teams.leagueId))
    .innerJoin(
      seasons,
      and(eq(seasons.leagueId, leagues.id), eq(seasons.seasonLabel, params.seasonLabel)),
    )
    .where(and(eq(leagues.slug, params.leagueSlug), eq(teams.slug, params.teamSlug)))
    .limit(1);

  return row ?? null;
}
