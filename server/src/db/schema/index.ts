import {
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const playerStatusEnum = pgEnum("player_status", [
  "active",
  "retired",
  "deceased",
]);

export const stintTypeEnum = pgEnum("stint_type", [
  "standard",
  "two_way",
  "assignment",
  "loan",
]);

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country"),
  isActive: integer("is_active").notNull().default(1),
});

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

export const playerBiographical = pgTable("player_biographical", {
  playerId: integer("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  birthDate: date("birth_date"),
  hometown: text("hometown"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  bio: text("bio"),
});

export const playerStints = pgTable(
  "player_stints",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    seasonId: integer("season_id").references(() => seasons.id),
    jerseyNumber: text("jersey_number"),
    stintType: stintTypeEnum("stint_type").notNull().default("standard"),
  },
  (t) => [unique().on(t.playerId, t.teamId, t.leagueId, t.seasonId)],
);

export const playerSeasonStats = pgTable(
  "player_season_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    stintId: integer("stint_id").references(() => playerStints.id),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    gamesPlayed: integer("games_played"),
    pointsPerGame: numeric("points_per_game", { precision: 5, scale: 1 }),
    reboundsPerGame: numeric("rebounds_per_game", { precision: 5, scale: 1 }),
    assistsPerGame: numeric("assists_per_game", { precision: 5, scale: 1 }),
    stealsPerGame: numeric("steals_per_game", { precision: 5, scale: 1 }),
    blocksPerGame: numeric("blocks_per_game", { precision: 5, scale: 1 }),
    fgPct: numeric("fg_pct", { precision: 5, scale: 1 }),
    fg3Pct: numeric("fg3_pct", { precision: 5, scale: 1 }),
    ftPct: numeric("ft_pct", { precision: 5, scale: 1 }),
    statsExtended: jsonb("stats_extended"),
  },
  (t) => [unique().on(t.playerId, t.teamId, t.seasonId, t.leagueId)],
);

export const playerAwards = pgTable("player_awards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  seasonId: integer("season_id").references(() => seasons.id),
  leagueId: integer("league_id").references(() => leagues.id),
  awardName: text("award_name").notNull(),
});
