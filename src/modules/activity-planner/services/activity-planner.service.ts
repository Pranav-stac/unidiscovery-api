import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityPlanStatus, ActivityType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class ActivityPlannerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.activityPlanItem.findMany({
      where: { userId },
      include: { activity: true },
      orderBy: [
        { targetYear: 'asc' },
        { targetMonth: 'asc' },
        { priority: 'desc' },
      ],
    });
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
    return this.prisma.activityPlanItem.create({
      data: { userId, ...data },
      include: { activity: true },
    });
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
    const item = await this.prisma.activityPlanItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Plan item not found');
    return this.prisma.activityPlanItem.update({
      where: { id },
      data,
      include: { activity: true },
    });
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.activityPlanItem.findFirst({
      where: { id, userId },
    });
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
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    const now = new Date();
    return this.create(userId, {
      title: activity.title,
      type: activity.type,
      activityId: activity.id,
      targetMonth: now.getMonth() + 1,
      targetYear: now.getFullYear(),
      notes: activity.description ?? undefined,
    });
  }
}
