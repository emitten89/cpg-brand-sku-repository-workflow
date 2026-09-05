CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contribution_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_hash text NOT NULL UNIQUE CHECK (length(receipt_hash) = 64),
  submission_type text NOT NULL CHECK (submission_type IN ('file_upload', 'change_request')),
  target_artifact text NOT NULL CHECK (
    target_artifact IN (
      'brand_repository',
      'sku_library',
      'retailer_model',
      'sources',
      'coverage_gaps',
      'summary'
    )
  ),
  source_snapshot_id text NOT NULL,
  record_reference text,
  summary text NOT NULL,
  details text NOT NULL,
  submitter_name text,
  submitter_email text,
  original_filename text,
  media_type text,
  size_bytes integer,
  sha256 text CHECK (sha256 IS NULL OR length(sha256) = 64),
  file_bytes bytea,
  status text NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'under_review', 'approved', 'rejected', 'superseded', 'published')
  ),
  reviewer_notes text,
  request_fingerprint text NOT NULL CHECK (length(request_fingerprint) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (submission_type = 'file_upload'
      AND original_filename IS NOT NULL
      AND size_bytes > 0
      AND size_bytes <= 2097152
      AND file_bytes IS NOT NULL
      AND octet_length(file_bytes) = size_bytes)
    OR
    (submission_type = 'change_request'
      AND original_filename IS NULL
      AND size_bytes IS NULL
      AND file_bytes IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS contribution_submissions_created_at_idx
  ON contribution_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS contribution_submissions_status_idx
  ON contribution_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS contribution_submissions_rate_limit_idx
  ON contribution_submissions (request_fingerprint, created_at DESC);

COMMENT ON TABLE contribution_submissions IS
  'Moderated proposals tied to a validated canonical snapshot. Rows do not mutate canonical artifacts directly.';
