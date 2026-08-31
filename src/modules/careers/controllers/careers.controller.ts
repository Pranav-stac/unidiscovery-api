import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CareersService } from '../services/careers.service';

@ApiTags('Careers')
@ApiBearerAuth()
@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @Get()
  @ApiOperation({ summary: 'List careers library' })
  list() {
    return this.careersService.list();
  }

  @Get('subjects')
  @ApiOperation({ summary: 'List subjects library' })
  subjects() {
    return this.careersService.listSubjects();
  }

  @Get('saved/list')
  @ApiOperation({ summary: 'Saved careers' })
  saved(@CurrentUser() user: AuthenticatedUser) {
    return this.careersService.saved(user.id);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'AI career recommendations' })
  recommend(@CurrentUser() user: AuthenticatedUser) {
    return this.careersService.recommend(user.id);
  }

  @Post('paths/generate')
  @ApiOperation({ summary: 'Generate career path combinations' })
  generatePaths(@CurrentUser() user: AuthenticatedUser) {
    return this.careersService.generatePaths(user.id);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save career to shortlist' })
  save(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.careersService.save(user.id, id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get career by slug' })
  getOne(@Param('slug') slug: string) {
    return this.careersService.getBySlug(slug);
  }
}
