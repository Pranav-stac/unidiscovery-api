import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApplicationDocumentType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApplicationsService } from '../services/applications.service';

class GenerateDocumentDto {
  @IsEnum(ApplicationDocumentType)
  type!: ApplicationDocumentType;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  targetCollege?: string;

  @IsOptional()
  @IsString()
  targetCountry?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  wordLimit?: number;

  @IsOptional()
  @IsString()
  additionalInstructions?: string;
}

class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

class RefineDocumentDto {
  @IsString()
  instruction!: string;
}

class AgentChatDto {
  @IsString()
  message!: string;

  @IsEnum(ApplicationDocumentType)
  type!: ApplicationDocumentType;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  currentContent?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  targetCollege?: string;

  @IsOptional()
  @IsString()
  targetCountry?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  wordLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedContextIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentNames?: string[];
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

  @Get('documents/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.applicationsService.getById(user.id, id);
  }

  @Post('documents/generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.applicationsService.generate(user.id, dto.type, {
      prompt: dto.prompt,
      targetCollege: dto.targetCollege,
      targetCountry: dto.targetCountry,
      tone: dto.tone,
      wordLimit: dto.wordLimit,
      additionalInstructions: dto.additionalInstructions,
    });
  }

  @Post('documents/generate/stream')
  generateStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateDocumentDto,
    @Res() res: Response,
  ) {
    return this.applicationsService.streamGenerateToResponse(
      user.id,
      dto.type,
      {
        prompt: dto.prompt,
        targetCollege: dto.targetCollege,
        targetCountry: dto.targetCountry,
        tone: dto.tone,
        wordLimit: dto.wordLimit,
        additionalInstructions: dto.additionalInstructions,
      },
      res,
    );
  }

  @Patch('documents/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.applicationsService.update(user.id, id, dto);
  }

  @Post('documents/:id/refine')
  refine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RefineDocumentDto,
  ) {
    return this.applicationsService.refine(user.id, id, dto.instruction);
  }

  @Post('documents/agent/stream')
  agentStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AgentChatDto,
    @Res() res: Response,
  ) {
    return this.applicationsService.streamAgentToResponse(user.id, dto.type, {
      message: dto.message,
      documentId: dto.documentId,
      currentContent: dto.currentContent,
      prompt: dto.prompt,
      targetCollege: dto.targetCollege,
      targetCountry: dto.targetCountry,
      tone: dto.tone,
      wordLimit: dto.wordLimit,
      excludedContextIds: dto.excludedContextIds,
      attachmentNames: dto.attachmentNames,
    }, res);
  }

  @Post('documents/:id/refine/stream')
  refineStream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RefineDocumentDto,
    @Res() res: Response,
  ) {
    return this.applicationsService.streamRefineToResponse(
      user.id,
      id,
      dto.instruction,
      res,
    );
  }
}
