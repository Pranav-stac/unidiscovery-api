import { Module } from '@nestjs/common';
import { ActivityPlannerController } from './controllers/activity-planner.controller';
import { ActivityPlannerService } from './services/activity-planner.service';

@Module({
  controllers: [ActivityPlannerController],
  providers: [ActivityPlannerService],
})
export class ActivityPlannerModule {}
