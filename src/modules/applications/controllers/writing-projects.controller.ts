import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WritingToolSlug } from '../data/writing-tools.config';
import { WritingProjectsService } from '../services/writing-projects.service';

class CreateWritingProjectDto {
  @IsString()
  tool!: WritingToolSlug;

  @IsOptional()
  @IsString()
  title?: string;
}

class UpdateWritingProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  workflowStep?: number;

  @IsOptional()
  @IsObject()
  inputs?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  selectedAngleId?: string;

  @IsOptional()
  @IsString()
  recommendationMode?: 'request' | 'draft';

  @IsOptional()
  @IsString()
  cvTemplate?: string;
}

class CoachMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  draftExcerpt?: string;

  @IsOptional()
  @IsObject()
  inputs?: Record<string, unknown>;
}

class CoachActionDto {
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  draftExcerpt?: string;
}

@ApiTags('Writing projects')
@ApiBearerAuth()
@Controller('applications/writing-projects')
export class WritingProjectsController {
  constructor(private readonly writingProjects: WritingProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.writingProjects.listProjects(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWritingProjectDto) {
    return this.writingProjects.create(user.id, dto.tool, dto.title);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.writingProjects.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWritingProjectDto,
  ) {
    return this.writingProjects.updateProject(user.id, id, dto);
  }

  @Post(':id/coach')
  coach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CoachMessageDto,
  ) {
    return this.writingProjects.coachTurn(user.id, id, dto.message, {
      draftExcerpt: dto.draftExcerpt,
      inputs: dto.inputs,
    });
  }

  @Post(':id/coach/kickoff')
  coachKickoff(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.writingProjects.coachKickoff(user.id, id);
  }

  @Post(':id/coach-action')
  coachAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CoachActionDto,
  ) {
    return this.writingProjects.coachAction(user.id, id, dto.action, dto.draftExcerpt);
  }

  @Post(':id/review')
  review(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.writingProjects.generateReviewReport(user.id, id);
  }

  @Post(':id/story-angles')
  storyAngles(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.writingProjects.generateStoryAngles(user.id, id);
  }

  @Post(':id/outline')
  outline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.writingProjects.generateOutline(user.id, id);
  }
}
