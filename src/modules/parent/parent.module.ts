import { Module } from '@nestjs/common';
import { ParentController } from './controllers/parent.controller';
import { ParentService } from './services/parent.service';

@Module({
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
