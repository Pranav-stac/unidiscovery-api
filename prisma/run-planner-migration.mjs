import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env') });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL or DIRECT_URL in platform/api/.env');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const statements = [
  `DO $$ BEGIN
    CREATE TYPE "PlanCategory" AS ENUM (
      'ACADEMICS', 'TEST_PREP', 'PROFILE', 'APPLICATION',
      'INTERVIEW', 'ENROLLMENT', 'VISA', 'OTHER'
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "PlanResponsibility" AS ENUM ('STUDENT', 'PARENT', 'COUNSELOR');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS category "PlanCategory" NOT NULL DEFAULT 'OTHER';`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS subcategory TEXT;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS country TEXT;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS description TEXT;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS why_it_matters TEXT;`,
  `ALTER TABLE activity_plan_items ADD COLUMN IF NOT EXISTS responsibility "PlanResponsibility" NOT NULL DEFAULT 'STUDENT';`,
  `CREATE INDEX IF NOT EXISTS activity_plan_items_user_id_category_idx ON activity_plan_items (user_id, category);`,
  `CREATE INDEX IF NOT EXISTS activity_plan_items_user_id_due_date_idx ON activity_plan_items (user_id, due_date);`,
];

try {
  console.log('Connecting to database...');
  for (const [index, sql] of statements.entries()) {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK ${index + 1}/${statements.length}`);
  }

  const columns = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activity_plan_items'
      AND column_name = 'category'
  `;

  if (!columns.length) {
    throw new Error('category column still missing after migration');
  }

  console.log('Planner migration applied successfully.');
} catch (error) {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
