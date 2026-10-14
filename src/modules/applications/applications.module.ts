import { Module } from '@nestjs/common';
import { ApplicationsController } from './controllers/applications.controller';
import { WritingProjectsController } from './controllers/writing-projects.controller';
import { ApplicationsService } from './services/applications.service';
import { WritingProjectsService } from './services/writing-projects.service';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfileContextService } from '../../common/services/profile-context.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ApplicationsController, WritingProjectsController],
  providers: [ApplicationsService, WritingProjectsService, ProfilesRepository, ProfileContextService],
})
export class ApplicationsModule {}
