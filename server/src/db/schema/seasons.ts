import { integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";

export const seasons = pgTable(
  "seasons",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    seasonLabel: text("season_label").notNull(),
  },
  (t) => [unique().on(t.leagueId, t.seasonLabel)],
);
