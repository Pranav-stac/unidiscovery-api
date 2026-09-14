import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationEventType, Prisma, TutoringTestType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { OfficialExamService } from './official-exam.service';
import { SAT_AUTHORED_BANK, satItemMetadata, type SatSection } from '../data/sat-authored-bank';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { pipeTextStreamToSse } from '../../../common/utils/sse-stream.util';
import type { Response } from 'express';

const OVERVIEW_CACHE_TTL = 60;

type GeneratedItem = {
  section: SatSection;
  skill: string;
  passageTitle?: string;
  passage?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
};

const SAT_MODULES = [
  {
    id: 'reading-writing' as SatSection,
    label: 'Reading and Writing',
    count: 8,
    skills: ['Words in Context', 'Central Ideas and Details', 'Command of Evidence', 'Transitions', 'Standard English Conventions'],
  },
  {
    id: 'math' as SatSection,
    label: 'Math',
    count: 8,
    skills: ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'],
  },
];

@Injectable()
export class TutoringService {
  private readonly logger = new Logger(TutoringService.name);
  private readonly generateLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly officialExam: OfficialExamService,
    private readonly notifications: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  private async invalidateOverview(userId: string, testType: TutoringTestType) {
    await Promise.all([
      this.cacheService.del(`tutoring-overview:${userId}:${testType}`),
      this.cacheService.del(`dashboard:${userId}`),
    ]);
  }

  async getOverview(userId: string, testType: TutoringTestType = TutoringTestType.SAT) {
    const cacheKey = `tutoring-overview:${userId}:${testType}`;
    const cached = await this.cacheService.get<Awaited<ReturnType<TutoringService['buildOverview']>>>(cacheKey);
    if (cached) return cached;

    const result = await this.buildOverview(userId, testType);
    await this.cacheService.set(cacheKey, result, OVERVIEW_CACHE_TTL);
    return result;
  }

  private async buildOverview(userId: string, testType: TutoringTestType) {
    if (testType === TutoringTestType.SAT) await this.ensureAuthoredBank();
    const [catalog, completed, progress, stored] = await Promise.all([
      testType === TutoringTestType.SAT ? this.officialExam.satCatalog() : [],
      this.completedResources(userId, testType),
      this.getProgress(userId, testType),
      this.prisma.tutoringQuestion.findMany({
        where: { testType, isActive: true },
        select: { metadata: true },
      }),
    ]);

    return {
      exam: testType,
      title: testType === TutoringTestType.SAT ? 'Digital SAT' : testType,
      summary:
        'Practice Digital SAT–format questions in the app, the way Prepare Buddy does: a stored bank tagged by official domains, then more items authored into that bank. Bluebook stays available for College Board’s own full tests.',
      format: {
        score: '400–1600',
        sections: [
          'Reading and Writing — two adaptive modules, 27 questions each',
          'Math — two adaptive modules, 22 questions each',
        ],
      },
      modules: SAT_MODULES.map((module) => ({
        ...module,
        questionCount: stored.filter((row) => this.sectionOf(row.metadata) === module.id).length,
        accuracy: progress.bySection?.[module.id]?.accuracy ?? 0,
        attempted: progress.bySection?.[module.id]?.total ?? 0,
      })),
      officialPractice: catalog.map((item) => ({
        ...item,
        done: completed.includes(item.id),
      })),
      progress,
      comingNext: ['GRE', 'GMAT', 'IELTS', 'TOEFL', 'ACT'],
    };
  }

  async markResource(userId: string, testType: TutoringTestType, resourceId: string, done: boolean) {
    const row = await this.progressRow(userId, testType);
    const current = this.readCompleted(row.metadata);
    const next = done
      ? [...new Set([...current, resourceId])]
      : current.filter((id) => id !== resourceId);
    await this.prisma.tutoringSession.update({
      where: { id: row.id },
      data: { metadata: { kind: 'resource-progress', completed: next } },
    });
    void this.invalidateOverview(userId, testType);
    return { completed: next };
  }

  async getQuestions(
    testType: TutoringTestType,
    userId?: string,
    section?: string,
    limit = 8,
  ) {
    if (testType === TutoringTestType.SAT) {
      await this.ensureAuthoredBank();
      void this.topUpSat(section as SatSection | undefined);
    }

    const attemptedIds = userId
      ? (
          await this.prisma.tutoringAttempt.findMany({
            where: { userId, testType },
            select: { questionId: true },
          })
        ).map((row) => row.questionId)
      : [];

    const rows = await this.prisma.tutoringQuestion.findMany({
      where: {
        testType,
        isActive: true,
        ...(attemptedIds.length ? { id: { notIn: attemptedIds } } : {}),
      },
      take: 80,
      orderBy: { createdAt: 'desc' },
    });
    const filtered = section
      ? rows.filter((row) => this.sectionOf(row.metadata) === section)
      : rows;
    const pool = filtered.length ? filtered : rows;

    const capped = Math.min(Math.max(limit, 1), section === 'math' ? 22 : 27);
    const ordered = [...pool].sort((a, b) => {
      const aId = (a.metadata as { bankId?: string } | null)?.bankId ?? '';
      const bId = (b.metadata as { bankId?: string } | null)?.bankId ?? '';
      return aId.localeCompare(bId, undefined, { numeric: true });
    });
    return ordered
      .slice(0, capped)
      .map((row) => ({
        id: row.id,
        testType: row.testType,
        question: row.question,
        options: this.shuffle((row.options as string[]) ?? []),
        difficulty: row.difficulty,
        section: this.sectionOf(row.metadata),
        skill: this.skillOf(row.metadata),
        passageTitle: this.passageTitleOf(row.metadata),
        passage: this.passageOf(row.metadata),
        passageWordCount: this.passageWordCountOf(row.metadata),
        questionType: this.questionTypeOf(row.metadata) ?? 'MULTIPLE_CHOICE',
      }));
  }

