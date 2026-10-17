ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS proof text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed jsonb NOT NULL DEFAULT '{}'::jsonb;
