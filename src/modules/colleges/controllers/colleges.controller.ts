import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CollegesService } from '../services/colleges.service';

export class CollegeResearchDto {
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) countries!: string[];
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) courses!: string[];
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) degrees!: string[];
  @IsOptional() @IsString() intake?: string;
  @IsOptional() @IsString() budget?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  priorities?: string[];
  @IsOptional() @IsInt() @Min(3) @Max(8) count?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  excludeNames?: string[];
}

export class CollegeChatDto {
  @IsString() message!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  collegeIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  excludeNames?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) countries?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) courses?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) degrees?: string[];
  @IsOptional() @IsString() budget?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) priorities?: string[];
  @IsOptional() @IsString() focusCollegeName?: string;
}

@ApiTags('Colleges')
@ApiBearerAuth()
@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get()
  @ApiOperation({ summary: 'List colleges' })
  list(
    @Query('country') country?: string,
    @Query('field') field?: string,
    @Query('degree') degree?: string,
    @Query('search') search?: string,
  ) {
    return this.collegesService.list(country, field, degree, search);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Get AI-powered college recommendations' })
  recommend(@CurrentUser() user: AuthenticatedUser) {
    return this.collegesService.recommend(user.id);
  }

  @Get('suite')
  @ApiOperation({
    summary: 'Get college suite profile, memory, and shortlist overview',
  })
  suite(@CurrentUser() user: AuthenticatedUser) {
    return this.collegesService.getSuite(user.id);
  }

  @Post('research')
  @ApiOperation({
    summary: 'Research source-linked colleges and rank them for the student',
  })
  research(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CollegeResearchDto,
  ) {
    return this.collegesService.research(user.id, dto);
  }

  @Post('chat')
  @ApiOperation({
    summary: 'Ask a grounded question about researched or saved colleges',
  })
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: CollegeChatDto) {
    return this.collegesService.chat(user.id, dto.message, dto);
  }

  @Post('chat/stream')
  chatStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CollegeChatDto,
    @Res() res: Response,
  ) {
    return this.collegesService.streamChatToResponse(user.id, dto.message, dto, res);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved colleges' })
  saved(@CurrentUser() user: AuthenticatedUser) {
    return this.collegesService.saved(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get college by id' })
  getById(@Param('id') id: string) {
    return this.collegesService.getById(id);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save a college' })
  save(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collegesService.save(user.id, id);
  }

  @Delete(':id/save')
  @ApiOperation({ summary: 'Remove a college from shortlist' })
  unsave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collegesService.unsave(user.id, id);
  }
}
