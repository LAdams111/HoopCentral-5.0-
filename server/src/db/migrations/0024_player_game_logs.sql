CREATE TABLE IF NOT EXISTS "player_game_logs" (
  "id" serial PRIMARY KEY,
  "player_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "league_id" integer NOT NULL REFERENCES "leagues"("id"),
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "game_date" date,
  "opponent" text NOT NULL,
  "home_away" text,
  "result" text,
  "started" boolean,
  "minutes" text,
  "points" numeric(5, 1),
  "rebounds" numeric(5, 1),
  "assists" numeric(5, 1),
  "steals" numeric(5, 1),
  "blocks" numeric(5, 1),
  "turnovers" numeric(5, 1),
  "fouls" numeric(5, 1),
  "fg_made" integer,
  "fg_att" integer,
  "fg3_made" integer,
  "fg3_att" integer,
  "ft_made" integer,
  "ft_att" integer,
  "plus_minus" text,
  "playoffs" boolean NOT NULL DEFAULT false,
  "source" text NOT NULL,
  "external_id" text NOT NULL,
  "extended" jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS player_game_logs_source_external_idx
  ON "player_game_logs" ("source", "external_id");

CREATE INDEX IF NOT EXISTS player_game_logs_player_season_idx
  ON "player_game_logs" ("player_id", "season_id");
