import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { SITE_KNOWLEDGE } from '../constants/site-knowledge';
import type { ChatMessageDto } from '../dto/assistant-chat.dto';

@Injectable()
export class AssistantService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly profileContextService: ProfileContextService,
  ) {}

  async chat(
    message: string,
    options?: {
      pagePath?: string;
      history?: ChatMessageDto[];
      userId?: string;
    },
  ) {
    const { pagePath, history = [], userId } = options ?? {};

    let profileContext = '';
    if (userId) {
      try {
        const profile = await this.profileContextService.getProfileOrThrow(userId);
        profileContext = `\n\n## Current Student Profile (logged in)\n${this.profileContextService.buildContextText(profile)}`;
      } catch {
        // Profile may not exist yet during onboarding
      }
    }

    const pageContext = pagePath
      ? `\n\nThe user is currently viewing: ${pagePath}`
      : '';

    const historyText =
      history.length > 0
        ? `\n\n## Conversation so far\n${history
            .slice(-10)
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n')}`
        : '';

    const prompt = `${SITE_KNOWLEDGE}${profileContext}${pageContext}${historyText}

User question: ${message}

Respond as the AI Discovery assistant:`;

    const reply = await this.geminiService.generateText(prompt);

    return { reply };
  }
}
