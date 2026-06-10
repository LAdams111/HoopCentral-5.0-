import { integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { leagues } from "./leagues.js";
import { players } from "./players.js";

export const playerIdentities = pgTable(
  "player_identities",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
  },
  (t) => [
    unique().on(t.source, t.externalId),
    unique().on(t.playerId, t.leagueId, t.source),
  ],
);
