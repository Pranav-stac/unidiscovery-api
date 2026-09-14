import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationEventType, Prisma, StudentProfile } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { CollegeMatchingService } from './college-matching.service';
import { CollegeMetadata } from '../types/college-metadata.interface';
import type {
  CollegeChatDto,
  CollegeResearchDto,
} from '../controllers/colleges.controller';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import type { Response } from 'express';

const SUITE_CACHE_TTL = 90;
const RESEARCH_CACHE_TTL = 300;

type ChatIntentPlan = {
  intent: 'find_more' | 'save' | 'unsave' | 'answer';
  answer: string;
  countries?: string[];
  courses?: string[];
  degrees?: string[];
  collegeName?: string;
};

type CollegeResearchPayload = {
  results: Array<{
    score: number;
    sources?: Array<Record<string, unknown>>;
    college: { id: string; name: string };
    [key: string]: unknown;
  }>;
  criteria: CollegeResearchDto;
  generatedAt: string;
  notice: string;
};

interface ResearchedCollege {
  name: string;
  country: string;
  city?: string;
  degree?: string;
  field?: string;
  description?: string;
  officialUrl?: string;
  admissionsUrl?: string;
  programUrl?: string;
  tuition?: string;
  deadline?: string;
  requirements?: string[];
  scholarships?: string;
  reasons?: string[];
  concerns?: string[];
}