  async submitAttempt(
    userId: string,
    questionId: string,
    testType: TutoringTestType,
    answer: string,
  ) {
    const question = await this.prisma.tutoringQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found');
    const isCorrect =
      question.correctAnswer?.trim().toLowerCase() === answer.trim().toLowerCase();
    await this.prisma.tutoringAttempt.create({
      data: { userId, questionId, testType, answer, isCorrect },
    });
    void this.invalidateOverview(userId, testType);
    const attemptCount = await this.prisma.tutoringAttempt.count({
      where: { userId, testType },
    });
    const milestones = [10, 25, 50, 100];
    if (milestones.includes(attemptCount)) {
      this.notifications.notify(
        userId,
        NotificationEventType.TUTORING_MILESTONE,
        {
          attemptCount,
          milestoneTitle: `${attemptCount} SAT questions practiced`,
          milestoneBody: `You've answered ${attemptCount} ${testType} practice questions. Consistent drills build timing and accuracy.`,
        },
        { dedupeKey: `tutoring-milestone:${testType}:${attemptCount}` },
      );
    }
    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation ?? '',
    };
  }

  async getProgress(userId: string, testType?: TutoringTestType) {
    const completed = testType ? await this.completedResources(userId, testType) : [];
    const withMeta = await this.prisma.tutoringAttempt.findMany({
      where: { userId, ...(testType ? { testType } : {}) },
      include: { question: { select: { metadata: true } } },
    });
    const total = withMeta.length;
    const correct = withMeta.filter((row) => row.isCorrect).length;
    const bySection = Object.fromEntries(
      SAT_MODULES.map((module) => {
        const rows = withMeta.filter((row) => this.sectionOf(row.question.metadata) === module.id);
        const ok = rows.filter((row) => row.isCorrect).length;
        return [
          module.id,
          {
            total: rows.length,
            correct: ok,
            accuracy: rows.length ? Math.round((ok / rows.length) * 100) : 0,
          },
        ];
      }),
    );
    return {
      total,
      correct,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      officialCompleted: completed.length,
      bySection,
    };
  }

  async chat(userId: string, testType: TutoringTestType, message: string) {
    const session = await this.prisma.tutoringSession.create({
      data: {
        userId,
        testType,
        messages: [{ role: 'user', content: message }] as Prisma.InputJsonValue,
      },
    });
    const reply = await this.geminiService.generateText(this.coachPrompt(message));
    await this.prisma.tutoringSession.update({
      where: { id: session.id },
      data: {
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: reply },
        ],
      },
    });
    return { reply, sessionId: session.id };
  }

  async streamChatToResponse(
    userId: string,
    testType: TutoringTestType,
    message: string,
    res: Response,
  ) {
    const session = await this.prisma.tutoringSession.create({
      data: {
        userId,
        testType,
        messages: [{ role: 'user', content: message }] as Prisma.InputJsonValue,
      },
    });
    await pipeTextStreamToSse(
      res,
      this.geminiService.streamGenerateText(this.coachPrompt(message)),
      async (reply) => {
        await this.prisma.tutoringSession.update({
          where: { id: session.id },
          data: {
            messages: [
              { role: 'user', content: message },
              { role: 'assistant', content: reply },
            ],
          },
        });
        return { reply, sessionId: session.id };
      },
    );
  }

  private coachPrompt(message: string) {
    return `You are a Digital SAT coach. Teach strategy and skills. Do not quote or recreate official College Board SAT questions.\n${message}`;
  }

  private async completedResources(userId: string, testType: TutoringTestType) {
    const rows = await this.prisma.tutoringSession.findMany({
      where: { userId, testType },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    const progress = rows.find((row) => this.isProgress(row.metadata));
    return this.readCompleted(progress?.metadata);
  }

  private async progressRow(userId: string, testType: TutoringTestType) {
    const rows = await this.prisma.tutoringSession.findMany({
      where: { userId, testType },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    const existing = rows.find((row) => this.readCompleted(row.metadata).length || this.isProgress(row.metadata));
    if (existing) return existing;
    return this.prisma.tutoringSession.create({
      data: {
        userId,
        testType,
        messages: [],
        metadata: { kind: 'resource-progress', completed: [] },
      },
    });
  }

  private isProgress(metadata: unknown) {
    return (metadata as { kind?: string } | null)?.kind === 'resource-progress';
  }

  private readCompleted(metadata: unknown) {
    const value = (metadata as { completed?: string[] } | null)?.completed;
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  }

  private async ensureAuthoredBank() {
    const existing = await this.prisma.tutoringQuestion.findMany({
      where: { testType: TutoringTestType.SAT },
      select: { id: true, metadata: true },
    });
    const byBankId = new Map(
      existing
        .map((row) => [(row.metadata as { bankId?: string } | null)?.bankId, row.id] as const)
        .filter(([bankId]) => Boolean(bankId)),
    );

    for (const item of SAT_AUTHORED_BANK) {
      const metadata = satItemMetadata(item);
      const foundId = byBankId.get(item.bankId);
      if (foundId) {
        await this.prisma.tutoringQuestion.update({
          where: { id: foundId },
          data: {
            question: item.question,
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            difficulty: item.difficulty,
            isActive: true,
            metadata,
          },
        });
        continue;
      }
      await this.prisma.tutoringQuestion.create({
        data: {
          testType: TutoringTestType.SAT,
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          difficulty: item.difficulty,
          metadata,
        },
      });
    }
  }

  private async topUpSat(section?: SatSection) {
    const key = section ?? 'all';
    const inflight = this.generateLocks.get(key);
    if (inflight) return inflight;
    const run = this.generateSatBatch(section).finally(() => this.generateLocks.delete(key));
    this.generateLocks.set(key, run);
    return run;
  }

  private async generateSatBatch(section?: SatSection) {
    if (!this.geminiService.isConfigured()) return;
    const target = section ?? 'reading-writing';
    const count = await this.prisma.tutoringQuestion.count({
      where: { testType: TutoringTestType.SAT, isActive: true },
    });
    if (count >= 48) return;

    const existing = await this.prisma.tutoringQuestion.findMany({
      where: { testType: TutoringTestType.SAT },
      select: { question: true },
      take: 40,
    });

    const generated = await this.geminiService.generateStructured<{ items: GeneratedItem[] }>({
      systemPrompt: `Author ORIGINAL Digital SAT practice MCQs in College Board's current format.
Never copy College Board, Khan Academy, Bluebook, PrepareBuddy, or leaked SAT wording.
Reading and Writing: include passageTitle, passage (40-120 words), and question stem. Math: stem only.
4 choices each. correctAnswer must match one option exactly.`,
      userPrompt: JSON.stringify({
        section: target,
        count: 6,
        avoid: existing.map((row) => row.question.slice(0, 90)),
      }),
      schemaDescription:
        '{ items: [{ section: "reading-writing"|"math", skill, passageTitle?, passage?, question, options: string[4], correctAnswer, explanation, difficulty: 1|2|3 }] }',
      fallback: { items: [] },
    });

    for (const item of generated.items ?? []) {
      if (!item.question || !item.options?.includes(item.correctAnswer)) continue;
      const duplicate = await this.prisma.tutoringQuestion.findFirst({
        where: { testType: TutoringTestType.SAT, question: item.question },
      });
      if (duplicate) continue;
      await this.prisma.tutoringQuestion.create({
        data: {
          testType: TutoringTestType.SAT,
          question: item.question,
          options: item.options.slice(0, 4),
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          difficulty: Number(item.difficulty) || 2,
          metadata: {
            section: item.section === 'math' ? 'math' : 'reading-writing',
            skill: item.skill,
            source: 'authored',
            passageTitle: item.section === 'reading-writing' ? item.passageTitle : undefined,
            passage: item.section === 'reading-writing' ? item.passage : undefined,
            passageWordCount: item.passage
              ? item.passage.trim().split(/\s+/).filter(Boolean).length
              : undefined,
            questionType: 'MULTIPLE_CHOICE',
          },
        },
      });
    }
  }

  private sectionOf(metadata: unknown): SatSection | undefined {
    const value = (metadata as { section?: string } | null)?.section;
    return value === 'math' || value === 'reading-writing' ? value : undefined;
  }

  private skillOf(metadata: unknown) {
    return (metadata as { skill?: string } | null)?.skill;
  }

  private passageTitleOf(metadata: unknown) {
    return (metadata as { passageTitle?: string } | null)?.passageTitle;
  }

  private passageOf(metadata: unknown) {
    return (metadata as { passage?: string } | null)?.passage;
  }

  private passageWordCountOf(metadata: unknown) {
    return (metadata as { passageWordCount?: number } | null)?.passageWordCount;
  }

  private questionTypeOf(metadata: unknown) {
    return (metadata as { questionType?: string } | null)?.questionType;
  }

  private shuffle<T>(items: T[]) {
    return [...items].sort(() => Math.random() - 0.5);
  }
}
