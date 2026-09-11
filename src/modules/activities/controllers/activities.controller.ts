import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivitiesService } from '../services/activities.service';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(
    @Query('type') type?: ActivityType,
    @Query('grade') grade?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.list({
      type,
      grade: grade ? Number(grade) : undefined,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 24,
    });
  }

  @Post('recommend')
  recommend(@CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.recommend(user.id);
  }

  @Get('saved')
  saved(@CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.saved(user.id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.activitiesService.getById(id);
  }

  @Post(':id/overview')
  overview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.activitiesService.getOverview(user.id, id);
  }

  @Post(':id/save')
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.activitiesService.save(user.id, id, body.notes);
  }
}
