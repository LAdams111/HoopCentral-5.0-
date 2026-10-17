ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;
