import { Module } from '@nestjs/common';
import { CollegesController } from './controllers/colleges.controller';
import { CollegesService } from './services/colleges.service';
import { CollegeMatchingService } from './services/college-matching.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [CollegesController],
  providers: [
    CollegesService,
    CollegeMatchingService,
    ProfilesRepository,
    ProfileContextService,
  ],
})
export class CollegesModule {}
