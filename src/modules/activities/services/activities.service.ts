import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, NotificationEventType, type Activity, type StudentProfile } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { isDeadlineOpen } from '../utils/activity-deadline.util';
import { sanitizeActivity } from '../utils/activity-response.util';
import {
  opportunityDetails,
  presentActivity,
  scoreOpportunity,
  type OpportunityMatch,
} from '../utils/opportunity-score.util';
import { NotificationsService } from '../../notifications/services/notifications.service';

type ActivityChatPlan = {
  intent: 'answer' | 'search' | 'save' | 'plan';
  answer: string;
  search?: { query?: string; type?: string };
  activityTitle?: string;
};

export interface ActivityChatOptions {
  tab?: string;
  search?: string;
  type?: string;
  focusActivityId?: string;
  focusActivityTitle?: string;
}

const LIST_CACHE_TTL = 180;
const DETAIL_CACHE_TTL = 600;
const FILTER_CACHE_TTL = 3600;
const RECOMMEND_CACHE_TTL = 180;

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
  relevantOnly?: boolean;
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
    private readonly cacheService: CacheService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string | undefined, options: ActivityListOptions) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(Math.max(1, options.limit ?? 24), 48);
    const cacheKey = `activities:list:${userId ?? 'anon'}:${JSON.stringify(options)}`;
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const profile = userId ? await this.profileContext.getProfileOrThrow(userId) : null;
    const grade = options.grade ?? (profile?.grade && profile.grade >= 6 && profile.grade <= 12 ? profile.grade : undefined);
    const where = this.buildListWhere({ ...options, grade });

    const rows = (
      await this.prisma.activity.findMany({
        where,
        take: 400,
        orderBy: { updatedAt: 'desc' },
      })
    ).filter((row) => isDeadlineOpen(row.metadata) && this.matchesMetadataFilters(row, options));

    const ranked = this.rank(rows, profile, options.relevantOnly !== false && !options.search);
    const start = (page - 1) * limit;
    const items = ranked.slice(start, start + limit).map(({ activity, match }) => ({
      ...sanitizeActivity(activity),
      ...presentActivity(activity, match),
    }));

    const result = {
      items,
      total: ranked.length,
      page,
      limit,
      hasMore: ranked.length > start + limit,
    };
    await this.cacheService.set(cacheKey, result, LIST_CACHE_TTL);
    return result;
  }

  async getFilterOptions() {
    const cacheKey = 'activities:filters';
    const cached = await this.cacheService.get<{
      countries: string[];
      formats: string[];
      costs: string[];
      categories: string[];
      levels: string[];
    }>(cacheKey);
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

  async recommend(userId: string) {
    const cacheKey = `activities:recommend:${userId}`;
    const cached = await this.cacheService.get<Array<{
      activity: Record<string, unknown>;
      score: number;
      reasons: string[];
      tip: string;
    }>>(cacheKey);
    if (cached) return cached;

    const profile = await this.profileContext.getProfileOrThrow(userId);
    const grade = profile.grade && profile.grade >= 6 && profile.grade <= 12 ? profile.grade : undefined;
    const rows = (
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
    ).filter((row) => isDeadlineOpen(row.metadata));

    const picks = this.rank(rows, profile, true).slice(0, 12);
    const result = picks.map(({ activity, match }) => ({
      activity: { ...sanitizeActivity(activity), ...presentActivity(activity, match) },
      score: match.score,
      reasons: match.reasons,
      tip: match.reasons[0] ?? 'A strong next step for your profile.',
    }));
    await this.cacheService.set(cacheKey, result, RECOMMEND_CACHE_TTL);
    return result;
  }

  async getById(id: string, userId?: string) {
    const cacheKey = `activities:detail:${id}:${userId ?? 'anon'}`;
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const activity = await this.prisma.activity.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    if (!isDeadlineOpen(activity.metadata)) throw new NotFoundException('Activity not found');

    const profile = userId ? await this.profileContext.getProfileOrThrow(userId) : null;
    const match = profile ? scoreOpportunity(activity, profile) : undefined;
    const result = {
      ...sanitizeActivity(activity),
      ...presentActivity(activity, match),
    };
    await this.cacheService.set(cacheKey, result, DETAIL_CACHE_TTL);
    return result;
  }

  async getOverview(userId: string, activityId: string) {
    const [profile, activity] = await Promise.all([
      this.profileContext.getProfileOrThrow(userId),
      this.getById(activityId, userId),
    ]);
    const match = scoreOpportunity(activity as Activity, profile);
    const details = (activity as { details?: { organization?: string; deadline?: string } }).details;
    const overview = await this.geminiService.generateText(
      `Write a personalized opportunity overview (3 short paragraphs, plain text):
1) What "${activity.title}" is and who runs it (${details?.organization ?? 'the organiser'}).
2) Why it may fit this student (fit ${match.score}/100). Reasons: ${match.reasons.join('; ')}.
3) Concrete next steps, including deadline (${details?.deadline ?? 'not specified'}).
Type: ${activity.type}
Description: ${activity.description ?? 'No description'}
Student: ${this.profileContext.buildContextText(profile)}`,
    );
    return {
      score: match.score,
      gradeEligible: match.eligible,
      reasons: match.reasons,
      overview,
      tip: match.reasons[0] ?? 'Start the application checklist this week.',
    };
  }

  async save(userId: string, activityId: string, notes?: string) {
    const activity = await this.getById(activityId, userId);
    await this.cacheService.del(`activities:recommend:${userId}`);
    const saved = await this.prisma.savedActivity.upsert({
      where: { userId_activityId: { userId, activityId } },
      update: { notes },
      create: { userId, activityId, notes },
    });
    this.notifications.notify(
      userId,
      NotificationEventType.ACTIVITY_SAVED,
      { activityId, activityTitle: activity.title },
      { dedupeKey: `activity-saved:${activityId}` },
    );
    return saved;
  }

  async unsave(userId: string, activityId: string) {
    await this.prisma.savedActivity.deleteMany({ where: { userId, activityId } });
    return { deleted: true };
  }

  async saved(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const rows = await this.prisma.savedActivity.findMany({
      where: { userId },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((row) => isDeadlineOpen(row.activity.metadata))
      .map((row) => {
        const match = scoreOpportunity(row.activity, profile);
        return {
          ...row,
          activity: { ...sanitizeActivity(row.activity), ...presentActivity(row.activity, match) },
        };
      });
  }

  private rank(rows: Activity[], profile: StudentProfile | null, relevantOnly: boolean) {
    const scored = rows.map((activity) => ({
      activity,
      match: profile
        ? scoreOpportunity(activity, profile)
        : ({ score: 50, eligible: true, reasons: [] } as OpportunityMatch),
    }));
    return scored
      .filter((item) => item.match.eligible && (!relevantOnly || !profile || item.match.score >= 28))
      .sort((a, b) => b.match.score - a.match.score || a.activity.title.localeCompare(b.activity.title));
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

  private matchesMetadataFilters(activity: { metadata: unknown }, options: ActivityListOptions) {
    const meta = (activity.metadata ?? {}) as Record<string, unknown>;
    if (options.country && String(meta.country ?? '') !== options.country) return false;
    if (options.format && !String(meta.format ?? '').toLowerCase().includes(options.format.toLowerCase())) {
      return false;
    }
    if (options.cost && !String(meta.cost ?? '').toLowerCase().includes(options.cost.toLowerCase())) {
      return false;
    }
    if (options.category) {
      const category = String(meta.category ?? '').replace(/_/g, ' ').toLowerCase();
      if (category !== options.category.toLowerCase()) return false;
    }
    if (options.highlySelective && !meta.highlySelective) return false;
    return true;
  }

  async chat(userId: string, message: string, options: ActivityChatOptions = {}) {
    const ctx = await this.loadChatContext(userId, options, message);
    return this.executeChatPlan(userId, ctx);
  }

  async streamChatToResponse(
    userId: string,
    message: string,
    options: ActivityChatOptions,
    res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      const ctx = await this.loadChatContext(userId, options, message);
      const plan = await this.planChatMessage(message, ctx);

      if (plan.intent === 'search') {
        const ack = plan.answer.trim() || 'Searching for opportunities that match…';
        this.writeSse(res, { chunk: `${ack}\n\n` });
      }

      const result = await this.executeChatPlan(userId, ctx, plan);
      const answer = result.answer ?? '';
      for (const part of answer.match(/\S+\s*/g) ?? [answer]) {
        this.writeSse(res, { chunk: part });
      }
      this.writeSse(res, { done: true, ...result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Stream failed';
      this.writeSse(res, { error: msg });
    } finally {
      res.end();
    }
  }

  private writeSse(res: Response, payload: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  private async loadChatContext(
    userId: string,
    options: ActivityChatOptions,
    message?: string,
  ) {
    const [profile, recommended, savedRows] = await Promise.all([
      this.profileContext.getProfileOrThrow(userId),
      this.recommend(userId).catch(() => []),
      this.saved(userId).catch(() => []),
    ]);

    const focusActivity = options.focusActivityId
      ? await this.getById(options.focusActivityId, userId).catch(() => null)
      : null;

    const recommendations = recommended.slice(0, 12).map((row) => ({
      id: String(row.activity.id),
      title: String(row.activity.title),
      type: row.activity.type,
      score: row.score,
      reasons: row.reasons,
      organization: (row.activity as { details?: { organization?: string } }).details?.organization,
      deadline: (row.activity as { details?: { deadline?: string } }).details?.deadline,
    }));

    const saved = savedRows.slice(0, 12).map((row) => ({
      id: String(row.activity.id),
      title: String(row.activity.title),
      type: row.activity.type,
      organization: (row.activity as { details?: { organization?: string } }).details?.organization,
      deadline: (row.activity as { details?: { deadline?: string } }).details?.deadline,
    }));

    return {
      options,
      message,
      profile,
      recommendations,
      saved,
      focusActivity,
      focusTitle: options.focusActivityTitle ?? focusActivity?.title,
    };
  }

  private formatActivityForAi(activity: Record<string, unknown>) {
    const details = (activity.details ?? {}) as Record<string, unknown>;
    return {
      id: activity.id,
      title: activity.title,
      type: activity.type,
      description: activity.description,
      matchScore: activity.matchScore,
      organization: details.organization,
      deadline: details.deadline,
      location: details.location ?? details.country,
      cost: details.cost,
      format: details.format,
      requirements: details.eligibility,
      matchReasons: activity.matchReasons,
    };
  }

  private async planChatMessage(
    message: string,
    ctx: Awaited<ReturnType<ActivitiesService['loadChatContext']>>,
  ): Promise<ActivityChatPlan> {
    return this.geminiService.generateStructured<ActivityChatPlan>({
      systemPrompt: `You are the student's opportunities assistant with full context about their profile, recommendations, saved list, and current page filters.

Choose exactly one intent:
- answer: Questions about fit, deadlines, requirements, comparisons, or advice using context below. Never invent facts not in context.
- search: Student wants NEW opportunities found (competitions, internships, programs, projects). Set search.query and optional search.type (COMPETITION, INTERNSHIP, SUMMER_PROGRAM, PROJECT, etc.).
- save: Student wants to bookmark a named opportunity from recommendations or saved list.
- plan: Student wants to add a named opportunity to their activity planner.

Write answer in JSON:
- answer: concise reply, max 90 words.
- For search: short acknowledgment line.
- For save/plan: brief confirmation; include activityTitle when saving/planning a specific one.`,
      userPrompt: JSON.stringify({
        message,
        focusActivity: ctx.focusActivity
          ? this.formatActivityForAi(ctx.focusActivity as Record<string, unknown>)
          : ctx.focusTitle,
        student: this.profileContext.buildContextText(ctx.profile),
        recommendations: ctx.recommendations,
        saved: ctx.saved,
        ui: {
          tab: ctx.options.tab,
          search: ctx.options.search,
          typeFilter: ctx.options.type,
        },
      }),
      schemaDescription:
        '{ intent: "answer"|"search"|"save"|"plan", answer: string, search?: { query?: string, type?: string }, activityTitle?: string }',
      fallback: {
        intent: 'answer',
        answer:
          'I can help you find opportunities, explain fit, save listings, or add them to your planner — what would you like?',
      },
    });
  }

  private async executeChatPlan(
    userId: string,
    ctx: Awaited<ReturnType<ActivitiesService['loadChatContext']>>,
    plan?: ActivityChatPlan,
  ) {
    const resolved =
      plan ?? (await this.planChatMessage(ctx.message ?? '', ctx));

    if (resolved.intent === 'search') {
      const query = resolved.search?.query?.trim() || ctx.options.search?.trim() || '';
      const type = this.parseActivityType(
        resolved.search?.type || ctx.options.type,
      );
      const page = await this.list(userId, {
        search: query || undefined,
        type,
        relevantOnly: !query,
        limit: 8,
        page: 1,
      });
      const items = (page.items as Array<Record<string, unknown>>) ?? [];
      return {
        intent: 'search' as const,
        answer:
          resolved.answer ||
          (items.length
            ? `Found ${items.length} opportunities that may fit.`
            : 'No strong matches yet — try a different keyword or type.'),
        results: items,
      };
    }

    if (
      (resolved.intent === 'save' || resolved.intent === 'plan') &&
      resolved.activityTitle
    ) {
      const target = resolved.activityTitle.trim().toLowerCase();
      const match =
        ctx.recommendations.find((item) =>
          item.title.toLowerCase().includes(target),
        ) ??
        ctx.saved.find((item) => item.title.toLowerCase().includes(target));
      if (match) {
        if (resolved.intent === 'save') {
          await this.save(userId, match.id);
        } else {
          await this.addToPlanner(userId, match.id);
        }
        return {
          intent: resolved.intent,
          answer:
            resolved.answer ||
            (resolved.intent === 'save'
              ? `Saved ${match.title}.`
              : `Added ${match.title} to your planner.`),
          activityId: match.id,
        };
      }
    }

    if (ctx.focusActivity) {
      const focus = this.formatActivityForAi(
        ctx.focusActivity as Record<string, unknown>,
      );
      return {
        intent: 'answer' as const,
        answer:
          resolved.answer.trim() ||
          `Check the official listing for the latest deadline and requirements for ${focus.title}.`,
        sources: [{ title: focus.title, id: focus.id }],
      };
    }

    return {
      intent: 'answer' as const,
      answer:
        resolved.answer.trim() ||
        'Ask me to search for opportunities, compare fit, save one, or add it to your planner.',
    };
  }

  private parseActivityType(value?: string) {
    if (!value?.trim()) return undefined;
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
    const allowed = new Set(Object.values(ActivityType));
    return allowed.has(normalized as ActivityType)
      ? (normalized as ActivityType)
      : undefined;
  }

  private async addToPlanner(userId: string, activityId: string) {
    const existing = await this.prisma.activityPlanItem.findFirst({
      where: { userId, activityId },
    });
    if (existing) return existing;

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    const details = opportunityDetails(activity.metadata);
    const deadline = details.deadline ? new Date(details.deadline) : null;
    const validDeadline =
      deadline && !Number.isNaN(deadline.getTime()) ? deadline : new Date();
    return this.prisma.activityPlanItem.create({
      data: {
        userId,
        title: activity.title,
        type: activity.type,
        activityId: activity.id,
        targetMonth: validDeadline.getMonth() + 1,
        targetYear: validDeadline.getFullYear(),
        notes: activity.description ?? undefined,
      },
    });
  }
}
