import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { AdminController } from './controllers/admin.controller';
import { AdminOpsService } from './services/admin-ops.service';
import { AdminService } from './services/admin.service';
import { UsersRepository } from '../../infrastructure/database/repositories/users.repository';

@Module({
  imports: [ActivitiesModule],
  controllers: [AdminController],
  providers: [AdminService, AdminOpsService, UsersRepository],
})
export class AdminModule {}
