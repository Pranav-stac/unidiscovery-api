import { Module } from '@nestjs/common';
import { DiagnosticsController } from './controllers/diagnostics.controller';
import { DiagnosticsService } from './services/diagnostics.service';
import { GeminiModule } from '../../infrastructure/ai/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
