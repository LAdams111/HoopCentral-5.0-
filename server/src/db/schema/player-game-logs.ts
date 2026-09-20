import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";
import { players } from "./players.js";
import { seasons } from "./seasons.js";
import { teams } from "./teams.js";

export const playerGameLogs = pgTable(
  "player_game_logs",
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
    gameDate: date("game_date"),
    opponent: text("opponent").notNull(),
    homeAway: text("home_away"),
    result: text("result"),
    started: boolean("started"),
    minutes: text("minutes"),
    points: numeric("points", { precision: 5, scale: 1 }),
    rebounds: numeric("rebounds", { precision: 5, scale: 1 }),
    assists: numeric("assists", { precision: 5, scale: 1 }),
    steals: numeric("steals", { precision: 5, scale: 1 }),
    blocks: numeric("blocks", { precision: 5, scale: 1 }),
    turnovers: numeric("turnovers", { precision: 5, scale: 1 }),
    fouls: numeric("fouls", { precision: 5, scale: 1 }),
    fgMade: integer("fg_made"),
    fgAtt: integer("fg_att"),
    fg3Made: integer("fg3_made"),
    fg3Att: integer("fg3_att"),
    ftMade: integer("ft_made"),
    ftAtt: integer("ft_att"),
    plusMinus: text("plus_minus"),
    playoffs: boolean("playoffs").notNull().default(false),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    extended: jsonb("extended").$type<Record<string, unknown>>(),
  },
  (t) => [unique("player_game_logs_source_external_idx").on(t.source, t.externalId)],
);
