import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;
  private enabled = true;

  constructor(private readonly configService: ConfigService) {
    this.ttlSeconds = this.configService.get<number>('redis.ttlSeconds', 300);
    this.keyPrefix = this.configService.get<string>(
      'redis.keyPrefix',
      'ai-platform:',
    );

    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
      retryStrategy: () => null,
    });

    this.client.on('error', (error) => {
      if (this.enabled) {
        this.logger.warn(`Redis error: ${error.message}`);
      }
    });
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async connect(): Promise<void> {
    if (!this.enabled || this.client.status !== 'wait') {
      return;
    }

    try {
      await this.client.connect();
      await this.client.ping();
      this.logger.log('Redis connected');
    } catch (error) {
      this.enabled = false;
      this.logger.warn(
        `Redis unavailable — caching disabled (${error instanceof Error ? error.message : 'unknown error'})`,
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    const value = await this.client.get(this.buildKey(key));
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds = this.ttlSeconds,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.client.set(
      this.buildKey(key),
      JSON.stringify(value),
      'EX',
      ttlSeconds,
    );
  }

  async del(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.client.del(this.buildKey(key));
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const fullPattern = this.buildKey(pattern);
    const stream = this.client.scanStream({ match: fullPattern, count: 100 });
    const keys: string[] = [];

    for await (const batch of stream) {
      keys.push(...(batch as string[]));
    }

    if (keys.length > 0) {
      await this.client.del(...keys);
      this.logger.debug(
        `Invalidated ${keys.length} cache keys for pattern: ${pattern}`,
      );
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.del(`user:${userId}`),
      this.invalidateByPattern(`profile:${userId}*`),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.enabled) {
      await this.client.quit();
    }
  }
}
