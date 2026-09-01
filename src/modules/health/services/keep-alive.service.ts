import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pingHealthEndpoint(): Promise<void> {
    if (this.configService.get<string>('nodeEnv') !== 'production') {
      return;
    }

    const url = this.resolveKeepAliveUrl();
    if (!url) {
      return;
    }

    try {
      const response = await fetch(url, { method: 'GET' });
      this.logger.log(`Keep-alive ping ${response.status} ${url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Keep-alive ping failed: ${message}`);
    }
  }

  private resolveKeepAliveUrl(): string | undefined {
    const configured = this.configService.get<string>('keepAlive.url');
    if (configured) {
      return configured;
    }

    const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
    if (!renderUrl) {
      return undefined;
    }

    const prefix = this.configService.get<string>('api.prefix', 'api/v1');
    return `${renderUrl.replace(/\/$/, '')}/${prefix}/health`;
  }
}
