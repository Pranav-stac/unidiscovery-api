import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityPlanStatus, ActivityType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ActivitiesService } from '../../activities/services/activities.service';
import { daysUntilDeadline, opportunityDetails } from '../../activities/utils/opportunity-score.util';

@Injectable()
export class ActivityPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.activityPlanItem.findMany({
      where: { userId },
      include: { activity: true },
      orderBy: [{ targetYear: 'asc' }, { targetMonth: 'asc' }, { priority: 'desc' }],
    });
    return rows.map((row) => this.withDeadline(row));
  }

  async dashboard(userId: string) {
    const [items, competitions, suggested] = await Promise.all([
      this.list(userId),
      this.listCompetitions(),
      this.activitiesService.recommend(userId).catch(() => []),
    ]);
    const plannedIds = new Set(items.map((item) => item.activityId).filter(Boolean));
    const upcoming = items
      .filter((item) => item.status !== 'COMPLETED' && item.status !== 'SKIPPED')
      .filter((item) => item.daysUntilDeadline == null || item.daysUntilDeadline <= 45)
      .slice(0, 8);

    return {
      items,
      competitions,
      upcoming,
      suggested: suggested
        .filter((row: { activity: { id: string } }) => !plannedIds.has(row.activity.id))
        .slice(0, 6),
      stats: {
        planned: items.filter((item) => item.status === 'PLANNED').length,
        inProgress: items.filter((item) => item.status === 'IN_PROGRESS').length,
        completed: items.filter((item) => item.status === 'COMPLETED').length,
        dueSoon: upcoming.filter((item) => item.daysUntilDeadline != null && item.daysUntilDeadline <= 14).length,
      },
    };
  }

  async create(
    userId: string,
    data: {
      title: string;
      type: ActivityType;
      activityId?: string;
      targetMonth?: number;
      targetYear?: number;
      priority?: number;
      notes?: string;
      linkedCareer?: string;
    },
  ) {
    const row = await this.prisma.activityPlanItem.create({
      data: { userId, ...data },
      include: { activity: true },
    });
    return this.withDeadline(row);
  }

  async update(
    userId: string,
    id: string,
    data: Partial<{
      title: string;
      status: ActivityPlanStatus;
      targetMonth: number;
      targetYear: number;
      priority: number;
      notes: string;
    }>,
  ) {
    const item = await this.prisma.activityPlanItem.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Plan item not found');
    const row = await this.prisma.activityPlanItem.update({
      where: { id },
      data,
      include: { activity: true },
    });
    return this.withDeadline(row);
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.activityPlanItem.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Plan item not found');
    await this.prisma.activityPlanItem.delete({ where: { id } });
    return { deleted: true };
  }

  async listCompetitions() {
    return this.prisma.competition.findMany({
      where: { isActive: true },
      orderBy: { deadline: 'asc' },
    });
  }

  async addFromActivity(userId: string, activityId: string) {
    const existing = await this.prisma.activityPlanItem.findFirst({
      where: { userId, activityId },
    });
    if (existing) {
      return this.prisma.activityPlanItem.findFirstOrThrow({
        where: { id: existing.id },
        include: { activity: true },
      }).then((row) => this.withDeadline(row));
    }

    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');
    const details = opportunityDetails(activity.metadata);
    const deadline = details.deadline ? new Date(details.deadline) : null;
    const validDeadline = deadline && !Number.isNaN(deadline.getTime()) ? deadline : new Date();
    return this.create(userId, {
      title: activity.title,
      type: activity.type,
      activityId: activity.id,
      targetMonth: validDeadline.getMonth() + 1,
      targetYear: validDeadline.getFullYear(),
      notes: activity.description ?? undefined,
    });
  }

  private withDeadline<T extends { activity?: { metadata?: unknown } | null; targetMonth?: number | null; targetYear?: number | null }>(
    row: T,
  ) {
    const fromActivity = row.activity ? daysUntilDeadline(row.activity.metadata) : null;
    let fromPlan: number | null = null;
    if (row.targetYear && row.targetMonth) {
      const date = new Date(row.targetYear, row.targetMonth - 1, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      fromPlan = Math.round((date.getTime() - today.getTime()) / 86400000);
    }
    return {
      ...row,
      daysUntilDeadline: fromActivity ?? fromPlan,
    };
  }
}
