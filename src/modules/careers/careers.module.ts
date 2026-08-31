import { Module } from '@nestjs/common';
import { CareersController } from './controllers/careers.controller';
import { CareersService } from './services/careers.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [CareersController],
  providers: [CareersService, ProfilesRepository, ProfileContextService],
  exports: [CareersService],
})
export class CareersModule {}
