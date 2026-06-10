import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id")
    .notNull()
    .references(() => leagues.id),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  city: text("city"),
});
