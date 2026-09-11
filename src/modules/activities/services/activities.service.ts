import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { isDeadlineOpen } from '../utils/activity-deadline.util';
import { sanitizeActivities, sanitizeActivity } from '../utils/activity-response.util';

const LIST_CACHE_TTL = 300;
const DETAIL_CACHE_TTL = 600;
const FILTER_CACHE_TTL = 3600;
const RECOMMEND_CACHE_TTL = 300;

export interface ActivitiesListResult {
  items: Awaited<ReturnType<typeof sanitizeActivities>>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ActivityRecommendationResult {
  activity: ReturnType<typeof sanitizeActivity>;
  score: number;
  tip: string;
}

export interface ActivityFilterOptionsResult {
  countries: string[];
  formats: string[];
  costs: string[];
  categories: string[];
  levels: string[];
}

export interface ActivityListOptions {
  type?: ActivityType;
  grade?: number;
  search?: string;
  country?: string;
  format?: string;
  cost?: string;
  category?: string;
  highlySelective?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
    private readonly cacheService: CacheService,
  ) {}

  async list(options: ActivityListOptions): Promise<ActivitiesListResult> {
    const cacheKey = `activities:list:${JSON.stringify(options)}`;
    const cached = await this.cacheService.get<ActivitiesListResult>(cacheKey);
    if (cached) return cached;

    const where = this.buildListWhere(options);

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(Math.max(1, options.limit ?? 24), 48);
    const needed = page * limit;
    const collected: Awaited<ReturnType<typeof this.prisma.activity.findMany>> = [];
    let dbSkip = 0;
    const batchSize = 100;

    while (collected.length < needed) {
      const batch = await this.prisma.activity.findMany({
        where,
        orderBy: [{ type: 'asc' }, { title: 'asc' }],
        skip: dbSkip,
        take: batchSize,
      });
      if (!batch.length) break;
      collected.push(
        ...batch.filter(
          (a) => isDeadlineOpen(a.metadata) && this.matchesMetadataFilters(a, options),
        ),
      );
      dbSkip += batch.length;
      if (batch.length < batchSize) break;
    }

    const start = (page - 1) * limit;
    const items = sanitizeActivities(collected.slice(start, start + limit));

    let hasMore = collected.length > start + limit;
    if (!hasMore && dbSkip > 0) {
      let probeSkip = dbSkip;
      while (!hasMore) {
        const probe = await this.prisma.activity.findMany({
          where,
          orderBy: [{ type: 'asc' }, { title: 'asc' }],
          skip: probeSkip,
          take: batchSize,
        });
        if (!probe.length) break;
        hasMore = probe.some(
          (a) => isDeadlineOpen(a.metadata) && this.matchesMetadataFilters(a, options),
        );
        probeSkip += probe.length;
        if (probe.length < batchSize) break;
      }
    }

    const total = await this.countOpenActivities(where, options);

    const result = {
      items,
      total,
      page,
      limit,
      hasMore,
    };

    await this.cacheService.set(cacheKey, result, LIST_CACHE_TTL);
    return result;
  }

  async getFilterOptions(): Promise<ActivityFilterOptionsResult> {
    const cacheKey = 'activities:filters';
    const cached = await this.cacheService.get<ActivityFilterOptionsResult>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.activity.findMany({
      where: { isActive: true, deletedAt: null },
      select: { metadata: true },
      take: 3000,
    });

    const countries = new Set<string>();
    const formats = new Set<string>();
    const costs = new Set<string>();
    const categories = new Set<string>();
    const levels = new Set<string>();

    for (const row of rows) {
      if (!isDeadlineOpen(row.metadata)) continue;
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      if (typeof meta.country === 'string' && meta.country.trim()) countries.add(meta.country.trim());
      if (typeof meta.format === 'string' && meta.format.trim()) formats.add(meta.format.trim());
      if (typeof meta.cost === 'string' && meta.cost.trim()) costs.add(meta.cost.trim());
      if (typeof meta.category === 'string' && meta.category.trim()) {
        categories.add(meta.category.trim().replace(/_/g, ' '));
      }
      if (typeof meta.level === 'string' && meta.level.trim()) levels.add(meta.level.trim());
    }

    const sortAlpha = (a: string, b: string) => a.localeCompare(b);
    const result = {
      countries: [...countries].sort(sortAlpha),
      formats: [...formats].sort(sortAlpha),
      costs: [...costs].sort(sortAlpha),
      categories: [...categories].sort(sortAlpha),
      levels: [...levels].sort(sortAlpha),
    };

    await this.cacheService.set(cacheKey, result, FILTER_CACHE_TTL);
    return result;
  }

