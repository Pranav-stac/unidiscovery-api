import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';

@Injectable()
export class CareersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async list(category?: string) {
    return this.prisma.career.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { title: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const career = await this.prisma.career.findUnique({ where: { slug } });
    if (!career) throw new NotFoundException('Career not found');
    return career;
  }

  async listSubjects(category?: string) {
    return this.prisma.subject.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { title: 'asc' },
    });
  }

  async recommend(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const careers = await this.prisma.career.findMany({
      where: { isActive: true },
    });

    const scored = careers
      .map((career) => ({
        career,
        score: this.profileContext.scoreByInterests(
          [...career.subjects, ...career.skills],
          profile.interests,
          profile.strengths,
          profile.subjects,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return Promise.all(
      scored.map(async ({ career, score }) => {
        const rationale = await this.geminiService.generateText(
          `In one sentence, explain why ${career.title} suits a Grade ${profile.grade ?? '?'} student interested in ${profile.interests.join(', ')}. Mention one trade-off.`,
        );
        const rec = await this.prisma.careerRecommendation.upsert({
          where: { userId_careerId: { userId, careerId: career.id } },
          update: { score, rationale },
          create: { userId, careerId: career.id, score, rationale },
        });
        return { ...rec, career };
      }),
    );
  }

  async generatePaths(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const careers = await this.prisma.career.findMany({
      where: { isActive: true },
      take: 8,
    });

    const prompt = `Given a student in Grade ${profile.grade}, stream ${profile.stream ?? 'undecided'}, interests: ${profile.interests.join(', ')}, strengths: ${profile.strengths.join(', ')}.
Generate 3 career path combinations as JSON array with fields: title, careers (array), tradeoffs (array), viability (high/medium), exampleEmployers (array).
Include at least one dual-path like STEM+business.`;

    const result = await this.geminiService.generateStructured<{
      paths: Array<{
        title: string;
        careers: string[];
        tradeoffs: string[];
        viability: string;
        exampleEmployers: string[];
      }>;
    }>({
      systemPrompt: 'You are a career guidance expert for students aged 13-22.',
      userPrompt: prompt,
      schemaDescription:
        '{ paths: [{ title, careers[], tradeoffs[], viability, exampleEmployers[] }] }',
      fallback: { paths: this.fallbackPaths(careers) },
    });

    return {
      paths: result.paths?.length ? result.paths : this.fallbackPaths(careers),
      profile: {
        grade: profile.grade,
        stream: profile.stream,
        interests: profile.interests,
      },
    };
  }

  async save(userId: string, careerId: string) {
    return this.prisma.careerRecommendation.upsert({
      where: { userId_careerId: { userId, careerId } },
      update: { isSaved: true },
      create: { userId, careerId, score: 70, isSaved: true },
    });
  }

  async saved(userId: string) {
    return this.prisma.careerRecommendation.findMany({
      where: { userId, isSaved: true },
      include: { career: true },
    });
  }

  private fallbackPaths(
    careers: Array<{
      title: string;
      combinations: string[];
      employers: string[];
    }>,
  ) {
    return [
      {
        title: 'Pure STEM Track',
        careers: [
          careers[0]?.title ?? 'Software Engineer',
          careers[4]?.title ?? 'Data Scientist',
        ],
        tradeoffs: ['High earning potential', 'Requires continuous learning'],
        viability: 'high',
        exampleEmployers: careers[0]?.employers.slice(0, 3) ?? [
          'Google',
          'Microsoft',
        ],
      },
      {
        title: 'STEM + Business Dual Path',
        careers: ['Software Engineer', 'Management Consultant'],
        tradeoffs: ['Broader career options', 'Split focus during studies'],
        viability: 'high',
        exampleEmployers: ['McKinsey Digital', 'BCG Gamma', 'Deloitte'],
      },
      {
        title: 'Creative + Technology',
        careers: ['Product Designer', 'Software Engineer'],
        tradeoffs: ['Portfolio-dependent', 'Growing hybrid roles'],
        viability: 'medium',
        exampleEmployers: ['Figma', 'Apple', 'Airbnb'],
      },
    ];
  }
}
