import { Module } from '@nestjs/common';
import { CareerMapController } from './controllers/career-map.controller';
import { CareerMapService } from './services/career-map.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [CareerMapController],
  providers: [CareerMapService, ProfilesRepository, ProfileContextService],
})
export class CareerMapModule {}
