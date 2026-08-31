import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TutoringTestType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';
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

@ApiTags('Tutoring')
@ApiBearerAuth()
@Controller('tutoring')
export class TutoringController {
  constructor(private readonly tutoringService: TutoringService) {}

  @Get('questions')
  getQuestions(@Query('testType') testType: TutoringTestType) {
    return this.tutoringService.getQuestions(testType);
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
}
