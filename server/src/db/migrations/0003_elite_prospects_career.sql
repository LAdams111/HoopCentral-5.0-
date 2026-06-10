ALTER TABLE "player_season_stats" DROP CONSTRAINT IF EXISTS "player_season_stats_stint_id_player_stints_id_fk";--> statement-breakpoint
ALTER TABLE "player_season_stats" DROP COLUMN IF EXISTS "stint_id";--> statement-breakpoint
ALTER TABLE "player_season_stats" DROP COLUMN IF EXISTS "steals_per_game";--> statement-breakpoint
ALTER TABLE "player_season_stats" DROP COLUMN IF EXISTS "blocks_per_game";--> statement-breakpoint
ALTER TABLE "player_season_stats" DROP COLUMN IF EXISTS "fg_pct";--> statement-breakpoint
ALTER TABLE "player_stints" DROP COLUMN IF EXISTS "jersey_number";--> statement-breakpoint
ALTER TABLE "player_stints" ADD COLUMN IF NOT EXISTS "start_date" date;--> statement-breakpoint
ALTER TABLE "player_stints" ADD COLUMN IF NOT EXISTS "end_date" date;
