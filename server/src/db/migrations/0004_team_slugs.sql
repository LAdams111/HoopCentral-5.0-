ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
UPDATE "teams" SET "slug" = lower(regexp_replace(regexp_replace(trim("name"), '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g')) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_slug_unique" UNIQUE("slug");
