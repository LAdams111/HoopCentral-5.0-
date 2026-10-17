CREATE TABLE IF NOT EXISTS "claim_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "user_email" text,
  "kind" text NOT NULL,
  "player_id" integer NOT NULL DEFAULT 0,
  "player_name" text,
  "team_slug" text NOT NULL DEFAULT '',
  "team_name" text,
  "league_slug" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "claim_requests_user_target_idx"
  ON "claim_requests" ("user_id", "kind", "player_id", "team_slug", "league_slug");
