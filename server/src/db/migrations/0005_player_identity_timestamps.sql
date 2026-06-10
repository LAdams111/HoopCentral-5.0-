ALTER TABLE "player_identities" ADD COLUMN "created_at" timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "player_identities" ADD COLUMN "updated_at" timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "player_identities" ALTER COLUMN "league_id" DROP NOT NULL;
--> statement-breakpoint
CREATE INDEX "player_identities_player_id_idx" ON "player_identities" ("player_id");
