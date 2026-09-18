import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

async function runStatement(
  prisma: PrismaClient,
  logger: Logger,
  label: string,
  sql: string,
  critical = false,
) {
  try {
    await prisma.$executeRawUnsafe(sql);
    logger.log(`Startup migration applied: ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (critical) {
      logger.error(`Critical startup migration failed (${label}): ${message}`);
      throw error;
    }
    logger.warn(`Startup migration skipped (${label}): ${message}`);
  }
}

async function ensurePlannerSchema(prisma: PrismaClient, logger: Logger) {
  await runStatement(
    prisma,
    logger,
    'PlanCategory enum',
    `DO $$ BEGIN
      CREATE TYPE "PlanCategory" AS ENUM (
        'ACADEMICS', 'TEST_PREP', 'PROFILE', 'APPLICATION',
        'INTERVIEW', 'ENROLLMENT', 'VISA', 'OTHER'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,
  );

  await runStatement(
    prisma,
    logger,
    'PlanResponsibility enum',
    `DO $$ BEGIN
      CREATE TYPE "PlanResponsibility" AS ENUM ('STUDENT', 'PARENT', 'COUNSELOR');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,
  );

  const plannerColumns: Array<[string, string]> = [
    ['category', `ADD COLUMN IF NOT EXISTS category "PlanCategory" NOT NULL DEFAULT 'OTHER'`],
    ['subcategory', 'ADD COLUMN IF NOT EXISTS subcategory TEXT'],
    ['start_date', 'ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ'],
    ['due_date', 'ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ'],
    ['country', 'ADD COLUMN IF NOT EXISTS country TEXT'],
    ['description', 'ADD COLUMN IF NOT EXISTS description TEXT'],
    ['why_it_matters', 'ADD COLUMN IF NOT EXISTS why_it_matters TEXT'],
    [
      'responsibility',
      `ADD COLUMN IF NOT EXISTS responsibility "PlanResponsibility" NOT NULL DEFAULT 'STUDENT'`,
    ],
  ];

  for (const [name, clause] of plannerColumns) {
    await runStatement(
      prisma,
      logger,
      `activity_plan_items.${name}`,
      `ALTER TABLE activity_plan_items ${clause};`,
      true,
    );
  }

  await runStatement(
    prisma,
    logger,
    'activity_plan_items category index',
    `CREATE INDEX IF NOT EXISTS activity_plan_items_user_id_category_idx
     ON activity_plan_items (user_id, category);`,
  );

  await runStatement(
    prisma,
    logger,
    'activity_plan_items due_date index',
    `CREATE INDEX IF NOT EXISTS activity_plan_items_user_id_due_date_idx
     ON activity_plan_items (user_id, due_date);`,
  );

  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activity_plan_items'
      AND column_name = 'category'
  `;

  if (!columns.length) {
    throw new Error(
      'activity_plan_items.category is still missing after startup migrations',
    );
  }
}

export async function applyStartupMigrations(
  prisma: PrismaClient,
  logger: Logger,
): Promise<void> {
  await ensurePlannerSchema(prisma, logger);
}
