CREATE TABLE IF NOT EXISTS "homeschool_progress" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "unit_id" TEXT NOT NULL,
  "learn_done" BOOLEAN NOT NULL DEFAULT false,
  "practice_score" INTEGER,
  "test_score" INTEGER,
  "mastered" BOOLEAN NOT NULL DEFAULT false,
  "lesson_cache" JSONB,
  "practice_cache" JSONB,
  "test_cache" JSONB,
  "chat_history" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homeschool_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "homeschool_progress_user_id_unit_id_key"
  ON "homeschool_progress"("user_id", "unit_id");
CREATE INDEX IF NOT EXISTS "homeschool_progress_user_id_idx"
  ON "homeschool_progress"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'homeschool_progress_user_id_fkey'
  ) THEN
    ALTER TABLE "homeschool_progress"
      ADD CONSTRAINT "homeschool_progress_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "homeschool_syllabi" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "cache_key" TEXT NOT NULL,
  "board" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homeschool_syllabi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "homeschool_syllabi_cache_key_key"
  ON "homeschool_syllabi"("cache_key");
CREATE INDEX IF NOT EXISTS "homeschool_syllabi_board_grade_idx"
  ON "homeschool_syllabi"("board", "grade");
