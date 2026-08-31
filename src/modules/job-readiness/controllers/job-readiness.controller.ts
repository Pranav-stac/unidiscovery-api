import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobAssetType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JobReadinessService } from '../services/job-readiness.service';

class GenerateAssetDto {
  @IsEnum(JobAssetType)
  type!: JobAssetType;
}

@ApiTags('Job Readiness')
@ApiBearerAuth()
@Controller('job-readiness')
export class JobReadinessController {
  constructor(private readonly jobReadinessService: JobReadinessService) {}

  @Get('assets')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.jobReadinessService.list(user.id);
  }

  @Post('assets/generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateAssetDto,
  ) {
    return this.jobReadinessService.generate(user.id, dto.type);
  }
}
