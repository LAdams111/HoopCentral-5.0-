ALTER TABLE "player_season_stats"
ADD COLUMN IF NOT EXISTS "extended_stats" jsonb;

ALTER TABLE "players"
ADD COLUMN IF NOT EXISTS "extended_profile" jsonb;
