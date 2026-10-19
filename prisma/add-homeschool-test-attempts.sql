-- Run once on production if homeschool unit tests fail with missing test_attempts column.
ALTER TABLE homeschool_progress
  ADD COLUMN IF NOT EXISTS test_attempts JSONB NOT NULL DEFAULT '[]'::jsonb;
