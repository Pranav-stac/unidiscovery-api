import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ActivityPlanStatus,
  ActivityType,
  PlanCategory,
  PlanResponsibility,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivityPlannerService } from '../services/activity-planner.service';

class CreatePlanItemDto {
  @IsString() title!: string;
  @IsEnum(ActivityType) type!: ActivityType;
  @IsOptional() @IsEnum(PlanCategory) category?: PlanCategory;
  @IsOptional() @IsString() subcategory?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) targetMonth?: number;
  @IsOptional() @IsInt() targetYear?: number;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) priority?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() whyItMatters?: string;
  @IsOptional() @IsEnum(PlanResponsibility) responsibility?: PlanResponsibility;
  @IsOptional() @IsString() linkedCareer?: string;
}

class UpdatePlanItemDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(ActivityPlanStatus) status?: ActivityPlanStatus;
  @IsOptional() @IsEnum(PlanCategory) category?: PlanCategory;
  @IsOptional() @IsString() subcategory?: string;
  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(12) targetMonth?: number;
  @IsOptional() @IsInt() targetYear?: number;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) priority?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() whyItMatters?: string;
  @IsOptional() @IsEnum(PlanResponsibility) responsibility?: PlanResponsibility;
}

class GenerateRoadmapDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  replace?: boolean;
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('Activity Planner')
@ApiBearerAuth()
@Controller('activity-planner')
export class ActivityPlannerController {
  constructor(private readonly plannerService: ActivityPlannerService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.plannerService.list(user.id);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.plannerService.dashboard(user.id);
  }

  @Get('competitions')
  competitions() {
    return this.plannerService.listCompetitions();
  }

  @Post('generate-roadmap')
  generateRoadmap(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateRoadmapDto,
  ) {
    return this.plannerService.generateRoadmap(user.id, Boolean(dto.replace));
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlanItemDto,
  ) {
    return this.plannerService.create(user.id, {
      ...dto,
      startDate: parseDate(dto.startDate),
      dueDate: parseDate(dto.dueDate),
    });
  }

  @Post('from-activity/:activityId')
  fromActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.plannerService.addFromActivity(user.id, activityId);
  }

  @Post(':id/enrich')
  enrichTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.plannerService.enrichTask(user.id, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.plannerService.update(user.id, id, {
      ...dto,
      startDate: dto.startDate === null ? null : parseDate(dto.startDate ?? undefined),
      dueDate: dto.dueDate === null ? null : parseDate(dto.dueDate ?? undefined),
    });
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.plannerService.remove(user.id, id);
  }
}
