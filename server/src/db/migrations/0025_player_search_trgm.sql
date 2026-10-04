CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS players_display_name_trgm_idx
  ON players USING gin (lower(display_name) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS teams_name_trgm_idx
  ON teams USING gin (lower(name) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS teams_slug_trgm_idx
  ON teams USING gin (lower(slug) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS teams_abbreviation_lower_idx
  ON teams (lower(abbreviation) text_pattern_ops);
