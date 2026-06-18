import { integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    abbreviation: text("abbreviation").notNull(),
    slug: text("slug").notNull(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
  },
  (t) => [unique().on(t.leagueId, t.slug)],
);
