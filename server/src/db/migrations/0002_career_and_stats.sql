CREATE TABLE "player_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	CONSTRAINT "player_identities_source_external_id_unique" UNIQUE("source","external_id"),
	CONSTRAINT "player_identities_player_id_league_id_source_unique" UNIQUE("player_id","league_id","source")
);
--> statement-breakpoint
CREATE TABLE "player_stints" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"season_id" integer,
	"jersey_number" text,
	CONSTRAINT "player_stints_player_id_team_id_league_id_season_id_unique" UNIQUE("player_id","team_id","league_id","season_id")
);
--> statement-breakpoint
CREATE TABLE "player_season_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"stint_id" integer,
	"season_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"games_played" integer,
	"points_per_game" numeric(5, 1),
	"rebounds_per_game" numeric(5, 1),
	"assists_per_game" numeric(5, 1),
	"steals_per_game" numeric(5, 1),
	"blocks_per_game" numeric(5, 1),
	"fg_pct" numeric(5, 1),
	CONSTRAINT "player_season_stats_player_id_team_id_season_id_league_id_unique" UNIQUE("player_id","team_id","season_id","league_id")
);
--> statement-breakpoint
ALTER TABLE "player_identities" ADD CONSTRAINT "player_identities_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_identities" ADD CONSTRAINT "player_identities_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_stint_id_player_stints_id_fk" FOREIGN KEY ("stint_id") REFERENCES "public"."player_stints"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
