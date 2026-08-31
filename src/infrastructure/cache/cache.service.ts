import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;

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
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', error.message);
    });
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async connect(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
      this.logger.log('Redis connected');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.buildKey(key));
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds = this.ttlSeconds,
  ): Promise<void> {
    await this.client.set(
      this.buildKey(key),
      JSON.stringify(value),
      'EX',
      ttlSeconds,
    );
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.buildKey(key));
  }

  async invalidateByPattern(pattern: string): Promise<void> {
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
    await this.client.quit();
  }
}
