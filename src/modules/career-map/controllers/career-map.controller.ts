import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CareerMapService } from '../services/career-map.service';

@ApiTags('Career Map')
@ApiBearerAuth()
@Controller('career-map')
export class CareerMapController {
  constructor(private readonly careerMapService: CareerMapService) {}

  @Get()
  @ApiOperation({ summary: 'Get latest career-years map' })
  getLatest(@CurrentUser() user: AuthenticatedUser) {
    return this.careerMapService.getLatest(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'List all map versions' })
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.careerMapService.list(user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate or refresh career-years map' })
  generate(@CurrentUser() user: AuthenticatedUser) {
    return this.careerMapService.generate(user.id);
  }
}
