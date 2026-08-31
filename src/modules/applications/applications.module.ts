import { Module } from '@nestjs/common';
import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/applications.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ProfilesRepository, ProfileContextService],
})
export class ApplicationsModule {}
