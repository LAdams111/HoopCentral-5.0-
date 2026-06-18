ALTER TABLE "player_season_stats"
  ADD COLUMN IF NOT EXISTS "fg_pct" numeric(5, 1);
