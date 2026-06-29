import { integer, numeric, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";
import { players } from "./players.js";
import { seasons } from "./seasons.js";
import { teams } from "./teams.js";

export const playerSeasonPlayoffStats = pgTable(
  "player_season_playoff_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id),
    gamesPlayed: integer("games_played"),
    pointsPerGame: numeric("points_per_game", { precision: 5, scale: 1 }),
    reboundsPerGame: numeric("rebounds_per_game", { precision: 5, scale: 1 }),
    assistsPerGame: numeric("assists_per_game", { precision: 5, scale: 1 }),
    stealsPerGame: numeric("steals_per_game", { precision: 5, scale: 1 }),
    blocksPerGame: numeric("blocks_per_game", { precision: 5, scale: 1 }),
    fieldGoalPct: numeric("fg_pct", { precision: 5, scale: 1 }),
    threePointPct: numeric("three_point_pct", { precision: 5, scale: 1 }),
    freeThrowPct: numeric("free_throw_pct", { precision: 5, scale: 1 }),
  },
  (t) => [unique().on(t.playerId, t.teamId, t.seasonId, t.leagueId)],
);
