CREATE TABLE IF NOT EXISTS profile_view_daily_runs (
  run_date date PRIMARY KEY,
  players_updated integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
