import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/auth.decorators';
import { ROLES } from '../../../common/constants';
import { ActivitiesService } from '../services/activities.service';
import { OpportunitySyncService } from '../services/opportunity-sync.service';

class ActivityChatDto {
  @IsString() message!: string;
  @IsOptional() @IsString() tab?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() focusActivityId?: string;
  @IsOptional() @IsString() focusActivityTitle?: string;
}

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly opportunitySync: OpportunitySyncService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: ActivityType,
    @Query('grade') grade?: string,
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('format') format?: string,
    @Query('cost') cost?: string,
    @Query('category') category?: string,
    @Query('highlySelective') highlySelective?: string,
    @Query('relevantOnly') relevantOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.list(user.id, {
      type,
      grade: grade ? Number(grade) : undefined,
      search,
      country: country || undefined,
      format: format || undefined,
      cost: cost || undefined,
      category: category || undefined,
      highlySelective: highlySelective === 'true' || highlySelective === '1',
      relevantOnly: relevantOnly !== 'false' && relevantOnly !== '0',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 24,
    });
  }

  @Get('filters')
  filters() {
    return this.activitiesService.getFilterOptions();
  }

  @Post('recommend')
  recommend(@CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.recommend(user.id);
  }

  @Get('saved')
  saved(@CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.saved(user.id);
  }

  @Post('sync')
  @Roles(ROLES.ADMIN, ROLES.PROGRAM_MANAGER)
  sync(@Query('scrape') scrape?: string) {
    return this.opportunitySync.sync({ scrape: scrape === '1' || scrape === 'true' });
  }

  @Post('chat')
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: ActivityChatDto) {
    return this.activitiesService.chat(user.id, dto.message, dto);
  }

  @Post('chat/stream')
  chatStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ActivityChatDto,
    @Res() res: Response,
  ) {
    return this.activitiesService.streamChatToResponse(user.id, dto.message, dto, res);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.activitiesService.getById(id, user.id);
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

  @Delete(':id/save')
  unsave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.activitiesService.unsave(user.id, id);
  }
}
