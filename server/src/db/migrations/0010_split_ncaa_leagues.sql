ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "gender" text;--> statement-breakpoint
INSERT INTO "leagues" ("slug", "name", "gender")
VALUES
  ('ncaa-m', 'NCAA Division I (Men)', 'male'),
  ('ncaa-w', 'NCAA Division I (Women)', 'female')
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "gender" = EXCLUDED."gender";--> statement-breakpoint
UPDATE "teams"
SET "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa-m')
WHERE "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa');--> statement-breakpoint
UPDATE "seasons"
SET "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa-m')
WHERE "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa');--> statement-breakpoint
UPDATE "player_stints"
SET "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa-m')
WHERE "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa');--> statement-breakpoint
UPDATE "player_season_stats"
SET "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa-m')
WHERE "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa');--> statement-breakpoint
UPDATE "player_identities"
SET "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa-m')
WHERE "league_id" = (SELECT "id" FROM "leagues" WHERE "slug" = 'ncaa');--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_league_id_slug_unique" ON "teams" ("league_id", "slug");
