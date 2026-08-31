import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DiagnosticsService } from '../services/diagnostics.service';

@ApiTags('Diagnostics')
@ApiBearerAuth()
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get diagnostic completion status and latest insights',
  })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.diagnosticsService.getStatus(user.id);
  }

  @Get('steps')
  @ApiOperation({ summary: 'Get personalized diagnostic steps' })
  getSteps(@CurrentUser() user: AuthenticatedUser) {
    return this.diagnosticsService.getStepsForUser(user.id);
  }

  @Post('retake')
  @ApiOperation({
    summary: 'Abandon current session and start a fresh diagnostic',
  })
  retake(@CurrentUser() user: AuthenticatedUser) {
    return this.diagnosticsService.retakeSession(user.id);
  }

  @Post('refresh-insights')
  @ApiOperation({
    summary: 'Regenerate AI insights from profile + last answers',
  })
  refreshInsights(@CurrentUser() user: AuthenticatedUser) {
    return this.diagnosticsService.refreshInsights(user.id);
  }

  @Post('sessions/start')
  @ApiOperation({ summary: 'Start or resume diagnostic session' })
  startSession(@CurrentUser() user: AuthenticatedUser) {
    return this.diagnosticsService.startSession(user.id);
  }

  @Post('sessions/:id/answer')
  @ApiOperation({ summary: 'Save answer for a diagnostic step' })
  saveAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: { stepId: string; answer: unknown; nextStepId?: string },
  ) {
    return this.diagnosticsService.saveAnswer(
      sessionId,
      user.id,
      body.stepId,
      body.answer,
      body.nextStepId,
    );
  }

  @Post('sessions/:id/progress')
  @ApiOperation({
    summary: 'Update current step for resume (chapter navigation)',
  })
  updateProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: { stepId: string },
  ) {
    return this.diagnosticsService.updateProgress(
      sessionId,
      user.id,
      body.stepId,
    );
  }

  @Post('sessions/:id/ai-followup')
  @ApiOperation({ summary: 'Get AI-generated follow-up question' })
  async getFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    const session = await this.diagnosticsService.getSession(
      sessionId,
      user.id,
    );
    const answers = session.answers as Record<string, unknown>;
    return this.diagnosticsService.getAiFollowUp(answers, user.id);
  }

  @Post('sessions/:id/complete')
  @ApiOperation({ summary: 'Complete diagnostic and generate AI report' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.diagnosticsService.completeSession(sessionId, user.id);
  }
}
