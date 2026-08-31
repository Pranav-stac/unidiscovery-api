import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ProfilesRepository } from '../../../infrastructure/database/repositories/profiles.repository';
import { ProfilesService } from '../services/profiles.service';

class UpdateProfileDto {
  @IsOptional() @IsInt() @Min(1) @Max(12) grade?: number;
  @IsOptional() @IsString() classGroup?: string;
  @IsOptional() @IsString() stream?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() board?: string;
  @IsOptional() @IsNumber() percentage?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) strengths?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) subjects?: string[];
  @IsOptional() @IsString() targetDegree?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) targetCountries?: string[];
  @IsOptional() @IsObject() transcriptData?: Record<string, unknown>;
  @IsOptional() @IsObject() resumeData?: Record<string, unknown>;
  @IsOptional() @IsString() resumeSummary?: string;
  @IsOptional() @IsInt() @Min(0) @Max(4) onboardingStep?: number;
  @IsOptional() @IsBoolean() onboardingCompleted?: boolean;
  @IsOptional() @IsBoolean() diagnosticCompleted?: boolean;
  @IsOptional() @IsObject() goals?: Record<string, unknown>;
}

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly profilesService: ProfilesService,
  ) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesRepository.findByUserId(user.id);
  }

  @Get('me/dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getDashboard(user.id);
  }

  @Put('me')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesRepository.update(
      user.id,
      dto as Prisma.StudentProfileUpdateInput,
    );
  }

  @Post('me/parse-transcript')
  @ApiOperation({
    summary: 'Parse pasted transcript into structured profile data',
  })
  parseTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { rawText: string },
  ) {
    return this.profilesService.parseTranscript(user.id, body.rawText);
  }

  @Post('me/parse-document')
  @ApiOperation({
    summary: 'Upload PDF/image marksheet — AI parses into profile',
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  parseDocument(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile()
    file?: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    if (!file) {
      return {
        error: 'No file received. Ensure the upload includes a file field.',
      };
    }
    return this.profilesService.parseDocument(user.id, file);
  }

  @Post('me/build-academic-profile')
  @ApiOperation({
    summary: 'Merge all parsed docs into unified academic profile + AI summary',
  })
  buildAcademicProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.buildAcademicProfile(user.id);
  }
}
