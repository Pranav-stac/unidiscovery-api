import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityPlanStatus, ActivityType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivityPlannerService } from '../services/activity-planner.service';

class CreatePlanItemDto {
  @IsString() title!: string;
  @IsEnum(ActivityType) type!: ActivityType;
  @IsOptional() @IsString() activityId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) targetMonth?: number;
  @IsOptional() @IsInt() targetYear?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3) priority?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() linkedCareer?: string;
}

class UpdatePlanItemDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(ActivityPlanStatus) status?: ActivityPlanStatus;
  @IsOptional() @IsInt() @Min(1) @Max(12) targetMonth?: number;
  @IsOptional() @IsInt() targetYear?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3) priority?: number;
  @IsOptional() @IsString() notes?: string;
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

  @Get('competitions')
  competitions() {
    return this.plannerService.listCompetitions();
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlanItemDto,
  ) {
    return this.plannerService.create(user.id, dto);
  }

  @Post('from-activity/:activityId')
  fromActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.plannerService.addFromActivity(user.id, activityId);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.plannerService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.plannerService.remove(user.id, id);
  }
}
