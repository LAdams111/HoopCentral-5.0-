ALTER TABLE "player_season_stats"
  ADD COLUMN IF NOT EXISTS "three_point_pct" numeric(5, 1);

ALTER TABLE "player_season_stats"
  ADD COLUMN IF NOT EXISTS "free_throw_pct" numeric(5, 1);

CREATE TABLE IF NOT EXISTS "player_season_playoff_stats" (
  "id" serial PRIMARY KEY NOT NULL,
  "player_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "league_id" integer NOT NULL REFERENCES "leagues"("id"),
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "games_played" integer,
  "points_per_game" numeric(5, 1),
  "rebounds_per_game" numeric(5, 1),
  "assists_per_game" numeric(5, 1),
  "steals_per_game" numeric(5, 1),
  "blocks_per_game" numeric(5, 1),
  "fg_pct" numeric(5, 1),
  "three_point_pct" numeric(5, 1),
  "free_throw_pct" numeric(5, 1),
  CONSTRAINT "player_season_playoff_stats_player_team_league_season_unique"
    UNIQUE("player_id", "team_id", "league_id", "season_id")
);
