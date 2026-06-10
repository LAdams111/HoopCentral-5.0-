import { date, integer, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";
import { players } from "./players.js";
import { seasons } from "./seasons.js";
import { teams } from "./teams.js";

export const playerStints = pgTable(
  "player_stints",
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
    seasonId: integer("season_id").references(() => seasons.id),
    startDate: date("start_date"),
    endDate: date("end_date"),
  },
  (t) => [unique().on(t.playerId, t.teamId, t.leagueId, t.seasonId)],
);
