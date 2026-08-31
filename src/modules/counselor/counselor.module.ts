import { Module } from '@nestjs/common';
import { CounselorController } from './controllers/counselor.controller';
import { CounselorService } from './services/counselor.service';

@Module({
  controllers: [CounselorController],
  providers: [CounselorService],
})
export class CounselorModule {}
