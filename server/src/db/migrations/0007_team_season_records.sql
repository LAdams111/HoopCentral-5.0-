CREATE TABLE IF NOT EXISTS "team_season_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "team_season_records_team_id_season_id_unique" UNIQUE("team_id","season_id")
);
--> statement-breakpoint
ALTER TABLE "team_season_records" ADD CONSTRAINT "team_season_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_season_records" ADD CONSTRAINT "team_season_records_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;
