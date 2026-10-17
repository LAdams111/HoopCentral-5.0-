ALTER TABLE "claim_requests" ADD COLUMN IF NOT EXISTS "id_document" bytea;
ALTER TABLE "claim_requests" ADD COLUMN IF NOT EXISTS "id_document_type" text;
