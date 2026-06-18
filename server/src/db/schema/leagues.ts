import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  gender: text("gender"),
});
