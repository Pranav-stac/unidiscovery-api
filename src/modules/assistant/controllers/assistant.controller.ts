import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../../common/decorators/auth.decorators';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AssistantChatDto } from '../dto/assistant-chat.dto';
import { AssistantService } from '../services/assistant.service';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Public()
  @ApiBearerAuth()
  @Post('chat')
  chat(
    @Body() dto: AssistantChatDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    return this.assistantService.chat(dto.message, {
      pagePath: dto.pagePath,
      history: dto.history,
      userId: req.user?.id,
    });
  }
}
