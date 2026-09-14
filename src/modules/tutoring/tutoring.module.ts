import { Module } from '@nestjs/common';
import { TutoringController } from './controllers/tutoring.controller';
import { TutoringService } from './services/tutoring.service';
import { OfficialExamService } from './services/official-exam.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [TutoringController],
  providers: [TutoringService, OfficialExamService],
})
export class TutoringModule {}
