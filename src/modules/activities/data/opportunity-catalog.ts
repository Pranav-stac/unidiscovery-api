import * as fs from 'fs';
import * as path from 'path';
import { ActivityType } from '@prisma/client';

export const SCRAPED_SOURCES = ['ecdatabase', 'snowday', 'extracurricularhub'] as const;
export type ScrapedSource = (typeof SCRAPED_SOURCES)[number];

export type NormalizedOpportunity = {
  title: string;
  type: ActivityType;
  description: string;
  gradeMin: number | null;
  gradeMax: number | null;
  interests: string[];
  url: string | null;
  metadata: Record<string, unknown>;
  dedupeKey: string;
};

export function scraperOutputDir() {
  return path.resolve(__dirname, '../../../../../scripts/ecdatabase-scraper/output');
}

function mapCategoryToType(
  category?: string | null,
  subcategory?: string | null,
  snowType?: string | null,
): ActivityType {
  const hay = `${category ?? ''} ${subcategory ?? ''} ${snowType ?? ''}`.toLowerCase();
  if (hay.includes('intern')) return ActivityType.INTERNSHIP;
  if (hay.includes('compet') || hay.includes('olympiad') || hay.includes('hackathon')) {
    return ActivityType.COMPETITION;
  }
  if (hay.includes('volunteer') || hay.includes('service')) return ActivityType.VOLUNTEER;
  if (hay.includes('summer') || hay.includes('program') || hay.includes('camp')) {
    return ActivityType.SUMMER_PROGRAM;
  }
  if (hay.includes('project') || hay.includes('research')) return ActivityType.PROJECT;
  return ActivityType.OTHER;
}

function inferInterests(category?: string | null, tags?: string[] | string | null): string[] {
  const parts: string[] = [];
  if (category) parts.push(category.replace(/_/g, ' '));
  if (typeof tags === 'string' && tags.trim()) {
    parts.push(...tags.split(/[;,]/).map((item) => item.trim()).filter(Boolean));
  } else if (Array.isArray(tags)) {
    parts.push(...tags);
  }
  return [...new Set(parts.map((item) => item.toLowerCase()).filter(Boolean))].slice(0, 10);
}

function readJson(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

export function normalizeEcdatabase(filePath: string): NormalizedOpportunity[] {
  const payload = readJson(filePath);
  if (!payload) return [];
  const rows = (payload.opportunities as Array<Record<string, unknown>>) ?? [];
  return rows
    .filter((rec) => !rec.archived)
    .map((rec) => {
      const url = (rec.application_url as string) || (rec.website_url as string) || null;
      const title = String(rec.name ?? 'Untitled').slice(0, 240);
      return {
        title,
        type: mapCategoryToType(rec.category as string, rec.subcategory as string),
        description: String(rec.long_description ?? rec.short_description ?? '').slice(0, 8000),
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
          eligibility: rec.eligibility,
        },
      };
    });
}

export function normalizeSnowday(filePath: string): NormalizedOpportunity[] {
  const payload = readJson(filePath);
  if (!payload) return [];
  const rows = (payload.opportunities as Array<Record<string, unknown>>) ?? [];
  return rows.map((rec) => {
    const url = (rec.url as string) || null;
    const title = String(rec.name ?? 'Untitled').slice(0, 240);
    return {
      title,
      type: mapCategoryToType(null, null, rec.type as string),
      description: String(rec.description ?? `${rec.provider ?? ''} · ${rec.interests ?? ''}`).slice(0, 8000),
      gradeMin: null,
      gradeMax: null,
      interests: inferInterests(rec.interests as string, rec.tags as string),
      url,
      dedupeKey: (url ?? title).toLowerCase(),
      metadata: {
        source: 'snowday' as ScrapedSource,
        sourceId: rec.id,
        organization: rec.provider,
        category: rec.type,
        seasons: rec.seasons,
        tags: rec.tags,
        financialGrade: rec.financial_accessibility_grade,
        expertsRating: rec.experts_choice_rating,
        highlySelective: rec.is_highly_selective,
        locationType: rec.location_type,
        location: rec.location,
        deadline: rec.deadline_date,
        deadlineStatus: rec.deadline_status,
        logoUrl: rec.logo_url,
        websiteUrl: rec.url,
      },
    };
  });
}

export function normalizeExtracurricularHub(filePath: string): NormalizedOpportunity[] {
  const payload = readJson(filePath);
  if (!payload) return [];
  const rows =
    (payload.opportunities as Array<Record<string, unknown>>) ??
    (payload.items as Array<Record<string, unknown>>) ??
    [];
  return rows.map((rec) => {
    const url =
      (rec.application_url as string) || (rec.website_url as string) || (rec.url as string) || (rec.link as string) || null;
    const title = String(rec.name ?? rec.title ?? 'Untitled').slice(0, 240);
    return {
      title,
      type: mapCategoryToType(rec.category as string, rec.type as string),
      description: String(rec.description ?? rec.short_description ?? rec.summary ?? '').slice(0, 8000),
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
        location: rec.location,
        eligibility: rec.eligibility,
        websiteUrl: rec.website_url ?? rec.listing_url,
        tags: rec.tags ?? rec.keywords,
      },
    };
  });
}

export function loadScrapedOpportunities(outputDir = scraperOutputDir()) {
  const merged = [
    ...normalizeEcdatabase(path.join(outputDir, 'opportunities.json')),
    ...normalizeSnowday(path.join(outputDir, 'snowday-opportunities.json')),
    ...normalizeExtracurricularHub(path.join(outputDir, 'extracurricularhub-opportunities.json')),
  ];
  const deduped: NormalizedOpportunity[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    if (!item.title.trim() || seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    deduped.push(item);
  }
  return { merged: merged.length, items: deduped };
}
