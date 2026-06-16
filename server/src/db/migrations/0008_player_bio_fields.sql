ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "jersey_number" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "country" text;
