import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationEventType } from '@prisma/client';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { ProfilesRepository } from '../../../infrastructure/database/repositories/profiles.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import {
  BOARD_LABELS,
  BoardKey,
  OfficialSubject,
  OfficialUnit,
  defaultSubjectIds,
  isSchoolSubjectExtra,
  normalizeBoard,
  normalizeGrade,
  normalizeStream,
  officialPortal,
  officialSubject,
  slugify,
  subjectName,
} from '../data/curriculum-sources';
import {
  OfficialMediaService,
  hasOfficialFiles,
  isFreshSyllabus,
} from './official-media.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { pipeTextStreamToSse } from '../../../common/utils/sse-stream.util';
import type { Response } from 'express';

const JOURNEY_CACHE_TTL = 120;

type HomeschoolPrefs = { extraSubjects?: string[] };

function readHomeschoolExtras(preferences: unknown): string[] {
  const prefs = preferences as { homeschool?: HomeschoolPrefs } | null;
  return (prefs?.homeschool?.extraSubjects ?? [])
    .map(slugify)
    .filter((id) => id && isSchoolSubjectExtra(id));
}

function mergeHomeschoolPrefs(
  preferences: unknown,
  patch: Partial<HomeschoolPrefs>,
): Record<string, unknown> {
  const root = (preferences as Record<string, unknown> | null) ?? {};
  const homeschool = (root.homeschool as HomeschoolPrefs | undefined) ?? {};
  return {
    ...root,
    homeschool: { ...homeschool, ...patch },
  };
}

export const PASS_SCORE = 70;

type LessonContent = {
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string; keyPoints: string[] }>;
  workedExample: { problem: string; steps: string[]; answer: string };
  recap: string[];
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  hint: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  focusArea?: string;
  conceptTag?: string;
};

type QuizSet = { questions: QuizQuestion[] };

type DiagnosticReportShape = {
  strengths?: string[];
  interests?: string[];
  learningStyle?: string;
  skillGaps?: string[];
  actionPlan?: string[];
  summary?: string;
};

type PersonalizationContext = {
  diagnosticCompleted: boolean;
  strengths: string[];
  interests: string[];
  skillGaps: string[];
  learningStyle: string;
  aiSummary: string;
  actionPlan: string[];
  priorPracticeScore: number | null;
  priorTestScore: number | null;
  lessonSummary: string;
  lessonRecap: string[];
  chapterSourceText: string;
  focusNote: string;
};

