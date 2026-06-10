import { integer, numeric, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";
import { players } from "./players.js";
import { playerStints } from "./player-stints.js";
import { seasons } from "./seasons.js";
import { teams } from "./teams.js";

export const playerSeasonStats = pgTable(
  "player_season_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    stintId: integer("stint_id").references(() => playerStints.id),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    gamesPlayed: integer("games_played"),
    pointsPerGame: numeric("points_per_game", { precision: 5, scale: 1 }),
    reboundsPerGame: numeric("rebounds_per_game", { precision: 5, scale: 1 }),
    assistsPerGame: numeric("assists_per_game", { precision: 5, scale: 1 }),
    stealsPerGame: numeric("steals_per_game", { precision: 5, scale: 1 }),
    blocksPerGame: numeric("blocks_per_game", { precision: 5, scale: 1 }),
    fgPct: numeric("fg_pct", { precision: 5, scale: 1 }),
  },
  (t) => [unique().on(t.playerId, t.teamId, t.seasonId, t.leagueId)],
);
