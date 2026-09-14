import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CATEGORY_PREF_FIELD,
  EVENT_CATEGORY,
  type NotifyPayload,
} from '../constants/notification-events';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPersonalizerService } from './notification-personalizer.service';
import { NotificationPushService } from './notification-push.service';
import type { UpdateNotificationPreferencesDto } from '../dto/notifications.dto';
import type { Response } from 'express';

const UNREAD_COUNT_CACHE_TTL = 30;
const STREAM_HEARTBEAT_MS = 45_000;

export type NotifyOptions = {
  dedupeKey?: string;
  skipEmail?: boolean;
  skipPush?: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly streamClients = new Map<string, Set<Response>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly personalizer: NotificationPersonalizerService,
    private readonly emailService: NotificationEmailService,
    private readonly pushService: NotificationPushService,
    private readonly cacheService: CacheService,
  ) {}

  private async invalidateUnreadCache(userId: string) {
    await this.cacheService.del(`notifications:unread:${userId}`);
  }

  private publishToUser(userId: string, payload: Record<string, unknown>) {
    const clients = this.streamClients.get(userId);
    if (!clients?.size) return;
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) {
      try {
        res.write(data);
      } catch {
        clients.delete(res);
      }
    }
  }

  private async publishUnreadUpdate(userId: string) {
    const { count } = await this.getUnreadCount(userId);
    this.publishToUser(userId, { type: 'count', count });
  }

  async streamToResponse(userId: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clients = this.streamClients.get(userId);
    if (!clients) {
      clients = new Set();
      this.streamClients.set(userId, clients);
    }
    clients.add(res);

    const { count } = await this.getUnreadCount(userId);
    res.write(`data: ${JSON.stringify({ type: 'count', count })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        clients?.delete(res);
      }
    }, STREAM_HEARTBEAT_MS);

    res.on('close', () => {
      clearInterval(heartbeat);
      clients?.delete(res);
      if (clients && !clients.size) this.streamClients.delete(userId);
    });
  }

  isEnabled() {
    return this.configService.get<boolean>('notifications.enabled', true);
  }

  /** Fire-and-forget personalized notification across in-app, email, and push. */
  notify(
    userId: string,
    eventType: NotificationEventType,
    payload: NotifyPayload = {},
    options: NotifyOptions = {},
  ) {
    if (!this.isEnabled()) return;
    void this.dispatch(userId, eventType, payload, options).catch((error) => {
      this.logger.error(`Notification dispatch failed for ${userId}/${eventType}`, error);
    });
  }

  async dispatch(
    userId: string,
    eventType: NotificationEventType,
    payload: NotifyPayload = {},
    options: NotifyOptions = {},
  ) {
    if (!this.isEnabled()) return null;

    if (options.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { userId_dedupeKey: { userId, dedupeKey: options.dedupeKey } },
      });
      if (existing) return existing;
    }

    const context = await this.buildUserContext(userId);
    if (!context) return null;

    const category = EVENT_CATEGORY[eventType];
    const prefs = await this.getOrCreatePreferences(userId);
    const prefField = CATEGORY_PREF_FIELD[category];
    if (prefField && prefs[prefField] === false) return null;
    if (eventType === NotificationEventType.WEEKLY_DIGEST && !prefs.weeklyDigest) return null;

    if (this.inQuietHours(prefs)) {
      if (eventType !== NotificationEventType.WEEKLY_DIGEST) return null;
    }

    const message = this.personalizer.personalize(eventType, context, payload);

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        eventType,
        category,
        title: message.title,
        body: message.body,
        actionUrl: message.actionUrl,
        metadata: payload as Prisma.InputJsonValue,
        dedupeKey: options.dedupeKey,
      },
    });
    void this.invalidateUnreadCache(userId);

    const deliveries: Array<{
      channel: NotificationChannel;
      recipient?: string;
    }> = [];

    if (prefs.inAppEnabled) {
      deliveries.push({ channel: NotificationChannel.IN_APP });
    }
    if (prefs.emailEnabled && !options.skipEmail && context.email) {
      deliveries.push({ channel: NotificationChannel.EMAIL, recipient: context.email });
    }
    if (prefs.pushEnabled && !options.skipPush) {
      deliveries.push({ channel: NotificationChannel.PUSH });
    }

    for (const item of deliveries) {
      const delivery = await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: item.channel,
          status: NotificationDeliveryStatus.PENDING,
          recipient: item.recipient,
        },
      });

      try {
        if (item.channel === NotificationChannel.IN_APP) {
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: NotificationDeliveryStatus.SENT,
              sentAt: new Date(),
            },
          });
          continue;
        }

        if (item.channel === NotificationChannel.EMAIL) {
          const result = await this.emailService.send({
            to: context.email,
            subject: message.emailSubject ?? message.title,
            html: message.emailHtml ?? `<p>${message.body}</p>`,
          });
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: NotificationDeliveryStatus.SENT,
              sentAt: new Date(),
              providerId: result.messageId,
            },
          });
          continue;
        }

        if (item.channel === NotificationChannel.PUSH) {
          const tokens = await this.prisma.deviceToken.findMany({
            where: { userId },
            select: { token: true },
          });
          if (!tokens.length) {
            await this.prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: {
                status: NotificationDeliveryStatus.SKIPPED,
                error: 'No device tokens registered',
              },
            });
            continue;
          }
          const push = await this.pushService.sendToTokens(
            tokens.map((row) => row.token),
            {
              title: message.title,
              body: message.body,
              actionUrl: message.actionUrl,
            },
          );
          if (push.invalidTokens.length) {
            await this.prisma.deviceToken.deleteMany({
              where: { userId, token: { in: push.invalidTokens } },
            });
          }
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: push.sent > 0 ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED,
              sentAt: push.sent > 0 ? new Date() : undefined,
              error: push.failed > 0 ? `${push.failed} push failures` : undefined,
            },
          });
        }
      } catch (error) {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            error: error instanceof Error ? error.message : 'Delivery failed',
          },
        });
      }
    }

    return notification;
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: 'WEB' | 'ANDROID' | 'IOS' = 'WEB',
    userAgent?: string,
  ) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { lastSeenAt: new Date(), userAgent, platform },
      create: { userId, token, platform, userAgent },
    });
  }

  async removeDevice(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
    return { deleted: true };
  }

  async getPreferences(userId: string) {
    return this.getOrCreatePreferences(userId);
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    await this.getOrCreatePreferences(userId);
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: dto,
    });
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * safeLimit;
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          deliveries: {
            select: { channel: true, status: true, sentAt: true },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      items,
      unread,
      meta: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) || 1 },
    };
  }

  async markRead(userId: string, notificationId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!row) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    void this.invalidateUnreadCache(userId);
    void this.publishUnreadUpdate(userId);
    return updated;
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    void this.invalidateUnreadCache(userId);
    void this.publishUnreadUpdate(userId);
    return { updated: true };
  }

  async getUnreadCount(userId: string) {
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await this.cacheService.get<{ count: number }>(cacheKey);
    if (cached) return cached;

    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    const result = { count };
    await this.cacheService.set(cacheKey, result, UNREAD_COUNT_CACHE_TTL);
    return result;
  }

  private async getOrCreatePreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  private inQuietHours(prefs: { quietHoursStart: number | null; quietHoursEnd: number | null }) {
    if (prefs.quietHoursStart == null || prefs.quietHoursEnd == null) return false;
    const hour = new Date().getHours();
    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;
    if (start <= end) return hour >= start && hour < end;
    return hour >= start || hour < end;
  }

  private async buildUserContext(userId: string) {
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
      board: user.profile?.board,
      grade: user.profile?.grade,
      stream: user.profile?.stream,
      classGroup: user.profile?.classGroup,
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