type ChatTurn = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class HomeschoolingService {
  private readonly logger = new Logger(HomeschoolingService.name);
  private readonly mcpUrl: string;
  private readonly lessonLocks = new Map<string, Promise<{ lesson: LessonContent; cached: boolean }>>();
  private readonly quizLocks = new Map<string, Promise<{ quiz: { questions: Omit<QuizQuestion, 'answerIndex'>[] }; cached: boolean }>>();
  private readonly conceptReviewLocks = new Map<
    string,
    Promise<Awaited<ReturnType<HomeschoolingService['buildConceptReview']>>>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesRepository: ProfilesRepository,
    private readonly profileContext: ProfileContextService,
    private readonly geminiService: GeminiService,
    private readonly officialMedia: OfficialMediaService,
    private readonly notifications: NotificationsService,
    private readonly cacheService: CacheService,
    config: ConfigService,
  ) {
    this.mcpUrl = (config.get<string>('ncertMcpUrl') ?? '').replace(/\/$/, '');
  }

  async getJourney(userId: string) {
    const cacheKey = `homeschool-journey:${userId}`;
    const cached = await this.cacheService.get<Awaited<ReturnType<HomeschoolingService['buildJourney']>>>(cacheKey);
    if (cached) return cached;

    const result = await this.buildJourney(userId);
    await this.cacheService.set(cacheKey, result, JOURNEY_CACHE_TTL);
    return result;
  }

  private async buildJourney(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const board = normalizeBoard(profile.board);
    const grade = normalizeGrade(profile.grade, profile.classGroup);
    const stream = grade >= 11 ? normalizeStream(profile.stream) : '';
    const extras = readHomeschoolExtras(profile.preferences);
    const listed =
      board === 'nios' ? await this.officialMedia.peekListing(grade) : [];
    const subjectIds = listed.length
      ? [...new Set([...listed.map((item) => item.subjectId), ...extras])]
      : defaultSubjectIds(board, grade, stream, extras);
    const progressRows = await this.prisma.homeschoolProgress.findMany({
      where: { userId },
    });
    const progressMap = new Map(progressRows.map((row) => [row.unitId, row]));
    const syllabusCache = await this.loadSyllabusCache(board, grade, subjectIds);

    const subjects = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const subject = await this.resolveSubject(board, grade, subjectId, {
          syllabusCache,
          generate: false,
          live: false,
        });
        const summary = this.summarizeSubject(board, grade, subjectId, subject, progressMap);
        const { units, ...rest } = summary;
        void units;
        return rest;
      }),
    );

    const recommendedSubject =
      subjects.find((subject) => subject.nextUnitId)?.id ?? subjects[0]?.id ?? null;
    const recommended =
      subjects.find((subject) => subject.id === recommendedSubject)?.nextUnitId ?? null;

    return {
      board,
      boardLabel: BOARD_LABELS[board],
      grade,
      stream: grade >= 11 ? stream || null : null,
      portalUrl: officialPortal(board, grade),
      studentName: undefined,
      extraSubjects: readHomeschoolExtras(profile.preferences),
      recommendedUnitId: recommended,
      recommendedSubjectId: recommendedSubject,
      stats: {
        subjects: subjects.length,
        units: subjects.reduce((sum, subject) => sum + subject.unitCount, 0),
        mastered: subjects.reduce((sum, subject) => sum + subject.mastered, 0),
      },
      subjects,
    };
  }

  async getSubject(userId: string, subjectId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const board = normalizeBoard(profile.board);
    const grade = normalizeGrade(profile.grade, profile.classGroup);
    const stream = grade >= 11 ? normalizeStream(profile.stream) : '';
    const extras = readHomeschoolExtras(profile.preferences);
    const listed =
      board === 'nios' ? await this.officialMedia.peekListing(grade) : [];
    const subjectIds = listed.length
      ? [...new Set([...listed.map((item) => item.subjectId), ...extras])]
      : defaultSubjectIds(board, grade, stream, extras);
    const normalizedId = slugify(subjectId);
    if (!subjectIds.includes(normalizedId) && board !== 'nios') {
      throw new NotFoundException('Subject not found');
    }
    const progressRows = await this.prisma.homeschoolProgress.findMany({
      where: { userId },
    });
    const progressMap = new Map(progressRows.map((row) => [row.unitId, row]));
    const syllabusCache = await this.loadSyllabusCache(board, grade, [normalizedId]);
    const subject = await this.resolveSubject(board, grade, normalizedId, {
      syllabusCache,
      generate: false,
      live: true,
    });
    return {
      boardLabel: BOARD_LABELS[board],
      grade,
      ...this.summarizeSubject(board, grade, normalizedId, subject, progressMap),
    };
  }

  async setup(
    userId: string,
    input: {
      board?: string;
      grade?: number;
      stream?: string;
      extraSubjects?: string[];
    },
  ) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const data: Record<string, unknown> = {};
    const grade = input.grade;
    if (input.board) data.board = input.board;
    if (grade) {
      data.grade = grade;
      data.classGroup =
        grade <= 8 ? '6-8' : grade <= 10 ? '9-10' : '11-12';
      if (grade < 11) data.stream = null;
    }
    if (grade && grade >= 11) {
      data.stream = input.stream?.trim() ? input.stream : null;
    }
    if (input.extraSubjects) {
      data.preferences = mergeHomeschoolPrefs(profile.preferences, {
        extraSubjects: input.extraSubjects
          .map(slugify)
          .filter((id) => id && isSchoolSubjectExtra(id)),
      });
    }
    if (Object.keys(data).length) {
      await this.profilesRepository.update(userId, data);
    }
    return this.getJourney(userId);
  }

  async getUnit(userId: string, unitId: string) {
    const parsed = this.parseUnitId(unitId);
    const subject = await this.resolveSubject(parsed.board, parsed.grade, parsed.subjectId);
    const unit = subject.units.find((item) => item.chapter === parsed.chapter);
    if (!unit) throw new NotFoundException('Unit not found');
    const progress = await this.prisma.homeschoolProgress.findUnique({
      where: { userId_unitId: { userId, unitId } },
    });
    return {
      id: unitId,
      board: parsed.board,
      boardLabel: BOARD_LABELS[parsed.board],
      grade: parsed.grade,
      subjectId: parsed.subjectId,
      subjectName: subject.name,
      chapter: unit.chapter,
      title: unit.title,
      textbookUrl: unit.textbookUrl,
      videoUrl: unit.videoUrl,
      videos: unit.videos ?? [],
      audios: unit.audios ?? [],
      portalUrl: officialPortal(parsed.board, parsed.grade),
      learnDone: Boolean(progress?.learnDone),
      practiceScore: progress?.practiceScore ?? null,
      testScore: progress?.testScore ?? null,
      mastered: Boolean(progress?.mastered),
      hasLesson: Boolean(progress?.lessonCache),
      hasPractice: Boolean(progress?.practiceCache),
      hasTest: Boolean(progress?.testCache),
    };
  }

  async getLesson(userId: string, unitId: string, refresh = false) {
    const lockKey = `${userId}:${unitId}:${refresh ? '1' : '0'}`;
    const inflight = this.lessonLocks.get(lockKey);
    if (inflight) return inflight;
    const run = this.buildLesson(userId, unitId, refresh).finally(() => {
      this.lessonLocks.delete(lockKey);
    });
    this.lessonLocks.set(lockKey, run);
    return run;
  }

  private async buildLesson(userId: string, unitId: string, refresh = false) {
    const context = await this.unitContext(userId, unitId);
    const existing = await this.progress(userId, unitId);
    if (!refresh && existing.lessonCache) {
      return { lesson: existing.lessonCache as LessonContent, cached: true };
    }
    const personalization = await this.buildPersonalizationContext(userId, context, existing);
    const lesson = await this.geminiService.generateStructured<LessonContent>({
      systemPrompt: `You are a ${context.boardLabel} Class ${context.grade} teacher writing a highly personalized lesson.
Adapt depth and examples to this student's diagnostic profile, learning style, and known gaps.
Spend extra time on weak areas. Use simpler language for gaps and stretch examples for strengths.
4 sections max. sections: [{ heading, body, keyPoints }]. workedExample: { problem, steps, answer }.`,
      userPrompt: JSON.stringify({
        board: context.boardLabel,
        grade: context.grade,
        subject: context.subject.name,
        chapter: context.unit.chapter,
        title: context.unit.title,
        officialPdf: context.unit.textbookUrl,
        chapterSource: personalization.chapterSourceText.slice(0, 3000),
        studentProfile: {
          diagnosticCompleted: personalization.diagnosticCompleted,
          strengths: personalization.strengths,
          interests: personalization.interests,
          skillGaps: personalization.skillGaps,
          learningStyle: personalization.learningStyle,
          aiSummary: personalization.aiSummary,
          actionPlan: personalization.actionPlan,
          focusNote: personalization.focusNote,
        },
      }),
      schemaDescription:
        '{ title, summary, sections: [{ heading, body, keyPoints: string[] }], workedExample: { problem, steps: string[], answer }, recap: string[] }',
      fallback: this.fallbackLesson(context.unit.title, context.subject.name, context.grade),
    });
    await this.prisma.homeschoolProgress.update({
      where: { userId_unitId: { userId, unitId } },
      data: { lessonCache: lesson as object },
    });
    return { lesson, cached: false };
  }

  async getPractice(userId: string, unitId: string, refresh = false) {
    return this.getQuiz(userId, unitId, 'practice', 6, refresh);
  }

  async getTest(userId: string, unitId: string, refresh = false) {
    return this.getQuiz(userId, unitId, 'test', 8, refresh);
  }

  async getConceptReview(userId: string, unitId: string, questionId: string, refresh = false) {
    const lockKey = `${userId}:${unitId}:${questionId}:${refresh ? '1' : '0'}`;
    const inflight = this.conceptReviewLocks.get(lockKey);
    if (inflight) return inflight;
    const run = this.buildConceptReview(userId, unitId, questionId, refresh).finally(() => {
      this.conceptReviewLocks.delete(lockKey);
    });
    this.conceptReviewLocks.set(lockKey, run);
    return run;
  }

  private async buildConceptReview(
    userId: string,
    unitId: string,
    questionId: string,
    refresh: boolean,
  ) {
    const context = await this.unitContext(userId, unitId);
    const existing = await this.progress(userId, unitId);
    const practiceQuiz = (existing.practiceCache ?? { questions: [] }) as QuizSet;
    const testQuiz = (existing.testCache ?? { questions: [] }) as QuizSet;
    const question = [...practiceQuiz.questions, ...testQuiz.questions].find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException('Practice or test question not found for this concept.');
    }

    const cacheKey = `homeschool-concept-review:${userId}:${unitId}:${questionId}`;
    if (!refresh) {
      const cached = await this.cacheService.get<{
        lesson: LessonContent;
        conceptTag: string;
        focusArea: string;
        question: { id: string; prompt: string };
        personalization: ReturnType<HomeschoolingService['publicPersonalization']>;
      }>(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const personalization = await this.buildPersonalizationContext(userId, context, existing);
    const correctAnswer = question.options[Number(question.answerIndex)] ?? '';
    const lesson = await this.geminiService.generateStructured<LessonContent>({
      systemPrompt: `You are a ${context.boardLabel} Class ${context.grade} tutor.
The student missed a question on one concept. Write a short, personalized concept review — not a full chapter lesson.
Explain the idea simply, address the likely misconception, connect to their known gaps, and rebuild confidence.
Use 2-3 sections max. Include one worked example tied to the missed question.`,
      userPrompt: JSON.stringify({
        subject: context.subject.name,
        chapter: context.unit.title,
        chapterNumber: context.unit.chapter,
        conceptTag: question.conceptTag,
        focusArea: question.focusArea,
        missedQuestion: question.prompt,
        options: question.options,
        correctAnswer,
        explanation: question.explanation,
        chapterSource: personalization.chapterSourceText.slice(0, 2500),
        studentProfile: {
          diagnosticCompleted: personalization.diagnosticCompleted,
          strengths: personalization.strengths,
          interests: personalization.interests,
          skillGaps: personalization.skillGaps,
          learningStyle: personalization.learningStyle,
          aiSummary: personalization.aiSummary,
          focusNote: personalization.focusNote,
        },
      }),
      schemaDescription:
        '{ title, summary, sections: [{ heading, body, keyPoints: string[] }], workedExample: { problem, steps: string[], answer }, recap: string[] }',
      fallback: this.fallbackConceptReview(question, context),
    });

    const payload = {
      lesson,
      conceptTag: question.conceptTag ?? 'Concept review',
      focusArea: question.focusArea ?? context.unit.title,
      question: { id: question.id, prompt: question.prompt },
      personalization: this.publicPersonalization(personalization),
    };
    await this.cacheService.set(cacheKey, payload, 86_400);
    return { ...payload, cached: false };
  }

  async saveProgress(
    userId: string,
    unitId: string,
    input: { learnDone?: boolean; practiceAnswers?: number[]; testAnswers?: number[] },
  ) {
    await this.unitContext(userId, unitId);
    const row = await this.progress(userId, unitId);
    const data: Record<string, unknown> = {};
    let breakdown: Array<{
      id: string;
      correct: boolean;
      selectedIndex: number | null;
      correctIndex: number;
      explanation: string;
      focusArea?: string;
      conceptTag?: string;
      prompt?: string;
    }> = [];

    if (input.learnDone) data.learnDone = true;
    if (input.practiceAnswers) {
      const quiz = (row.practiceCache ?? { questions: [] }) as QuizSet;
      data.practiceScore = this.score(quiz.questions, input.practiceAnswers);
      breakdown = this.quizBreakdown(quiz.questions, input.practiceAnswers);
    }
    if (input.testAnswers) {
      const quiz = (row.testCache ?? { questions: [] }) as QuizSet;
      const score = this.score(quiz.questions, input.testAnswers);
      data.testScore = score;
      data.mastered = score >= PASS_SCORE;
      data.learnDone = true;
      breakdown = this.quizBreakdown(quiz.questions, input.testAnswers);
    }
    const updated = await this.prisma.homeschoolProgress.update({
      where: { userId_unitId: { userId, unitId } },
      data,
    });
    if (!row.mastered && updated.mastered) {
      const context = await this.unitContext(userId, unitId);
      this.notifications.notify(
        userId,
        NotificationEventType.HOMESCHOOL_UNIT_MASTERED,
        {
          unitTitle: context.unit.title,
          subjectName: context.subject.name,
          testScore: updated.testScore,
          unitHref: `/homeschooling/${context.subject.id}/${unitId}`,
        },
        { dedupeKey: `homeschool-mastered:${unitId}` },
      );
    }
    void this.cacheService.del(`homeschool-journey:${userId}`);
    void this.cacheService.del(`dashboard:${userId}`);
    return {
      learnDone: updated.learnDone,
      practiceScore: updated.practiceScore,
      testScore: updated.testScore,
      mastered: updated.mastered,
      passScore: PASS_SCORE,
      breakdown,
    };
  }

  async chat(userId: string, unitId: string, message: string) {
    const context = await this.unitContext(userId, unitId);
    const row = await this.progress(userId, unitId);
    const history = Array.isArray(row.chatHistory) ? (row.chatHistory as ChatTurn[]) : [];
    const lesson = (row.lessonCache ?? null) as LessonContent | null;
    const result = await this.geminiService.generateStructured<{
      intent: 'explain' | 'hint' | 'quiz' | 'next' | 'answer';
      answer: string;
      extraQuestions?: QuizQuestion[];
    }>({
      systemPrompt: `You are the student's personal school helper for this exact chapter.
Help them learn, practice, or take the next step. Never invent other chapters.
If they want more questions, return extraQuestions as MCQs.
Keep answer short and clear for Class ${context.grade}.`,
      userPrompt: JSON.stringify({
        message,
        chapter: context.unit.title,
        subject: context.subject.name,
        board: context.boardLabel,
        grade: context.grade,
        lessonSummary: lesson?.summary,
        recap: lesson?.recap,
        progress: {
          learnDone: row.learnDone,
          practiceScore: row.practiceScore,
          testScore: row.testScore,
          mastered: row.mastered,
        },
        recentChat: history.slice(-6),
      }),
      schemaDescription:
        '{ intent: "explain"|"hint"|"quiz"|"next"|"answer", answer: string, extraQuestions?: [{ id, prompt, options, answerIndex, hint, explanation }] }',
      fallback: {
        intent: 'answer',
        answer: `Ask me anything about ${context.unit.title}. I can explain, give a hint, or make extra practice.`,
      },
    });

    const nextHistory = [
      ...history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: result.answer },
    ].slice(-20);
    await this.prisma.homeschoolProgress.update({
      where: { userId_unitId: { userId, unitId } },
      data: { chatHistory: nextHistory },
    });
    return {
      intent: result.intent,
      answer: result.answer,
      extraQuestions: result.extraQuestions ?? [],
    };
  }

  async streamChatToResponse(
    userId: string,
    unitId: string,
    message: string,
    res: Response,
  ) {
    const context = await this.unitContext(userId, unitId);
    const row = await this.progress(userId, unitId);
    const history = Array.isArray(row.chatHistory) ? (row.chatHistory as ChatTurn[]) : [];
    const lesson = (row.lessonCache ?? null) as LessonContent | null;
    const prompt = `You are the student's personal school helper for this exact chapter.
Help them learn, practice, or take the next step. Never invent other chapters.
Keep answer short and clear for Class ${context.grade}.

Chapter: ${context.unit.title}
Subject: ${context.subject.name}
Board: ${context.boardLabel}
Lesson summary: ${lesson?.summary ?? 'n/a'}
Recap: ${lesson?.recap ?? 'n/a'}
Progress: learn=${row.learnDone}, practice=${row.practiceScore ?? 'n/a'}, test=${row.testScore ?? 'n/a'}, mastered=${row.mastered}
Recent chat: ${JSON.stringify(history.slice(-4))}

Student question: ${message}`;

    await pipeTextStreamToSse(
      res,
      this.geminiService.streamGenerateText(prompt),
      async (answer) => {
        const nextHistory = [
          ...history,
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: answer },
        ].slice(-20);
        await this.prisma.homeschoolProgress.update({
          where: { userId_unitId: { userId, unitId } },
          data: { chatHistory: nextHistory },
        });
        return { intent: 'answer', answer };
      },
    );
  }

  private async getQuiz(
    userId: string,
    unitId: string,
    kind: 'practice' | 'test',
    count: number,
    refresh: boolean,
  ) {
    const lockKey = `${userId}:${unitId}:${kind}:${refresh ? '1' : '0'}`;
    const inflight = this.quizLocks.get(lockKey);
    if (inflight) return inflight;
    const run = this.buildQuiz(userId, unitId, kind, count, refresh).finally(() => {
      this.quizLocks.delete(lockKey);
    });
    this.quizLocks.set(lockKey, run);
    return run;
  }

  private async buildQuiz(
    userId: string,
    unitId: string,
    kind: 'practice' | 'test',
    count: number,
    refresh: boolean,
  ) {
    const context = await this.unitContext(userId, unitId);
    const existing = await this.progress(userId, unitId);
    const cached = kind === 'practice' ? existing.practiceCache : existing.testCache;
    const personalization = await this.buildPersonalizationContext(userId, context, existing);
    if (!refresh && cached) {
      return {
        quiz: this.publicQuiz(cached as QuizSet, kind),
        cached: true,
        mode: kind,
        personalization: this.publicPersonalization(personalization),
      };
    }

    const practicePrompt = `Create exactly ${count} formative PRACTICE MCQs for ${context.boardLabel} Class ${context.grade}.
These are guided drills — NOT an exam. Rules:
- Start easy, build confidence, then medium difficulty.
- 70% of questions must target the student's weak areas / skill gaps listed below.
- Each question needs a helpful hint that nudges without giving the answer.
- Include focusArea (the concept being tested) and conceptTag (short label).
- 4 options each, one correct answerIndex (0-3).
- Avoid repeating the same question pattern.`;

    const testPrompt = `Create exactly ${count} summative UNIT TEST MCQs for ${context.boardLabel} Class ${context.grade}.
This is an exam-style check — NOT practice. Rules:
- Mix medium and hard difficulty. No hints in the student-facing output.
- Cover the full chapter evenly, including 1-2 questions on weak areas.
- Use exam wording: application, multi-step reasoning, common traps.
- Include focusArea and conceptTag for each question.
- 4 options each, one correct answerIndex (0-3).
- Questions must be harder and broader than practice drills.`;

    const quiz = await this.geminiService.generateStructured<QuizSet>({
      systemPrompt: kind === 'test' ? testPrompt : practicePrompt,
      userPrompt: JSON.stringify({
        mode: kind,
        subject: context.subject.name,
        chapter: context.unit.title,
        chapterNumber: context.unit.chapter,
        officialSource: context.unit.textbookUrl,
        chapterSource: personalization.chapterSourceText.slice(0, 3500),
        lessonSummary: personalization.lessonSummary,
        lessonRecap: personalization.lessonRecap,
        studentProfile: {
          diagnosticCompleted: personalization.diagnosticCompleted,
          strengths: personalization.strengths,
          interests: personalization.interests,
          skillGaps: personalization.skillGaps,
          learningStyle: personalization.learningStyle,
          aiSummary: personalization.aiSummary,
          actionPlan: personalization.actionPlan,
          priorPracticeScore: personalization.priorPracticeScore,
          priorTestScore: personalization.priorTestScore,
          focusNote: personalization.focusNote,
        },
      }),
      schemaDescription:
        '{ questions: [{ id, prompt, options: string[4], answerIndex: number, hint, explanation, difficulty: "easy"|"medium"|"hard", focusArea, conceptTag }] }',
      fallback: this.fallbackQuiz(context.unit.title, count, kind, personalization),
    });
    quiz.questions = quiz.questions.slice(0, count).map((question, index) => ({
      ...question,
      id: question.id || `${kind}-${index + 1}`,
      options: (question.options ?? []).slice(0, 4),
      answerIndex: Number(question.answerIndex) || 0,
      difficulty: question.difficulty ?? (kind === 'test' ? 'medium' : 'easy'),
      focusArea: question.focusArea ?? context.unit.title,
      conceptTag: question.conceptTag ?? `Concept ${index + 1}`,
    }));
    await this.prisma.homeschoolProgress.update({
      where: { userId_unitId: { userId, unitId } },
      data:
        kind === 'practice'
          ? { practiceCache: quiz as object }
          : { testCache: quiz as object },
    });
    return {
      quiz: this.publicQuiz(quiz, kind),
      cached: false,
      mode: kind,
      personalization: this.publicPersonalization(personalization),
    };
  }

  private publicQuiz(quiz: QuizSet, kind: 'practice' | 'test') {
    return {
      questions: quiz.questions.map((question) => {
        const { answerIndex: _ignored, hint, ...rest } = question;
        void _ignored;
        return {
          ...rest,
          hint: kind === 'practice' ? hint : '',
        };
      }),
    };
  }

  private publicPersonalization(personalization: PersonalizationContext) {
    return {
      diagnosticCompleted: personalization.diagnosticCompleted,
      focusNote: personalization.focusNote,
      skillGaps: personalization.skillGaps,
      strengths: personalization.strengths.slice(0, 4),
      learningStyle: personalization.learningStyle,
    };
  }

  private async buildPersonalizationContext(
    userId: string,
    context: Awaited<ReturnType<HomeschoolingService['unitContext']>>,
    progress: Awaited<ReturnType<HomeschoolingService['progress']>>,
  ): Promise<PersonalizationContext> {
    const diagnostic = await this.prisma.diagnosticResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const report = (diagnostic?.report ?? null) as DiagnosticReportShape | null;
    const profile = context.profile;
    const subjectNeedle = [
      context.subject.name,
      context.subject.id.replace(/-/g, ' '),
      context.unit.title,
    ]
      .join(' ')
      .toLowerCase();

    const allGaps = [...(report?.skillGaps ?? [])];
    const matchedGaps = allGaps.filter((gap) => {
      const lower = gap.toLowerCase();
      return subjectNeedle.split(/\s+/).some((token) => token.length > 3 && lower.includes(token));
    });
    const skillGaps = (matchedGaps.length ? matchedGaps : allGaps).slice(0, 5);
    const lesson = (progress.lessonCache ?? null) as LessonContent | null;
    const chapterSourceText = await this.optionalMcpChapter(context.parsed, context.unit);

    const focusNote = skillGaps.length
      ? `Extra focus on your gaps: ${skillGaps.join(', ')}`
      : profile.diagnosticCompleted
        ? `Personalized for your ${context.subject.name} pathway`
        : 'Take the diagnostic to unlock gap-focused practice';

    return {
      diagnosticCompleted: Boolean(profile.diagnosticCompleted),
      strengths: [...new Set([...(profile.strengths ?? []), ...(report?.strengths ?? [])])].slice(0, 6),
      interests: [...new Set([...(profile.interests ?? []), ...(report?.interests ?? [])])].slice(0, 6),
      skillGaps,
      learningStyle: report?.learningStyle ?? '',
      aiSummary: profile.aiSummary ?? report?.summary ?? '',
      actionPlan: (report?.actionPlan ?? []).slice(0, 5),
      priorPracticeScore: progress.practiceScore ?? null,
      priorTestScore: progress.testScore ?? null,
      lessonSummary: lesson?.summary ?? '',
      lessonRecap: lesson?.recap ?? [],
      chapterSourceText,
      focusNote,
    };
  }

  private score(questions: QuizQuestion[], answers: number[]) {
    if (!questions.length) return 0;
    const correct = questions.filter(
      (question, index) => Number(answers[index]) === Number(question.answerIndex),
    ).length;
    return Math.round((correct / questions.length) * 100);
  }

  private quizBreakdown(questions: QuizQuestion[], answers: number[]) {
    return questions.map((question, index) => ({
      id: question.id,
      correct: Number(answers[index]) === Number(question.answerIndex),
      selectedIndex: answers[index] ?? null,
      correctIndex: Number(question.answerIndex),
      explanation: question.explanation,
      focusArea: question.focusArea,
      conceptTag: question.conceptTag,
      prompt: question.prompt,
    }));
  }

  private async loadSyllabusCache(
    board: BoardKey,
    grade: number,
    subjectIds: string[],
  ): Promise<Map<string, { payload: OfficialSubject; updatedAt: Date }>> {
    const cacheKeys = subjectIds.map((subjectId) => `${board}:${grade}:${subjectId}`);
    if (!cacheKeys.length) {
      return new Map<string, { payload: OfficialSubject; updatedAt: Date }>();
    }
    const rows = await this.prisma.homeschoolSyllabus.findMany({
      where: { cacheKey: { in: cacheKeys } },
    });
    return new Map(
      rows
        .filter((row) => row.payload)
        .map((row) => [
          row.cacheKey,
          { payload: row.payload as OfficialSubject, updatedAt: row.updatedAt },
        ]),
    );
  }

  private catalogFallback(
    board: BoardKey,
    grade: number,
    subjectId: string,
  ): OfficialSubject {
    const name = subjectName(subjectId);
    return {
      id: subjectId,
      name,
      units: Array.from({ length: 8 }, (_, index) => ({
        chapter: index + 1,
        title: `${name} — Chapter ${index + 1}`,
        textbookUrl: officialPortal(board, grade),
        videoQuery: `${BOARD_LABELS[board]} Class ${grade} ${name} Chapter ${index + 1}`,
      })),
    };
  }

  private summarizeSubject(
    board: BoardKey,
    grade: number,
    subjectId: string,
    subject: OfficialSubject,
    progressMap: Map<string, { learnDone?: boolean; practiceScore?: number | null; testScore?: number | null; mastered?: boolean }>,
  ) {
    const units = subject.units.map((unit, index) => {
      const unitId = this.unitId(board, grade, subjectId, unit.chapter);
      const progress = progressMap.get(unitId);
      const unlocked =
        index === 0 ||
        subject.units.slice(0, index).every((prior) => {
          const priorId = this.unitId(board, grade, subjectId, prior.chapter);
          return Boolean(progressMap.get(priorId)?.mastered);
        });
      const status = !unlocked
        ? 'locked'
        : progress?.mastered
          ? 'mastered'
          : progress?.learnDone || progress?.practiceScore != null
            ? 'in_progress'
            : 'available';
      return {
        id: unitId,
        chapter: unit.chapter,
        title: unit.title,
        status,
        learnDone: Boolean(progress?.learnDone),
        practiceScore: progress?.practiceScore ?? null,
        testScore: progress?.testScore ?? null,
        mastered: Boolean(progress?.mastered),
        textbookUrl: unit.textbookUrl,
        videoUrl: unit.videoUrl,
        videos: unit.videos ?? [],
      };
    });
    const mastered = units.filter((unit) => unit.mastered).length;
    const nextUnit =
      units.find((unit) => unit.status === 'available' || unit.status === 'in_progress') ??
      units[0];
    return {
      id: subjectId,
      name: subject.name,
      unitCount: units.length,
      mastered,
      progress: units.length ? Math.round((mastered / units.length) * 100) : 0,
      nextUnitId: nextUnit?.id,
      nextUnitTitle: nextUnit?.title,
      units,
    };
  }

  private async resolveSubject(
    board: BoardKey,
    grade: number,
    subjectId: string,
    options: {
      syllabusCache?: Map<string, { payload: OfficialSubject; updatedAt: Date }>;
      generate?: boolean;
      live?: boolean;
    } = {},
  ): Promise<OfficialSubject> {
    const cacheKey = `${board}:${grade}:${subjectId}`;
    const batchEntry = options.syllabusCache?.get(cacheKey);
    const dbRow = batchEntry
      ? { payload: batchEntry.payload, updatedAt: batchEntry.updatedAt }
      : await this.prisma.homeschoolSyllabus.findUnique({ where: { cacheKey } });
    const cached = (batchEntry?.payload ?? dbRow?.payload) as OfficialSubject | undefined;
    const cachedLive = Boolean(cached && hasOfficialFiles(cached));

    if (options.live !== false && board === 'nios' && !(cachedLive && isFreshSyllabus(dbRow?.updatedAt))) {
      const scraped = await this.officialMedia.loadSubject(board, grade, subjectId);
      if (scraped) return scraped;
    }
    if (cachedLive && cached) return cached;

    const official = officialSubject(board, grade, subjectId);
    if (official) return official;
    if (cached) return cached;
    if (!options.generate) {
      return this.catalogFallback(board, grade, subjectId);
    }
    const generated = await this.geminiService.generateStructured<{
      units: Array<{ chapter: number; title: string }>;
    }>({
      systemPrompt: `List the official current-year chapters for this school subject.
Return real published chapter titles only, in syllabus order. 6 to 16 chapters.`,
      userPrompt: JSON.stringify({
        board: BOARD_LABELS[board],
        grade,
        subject: subjectName(subjectId),
      }),
      schemaDescription: '{ units: [{ chapter: number, title: string }] }',
      fallback: {
        units: Array.from({ length: 8 }, (_, index) => ({
          chapter: index + 1,
          title: `${subjectName(subjectId)} — Part ${index + 1}`,
        })),
      },
    });
    const subject: OfficialSubject = {
      id: subjectId,
      name: subjectName(subjectId),
      units: generated.units.map((unit) => ({
        chapter: unit.chapter,
        title: unit.title,
        textbookUrl: officialPortal(board, grade),
        videoQuery: `${BOARD_LABELS[board]} Class ${grade} ${subjectName(subjectId)} ${unit.title}`,
      })),
    };
    await this.prisma.homeschoolSyllabus.upsert({
      where: { cacheKey },
      create: { cacheKey, board, grade, subject: subjectId, payload: subject as object },
      update: { payload: subject as object },
    });
    return subject;
  }

  private async unitContext(userId: string, unitId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const parsed = this.parseUnitId(unitId);
    const subject = await this.resolveSubject(parsed.board, parsed.grade, parsed.subjectId);
    const unit = subject.units.find((item) => item.chapter === parsed.chapter);
    if (!unit) throw new NotFoundException('Unit not found');
    return {
      profile,
      parsed,
      subject,
      unit,
      boardLabel: BOARD_LABELS[parsed.board],
      grade: parsed.grade,
    };
  }

  private async progress(userId: string, unitId: string) {
    const existing = await this.prisma.homeschoolProgress.findUnique({
      where: { userId_unitId: { userId, unitId } },
    });
    if (existing) return existing;
    try {
      return await this.prisma.homeschoolProgress.create({
        data: { userId, unitId },
      });
    } catch {
      return this.prisma.homeschoolProgress.findUniqueOrThrow({
        where: { userId_unitId: { userId, unitId } },
      });
    }
  }

  private unitId(board: BoardKey, grade: number, subjectId: string, chapter: number) {
    return `${board}-${grade}-${subjectId}-u${chapter}`;
  }

  private parseUnitId(unitId: string) {
    const match = unitId.match(/^(cbse|nios|cambridge|icse)-(\d{1,2})-([a-z0-9-]+)-u(\d+)$/);
    if (!match) throw new NotFoundException('Unit not found');
    return {
      board: match[1] as BoardKey,
      grade: Number(match[2]),
      subjectId: match[3],
      chapter: Number(match[4]),
    };
  }

  private async optionalMcpChapter(
    parsed: { board: BoardKey; grade: number; subjectId: string; chapter: number },
    unit: OfficialUnit,
  ) {
    if (!this.mcpUrl || parsed.board === 'nios' || parsed.board === 'cambridge') {
      return `Official chapter: ${unit.title}. Source: ${unit.textbookUrl}`;
    }
    try {
      const subject = subjectName(parsed.subjectId);
      const response = await fetch(
        `${this.mcpUrl}/books/${parsed.grade}/${encodeURIComponent(subject)}/chapters/${parsed.chapter}`,
        { signal: AbortSignal.timeout(2500) },
      );
      if (!response.ok) return `Official chapter: ${unit.title}. Source: ${unit.textbookUrl}`;
      const data = (await response.json()) as { text?: string };
      return (data.text ?? '').slice(0, 6000);
    } catch {
      return `Official chapter: ${unit.title}. Source: ${unit.textbookUrl}`;
    }
  }

  private fallbackConceptReview(
    question: QuizQuestion,
    context: Awaited<ReturnType<HomeschoolingService['unitContext']>>,
  ): LessonContent {
    const focus = question.focusArea ?? context.unit.title;
    const tag = question.conceptTag ?? 'This concept';
    return {
      title: `${tag}: focused review`,
      summary: `Let's rebuild ${tag} — the idea behind "${focus}" in ${context.unit.title}.`,
      sections: [
        {
          heading: 'What went wrong',
          body: question.explanation || `The correct approach for "${question.prompt}" depends on the core rule in ${focus}.`,
          keyPoints: [
            `Focus area: ${focus}`,
            'Read the question twice before choosing an option',
            'Match each option to the definition or rule you know',
          ],
        },
        {
          heading: 'Rebuild the concept',
          body: `In ${context.subject.name}, ${focus} is a building block for this chapter. Start with the definition, then check how it appears in a simple example before tackling exam-style traps.`,
          keyPoints: [
            `Concept: ${tag}`,
            'Write the rule in your own words',
            'Try one easy example, then one harder one',
          ],
        },
      ],
      workedExample: {
        problem: question.prompt,
        steps: [
          'Identify what the question is really asking',
          `Recall the rule for ${focus}`,
          'Eliminate options that break that rule',
          'Pick the option that fits every condition',
        ],
        answer: question.options[Number(question.answerIndex)] ?? 'See the official explanation above.',
      },
      recap: [
        `${tag} is worth revisiting before your next practice round`,
        `Link ${focus} back to the official textbook chapter`,
        'Retry practice once this review feels clear',
      ],
    };
  }

  private fallbackLesson(title: string, subject: string, grade: number): LessonContent {
    return {
      title,
      summary: `This lesson covers ${title} for Class ${grade} ${subject}.`,
      sections: [
        {
          heading: 'What you will learn',
          body: `Read the official textbook chapter on ${title}, then come back and ask for any part to be explained in simpler words.`,
          keyPoints: [`${title} is part of your ${subject} syllabus`, 'Start with definitions', 'Then try the worked example'],
        },
      ],
      workedExample: {
        problem: `Write one example from ${title} in your own words.`,
        steps: ['Open the official textbook', 'Pick one example', 'Rewrite it simply'],
        answer: 'Your own rewritten example.',
      },
      recap: [`${title} is a required chapter`, 'Practice after you finish reading'],
    };
  }

  private fallbackQuiz(
    title: string,
    count: number,
    kind: 'practice' | 'test',
    personalization: PersonalizationContext,
  ): QuizSet {
    const gap = personalization.skillGaps[0] ?? title;
    return {
      questions: Array.from({ length: count }, (_, index) => ({
        id: `q${index + 1}`,
        prompt:
          kind === 'test'
            ? `Exam-style: Which best applies ${gap} in the context of ${title}?`
            : `Practice: What is the key idea in ${title} related to ${gap}?`,
        options: kind === 'test'
          ? [
              `Apply the core rule from ${title} to solve a new scenario`,
              `Skip definitions and guess from keywords`,
              `Memorize only one example without understanding`,
              `Ignore ${gap} because it is optional`,
            ]
          : [
              `Understand the main concept step by step`,
              `Skip to the next chapter`,
              `Memorize without practicing`,
              `Ignore weak areas`,
            ],
        answerIndex: 0,
        hint: kind === 'practice' ? `Think about the main concept in ${title} and your gap: ${gap}.` : '',
        explanation: `${title} is on your syllabus. ${kind === 'practice' ? 'Practice builds the concept before the test.' : 'The test checks full chapter mastery.'}`,
        difficulty: kind === 'test' ? (index % 2 ? 'hard' : 'medium') : (index < 2 ? 'easy' : 'medium'),
        focusArea: gap,
        conceptTag: `Concept ${index + 1}`,
      })),
    };
  }
}
