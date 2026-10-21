-- Run once on production if practice history fails with missing practice_attempts column.
ALTER TABLE homeschool_progress
  ADD COLUMN IF NOT EXISTS practice_attempts JSONB NOT NULL DEFAULT '[]'::jsonb;
