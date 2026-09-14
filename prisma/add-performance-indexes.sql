-- Performance indexes for fast navigation and dashboard loads.
-- Run manually against your Postgres database (safe to re-run).

-- Unread notification count (partial index)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id)
  WHERE read_at IS NULL;

-- Application documents for college suite listing
CREATE INDEX IF NOT EXISTS idx_app_docs_user_active_updated
  ON application_documents (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Tutoring dashboard accuracy counts
CREATE INDEX IF NOT EXISTS idx_tutoring_attempts_user_correct
  ON tutoring_attempts (user_id, is_correct);

-- Activity browse scans
CREATE INDEX IF NOT EXISTS idx_activities_active_updated
  ON activities (is_active, updated_at DESC)
  WHERE deleted_at IS NULL;

-- College suite recommendations ordering
CREATE INDEX IF NOT EXISTS idx_college_rec_user_score
  ON college_recommendations (user_id, score DESC);

-- Saved activities count per user
CREATE INDEX IF NOT EXISTS idx_saved_activities_user
  ON saved_activities (user_id);
