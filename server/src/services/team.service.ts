import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  playerSeasonStats,
  players,
  seasons,
  teams,
} from "../db/schema/index.js";
import { type PlayerCard, toPlayerCard } from "./player.service.js";

export interface TeamInfo {
  id: number;
  name: string;
  abbreviation: string;
}

export interface TeamRoster {
  team: TeamInfo;
  seasonLabel: string;
  players: PlayerCard[];
}

async function findTeam(teamKey: string) {
  const decoded = decodeURIComponent(teamKey).trim();

  const [row] = await db
    .select()
    .from(teams)
    .where(
      or(
        ilike(teams.abbreviation, decoded),
        ilike(teams.name, decoded),
      ),
    )
    .limit(1);

  return row ?? null;
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

export async function getTeamRoster(
  teamKey: string,
  seasonKey: string,
): Promise<TeamRoster | null> {
  const team = await findTeam(teamKey);
  if (!team) return null;

  const season =
    (await findSeason(seasonKey, team.leagueId)) ??
    (await findLatestSeasonForTeam(team.id));

  if (!season) {
    return {
      team: {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
      },
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
    team: {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
    },
    seasonLabel: season.seasonLabel,
    players: rows.map((row) => toPlayerCard(row.player, row.teamName)),
  };
}

export async function getTeamSeasons(teamKey: string): Promise<string[]> {
  const team = await findTeam(teamKey);
  if (!team) return [];

  const rows = await db
    .selectDistinct({ label: seasons.seasonLabel })
    .from(playerSeasonStats)
    .innerJoin(seasons, eq(playerSeasonStats.seasonId, seasons.id))
    .where(eq(playerSeasonStats.teamId, team.id))
    .orderBy(desc(seasons.seasonLabel));

  return rows.map((row) => row.label);
}
