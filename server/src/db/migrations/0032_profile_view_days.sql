CREATE TABLE IF NOT EXISTS "profile_view_days" (
  "player_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "view_date" date NOT NULL,
  "views" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "view_date")
);
