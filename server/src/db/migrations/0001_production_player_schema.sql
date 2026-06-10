DROP TABLE IF EXISTS "player_awards" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "player_season_stats" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "player_stints" CASCADE;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "position" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "height_cm" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "weight_kg" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birth_date" date;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "hometown" text;--> statement-breakpoint
UPDATE "players" p SET
  "position" = b."position",
  "height_cm" = b."height_cm",
  "weight_kg" = b."weight_kg",
  "birth_date" = b."birth_date",
  "hometown" = b."hometown"
FROM "player_biographical" b
WHERE p."id" = b."player_id";--> statement-breakpoint
DROP TABLE IF EXISTS "player_biographical" CASCADE;--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
DROP TYPE IF EXISTS "player_status";--> statement-breakpoint
DROP TYPE IF EXISTS "stint_type";--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN IF EXISTS "country";--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN IF EXISTS "is_active";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN IF EXISTS "slug";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN IF EXISTS "city";--> statement-breakpoint
ALTER TABLE "seasons" RENAME COLUMN "label" TO "season_label";--> statement-breakpoint
ALTER TABLE "seasons" DROP COLUMN IF EXISTS "start_date";--> statement-breakpoint
ALTER TABLE "seasons" DROP COLUMN IF EXISTS "end_date";--> statement-breakpoint
UPDATE "players" SET "slug" = 'unknown-' || "id"::text WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "slug" SET NOT NULL;
