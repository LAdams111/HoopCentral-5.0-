CREATE TYPE "public"."player_status" AS ENUM('active', 'retired', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."stint_type" AS ENUM('standard', 'two_way', 'assignment', 'loan');--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "leagues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"city" text
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"label" text NOT NULL,
	"start_date" date,
	"end_date" date,
	CONSTRAINT "seasons_league_id_label_unique" UNIQUE("league_id","label")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"display_name" text NOT NULL,
	"current_team_id" integer,
	"status" "player_status" DEFAULT 'active' NOT NULL,
	"profile_views" integer DEFAULT 0 NOT NULL,
	"headshot_url" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "player_biographical" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"birth_date" date,
	"hometown" text,
	"height_cm" integer,
	"weight_kg" integer,
	"position" text,
	"jersey_number" integer,
	"bio" text
);
--> statement-breakpoint
CREATE TABLE "player_stints" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"season_id" integer,
	"jersey_number" text,
	"stint_type" "stint_type" DEFAULT 'standard' NOT NULL,
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
	"fg3_pct" numeric(5, 1),
	"ft_pct" numeric(5, 1),
	"stats_extended" jsonb,
	CONSTRAINT "player_season_stats_player_id_team_id_season_id_league_id_unique" UNIQUE("player_id","team_id","season_id","league_id")
);
--> statement-breakpoint
CREATE TABLE "player_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"season_id" integer,
	"league_id" integer,
	"award_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_biographical" ADD CONSTRAINT "player_biographical_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_stint_id_player_stints_id_fk" FOREIGN KEY ("stint_id") REFERENCES "public"."player_stints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;
