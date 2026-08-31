import { Module } from '@nestjs/common';
import { ActivitiesController } from './controllers/activities.controller';
import { ActivitiesService } from './services/activities.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ProfilesRepository, ProfileContextService],
})
export class ActivitiesModule {}
