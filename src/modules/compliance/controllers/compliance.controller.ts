import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UCASApplicationStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ComplianceService } from '../services/compliance.service';

class LogGatsbyDto {
  @IsInt() @Min(1) @Max(8) benchmark!: number;
  @IsString() title!: string;
  @IsOptional() @IsString() evidence?: string;
  @IsOptional() @IsString() status?: string;
}

class CreateEncounterDto {
  @IsString() type!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() benchmarks?: number[];
}

class UpdateUcasDto {
  @IsOptional() @IsString() personalStatement?: string;
  @IsOptional() @IsArray() courses?: unknown[];
  @IsOptional() @IsEnum(UCASApplicationStatus) status?: UCASApplicationStatus;
}

@ApiTags('UK Compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('gatsby')
  benchmarks() {
    return this.complianceService.getGatsbyBenchmarks();
  }

  @Get('gatsby/progress')
  myProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceService.getStudentGatsbyProgress(user.id);
  }

  @Post('gatsby/log')
  logGatsby(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogGatsbyDto) {
    return this.complianceService.logGatsbyEncounter(user.id, dto);
  }

  @Get('ceiag')
  ceiag() {
    return this.complianceService.getCeiagContent();
  }

  @Get('encounters')
  encounters(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceService.listEncounters(user.id);
  }

  @Post('encounters')
  createEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEncounterDto,
  ) {
    return this.complianceService.createEncounter(user.id, dto);
  }

  @Get('ucas')
  ucas(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceService.getUcasApplication(user.id);
  }

  @Put('ucas')
  updateUcas(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUcasDto,
  ) {
    return this.complianceService.upsertUcasApplication(user.id, dto);
  }

  @Get('mat-report')
  matReport() {
    return this.complianceService.getMatReport();
  }
}
