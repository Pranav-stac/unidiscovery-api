import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { ActivityPlannerController } from './controllers/activity-planner.controller';
import { ActivityPlannerService } from './services/activity-planner.service';

@Module({
  imports: [ActivitiesModule],
  controllers: [ActivityPlannerController],
  providers: [ActivityPlannerService],
})
export class ActivityPlannerModule {}
