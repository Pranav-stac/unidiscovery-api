import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async list(type?: ActivityType, grade?: number) {
    return this.prisma.activity.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(type ? { type } : {}),
        ...(grade
          ? {
              AND: [
                { OR: [{ gradeMin: null }, { gradeMin: { lte: grade } }] },
                { OR: [{ gradeMax: null }, { gradeMax: { gte: grade } }] },
              ],
            }
          : {}),
      },
      orderBy: { title: 'asc' },
    });
  }

  async recommend(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const activities = await this.prisma.activity.findMany({
      where: { isActive: true, deletedAt: null },
    });

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
    return this.prisma.savedActivity.findMany({
      where: { userId },
      include: { activity: true },
    });
  }
}
