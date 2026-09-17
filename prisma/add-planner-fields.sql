-- Activity planner: admission roadmap fields
DO $$ BEGIN
  CREATE TYPE "PlanCategory" AS ENUM (
    'ACADEMICS', 'TEST_PREP', 'PROFILE', 'APPLICATION',
    'INTERVIEW', 'ENROLLMENT', 'VISA', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanResponsibility" AS ENUM ('STUDENT', 'PARENT', 'COUNSELOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE activity_plan_items
  ADD COLUMN IF NOT EXISTS category "PlanCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
  ADD COLUMN IF NOT EXISTS responsibility "PlanResponsibility" NOT NULL DEFAULT 'STUDENT';

CREATE INDEX IF NOT EXISTS activity_plan_items_user_id_category_idx
  ON activity_plan_items (user_id, category);

CREATE INDEX IF NOT EXISTS activity_plan_items_user_id_due_date_idx
  ON activity_plan_items (user_id, due_date);
