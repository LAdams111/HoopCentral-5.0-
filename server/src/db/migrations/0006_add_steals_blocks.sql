ALTER TABLE "player_season_stats"
  ADD COLUMN IF NOT EXISTS "steals_per_game" numeric(5, 1),
  ADD COLUMN IF NOT EXISTS "blocks_per_game" numeric(5, 1);
