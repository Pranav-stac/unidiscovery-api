import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { CollegeMatchingService } from './college-matching.service';
import { CollegeMetadata } from '../types/college-metadata.interface';

@Injectable()
export class CollegesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
    private readonly matchingService: CollegeMatchingService,
  ) {}

  async list(country?: string, field?: string) {
    return this.prisma.college.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(country ? { country } : {}),
        ...(field ? { field: { contains: field, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async recommend(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const colleges = await this.prisma.college.findMany({
      where: { isActive: true, deletedAt: null },
    });

    const scored = colleges
      .map((college) => {
        const meta = college.metadata as CollegeMetadata | null;
        const match = this.matchingService.scoreCollege(profile, {
          id: college.id,
          name: college.name,
          country: college.country,
          field: college.field,
          metadata: meta,
        });
        return { college, score: match.score, match };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const recommendations = await Promise.all(
      scored.map(async ({ college, score, match }) => {
        const reasonsText = match.matchReasons.length
          ? `Reasons: ${match.matchReasons.join('; ')}`
          : '';
        const concernsText = match.concerns.length
          ? `Consider: ${match.concerns.join('; ')}`
          : '';

        const rationale = await this.geminiService.generateText(
          `In 2 sentences, explain why ${college.name} (${college.field}, ${college.country}) suits this student. Score: ${score}/100. ${reasonsText} ${concernsText} Profile: ${this.profileContext.buildContextText(profile)}. Be specific about programs, location, and fit.`,
        );

        const rec = await this.prisma.collegeRecommendation.upsert({
          where: { userId_collegeId: { userId, collegeId: college.id } },
          update: { score, rationale },
          create: { userId, collegeId: college.id, score, rationale },
        });

        return {
          ...rec,
          college,
          matchBreakdown: match.breakdown,
          matchReasons: match.matchReasons,
          concerns: match.concerns,
        };
      }),
    );

    return recommendations;
  }

  async save(userId: string, collegeId: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });
    if (!college) throw new NotFoundException('College not found');

    return this.prisma.collegeRecommendation.upsert({
      where: { userId_collegeId: { userId, collegeId } },
      update: { isSaved: true },
      create: { userId, collegeId, score: 70, isSaved: true },
    });
  }

  async saved(userId: string) {
    return this.prisma.collegeRecommendation.findMany({
      where: { userId, isSaved: true },
      include: { college: true },
    });
  }

  async getById(id: string) {
    const college = await this.prisma.college.findUnique({ where: { id } });
    if (!college) throw new NotFoundException('College not found');
    return college;
  }
}
