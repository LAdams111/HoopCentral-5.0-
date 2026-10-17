ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS photo bytea,
  ADD COLUMN IF NOT EXISTS photo_type text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS player_photos (
  player_id integer PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  photo bytea NOT NULL,
  photo_type text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
