import { Module } from '@nestjs/common';
import { JobReadinessController } from './controllers/job-readiness.controller';
import { JobReadinessService } from './services/job-readiness.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [JobReadinessController],
  providers: [JobReadinessService, ProfilesRepository, ProfileContextService],
})
export class JobReadinessModule {}
