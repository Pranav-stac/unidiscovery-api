import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/auth.decorators';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let database = 'ok';
    let redis = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    try {
      await this.cacheService.connect();
      redis = 'ok';
    } catch {
      redis = 'error';
    }

    return {
      status: database === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database, redis },
    };
  }
}
