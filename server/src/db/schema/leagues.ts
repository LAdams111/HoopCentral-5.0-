import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country"),
  isActive: integer("is_active").notNull().default(1),
});
