import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { HomeschoolingService } from '../services/homeschooling.service';

class SetupDto {
  @IsOptional() @IsString() board?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) grade?: number;
  @IsOptional() @IsString() stream?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) extraSubjects?: string[];
}

class ProgressDto {
  @IsOptional() @IsBoolean() learnDone?: boolean;
  @IsOptional() @IsArray() @IsInt({ each: true }) practiceAnswers?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) testAnswers?: number[];
}

class ChatDto {
  @IsString() message!: string;
}

class ReviewConceptDto {
  @IsString() questionId!: string;
}

@ApiTags('Homeschooling')
@ApiBearerAuth()
@Controller('homeschooling')
export class HomeschoolingController {
  constructor(private readonly homeschoolingService: HomeschoolingService) {}

  @Get('journey')
  @ApiOperation({ summary: 'Get the student school path for their grade and board' })
  journey(@CurrentUser() user: AuthenticatedUser) {
    return this.homeschoolingService.getJourney(user.id);
  }

  @Get('subjects/:subjectId')
  @ApiOperation({ summary: 'Get one subject with chapter list and progress' })
  subject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subjectId') subjectId: string,
  ) {
    return this.homeschoolingService.getSubject(user.id, subjectId);
  }

  @Patch('setup')
  @ApiOperation({ summary: 'Update board, grade, stream, or subjects' })
  setup(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetupDto) {
    return this.homeschoolingService.setup(user.id, dto);
  }

  @Get('units/:unitId')
  getUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string) {
    return this.homeschoolingService.getUnit(user.id, unitId);
  }

  @Post('units/:unitId/learn')
  learn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.homeschoolingService.getLesson(user.id, unitId, refresh === '1');
  }

  @Post('units/:unitId/practice')
  practice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.homeschoolingService.getPractice(user.id, unitId, refresh === '1');
  }

  @Post('units/:unitId/test')
  test(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.homeschoolingService.getTest(user.id, unitId, refresh === '1');
  }

  @Post('units/:unitId/review-concept')
  @ApiOperation({ summary: 'Generate a personalized mini-lesson for a missed concept' })
  reviewConcept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Body() dto: ReviewConceptDto,
    @Query('refresh') refresh?: string,
  ) {
    return this.homeschoolingService.getConceptReview(
      user.id,
      unitId,
      dto.questionId,
      refresh === '1',
    );
  }

  @Post('units/:unitId/progress')
  progress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Body() dto: ProgressDto,
  ) {
    return this.homeschoolingService.saveProgress(user.id, unitId, dto);
  }

  @Post('units/:unitId/chat')
  chat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Body() dto: ChatDto,
  ) {
    return this.homeschoolingService.chat(user.id, unitId, dto.message);
  }

  @Post('units/:unitId/chat/stream')
  chatStream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('unitId') unitId: string,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    return this.homeschoolingService.streamChatToResponse(
      user.id,
      unitId,
      dto.message,
      res,
    );
  }
}
