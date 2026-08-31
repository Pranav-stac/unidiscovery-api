import { Injectable } from '@nestjs/common';
import { ApplicationDocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async list(userId: string) {
    return this.prisma.applicationDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async generate(
    userId: string,
    type: ApplicationDocumentType,
    prompt?: string,
  ) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const context = this.profileContext.buildContextText(profile);

    const typePrompts: Record<ApplicationDocumentType, string> = {
      PERSONAL_STATEMENT: `Write a compelling 250-word personal statement for college admission based on this student profile. Use first person, authentic tone.`,
      SCHOLARSHIP: `Write a 200-word scholarship application paragraph highlighting merit and need based on this profile.`,
      LETTER_OF_RECOMMENDATION: `Draft a letter of recommendation template a teacher could use for this student. Include specific strengths and examples.`,
      ESSAY: `Write a 300-word college essay on: ${prompt ?? 'a challenge that shaped my growth'}. Use the student profile for context.`,
    };

    const content = await this.geminiService.generateText(
      `${typePrompts[type]}\n\nStudent profile:\n${context}`,
    );

    const titles: Record<ApplicationDocumentType, string> = {
      PERSONAL_STATEMENT: 'Personal Statement Draft',
      SCHOLARSHIP: 'Scholarship Application',
      LETTER_OF_RECOMMENDATION: 'Letter of Recommendation Draft',
      ESSAY: prompt ? `Essay: ${prompt.slice(0, 40)}` : 'College Essay',
    };

    return this.prisma.applicationDocument.create({
      data: {
        userId,
        type,
        title: titles[type],
        content,
        metadata: {
          prompt,
          generatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }
}
