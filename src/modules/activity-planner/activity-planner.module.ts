import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';
import { ActivityPlannerController } from './controllers/activity-planner.controller';
import { ActivityPlannerService } from './services/activity-planner.service';

@Module({
  imports: [ActivitiesModule, GeminiModule],
  controllers: [ActivityPlannerController],
  providers: [ActivityPlannerService],
})
export class ActivityPlannerModule {}
