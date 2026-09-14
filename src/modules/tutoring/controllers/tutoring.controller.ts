import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TutoringTestType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TutoringService } from '../services/tutoring.service';

class SubmitAttemptDto {
  @IsEnum(TutoringTestType)
  testType!: TutoringTestType;

  @IsString()
  answer!: string;
}

class ChatDto {
  @IsEnum(TutoringTestType)
  testType!: TutoringTestType;

  @IsString()
  message!: string;
}

class ResourceDto {
  @IsEnum(TutoringTestType)
  testType!: TutoringTestType;

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

@ApiTags('Tutoring')
@ApiBearerAuth()
@Controller('tutoring')
export class TutoringController {
  constructor(private readonly tutoringService: TutoringService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('testType') testType?: TutoringTestType,
  ) {
    return this.tutoringService.getOverview(user.id, testType ?? TutoringTestType.SAT);
  }

  @Post('resources')
  markResource(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResourceDto) {
    return this.tutoringService.markResource(user.id, dto.testType, dto.resourceId, dto.done !== false);
  }

  @Get('questions')
  getQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('testType') testType: TutoringTestType,
    @Query('section') section?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tutoringService.getQuestions(
      testType,
      user.id,
      section,
      limit ? Number(limit) : 8,
    );
  }

  @Get('progress')
  getProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Query('testType') testType?: TutoringTestType,
  ) {
    return this.tutoringService.getProgress(user.id, testType);
  }

  @Post('questions/:id/attempt')
  submitAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') questionId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.tutoringService.submitAttempt(
      user.id,
      questionId,
      dto.testType,
      dto.answer,
    );
  }

  @Post('chat')
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChatDto) {
    return this.tutoringService.chat(user.id, dto.testType, dto.message);
  }

  @Post('chat/stream')
  chatStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    return this.tutoringService.streamChatToResponse(
      user.id,
      dto.testType,
      dto.message,
      res,
    );
  }
}
