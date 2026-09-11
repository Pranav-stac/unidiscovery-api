/**
 * Import scraped opportunity JSON into the activities table.
 * Run: node node_modules/ts-node/dist/bin.js prisma/import-scraped-activities.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { ActivityType, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SCRAPED_SOURCES = ['ecdatabase', 'snowday', 'extracurricularhub'] as const;

type ScrapedSource = (typeof SCRAPED_SOURCES)[number];

interface NormalizedActivity {
  title: string;
  type: ActivityType;
  description: string;
  gradeMin: number | null;
  gradeMax: number | null;
  interests: string[];
  url: string | null;
  metadata: Record<string, unknown>;
  dedupeKey: string;
}

function rootDir() {
  return path.resolve(__dirname, '../../..');
}

function mapCategoryToType(category?: string | null, subcategory?: string | null, snowType?: string | null): ActivityType {
  const hay = `${category ?? ''} ${subcategory ?? ''} ${snowType ?? ''}`.toLowerCase();
  if (hay.includes('intern')) return ActivityType.INTERNSHIP;
  if (hay.includes('compet') || hay.includes('olympiad') || hay.includes('hackathon')) return ActivityType.COMPETITION;
  if (hay.includes('volunteer') || hay.includes('service')) return ActivityType.VOLUNTEER;
  if (hay.includes('summer') || hay.includes('program') || hay.includes('camp')) return ActivityType.SUMMER_PROGRAM;
  if (hay.includes('project') || hay.includes('research')) return ActivityType.PROJECT;
  return ActivityType.OTHER;
}

function inferInterests(category?: string | null, tags?: string[] | string | null): string[] {
  const parts: string[] = [];
  if (category) parts.push(category.replace(/_/g, ' '));
  if (typeof tags === 'string' && tags.trim()) {
    parts.push(...tags.split(/[;,]/).map((t) => t.trim()).filter(Boolean));
  } else if (Array.isArray(tags)) {
    parts.push(...tags);
  }
  return [...new Set(parts.map((p) => p.toLowerCase()).filter(Boolean))].slice(0, 8);
}

function normalizeEcdatabase(filePath: string): NormalizedActivity[] {
  if (!fs.existsSync(filePath)) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    opportunities: Array<Record<string, unknown>>;
  };

  return payload.opportunities
    .filter((rec) => !rec.archived)
    .map((rec) => {
      const url = (rec.application_url as string) || (rec.website_url as string) || null;
      const title = String(rec.name ?? 'Untitled').slice(0, 240);
      return {
        title,
        type: mapCategoryToType(rec.category as string, rec.subcategory as string),
        description: String(rec.short_description ?? rec.long_description ?? '').slice(0, 4000),
        gradeMin: typeof rec.grade_min === 'number' ? rec.grade_min : null,
        gradeMax: typeof rec.grade_max === 'number' ? rec.grade_max : null,
        interests: inferInterests(rec.category as string, rec.tags as string[]),
        url,
        dedupeKey: (url ?? title).toLowerCase(),
        metadata: {
          source: 'ecdatabase' as ScrapedSource,
          sourceId: rec.id,
          organization: rec.organization,
          category: rec.category,
          subcategory: rec.subcategory,
          format: rec.format,
          deadline: rec.deadline,
          deadlineStatus: rec.deadline_status,
          cost: rec.cost,
          country: rec.country,
          city: rec.city,
          region: rec.region,
          level: rec.level,
          scope: rec.scope,
          openToInternational: rec.open_to_international,
          logoUrl: rec.logo_url,
          websiteUrl: rec.website_url,
          tags: rec.tags,
        },
      };
    });
}

function normalizeSnowday(filePath: string): NormalizedActivity[] {
  if (!fs.existsSync(filePath)) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    opportunities: Array<Record<string, unknown>>;
  };

  return payload.opportunities.map((rec) => {
    const url = (rec.url as string) || null;
    const title = String(rec.name ?? 'Untitled').slice(0, 240);
    return {
      title,
      type: mapCategoryToType(null, null, rec.type as string),
      description: `${rec.provider ?? ''} · ${rec.interests ?? ''}`.trim().slice(0, 4000),
      gradeMin: null,
      gradeMax: null,
      interests: inferInterests(rec.interests as string, rec.tags as string),
      url,
      dedupeKey: (url ?? title).toLowerCase(),
      metadata: {
        source: 'snowday' as ScrapedSource,
        sourceId: rec.id,
        organization: rec.provider,
        type: rec.type,
        providerTier: rec.provider_tier,
        seasons: rec.seasons,
        interests: rec.interests,
        financialGrade: rec.financial_accessibility_grade,
        expertsRating: rec.experts_choice_rating,
        highlySelective: rec.is_highly_selective,
        locationType: rec.location_type,
        location: rec.location,
        deadline: rec.deadline_date,
        deadlineDescription: rec.deadline_description,
        deadlineStatus: rec.deadline_status,
        logoUrl: rec.logo_url,
      },
    };
  });
}

function normalizeExtracurricularHub(filePath: string): NormalizedActivity[] {
  if (!fs.existsSync(filePath)) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    opportunities?: Array<Record<string, unknown>>;
    items?: Array<Record<string, unknown>>;
  };
  const rows = payload.opportunities ?? payload.items ?? [];

  return rows.map((rec) => {
    const url = (rec.url as string) || (rec.link as string) || (rec.application_url as string) || null;
    const title = String(rec.name ?? rec.title ?? 'Untitled').slice(0, 240);
    const description = String(rec.description ?? rec.short_description ?? rec.summary ?? '').slice(0, 4000);
    return {
      title,
      type: mapCategoryToType(rec.category as string, rec.type as string),
      description,
      gradeMin: typeof rec.grade_min === 'number' ? rec.grade_min : null,
      gradeMax: typeof rec.grade_max === 'number' ? rec.grade_max : null,
      interests: inferInterests(rec.category as string, rec.tags as string[] | string),
      url,
      dedupeKey: (url ?? title).toLowerCase(),
      metadata: {
        source: 'extracurricularhub' as ScrapedSource,
        sourceId: rec.id ?? rec.slug,
        organization: rec.organization ?? rec.provider,
        category: rec.category,
        format: rec.format,
        deadline: rec.deadline,
        cost: rec.cost,
        country: rec.country,
        tags: rec.tags,
      },
    };
  });
}

async function main() {
  const outputDir = path.join(rootDir(), 'scripts', 'ecdatabase-scraper', 'output');

  const merged = [
    ...normalizeEcdatabase(path.join(outputDir, 'opportunities.json')),
    ...normalizeSnowday(path.join(outputDir, 'snowday-opportunities.json')),
    ...normalizeExtracurricularHub(path.join(outputDir, 'extracurricularhub-opportunities.json')),
  ];

  const deduped: NormalizedActivity[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    if (!item.title.trim() || seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    deduped.push(item);
  }

  console.log(`Parsed ${merged.length} records → ${deduped.length} unique opportunities`);

  const deleted = await prisma.activity.deleteMany({
    where: {
      OR: SCRAPED_SOURCES.map((source) => ({
        metadata: { path: ['source'], equals: source },
      })),
    },
  });
  console.log(`Removed ${deleted.count} previous scraped rows`);

  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < deduped.length; i += chunkSize) {
    const chunk = deduped.slice(i, i + chunkSize);
    await prisma.activity.createMany({
      data: chunk.map((item) => ({
        title: item.title,
        type: item.type,
        description: item.description,
        gradeMin: item.gradeMin,
        gradeMax: item.gradeMax,
        interests: item.interests,
        url: item.url,
        metadata: item.metadata as Prisma.InputJsonObject,
        isActive: true,
      })),
    });
    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${deduped.length}`);
  }

  const total = await prisma.activity.count({ where: { isActive: true, deletedAt: null } });
  console.log(`Import complete. Active activities in DB: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
