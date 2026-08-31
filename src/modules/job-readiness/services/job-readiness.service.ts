import { Injectable } from '@nestjs/common';
import { JobAssetType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';

@Injectable()
export class JobReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async list(userId: string) {
    return this.prisma.jobAsset.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async generate(userId: string, type: JobAssetType) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const context = this.profileContext.buildContextText(profile);

    if (type === JobAssetType.CV) {
      const cvContent = await this.geminiService.generateStructured({
        systemPrompt: 'Generate a student CV/resume as JSON.',
        userPrompt: context,
        schemaDescription: `{
          "summary": "string",
          "education": [{"school":"string","grade":"string","highlights":["string"]}],
          "skills": ["string"],
          "activities": ["string"],
          "experience": ["string"]
        }`,
        fallback: {
          summary:
            profile.aiSummary ??
            'Motivated student seeking growth opportunities.',
          education: [
            {
              school: profile.school ?? 'School',
              grade: String(profile.grade ?? ''),
              highlights: profile.strengths,
            },
          ],
          skills: profile.strengths,
          activities: profile.interests,
          experience: [],
        },
      });

      return this.prisma.jobAsset.create({
        data: {
          userId,
          type,
          title: 'My CV',
          content: cvContent,
        },
      });
    }

    const linkedInContent = await this.geminiService.generateStructured({
      systemPrompt: 'Generate LinkedIn profile sections as JSON.',
      userPrompt: context,
      schemaDescription: `{
        "headline": "string",
        "about": "string",
        "experience": ["string"],
        "skills": ["string"]
      }`,
      fallback: {
        headline: 'Student | Future Innovator',
        about:
          profile.aiSummary ??
          'Passionate learner building skills for the future.',
        experience: profile.interests.map((i) => `Interested in ${i}`),
        skills: profile.strengths,
      },
    });

    return this.prisma.jobAsset.create({
      data: {
        userId,
        type,
        title: 'LinkedIn Profile',
        content: linkedInContent,
      },
    });
  }
}
