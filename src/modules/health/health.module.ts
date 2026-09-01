import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { KeepAliveService } from './services/keep-alive.service';

@Module({
  controllers: [HealthController],
  providers: [KeepAliveService],
})
export class HealthModule {}
