import { Module } from '@nestjs/common';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';
import { HomeschoolingController } from './controllers/homeschooling.controller';
import { HomeschoolingService } from './services/homeschooling.service';
import { OfficialMediaService } from './services/official-media.service';

@Module({
  imports: [GeminiModule],
  controllers: [HomeschoolingController],
  providers: [
    HomeschoolingService,
    OfficialMediaService,
    ProfilesRepository,
    ProfileContextService,
  ],
})
export class HomeschoolingModule {}
