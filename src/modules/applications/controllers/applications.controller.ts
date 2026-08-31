import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApplicationDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApplicationsService } from '../services/applications.service';

class GenerateDocumentDto {
  @IsEnum(ApplicationDocumentType)
  type!: ApplicationDocumentType;

  @IsOptional()
  @IsString()
  prompt?: string;
}

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('documents')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.list(user.id);
  }

  @Post('documents/generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.applicationsService.generate(user.id, dto.type, dto.prompt);
  }
}
