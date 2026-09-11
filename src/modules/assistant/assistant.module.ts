import { Module } from '@nestjs/common';
import { AssistantController } from './controllers/assistant.controller';
import { AssistantService } from './services/assistant.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';
import { DatabaseRepositoriesModule } from '../../infrastructure/database/database-repositories.module';
import { ProfileContextService } from '../../common/services/profile-context.service';

@Module({
  imports: [GeminiModule, DatabaseRepositoriesModule],
  controllers: [AssistantController],
  providers: [AssistantService, ProfileContextService],
})
export class AssistantModule {}
