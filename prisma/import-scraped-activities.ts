/**
 * Import scraped opportunity JSON into the activities table.
 * Prefer the API scheduler in production. This script is for local/manual runs.
 * Run: node node_modules/ts-node/dist/bin.js prisma/import-scraped-activities.ts
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  loadScrapedOpportunities,
  SCRAPED_SOURCES,
} from '../src/modules/activities/data/opportunity-catalog';

const prisma = new PrismaClient();

function sourceKey(item: { metadata?: Record<string, unknown>; url?: string | null; title?: string }) {
  const meta = item.metadata ?? {};
  if (meta.source && meta.sourceId) return `${meta.source}:${meta.sourceId}`;
  return (item.url ?? item.title ?? '').toLowerCase();
}

async function main() {
  const { merged, items } = loadScrapedOpportunities();
  console.log(`Parsed ${merged} records → ${items.length} unique opportunities`);

  const existing = await prisma.activity.findMany({
    where: {
      OR: SCRAPED_SOURCES.map((source) => ({
        metadata: { path: ['source'], equals: source },
      })),
    },
    select: { id: true, url: true, title: true, metadata: true },
  });
  const byKey = new Map<string, string>();
  for (const row of existing) {
    byKey.set(sourceKey({ ...row, metadata: (row.metadata ?? {}) as Record<string, unknown> }), row.id);
  }

  let created = 0;
  let updated = 0;
  const keep = new Set<string>();

  for (const item of items) {
    const key = sourceKey(item);
    const id = byKey.get(key);
    const data = {
      title: item.title,
      type: item.type,
      description: item.description,
      gradeMin: item.gradeMin,
      gradeMax: item.gradeMax,
      interests: item.interests,
      url: item.url,
      metadata: item.metadata as Prisma.InputJsonObject,
      isActive: true,
      deletedAt: null,
    };
    if (id) {
      await prisma.activity.update({ where: { id }, data });
      keep.add(id);
      updated += 1;
    } else {
      const row = await prisma.activity.create({ data });
      keep.add(row.id);
      created += 1;
    }
  }

  const stale = existing.filter((row) => !keep.has(row.id)).map((row) => row.id);
  if (stale.length) {
    await prisma.activity.updateMany({
      where: { id: { in: stale } },
      data: { isActive: false },
    });
  }

  console.log(`Import complete. ${created} created, ${updated} updated, ${stale.length} deactivated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
