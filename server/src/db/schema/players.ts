import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { teams } from "./teams.js";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  currentTeamId: integer("current_team_id").references(() => teams.id),
  position: text("position"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  birthDate: date("birth_date"),
  hometown: text("hometown"),
  country: text("country"),
  jerseyNumber: text("jersey_number"),
  headshotUrl: text("headshot_url").default(""),
  profileViews: integer("profile_views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
