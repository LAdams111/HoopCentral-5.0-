import { integer, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { seasons } from "./seasons.js";
import { teams } from "./teams.js";

export const teamSeasonRecords = pgTable(
  "team_season_records",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
  },
  (t) => [unique().on(t.teamId, t.seasonId)],
);
