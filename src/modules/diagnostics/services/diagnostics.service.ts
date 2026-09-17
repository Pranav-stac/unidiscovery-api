import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DiagnosticSessionStatus, DiagnosticTemplate, NotificationEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

import { buildStandardDiagnosticSteps } from '../data/legacy-story.adapter';
import { getDevFillAnswer } from '../data/dev-fill.answers';
import {
  RETEST_MESSAGE,
  validateDiagnosticAnswers,
  validateSingleTextAnswer,
} from './answer-quality.validator';
import { NotificationsService } from '../../notifications/services/notifications.service';

export interface DiagnosticStep {
  id: string;
  type:
    | 'choice'
    | 'swipe'
    | 'slider'
    | 'voice-note'
    | 'ai-followup'
    | 'multi-choice'
    | 'chapter';
  stepKind?: 'chapter' | 'question';
  chapter?: string;
  chapterIndex?: number;
  chapterTotal?: number;
  evaluationCategory?: string;
  title: string;
  subtitle?: string;
  options?: Array<{ value: string; label: string; emoji?: string }>;
  min?: number;
  max?: number;
  maxSelections?: number;
  intro?: string;
}

export interface DiagnosticReport {
  headline: string;
  summary: string;
  strengths: string[];
  interests: string[];
  learningStyle: string;
  recommendedDirections: string[];
  nextBestAction: string;
  profileInsights?: string[];
  careerMatches?: string[];
  collegeFit?: string;
  skillGaps?: string[];
  actionPlan?: string[];
  fitScore?: number;
}

@Injectable()
export class DiagnosticsService {
  private activeTemplateCache: {
    template: DiagnosticTemplate | null;
    expires: number;
  } | null = null;

