import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('notifications.smtpHost');
    const user = this.configService.get<string>('notifications.smtpUser');
    const pass = this.configService.get<string>('notifications.smtpPass');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('notifications.smtpPort', 587),
        secure: this.configService.get<boolean>('notifications.smtpSecure', false),
        auth: { user, pass },
      });
      this.logger.log('SMTP email transport configured');
    } else {
      this.logger.warn('SMTP not configured — emails will log to console in development');
    }
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  async send(input: { to: string; subject: string; html: string }) {
    const from =
      this.configService.get<string>('notifications.emailFrom') ??
      'UniDiscover <noreply@unidiscovery.app>';

    if (!this.transporter) {
      if (this.configService.get('nodeEnv') === 'production') {
        throw new Error('Email transport is not configured');
      }
      this.logger.log(`[email:dev] To: ${input.to} | ${input.subject}`);
      return { messageId: `dev-${Date.now()}` };
    }

    const result = await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return { messageId: result.messageId };
  }
}
