import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { UsersRepository } from '../../infrastructure/database/repositories/users.repository';

@Module({
  controllers: [AdminController],
  providers: [AdminService, UsersRepository],
})
export class AdminModule {}