@Injectable()
export class CollegesService {
  private readonly logger = new Logger(CollegesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
    private readonly matchingService: CollegeMatchingService,
    private readonly notifications: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  async list(
    country?: string,
    field?: string,
    degree?: string,
    search?: string,
  ) {
    return this.prisma.college.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(country
          ? { country: { equals: country, mode: 'insensitive' as const } }
          : {}),
        ...(field
          ? { field: { contains: field, mode: 'insensitive' as const } }
          : {}),
        ...(degree
          ? { degree: { contains: degree, mode: 'insensitive' as const } }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { city: { contains: search, mode: 'insensitive' as const } },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
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
        const meta = (college.metadata ?? {}) as Record<string, unknown>;
        const match = this.safeScore(profile, college, meta);
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

  async getSuite(userId: string) {
    const cacheKey = `college-suite:${userId}`;
    const cached = await this.cacheService.get<Awaited<ReturnType<CollegesService['buildSuite']>>>(cacheKey);
    if (cached) return cached;

    const result = await this.buildSuite(userId);
    await this.cacheService.set(cacheKey, result, SUITE_CACHE_TTL);
    return result;
  }

  private async buildSuite(userId: string) {
    const [profile, saved, recommendations, documents] = await Promise.all([
      this.profileContext.getProfileOrThrow(userId),
      this.saved(userId),
      this.prisma.collegeRecommendation.findMany({
        where: { userId },
        include: { college: true },
        orderBy: { score: 'desc' },
        take: 24,
      }),
      this.prisma.applicationDocument.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);

    const resumeData =
      profile.resumeData && typeof profile.resumeData === 'object'
        ? (profile.resumeData as Record<string, unknown>)
        : {};
    const memoryDocuments = Array.isArray(resumeData.memoryDocuments)
      ? (resumeData.memoryDocuments as Array<Record<string, unknown>>)
      : [];

    const readiness = [
      {
        id: 'academic',
        label: 'Academic record',
        ready: Boolean(profile.transcriptData || profile.percentage),
      },
      {
        id: 'context',
        label: 'CV & supporting documents',
        ready: memoryDocuments.length > 0,
      },
      {
        id: 'countries',
        label: 'Target countries',
        ready: profile.targetCountries.length > 0,
      },
      {
        id: 'degree',
        label: 'Degree or course direction',
        ready: Boolean(profile.targetDegree || profile.stream),
      },
    ];

    return {
      profile,
      readiness,
      readinessScore: Math.round(
        (readiness.filter((item) => item.ready).length / readiness.length) *
          100,
      ),
      memoryDocuments: memoryDocuments.map(({ embedding, ...document }) => ({
        ...document,
        semanticReady: Array.isArray(embedding) && embedding.length > 0,
      })),
      saved,
      recommendations,
      documents,
    };
  }

  async research(
    userId: string,
    criteria: CollegeResearchDto,
    options?: { quick?: boolean; skipCache?: boolean },
  ): Promise<CollegeResearchPayload> {
    const cacheKey = `college-research:${userId}:${JSON.stringify({
      countries: criteria.countries,
      courses: criteria.courses,
      degrees: criteria.degrees,
      budget: criteria.budget,
      priorities: criteria.priorities,
      count: criteria.count,
      excludeNames: criteria.excludeNames,
    })}`;
    if (!options?.skipCache) {
      const cached = await this.cacheService.get<CollegeResearchPayload>(cacheKey);
      if (cached) return cached;
    }

    const quick = options?.quick ?? true;
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const resumeData =
      profile.resumeData && typeof profile.resumeData === 'object'
        ? (profile.resumeData as Record<string, unknown>)
        : {};
    const memoryDocuments = Array.isArray(resumeData.memoryDocuments)
      ? (resumeData.memoryDocuments as Array<Record<string, unknown>>)
      : [];
    const count = Math.min(8, Math.max(3, criteria.count ?? 6));
    const excludeNames = (criteria.excludeNames ?? []).map((name) =>
      name.trim().toLowerCase(),
    );

    const existing = await this.prisma.college.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(criteria.countries.length
          ? {
              OR: criteria.countries.map((country) => ({
                country: { equals: country, mode: 'insensitive' as const },
              })),
            }
          : {}),
      },
      take: count + excludeNames.length,
    });
    const fallback = {
      colleges: existing.map((college) => {
        const metadata = (college.metadata ?? {}) as Record<string, unknown>;
        return {
          name: college.name,
          country: college.country,
          city: college.city ?? undefined,
          degree: college.degree ?? undefined,
          field: college.field ?? undefined,
          description: college.description ?? undefined,
          officialUrl:
            typeof metadata.website === 'string' ? metadata.website : undefined,
          reasons: ['Matches the selected search direction'],
          concerns: [
            'Verify current admissions details on the official website',
          ],
        };
      }),
    };

    try {
    const researched = await this.geminiService.generateStructured<{
      colleges: ResearchedCollege[];
    }>({
      systemPrompt: `You are a careful university research assistant. Return real institutions only.
Every factual college must include its official university URL and, where possible, official admissions and program URLs.
Never invent rankings, tuition, deadlines, programs, acceptance rates, requirements, or URLs.
If a fact cannot be supported by an official link, omit it. Mix reach, target, and likely options.
Do not repeat any college in the excludeNames list.
Recommendations must fit the supplied student evidence and choices, without claiming guaranteed admission.
reasons and concerns must be string arrays.`,
      userPrompt: JSON.stringify({
        requestedCount: count,
        excludeNames,
        criteria,
        student: {
          profile: this.profileContext.buildContextText(profile),
          documentMemory: memoryDocuments.slice(-8).map((document) => ({
            type: document.documentType,
            summary: document.summary,
            facts: document.facts,
          })),
        },
        currentYear: new Date().getFullYear(),
      }),
      schemaDescription:
        '{ colleges: [{ name, country, city?, degree?, field?, description?, officialUrl, admissionsUrl?, programUrl?, tuition?, deadline?, requirements?: string[], scholarships?, reasons?: string[], concerns?: string[] }] }',
      fallback,
    });

    const valid = (researched.colleges ?? [])
      .filter((college) => college.name?.trim() && college.country?.trim())
      .filter(
        (college) => !excludeNames.includes(college.name.trim().toLowerCase()),
      )
      .map((college) => ({
        ...college,
        officialUrl: this.safeUrl(college.officialUrl),
        admissionsUrl: this.safeUrl(college.admissionsUrl),
        programUrl: this.safeUrl(college.programUrl),
        reasons: this.stringArray(college.reasons),
        concerns: this.stringArray(college.concerns),
        requirements: this.stringArray(college.requirements),
      }))
      .slice(0, count);

    const prepared = await Promise.all(
      valid.map((item) => this.persistResearchedCollege(item, profile)),
    );

    const ready = prepared.filter(
      (item): item is NonNullable<(typeof prepared)[number]> => Boolean(item),
    );

    const semanticScores = quick
      ? new Map<string, number>()
      : await this.getSemanticScoresForResearch(
          ready.map(({ college }) => college.id),
          profile,
          criteria,
          memoryDocuments,
        );

    void this.embedCollegesInBackground(ready.map(({ item, college }) => ({
      collegeId: college.id,
      item,
    })));

    const results = await Promise.all(
      ready.map(async ({ item, college, match, sourceChecks }) => {
        const semanticFit = semanticScores.get(college.id);
        const score =
          semanticFit === undefined
            ? match.score
            : Math.round(match.score * 0.75 + semanticFit * 0.25);
        const reasons = this.stringArray(
          item.reasons?.length ? item.reasons : match.matchReasons,
        );
        const concerns = this.stringArray(
          item.concerns?.length ? item.concerns : match.concerns,
        );
        const rationale = reasons.join(' · ');
        const recommendation = await this.prisma.collegeRecommendation.upsert({
          where: { userId_collegeId: { userId, collegeId: college.id } },
          create: {
            userId,
            collegeId: college.id,
            score,
            rationale,
          },
          update: { score, rationale },
        });
        return {
          ...recommendation,
          college,
          matchBreakdown: match.breakdown,
          semanticFit,
          matchReasons: reasons,
          concerns,
          sources: sourceChecks,
        };
      }),
    );

    const payload = {
      results: results.sort((a, b) => b.score - a.score),
      criteria,
      generatedAt: new Date().toISOString(),
      notice:
        'Always check dates, fees, and requirements on the college website before you apply.',
    };
    void this.cacheService.set(cacheKey, payload, RESEARCH_CACHE_TTL);
    return payload;
    } catch (error) {
      this.logger.error(
        `College research failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return {
        results: [],
        criteria,
        generatedAt: new Date().toISOString(),
        notice:
          'We could not finish that search. Please try again in a moment.',
      };
    }
  }

  async chat(
    userId: string,
    message: string,
    options: CollegeChatDto | string[] = [],
  ) {
    const ctx = await this.loadChatContext(userId, options, message);
    return this.executeChatPlan(userId, message, ctx);
  }

  async streamChatToResponse(
    userId: string,
    message: string,
    options: CollegeChatDto | string[] = [],
    res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      const ctx = await this.loadChatContext(userId, options, message);
      const plan = await this.planChatMessage(message, ctx);

      if (plan.intent === 'find_more') {
        const ack =
          plan.answer.trim() ||
          'Searching for colleges that match your request…';
        this.writeSse(res, { chunk: `${ack}\n\n` });
      }

      const result = await this.executeChatPlan(userId, message, ctx, plan);
      const answer = result.answer ?? '';
      for (const part of answer.match(/\S+\s*/g) ?? [answer]) {
        this.writeSse(res, { chunk: part });
      }
      this.writeSse(res, { done: true, ...result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Stream failed';
      this.writeSse(res, { error: msg });
    } finally {
      res.end();
    }
  }

  private writeSse(res: Response, payload: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  private normalizeChatDto(
    options: CollegeChatDto | string[],
    message: string,
  ): CollegeChatDto {
    return Array.isArray(options) ? { message, collegeIds: options } : options;
  }

  private async loadChatContext(
    userId: string,
    options: CollegeChatDto | string[],
    message: string,
  ) {
    const dto = this.normalizeChatDto(options, message);
    const collegeIds = dto.collegeIds ?? [];
    const [profile, recommendations] = await Promise.all([
      this.profileContext.getProfileOrThrow(userId),
      this.prisma.collegeRecommendation.findMany({
        where: {
          userId,
          ...(collegeIds.length ? { collegeId: { in: collegeIds } } : {}),
        },
        include: { college: true },
        orderBy: { score: 'desc' },
        take: 24,
      }),
    ]);
    const shortlist = this.formatShortlistForAi(recommendations);
    const sources = recommendations.flatMap((recommendation) => {
      const metadata =
        recommendation.college.metadata &&
        typeof recommendation.college.metadata === 'object'
          ? (recommendation.college.metadata as Record<string, unknown>)
          : {};
      const factSources = Array.isArray(metadata.factSources)
        ? (metadata.factSources as Array<{ url?: string; verified?: boolean }>)
        : [];
      const official =
        typeof metadata.website === 'string'
          ? metadata.website
          : typeof metadata.officialUrl === 'string'
            ? metadata.officialUrl
            : undefined;
      const links = [
        ...factSources.filter((source) => source.url).map((source) => ({
          collegeId: recommendation.collegeId,
          college: recommendation.college.name,
          url: source.url!,
          verified: Boolean(source.verified),
        })),
        ...(official
          ? [
              {
                collegeId: recommendation.collegeId,
                college: recommendation.college.name,
                url: official,
                verified: true,
              },
            ]
          : []),
      ];
      return links;
    });
    const focusCollege =
      dto.focusCollegeName?.trim() ||
      (collegeIds.length === 1 ? shortlist[0]?.name : undefined);

    return { dto, profile, recommendations, shortlist, sources, focusCollege };
  }

  private formatShortlistForAi(
    recommendations: Array<{
      collegeId: string;
      score: number;
      rationale: string | null;
      isSaved: boolean;
      college: {
        name: string;
        country: string;
        city: string | null;
        field: string | null;
        degree: string | null;
        description: string | null;
        metadata: unknown;
      };
    }>,
  ) {
    return recommendations.map((recommendation) => {
      const metadata =
        recommendation.college.metadata &&
        typeof recommendation.college.metadata === 'object'
          ? (recommendation.college.metadata as Record<string, unknown>)
          : {};
      return {
        id: recommendation.collegeId,
        name: recommendation.college.name,
        country: recommendation.college.country,
        city: recommendation.college.city,
        field: recommendation.college.field,
        degree: recommendation.college.degree,
        score: recommendation.score,
        rationale: recommendation.rationale,
        isSaved: recommendation.isSaved,
        description: recommendation.college.description,
        tuition: metadata.tuition,
        deadline: metadata.deadline,
        requirements: metadata.requirements,
        scholarships: metadata.scholarships,
        officialUrl: metadata.website ?? metadata.officialUrl,
        admissionsUrl: metadata.admissionsUrl,
        programUrl: metadata.programUrl,
        matchReasons: metadata.matchReasons,
        concerns: metadata.concerns,
      };
    });
  }

  private async planChatMessage(
    message: string,
    ctx: Awaited<ReturnType<CollegesService['loadChatContext']>>,
  ): Promise<ChatIntentPlan> {
    return this.geminiService.generateStructured<ChatIntentPlan>({
      systemPrompt: `You are the student's college shortlist assistant with full context about their profile, current colleges, and search filters.

Choose exactly one intent:
- answer: Questions about colleges already on the list — requirements, fees, tuition, deadlines, scholarships, fit, comparisons, pros/cons. Also use when info is missing and you must say to check the official site.
- find_more: ONLY when the student clearly wants NEW colleges added to the list (expand search, different country, more options). Never use for questions about existing colleges.
- save: Student wants to save/bookmark a named college on the list.
- unsave: Student wants to remove a saved college.

Write answer in the same JSON:
- For answer: complete concise reply, max 90 words, short bullets if helpful. Use only shortlist data. Never invent facts.
- For find_more: one short line acknowledging the search (e.g. "I'll search for more options in Canada.").
- For save/unsave: brief confirmation line.
Include countries/courses/degrees only when find_more and the student specified or implied new search criteria.
Include collegeName when save/unsave.`,
      userPrompt: JSON.stringify({
        message,
        focusCollege: ctx.focusCollege,
        student: this.profileContext.buildContextText(ctx.profile),
        shortlist: ctx.shortlist,
        sourceLinks: ctx.sources.slice(0, 16),
        currentSearch: {
          countries: ctx.dto.countries,
          courses: ctx.dto.courses,
          degrees: ctx.dto.degrees,
          budget: ctx.dto.budget,
          priorities: ctx.dto.priorities,
        },
      }),
      schemaDescription:
        '{ intent: "find_more"|"save"|"unsave"|"answer", answer: string, countries?: string[], courses?: string[], degrees?: string[], collegeName?: string }',
      fallback: {
        intent: 'answer',
        answer:
          'I can answer questions about your current colleges or search for more — what would you like to know?',
      },
    });
  }

  private async executeChatPlan(
    userId: string,
    message: string,
    ctx: Awaited<ReturnType<CollegesService['loadChatContext']>>,
    plan?: ChatIntentPlan,
  ) {
    const resolved = plan ?? await this.planChatMessage(message, ctx);
    const { dto, recommendations, sources } = ctx;

    if (resolved.intent === 'find_more') {
      const countries = this.stringArray(
        resolved.countries?.length ? resolved.countries : dto.countries,
      );
      const courses = this.stringArray(
        resolved.courses?.length ? resolved.courses : dto.courses,
      );
      const degrees = this.stringArray(
        resolved.degrees?.length ? resolved.degrees : dto.degrees,
      );
      if (!countries.length || !courses.length || !degrees.length) {
        return {
          intent: 'answer' as const,
          answer:
            resolved.answer ||
            'Tell me the country, subject, and degree you want, and I will find more colleges.',
          sources,
          results: [],
        };
      }
      const extra = await this.research(
        userId,
        {
          countries,
          courses,
          degrees,
          budget: dto.budget,
          priorities: this.stringArray(dto.priorities),
          excludeNames: [
            ...(dto.excludeNames ?? []),
            ...recommendations.map((item) => item.college.name),
          ],
          count: 4,
        },
        { quick: true },
      );
      return {
        intent: 'find_more' as const,
        answer:
          resolved.answer ||
          `Added ${extra.results.length} more colleges to your list.`,
        sources: extra.results.flatMap((item) => item.sources ?? []),
        results: extra.results,
      };
    }

    if (
      (resolved.intent === 'save' || resolved.intent === 'unsave') &&
      resolved.collegeName
    ) {
      const target = resolved.collegeName.trim().toLowerCase();
      const match = recommendations.find((item) =>
        item.college.name.toLowerCase().includes(target),
      );
      if (match) {
        if (resolved.intent === 'save') await this.save(userId, match.collegeId);
        else await this.unsave(userId, match.collegeId);
        return {
          intent: resolved.intent,
          answer:
            resolved.answer ||
            (resolved.intent === 'save'
              ? `Saved ${match.college.name}.`
              : `Removed ${match.college.name} from saved.`),
          sources,
          collegeId: match.collegeId,
        };
      }
    }

    return {
      intent: 'answer' as const,
      answer:
        resolved.answer.trim() ||
        'I do not have enough detail in your shortlist for that — check the official college link or ask me to find more colleges.',
      sources,
    };
  }

  async save(userId: string, collegeId: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });
    if (!college) throw new NotFoundException('College not found');

    const saved = await this.prisma.collegeRecommendation.upsert({
      where: { userId_collegeId: { userId, collegeId } },
      update: { isSaved: true },
      create: { userId, collegeId, score: 70, isSaved: true },
    });
    this.notifications.notify(
      userId,
      NotificationEventType.COLLEGE_SAVED,
      { collegeId, collegeName: college.name },
      { dedupeKey: `college-saved:${collegeId}` },
    );
    void this.cacheService.invalidateStudentCaches(userId);
    return saved;
  }

  async saved(userId: string) {
    return this.prisma.collegeRecommendation.findMany({
      where: { userId, isSaved: true },
      include: { college: true },
    });
  }

  async unsave(userId: string, collegeId: string) {
    await this.prisma.collegeRecommendation.updateMany({
      where: { userId, collegeId },
      data: { isSaved: false },
    });
    void this.cacheService.invalidateStudentCaches(userId);
    return { saved: false };
  }

  async getById(id: string) {
    const college = await this.prisma.college.findUnique({ where: { id } });
    if (!college) throw new NotFoundException('College not found');
    return college;
  }

  private safeUrl(value?: string) {
    if (!value) return undefined;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return undefined;
      return url.toString();
    } catch {
      return undefined;
    }
  }

  private async getSemanticScoresForResearch(
    collegeIds: string[],
    profile: StudentProfile,
    criteria: CollegeResearchDto,
    memoryDocuments: Array<Record<string, unknown>>,
  ) {
    if (!collegeIds.length) return new Map<string, number>();
    const studentMatchText = [
      this.profileContext.buildContextText(profile),
      JSON.stringify(criteria),
      ...memoryDocuments
        .slice(-8)
        .map((document) => String(document.summary ?? '')),
    ].join('\n');
    const queryEmbedding = await this.geminiService.generateEmbedding(
      studentMatchText,
      'RETRIEVAL_QUERY',
    );
    if (!queryEmbedding.length) return new Map<string, number>();
    return this.getSemanticScores(collegeIds, queryEmbedding);
  }

  private async persistResearchedCollege(
    item: ResearchedCollege,
    profile: StudentProfile,
  ) {
    try {
      const officialUrl = item.officialUrl;
      const sourceChecks = officialUrl
        ? [{ url: officialUrl, verified: false }]
        : [];
      const existingCollege = await this.prisma.college.findFirst({
        where: {
          name: { equals: item.name, mode: 'insensitive' },
          country: { equals: item.country, mode: 'insensitive' },
          deletedAt: null,
        },
      });
      const oldMetadata =
        existingCollege?.metadata &&
        typeof existingCollege.metadata === 'object'
          ? (existingCollege.metadata as Record<string, unknown>)
          : {};
      const metadata = {
        ...oldMetadata,
        fields: this.stringArray(oldMetadata.fields, item.field),
        programs: this.stringArray(oldMetadata.programs, item.degree),
        streams: this.stringArray(oldMetadata.streams),
        tags: this.stringArray(oldMetadata.tags),
        website: item.officialUrl,
        admissionsUrl: item.admissionsUrl,
        programUrl: item.programUrl,
        tuitionDisplay: item.tuition,
        deadlineDisplay: item.deadline,
        requirements: Array.isArray(item.requirements)
          ? item.requirements
          : [],
        scholarshipsDisplay: item.scholarships,
        factSources: sourceChecks,
        researchedAt: new Date().toISOString(),
        verificationStatus: sourceChecks.some((source) => source.verified)
          ? 'source-reachable'
          : 'links-unverified',
      };
      const college = existingCollege
        ? await this.prisma.college.update({
            where: { id: existingCollege.id },
            data: {
              city: item.city,
              degree: item.degree,
              field: item.field,
              description: item.description,
              metadata,
            },
          })
        : await this.prisma.college.create({
            data: {
              name: item.name.trim(),
              country: item.country.trim(),
              city: item.city,
              degree: item.degree,
              field: item.field,
              description: item.description,
              metadata,
            },
          });

      if (officialUrl) {
        void this.verifySourceInBackground(college.id, officialUrl, metadata);
      }

      return {
        item,
        college,
        match: this.safeScore(profile, college, metadata),
        sourceChecks,
      };
    } catch (error) {
      this.logger.warn(
        `Could not save researched college ${item.name}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }

  private async verifySourceInBackground(
    collegeId: string,
    officialUrl: string,
    metadata: Record<string, unknown>,
  ) {
    const verified = await this.checkSource(officialUrl);
    const factSources = [{ url: officialUrl, verified }];
    await this.prisma.college.update({
      where: { id: collegeId },
      data: {
        metadata: {
          ...metadata,
          factSources,
          verificationStatus: verified
            ? 'source-reachable'
            : 'links-unverified',
        },
      },
    });
  }

  private safeScore(
    profile: StudentProfile,
    college: {
      id: string;
      name: string;
      country: string;
      field?: string | null;
    },
    metadata: Record<string, unknown>,
  ) {
    try {
      return this.matchingService.scoreCollege(profile, {
        id: college.id,
        name: college.name,
        country: college.country,
        field: college.field,
        metadata: metadata as unknown as CollegeMetadata,
      });
    } catch (error) {
      this.logger.warn(
        `College scoring failed for ${college.name}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return {
        score: 60,
        breakdown: {
          fieldFit: 60,
          countryFit: 60,
          academicFit: 60,
          interestFit: 60,
          budgetFit: 60,
        },
        matchReasons: [],
        concerns: [],
      };
    }
  }

  private async checkSource(url: string) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(1200),
        headers: { 'User-Agent': 'AI-Discovery-Admissions-Research/1.0' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private stringArray(value: unknown, fallback?: string): string[] {
    const values = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : typeof value === 'string' && value.trim()
        ? value
            .split(/[,|/]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    if (fallback?.trim() && !values.includes(fallback.trim())) {
      values.push(fallback.trim());
    }
    return values;
  }

  private embedCollegesInBackground(
    colleges: Array<{ collegeId: string; item: ResearchedCollege }>,
  ) {
    void Promise.all(
      colleges.map(async ({ collegeId, item }) => {
        const embedding = await this.geminiService.generateEmbedding(
          this.buildCollegeEmbeddingText(item),
        );
        if (embedding.length) {
          await this.upsertCollegeEmbedding(
            collegeId,
            this.buildCollegeEmbeddingText(item),
            embedding,
          );
        }
      }),
    ).catch((error) => {
      this.logger.warn(
        `Background college matching update failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    });
  }

  private buildCollegeEmbeddingText(college: ResearchedCollege): string {
    return [
      college.name,
      college.country,
      college.city,
      college.degree,
      college.field,
      college.description,
      ...(college.requirements ?? []),
      ...(college.reasons ?? []),
      college.scholarships,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async upsertCollegeEmbedding(
    collegeId: string,
    content: string,
    embedding: number[],
  ) {
    try {
      const vector = `[${embedding.map((value) => Number(value)).join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO college_embeddings
          (id, college_id, embedding, content, created_at, updated_at)
        VALUES
          (uuid_generate_v4(), ${collegeId}::uuid, ${vector}::vector, ${content}, NOW(), NOW())
        ON CONFLICT (college_id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          content = EXCLUDED.content,
          updated_at = NOW()
      `;
    } catch (error) {
      this.logger.warn(
        `College embedding could not be stored: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async getSemanticScores(
    collegeIds: string[],
    embedding: number[],
  ): Promise<Map<string, number>> {
    if (!collegeIds.length) return new Map();
    try {
      const vector = `[${embedding.map((value) => Number(value)).join(',')}]`;
      const rows = await this.prisma.$queryRaw<
        Array<{ collegeId: string; similarity: number }>
      >(Prisma.sql`
        SELECT
          college_id::text AS "collegeId",
          1 - (embedding <=> ${vector}::vector) AS similarity
        FROM college_embeddings
        WHERE college_id IN (${Prisma.join(
          collegeIds.map((id) => Prisma.sql`${id}::uuid`),
        )})
      `);
      return new Map(
        rows.map((row) => [
          row.collegeId,
          Math.round(Math.max(0, Math.min(1, Number(row.similarity))) * 100),
        ]),
      );
    } catch (error) {
      this.logger.warn(
        `Semantic scores unavailable; using profile scoring: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return new Map();
    }
  }
}
