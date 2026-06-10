import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { playerStatusEnum } from "./enums.js";
import { teams } from "./teams.js";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique(),
  displayName: text("display_name").notNull(),
  currentTeamId: integer("current_team_id").references(() => teams.id),
  status: playerStatusEnum("status").notNull().default("active"),
  profileViews: integer("profile_views").notNull().default(0),
  headshotUrl: text("headshot_url").default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
