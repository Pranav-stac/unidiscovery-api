import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CollegesService } from '../services/colleges.service';

@ApiTags('Colleges')
@ApiBearerAuth()
@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get()
  @ApiOperation({ summary: 'List colleges' })
  list(@Query('country') country?: string, @Query('field') field?: string) {
    return this.collegesService.list(country, field);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Get AI-powered college recommendations' })
  recommend(@CurrentUser() user: AuthenticatedUser) {
    return this.collegesService.recommend(user.id);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved colleges' })
  saved(@CurrentUser() user: AuthenticatedUser) {
    return this.collegesService.saved(user.id);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save a college' })
  save(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collegesService.save(user.id, id);
  }
}