  private buildListWhere(options: Pick<ActivityListOptions, 'type' | 'grade' | 'search'>) {
    const search = options.search?.trim();
    return {
      isActive: true,
      deletedAt: null,
      ...(options.type ? { type: options.type } : {}),
      ...(options.grade
        ? {
            AND: [
              { OR: [{ gradeMin: null }, { gradeMin: { lte: options.grade } }] },
              { OR: [{ gradeMax: null }, { gradeMax: { gte: options.grade } }] },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  private matchesMetadataFilters(
    activity: { metadata: unknown },
    options: ActivityListOptions,
  ): boolean {
    const meta = (activity.metadata ?? {}) as Record<string, unknown>;

    if (options.country && String(meta.country ?? '') !== options.country) return false;

    if (options.format) {
      const format = String(meta.format ?? '').toLowerCase();
      if (!format.includes(options.format.toLowerCase())) return false;
    }

    if (options.cost) {
      const cost = String(meta.cost ?? '').toLowerCase();
      if (!cost.includes(options.cost.toLowerCase())) return false;
    }

    if (options.category) {
      const category = String(meta.category ?? '')
        .replace(/_/g, ' ')
        .toLowerCase();
      if (category !== options.category.toLowerCase()) return false;
    }

    if (options.highlySelective && !meta.highlySelective) return false;

    return true;
  }

  private async countOpenActivities(
    where: ReturnType<ActivitiesService['buildListWhere']>,
    options: ActivityListOptions,
  ) {
    const rows = await this.prisma.activity.findMany({
      where,
      select: { metadata: true },
    });
    return rows.filter(
      (r) => isDeadlineOpen(r.metadata) && this.matchesMetadataFilters(r, options),
    ).length;
  }

  async recommend(userId: string): Promise<ActivityRecommendationResult[]> {
    const cacheKey = `activities:recommend:${userId}`;
    const cached = await this.cacheService.get<ActivityRecommendationResult[]>(cacheKey);
    if (cached) return cached;

    const profile = await this.profileContext.getProfileOrThrow(userId);
    const grade =
      profile.grade && profile.grade >= 6 && profile.grade <= 12 ? profile.grade : undefined;

    const activities = sanitizeActivities(
      (
        await this.prisma.activity.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            ...(grade
              ? {
                  AND: [
                    { OR: [{ gradeMin: null }, { gradeMin: { lte: grade } }] },
                    { OR: [{ gradeMax: null }, { gradeMax: { gte: grade } }] },
                  ],
                }
              : {}),
          },
          take: 400,
          orderBy: { updatedAt: 'desc' },
        })
      ).filter((a) => isDeadlineOpen(a.metadata)),
    );

    const scored = activities
      .map((activity) => ({
        activity,
        score: this.profileContext.scoreByInterests(
          activity.interests,
          profile.interests,
          profile.strengths,
          profile.subjects,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const withTips = await Promise.all(
      scored.map(async ({ activity, score }) => {
        const tip = await this.geminiService.generateText(
          `One actionable tip (max 20 words) for this student to pursue "${activity.title}". Profile: ${this.profileContext.buildContextText(profile)}`,
        );
        return { activity, score, tip };
      }),
    );

    await this.cacheService.set(cacheKey, withTips, RECOMMEND_CACHE_TTL);
    return withTips;
  }

  async getById(id: string): Promise<ReturnType<typeof sanitizeActivity>> {
    const cacheKey = `activities:detail:${id}`;
    const cached = await this.cacheService.get<ReturnType<typeof sanitizeActivity>>(cacheKey);
    if (cached) return cached;

    const activity = await this.prisma.activity.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    if (!isDeadlineOpen(activity.metadata)) {
      throw new NotFoundException('Activity not found');
    }

    const sanitized = sanitizeActivity(activity);
    await this.cacheService.set(cacheKey, sanitized, DETAIL_CACHE_TTL);
    return sanitized;
  }

  async getOverview(userId: string, activityId: string) {
    const [profile, activity] = await Promise.all([
      this.profileContext.getProfileOrThrow(userId),
      this.getById(activityId),
    ]);

    const grade =
      profile.grade && profile.grade >= 6 && profile.grade <= 12 ? profile.grade : undefined;
    const gradeEligible =
      !grade ||
      ((!activity.gradeMin || activity.gradeMin <= grade) &&
        (!activity.gradeMax || activity.gradeMax >= grade));

    const score = this.profileContext.scoreByInterests(
      activity.interests,
      profile.interests,
      profile.strengths,
      profile.subjects,
    );

    const meta = (activity.metadata ?? {}) as Record<string, unknown>;
    const deadline = meta.deadline ? String(meta.deadline) : 'Not specified';
    const organization = meta.organization ? String(meta.organization) : 'Unknown';

    const overview = await this.geminiService.generateText(
      `Write a personalized opportunity overview for a student (3 short paragraphs, plain text, no markdown headers):
1) What "${activity.title}" is and who runs it (${organization}).
2) Why it may fit this student (interest fit score ${score}/100${gradeEligible ? '' : ' — note grade eligibility concern'}).
3) Concrete next steps to prepare or apply, including deadline timing (${deadline}).

Opportunity type: ${activity.type}
Description: ${activity.description ?? 'No description'}
Interests/tags: ${activity.interests.join(', ') || 'general'}
Grade range: ${activity.gradeMin ?? 'any'}–${activity.gradeMax ?? 'any'}
Student profile: ${this.profileContext.buildContextText(profile)}
Be specific, encouraging, and actionable.`,
    );

    const tip = await this.geminiService.generateText(
      `One actionable tip (max 20 words) for this student to pursue "${activity.title}". Profile: ${this.profileContext.buildContextText(profile)}`,
    );

    return { score, gradeEligible, overview, tip };
  }

  async save(userId: string, activityId: string, notes?: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');

    await this.cacheService.del(`activities:recommend:${userId}`);

    return this.prisma.savedActivity.upsert({
      where: { userId_activityId: { userId, activityId } },
      update: { notes },
      create: { userId, activityId, notes },
    });
  }

  async saved(userId: string) {
    const rows = await this.prisma.savedActivity.findMany({
      where: { userId },
      include: { activity: true },
    });
    return rows
      .filter((row) => isDeadlineOpen(row.activity.metadata))
      .map((row) => ({
        ...row,
        activity: sanitizeActivity(row.activity),
      }));
  }
}
