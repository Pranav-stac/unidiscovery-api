import { Module } from '@nestjs/common';
import { ProfilesController } from './controllers/profiles.controller';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { ProfilesService } from './services/profiles.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ProfilesController],
  providers: [ProfilesRepository, ProfilesService],
  exports: [ProfilesRepository, ProfilesService],
})
export class ProfilesModule {}
