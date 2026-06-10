import { date, integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";

export const seasons = pgTable(
  "seasons",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    label: text("label").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
  },
  (t) => [unique().on(t.leagueId, t.label)],
);
