import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getApps } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';

@Injectable()
export class NotificationPushService {
  private readonly logger = new Logger(NotificationPushService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return getApps().length > 0;
  }

  async sendToTokens(
    tokens: string[],
    input: { title: string; body: string; actionUrl?: string },
  ) {
    if (!tokens.length) return { sent: 0, failed: 0, invalidTokens: [] as string[] };
    if (!this.isConfigured()) {
      if (this.configService.get('nodeEnv') === 'production') {
        throw new Error('Firebase Admin is not configured for push');
      }
      this.logger.log(`[push:dev] ${input.title}: ${input.body}`);
      return { sent: tokens.length, failed: 0, invalidTokens: [] as string[] };
    }

    const appUrl = this.configService.get<string>('notifications.appWebUrl') ?? 'http://localhost:3200';
    const link = input.actionUrl ? `${appUrl}${input.actionUrl}` : appUrl;

    const message: MulticastMessage = {
      notification: { title: input.title, body: input.body },
      webpush: {
        fcmOptions: { link },
        notification: { title: input.title, body: input.body },
      },
      data: {
        actionUrl: input.actionUrl ?? '/dashboard',
      },
      tokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);
    const invalidTokens: string[] = [];
    response.responses.forEach((item, index) => {
      if (!item.success) invalidTokens.push(tokens[index]);
    });
    return {
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens,
    };
  }
}
