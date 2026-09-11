import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { isDeadlineOpen } from '../utils/activity-deadline.util';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async list(options: {
    type?: ActivityType;
    grade?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
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
      collected.push(...batch.filter((a) => isDeadlineOpen(a.metadata)));
      dbSkip += batch.length;
      if (batch.length < batchSize) break;
    }

    const start = (page - 1) * limit;
    const items = collected.slice(start, start + limit);

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
        hasMore = probe.some((a) => isDeadlineOpen(a.metadata));
        probeSkip += probe.length;
        if (probe.length < batchSize) break;
      }
    }

    const total = await this.countOpenActivities(where);

    return {
      items,
      total,
      page,
      limit,
      hasMore,
    };
  }

  private buildListWhere(options: {
    type?: ActivityType;
    grade?: number;
    search?: string;
  }) {
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

  private async countOpenActivities(
    where: ReturnType<ActivitiesService['buildListWhere']>,
  ) {
    const rows = await this.prisma.activity.findMany({
      where,
      select: { metadata: true },
    });
    return rows.filter((r) => isDeadlineOpen(r.metadata)).length;
  }

  async recommend(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const grade =
      profile.grade && profile.grade >= 6 && profile.grade <= 12 ? profile.grade : undefined;

    const activities = (
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
    ).filter((a) => isDeadlineOpen(a.metadata));

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

    return withTips;
  }

  async getById(id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    if (!isDeadlineOpen(activity.metadata)) {
      throw new NotFoundException('Activity not found');
    }
    return activity;
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
    return rows.filter((row) => isDeadlineOpen(row.activity.metadata));
  }
}