  private staticStepsCache: { steps: DiagnosticStep[]; expires: number } | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly cacheService: CacheService,
    private readonly notifications: NotificationsService,
  ) {}

  private invalidateStepsCache(_userId?: string) {
    this.staticStepsCache = null;
  }

  async getActiveTemplate(): Promise<DiagnosticTemplate | null> {
    if (
      this.activeTemplateCache &&
      this.activeTemplateCache.expires > Date.now()
    ) {
      return this.activeTemplateCache.template;
    }

    const template = await this.prisma.diagnosticTemplate.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    this.activeTemplateCache = {
      template,
      expires: Date.now() + 10 * 60 * 1000,
    };

    return template;
  }

  async getStatus(userId: string) {
    const [profile, inProgress, latest] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId },
        select: { diagnosticCompleted: true },
      }),
      this.prisma.diagnosticSession.findFirst({
        where: { userId, status: DiagnosticSessionStatus.IN_PROGRESS },
      }),
      this.prisma.diagnosticResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { session: { select: { completedAt: true, answers: true } } },
      }),
    ]);

    const inProgressMeta = inProgress?.metadata as {
      currentStepId?: string;
    } | null;

    let latestResult = latest?.report
      ? this.sanitizeReport(latest.report as unknown as DiagnosticReport)
      : undefined;

    const sessionAnswers = latest?.session?.answers;
    if (latestResult && sessionAnswers) {
      const steps = await this.getStepsForUser(userId);
      const quality = validateDiagnosticAnswers(
        sessionAnswers as Record<string, unknown>,
        steps,
      );
      if (!quality.valid) {
        latestResult = undefined;
      }
    }

    return {
      completed: profile?.diagnosticCompleted ?? false,
      inProgressSessionId: inProgress?.id,
      resumeStepId: inProgressMeta?.currentStepId,
      latestResult,
      completedAt:
        latest?.session.completedAt?.toISOString() ??
        latest?.createdAt.toISOString(),
    };
  }

  async getBootstrap(userId: string) {
    const [status, steps] = await Promise.all([
      this.getStatus(userId),
      this.getStepsForUser(userId),
    ]);

    let sessionAnswers: Record<string, unknown> | undefined;
    if (status.inProgressSessionId) {
      const session = await this.prisma.diagnosticSession.findFirst({
        where: { id: status.inProgressSessionId, userId },
        select: { answers: true },
      });
      sessionAnswers = session?.answers as Record<string, unknown> | undefined;
    }

    const questionSteps = steps.filter(
      (step) => step.stepKind === 'question' || step.type !== 'chapter',
    );
    const answeredCount = sessionAnswers
      ? questionSteps.filter(
          (step) =>
            sessionAnswers![step.id] !== undefined &&
            sessionAnswers![step.id] !== null,
        ).length
      : 0;

    return {
      ...status,
      steps,
      sessionAnswers,
      answeredCount,
      questionCount: questionSteps.length,
    };
  }

  async startSession(userId: string) {
    const [template, existing, profile] = await Promise.all([
      this.getActiveTemplate(),
      this.prisma.diagnosticSession.findFirst({
        where: { userId, status: DiagnosticSessionStatus.IN_PROGRESS },
      }),
      this.prisma.studentProfile.findUnique({
        where: { userId },
        select: { diagnosticCompleted: true },
      }),
    ]);

    if (!template) {
      throw new Error('No active diagnostic template configured');
    }

    if (existing) {
      return existing;
    }

    // Don't auto-start a new session if already completed — use retake instead
    if (profile?.diagnosticCompleted) {
      throw new ConflictException(
        'Diagnostic already completed. Use retake to start again.',
      );
    }

    return this.prisma.diagnosticSession.create({
      data: {
        userId,
        templateId: template.id,
        metadata: { currentStep: 0 },
      },
    });
  }

  async retakeSession(userId: string) {
    const template = await this.getActiveTemplate();
    if (!template) {
      throw new Error('No active diagnostic template configured');
    }

    await this.prisma.diagnosticSession.updateMany({
      where: { userId, status: DiagnosticSessionStatus.IN_PROGRESS },
      data: { status: DiagnosticSessionStatus.ABANDONED },
    });

    this.invalidateStepsCache(userId);

    const session = await this.prisma.diagnosticSession.create({
      data: {
        userId,
        templateId: template.id,
        metadata: { currentStep: 0, retake: true },
      },
    });

    const steps = await this.getStepsForUser(userId);
    const questionSteps = steps.filter(
      (step) => step.stepKind === 'question' || step.type !== 'chapter',
    );

    return {
      id: session.id,
      steps,
      questionCount: questionSteps.length,
      answeredCount: 0,
      sessionAnswers: {},
      resumeStepId: steps[0]?.id,
    };
  }

  async devFillSession(userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev fill is not available in production.');
    }

    const session = await this.retakeSession(userId);
    const steps = await this.getStepsForUser(userId);
    const questionSteps = steps.filter(
      (step) => step.stepKind === 'question' || step.type !== 'chapter',
    );

    const answers: Record<string, unknown> = {};
    let choiceIndex = 0;
    let textIndex = 0;

    for (const step of steps) {
      const isQuestion =
        step.stepKind === 'question' ||
        (!step.stepKind && step.type !== 'chapter');
      if (!isQuestion) continue;

      const value = getDevFillAnswer(step, choiceIndex, textIndex);
      answers[step.id] = value;

      if (step.type === 'choice' || step.type === 'swipe') {
        choiceIndex += 1;
      } else if (
        step.type === 'ai-followup' ||
        step.type === 'voice-note' ||
        step.type === 'multi-choice' ||
        step.type === 'slider'
      ) {
        textIndex += 1;
      }
    }

    const epilogue = steps.find((step) => step.id === 'story-epilogue');
    const epilogueId = epilogue?.id ?? steps[steps.length - 1]?.id;

    await this.prisma.diagnosticSession.update({
      where: { id: session.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        metadata: {
          currentStepId: epilogueId,
          devFill: true,
        },
      },
    });

    return {
      sessionId: session.id,
      answeredCount: questionSteps.length,
      questionCount: questionSteps.length,
      resumeStepId: epilogueId,
      sessionAnswers: answers,
      steps,
    };
  }

  async refreshInsights(userId: string): Promise<DiagnosticReport> {
    const latestSession = await this.prisma.diagnosticSession.findFirst({
      where: { userId, status: DiagnosticSessionStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      include: { result: true },
    });

    if (!latestSession?.result) {
      throw new Error('Complete diagnostic test first to generate insights');
    }

    const answers = latestSession.answers as Record<string, unknown>;
    const steps = await this.getStepsForUser(userId);
    const metadata = (latestSession.metadata as Record<string, unknown>) ?? {};
    await this.assertAnswerQuality(answers, steps, userId, metadata);

    const report = await this.generateReport(answers, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.diagnosticResult.update({
        where: { id: latestSession.result!.id },
        data: {
          report: report as unknown as Prisma.InputJsonValue,
          aiModel: this.geminiService.isConfigured() ? 'gemini' : 'fallback',
        },
      });

      await tx.studentProfile.update({
        where: { userId },
        data: {
          interests: report.interests,
          strengths: report.strengths,
          aiSummary: report.summary,
        },
      });
    });

    await this.cacheService.invalidateUser(userId);
    return this.sanitizeReport(report);
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.diagnosticSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new Error('Session not found');
    return session;
  }

  private async getProfileContext(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });
    if (!profile) return null;

    const goals = (profile.goals ?? {}) as Record<string, unknown>;
    const isCollege =
      profile.classGroup?.startsWith('college-') ||
      goals.educationLevel === 'college';

    const transcript = (profile.transcriptData ?? {}) as Record<
      string,
      unknown
    >;
    const documents = (transcript.documents as unknown[] | undefined) ?? [];
    const semesterRecords =
      (transcript.semesterRecords as unknown[] | undefined) ?? [];
    const transcriptSubjects =
      (transcript.subjects as string[] | undefined) ?? profile.subjects ?? [];

    const collegeYearMap: Record<string, string> = {
      'college-y1': 'Year 1',
      'college-y2': 'Year 2',
      'college-y3': 'Year 3',
      'college-y4': 'Year 4+',
    };

    return {
      name: profile.user.name.split(' ')[0],
      fullName: profile.user.name,
      isCollege,
      classGroup: profile.classGroup,
      classGroupLabel: profile.classGroup
        ? (collegeYearMap[profile.classGroup] ?? profile.classGroup)
        : null,
      stream: profile.stream,
      board: profile.board,
      grade: profile.grade,
      school: profile.school,
      targetDegree: profile.targetDegree,
      targetCountries: profile.targetCountries ?? [],
      city: profile.city,
      country: profile.country,
      percentage: profile.percentage,
      subjects: profile.subjects ?? [],
      interests: profile.interests ?? [],
      strengths: profile.strengths ?? [],
      resumeSummary: profile.resumeSummary,
      hasTranscript: documents.length > 0,
      hasResume: !!profile.resumeData || !!profile.resumeSummary,
      transcriptInstitution:
        (transcript.institution as string) ?? profile.school,
      transcriptDegree: transcript.degree as string | undefined,
      transcriptProgram: (transcript.program as string) ?? profile.stream,
      cgpa: transcript.cgpa as number | undefined,
      transcriptSubjects: transcriptSubjects.slice(0, 12),
      semesterCount: semesterRecords.length,
      transcriptSummary: transcript.aiSummary as string | undefined,
      documentCount: documents.length,
      onboardingCompleted: profile.onboardingCompleted,
    };
  }

  async getStepsForUser(_userId: string): Promise<DiagnosticStep[]> {
    if (
      this.staticStepsCache &&
      this.staticStepsCache.expires > Date.now()
    ) {
      return this.staticStepsCache.steps;
    }

    const steps = buildStandardDiagnosticSteps();

    this.staticStepsCache = {
      steps,
      expires: Date.now() + 5 * 60 * 1000,
    };

    return steps;
  }

  getInitialSteps(): DiagnosticStep[] {
    return [
      {
        id: 'vibe',
        type: 'swipe',
        title: 'What energizes you most right now?',
        subtitle: 'Swipe through — no wrong answers',
        options: [
          { value: 'build', label: 'Building things' },
          { value: 'help', label: 'Helping people' },
          { value: 'create', label: 'Creating art/media' },
          { value: 'analyze', label: 'Solving puzzles' },
          { value: 'lead', label: 'Leading teams' },
        ],
      },
      {
        id: 'subjects',
        type: 'choice',
        title: 'Which subjects feel most natural?',
        subtitle: 'Pick up to 3',
        options: [
          { value: 'math', label: 'Math' },
          { value: 'science', label: 'Science' },
          { value: 'english', label: 'English' },
          { value: 'history', label: 'History' },
          { value: 'cs', label: 'Computer Science' },
          { value: 'arts', label: 'Arts' },
        ],
      },
      {
        id: 'confidence',
        type: 'slider',
        title: 'How confident do you feel about your future path?',
        subtitle: 'Slide honestly — we adapt to you',
        min: 1,
        max: 10,
      },
      {
        id: 'dream',
        type: 'ai-followup',
        title: 'Tell us your dream in one line',
        subtitle: 'AI will ask only what it still needs',
      },
    ];
  }

  async saveAnswer(
    sessionId: string,
    userId: string,
    stepId: string,
    answer: unknown,
    nextStepId?: string,
  ) {
    const session = await this.prisma.diagnosticSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const steps = await this.getStepsForUser(userId);
    const step = steps.find((s) => s.id === stepId);
    if (step) {
      const textIssue = validateSingleTextAnswer(step, answer);
      if (textIssue) {
        throw new BadRequestException({
          message: textIssue.message,
          code: textIssue.code,
          issues: textIssue.issues,
        });
      }
    }

    const answers = {
      ...(session.answers as Record<string, unknown>),
      [stepId]: answer,
    };

    const existingMeta = (session.metadata as Record<string, unknown>) ?? {};

    return this.prisma.diagnosticSession.update({
      where: { id: sessionId },
      data: {
        answers: answers as Prisma.InputJsonValue,
        metadata: {
          ...existingMeta,
          currentStepId: nextStepId ?? stepId,
        },
      },
    });
  }

  async updateProgress(sessionId: string, userId: string, stepId: string) {
    const session = await this.prisma.diagnosticSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const existingMeta = (session.metadata as Record<string, unknown>) ?? {};

    return this.prisma.diagnosticSession.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...existingMeta,
          currentStepId: stepId,
        },
      },
    });
  }

  async getAiFollowUp(
    _answers: Record<string, unknown>,
    _userId?: string,
  ): Promise<DiagnosticStep> {
    return {
      id: 'ai-generated',
      type: 'choice',
      title: 'What matters most in your ideal college or career?',
      subtitle: 'Pick the option that resonates most right now.',
      options: [
        { value: 'impact', label: 'Making an impact' },
        { value: 'income', label: 'Financial stability' },
        { value: 'creativity', label: 'Creative freedom' },
        { value: 'prestige', label: 'Top institutions' },
      ],
    };
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.diagnosticSession.findFirst({
      where: { id: sessionId, userId },
      include: { template: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const answers = (session.answers as Record<string, unknown>) ?? {};
    const steps = await this.getStepsForUser(userId);
    const questionSteps = steps.filter(
      (step) => step.stepKind === 'question' || step.type !== 'chapter',
    );
    const answeredCount = questionSteps.filter(
      (step) => answers[step.id] !== undefined && answers[step.id] !== null,
    ).length;

    if (questionSteps.length === 0) {
      throw new UnprocessableEntityException({
        message:
          'Diagnostic questions are not available right now. Please refresh and retake the diagnostic.',
        code: 'INSUFFICIENT_ANSWERS',
        issues: ['No diagnostic questions were loaded for this session.'],
      });
    }

    const metadata = (session.metadata as Record<string, unknown>) ?? {};
    await this.assertAnswerQuality(answers, steps, userId, metadata);

    const report = await this.generateReport(answers, userId);

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    const existingGoals = (profile?.goals ?? {}) as Record<string, unknown>;
    const goalUpdates: Record<string, unknown> = { ...existingGoals };
    const budget =
      answers.family_budget ??
      answers.g1112_q33_family_budget ??
      answers.g910_q33_family_budget ??
      answers.coll_grad_budget;
    const streamPref =
      answers.stream_pull ??
      answers.g910_q32_stream_pull ??
      answers.g1112_q30_stream_pull;
    const workEnv =
      answers.work_environment ??
      answers.g1112_q28_work_env ??
      answers.g910_q28_work_env ??
      answers.coll_work_env;
    const careerPath =
      answers.coll_primary_path ??
      answers.coll_path_confirm ??
      answers.internship_priority;
    if (budget) goalUpdates.budget = budget;
    if (streamPref) goalUpdates.streamPreference = streamPref;
    if (workEnv) goalUpdates.workEnvironment = workEnv;
    if (careerPath) goalUpdates.careerPath = careerPath;

    await this.prisma.$transaction(async (tx) => {
      await tx.diagnosticSession.update({
        where: { id: sessionId },
        data: {
          status: DiagnosticSessionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.diagnosticResult.create({
        data: {
          sessionId,
          userId,
          report: report as unknown as Prisma.InputJsonValue,
          aiModel: this.geminiService.isConfigured() ? 'gemini' : 'fallback',
        },
      });

      await tx.studentProfile.update({
        where: { userId },
        data: {
          interests: report.interests,
          strengths: report.strengths,
          aiSummary: report.summary,
          diagnosticCompleted: true,
          onboardingCompleted: true,
          goals: goalUpdates as Prisma.InputJsonValue,
        },
      });
    });

    await this.cacheService.invalidateUser(userId);
    this.invalidateStepsCache(userId);

    this.notifications.notify(
      userId,
      NotificationEventType.DIAGNOSTIC_COMPLETED,
      { headline: report.headline },
      { dedupeKey: `diagnostic-completed:${sessionId}` },
    );

    return report;
  }

  private async assertAnswerQuality(
    answers: Record<string, unknown>,
    steps: DiagnosticStep[],
    userId?: string,
    sessionMeta?: Record<string, unknown>,
  ): Promise<void> {
    const ruleResult = validateDiagnosticAnswers(answers, steps);
    if (!ruleResult.valid) {
      throw new UnprocessableEntityException({
        message: ruleResult.message,
        code: ruleResult.code,
        issues: ruleResult.issues,
      });
    }

    // Rule-based validation is enough; skip Gemini quality gate so students are not blocked by flaky AI checks.
    if (sessionMeta?.devFill === true || !this.geminiService.isConfigured()) {
      return;
    }

    const skipAiCheck = process.env.DIAGNOSTIC_AI_QUALITY_CHECK === 'true';
    if (!skipAiCheck) {
      return;
    }

    const aiCheck = await this.geminiService.generateStructured<{
      valid: boolean;
      message: string;
      issues: string[];
    }>({
      systemPrompt: `You are a quality gate for UniDiscover's student career diagnostic. Decide if answers are genuine enough to produce meaningful insights.

Mark valid=false when:
- Open-text answers are gibberish, placeholders (asdf, test, idk), or clearly not engaged
- Aptitude answers are nonsense or show no real attempt
- Answers look randomly clicked (same option repeated, contradictory without explanation)
- Overall engagement is too low for a credible report

When invalid, message must warmly ask the student to retake and answer thoughtfully. Do not generate career advice.`,
      userPrompt: JSON.stringify({
        answers,
        questionCount: steps.filter(
          (s) => s.stepKind === 'question' || s.type !== 'chapter',
        ).length,
      }),
      schemaDescription: `{
        "valid": "boolean — true only if answers are thoughtful enough",
        "message": "string — retake guidance if invalid, empty if valid",
        "issues": ["string — specific problems found"]
      }`,
      fallback: {
        valid: true,
        message: '',
        issues: [],
      },
    });

    if (!aiCheck.valid) {
      throw new UnprocessableEntityException({
        message: aiCheck.message || RETEST_MESSAGE,
        code: 'ANSWERS_INVALID',
        issues: aiCheck.issues?.length
          ? aiCheck.issues
          : ['AI quality check failed'],
      });
    }
  }

  private sanitizeText(value: string): string {
    return value.replace(/\*\*/g, '').trim();
  }

  private sanitizeReport(report: DiagnosticReport): DiagnosticReport {
    return {
      ...report,
      headline: this.sanitizeText(report.headline),
      summary: this.sanitizeText(report.summary),
      learningStyle: this.sanitizeText(report.learningStyle),
      nextBestAction: this.sanitizeText(report.nextBestAction),
      collegeFit: report.collegeFit ? this.sanitizeText(report.collegeFit) : report.collegeFit,
      strengths: report.strengths?.map((s) => this.sanitizeText(s)),
      interests: report.interests?.map((s) => this.sanitizeText(s)),
      recommendedDirections: report.recommendedDirections?.map((s) => this.sanitizeText(s)),
      profileInsights: undefined,
      careerMatches: report.careerMatches?.map((s) => this.sanitizeText(s)),
      skillGaps: report.skillGaps?.map((s) => this.sanitizeText(s)),
      actionPlan: report.actionPlan?.map((s) => this.sanitizeText(s)),
    };
  }

  private async generateReport(
    answers: Record<string, unknown>,
    _userId?: string,
  ): Promise<DiagnosticReport> {
    const fallback: DiagnosticReport = {
      headline: 'Your discovery results',
      summary:
        'Based on your diagnostic answers, you show a blend of curiosity, purpose, and thoughtful reflection.',
      strengths: ['Curiosity', 'Adaptability', 'Problem solving'],
      interests: ['Technology', 'Learning', 'Growth'],
      learningStyle: 'Hands-on explorer',
      recommendedDirections: [
        'STEM exploration',
        'Design and innovation',
        'Research-oriented paths',
      ],
      nextBestAction: 'Explore your dashboard and continue building your profile',
      careerMatches: ['Engineering', 'Medicine', 'Business', 'Design'],
      collegeFit:
        'Your answers suggest openness to rigorous programs that match your interests and working style.',
      skillGaps: [
        'Explore stream options',
        'Build foundational skills',
        'Research target colleges',
      ],
      actionPlan: [
        'Review your insight report',
        'Explore college matches',
        'Complete your profile',
        'Plan next learning steps',
      ],
      fitScore: 70,
    };

    return this.sanitizeReport(
      await this.geminiService.generateStructured<DiagnosticReport>({
        systemPrompt: `You are an expert student career advisor for UniDiscover. Generate a diagnostic report using ONLY the student's quiz answers. Do not reference profile, transcript, resume, school name, or any data outside the answers object.`,
        userPrompt: JSON.stringify({ answers }),
        schemaDescription: `{
        "headline": "string — clear title based on answers",
        "summary": "string — 3-4 sentences from answers only",
        "strengths": ["string — 3-5 strengths inferred from answers"],
        "interests": ["string — 3-5 interests inferred from answers"],
        "learningStyle": "string",
        "recommendedDirections": ["string — 3-4 career/education directions"],
        "nextBestAction": "string — single clear next step",
        "careerMatches": ["string — 4-6 career titles that fit"],
        "collegeFit": "string — paragraph on college fit from answers",
        "skillGaps": ["string — 2-4 areas to develop"],
        "actionPlan": ["string — 4-5 concrete action steps in order"],
        "fitScore": "number 0-100 — alignment inferred from answers"
      }`,
        fallback,
      }),
    );
  }
}
