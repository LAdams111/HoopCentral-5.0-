CREATE TABLE IF NOT EXISTS "user_favorites" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "kind" text NOT NULL,
  "player_id" integer NOT NULL DEFAULT 0,
  "player_name" text,
  "headshot_url" text,
  "team_slug" text NOT NULL DEFAULT '',
  "team_name" text,
  "league_slug" text NOT NULL DEFAULT '',
  "abbreviation" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_favorites_target_idx"
  ON "user_favorites" ("user_id", "kind", "player_id", "team_slug", "league_slug");
