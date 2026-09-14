import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationEventType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { NotificationPersonalizerService } from './notification-personalizer.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly personalizer: NotificationPersonalizerService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async diagnosticReminders() {
    if (!this.notifications.isEnabled()) return;
    const profiles = await this.prisma.studentProfile.findMany({
      where: {
        onboardingCompleted: true,
        diagnosticCompleted: false,
        user: { isActive: true, deletedAt: null },
      },
      select: { userId: true },
      take: 200,
    });
    for (const profile of profiles) {
      this.notifications.notify(
        profile.userId,
        NotificationEventType.DIAGNOSTIC_REMINDER,
        {},
        { dedupeKey: `diagnostic-reminder:${new Date().toISOString().slice(0, 10)}` },
      );
    }
    this.logger.log(`Queued ${profiles.length} diagnostic reminders`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async planDueReminders() {
    if (!this.notifications.isEnabled()) return;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const items = await this.prisma.activityPlanItem.findMany({
      where: {
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        OR: [
          { targetYear: currentYear, targetMonth: currentMonth },
          { targetYear: nextYear, targetMonth: nextMonth },
        ],
      },
      take: 300,
    });
    for (const item of items) {
      const dueLabel =
        item.targetMonth && item.targetYear
          ? new Date(item.targetYear, item.targetMonth - 1, 1).toLocaleDateString('en-IN', {
              month: 'long',
              year: 'numeric',
            })
          : 'this month';
      this.notifications.notify(
        item.userId,
        NotificationEventType.PLAN_ITEM_DUE,
        { itemTitle: item.title, dueLabel },
        { dedupeKey: `plan-due:${item.id}:${item.targetYear}-${item.targetMonth}` },
      );
    }
    this.logger.log(`Queued ${items.length} plan due reminders`);
  }

  @Cron('0 9 * * 1')
  async weeklyDigest() {
    if (!this.notifications.isEnabled()) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: 'STUDENT',
        lastLoginAt: { gte: since },
      },
      select: { id: true },
      take: 500,
    });
    const weekKey = new Date().toISOString().slice(0, 10);
    for (const user of users) {
      const ctx = await this.buildDigestContext(user.id);
      if (!ctx) continue;
      this.notifications.notify(
        user.id,
        NotificationEventType.WEEKLY_DIGEST,
        { digestBody: this.personalizer.buildDigestBody(ctx) },
        { dedupeKey: `weekly-digest:${weekKey}` },
      );
    }
    this.logger.log(`Queued ${users.length} weekly digests`);
  }

  private async buildDigestContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) return null;
    const [collegesSaved, activitiesSaved, tutoringAttempts, tutoringCorrect] =
      await Promise.all([
        this.prisma.collegeRecommendation.count({ where: { userId, isSaved: true } }),
        this.prisma.savedActivity.count({ where: { userId } }),
        this.prisma.tutoringAttempt.count({ where: { userId } }),
        this.prisma.tutoringAttempt.count({ where: { userId, isCorrect: true } }),
      ]);
    return {
      name: user.name,
      firstName: user.name.split(' ')[0] || user.name,
      email: user.email,
      diagnosticCompleted: user.profile?.diagnosticCompleted ?? false,
      collegesSaved,
      activitiesSaved,
      tutoringAttempts,
      tutoringAccuracy: tutoringAttempts
        ? Math.round((tutoringCorrect / tutoringAttempts) * 100)
        : 0,
    };
  }
}
