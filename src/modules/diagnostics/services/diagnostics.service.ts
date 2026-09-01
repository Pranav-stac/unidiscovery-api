import { Injectable } from '@nestjs/common';
import { DiagnosticSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

import { buildStoryDiagnosticSteps } from '../data/legacy-story.adapter';

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
    template: Awaited<ReturnType<DiagnosticsService['getActiveTemplate']>>;
    expires: number;
  } | null = null;

  private stepsCache = new Map<
    string,
    { steps: DiagnosticStep[]; expires: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly cacheService: CacheService,
  ) {}

  private invalidateStepsCache(userId: string) {
    this.stepsCache.delete(userId);
  }

  async getActiveTemplate() {
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
        include: { session: { select: { completedAt: true } } },
      }),
    ]);

    const inProgressMeta = inProgress?.metadata as {
      currentStepId?: string;
    } | null;

    return {
      completed: profile?.diagnosticCompleted ?? false,
      inProgressSessionId: inProgress?.id,
      resumeStepId: inProgressMeta?.currentStepId,
      latestResult: latest?.report as DiagnosticReport | undefined,
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

    return { ...status, steps };
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
      throw new Error(
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

    return this.prisma.diagnosticSession.create({
      data: {
        userId,
        templateId: template.id,
        metadata: { currentStep: 0, retake: true },
      },
    });
  }

  async refreshInsights(userId: string): Promise<DiagnosticReport> {
    const latestSession = await this.prisma.diagnosticSession.findFirst({
      where: { userId, status: DiagnosticSessionStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      include: { result: true },
    });

    if (!latestSession?.result) {
      throw new Error('Complete AI Discovery first to generate insights');
    }

    const answers = latestSession.answers as Record<string, unknown>;
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
    return report;
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
    };
  }

  async getStepsForUser(userId: string): Promise<DiagnosticStep[]> {
    const cached = this.stepsCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.steps;
    }

    const ctx = await this.getProfileContext(userId);
    if (!ctx) return this.getInitialSteps();

    const steps = buildStoryDiagnosticSteps({
      name: ctx.name,
      isCollege: ctx.isCollege,
      classGroup: ctx.classGroup,
      classGroupLabel: ctx.classGroupLabel,
      stream: ctx.stream,
      board: ctx.board,
      school: ctx.school,
      country: ctx.country,
      city: ctx.city,
      grade: ctx.grade,
      targetDegree: ctx.targetDegree,
      targetCountries: ctx.targetCountries,
      subjects: ctx.subjects,
      cgpa: ctx.cgpa,
      percentage: ctx.percentage,
      hasTranscript: ctx.hasTranscript,
      transcriptProgram: ctx.transcriptProgram,
      resumeSummary: ctx.resumeSummary,
      interests: ctx.interests,
    });

    this.stepsCache.set(userId, {
      steps,
      expires: Date.now() + 5 * 60 * 1000,
    });

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
          { value: 'build', label: 'Building things', emoji: '🛠️' },
          { value: 'help', label: 'Helping people', emoji: '🤝' },
          { value: 'create', label: 'Creating art/media', emoji: '🎨' },
          { value: 'analyze', label: 'Solving puzzles', emoji: '🧩' },
          { value: 'lead', label: 'Leading teams', emoji: '🚀' },
        ],
      },
      {
        id: 'subjects',
        type: 'choice',
        title: 'Which subjects feel most natural?',
        subtitle: 'Pick up to 3',
        options: [
          { value: 'math', label: 'Math', emoji: '📐' },
          { value: 'science', label: 'Science', emoji: '🔬' },
          { value: 'english', label: 'English', emoji: '📚' },
          { value: 'history', label: 'History', emoji: '🏛️' },
          { value: 'cs', label: 'Computer Science', emoji: '💻' },
          { value: 'arts', label: 'Arts', emoji: '🎭' },
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
    answers: Record<string, unknown>,
    userId?: string,
  ): Promise<DiagnosticStep> {
    const ctx = userId ? await this.getProfileContext(userId) : null;
    const profileHint = ctx
      ? `Student: ${ctx.name}, ${ctx.isCollege ? 'college' : 'school'} student, stream: ${ctx.stream ?? 'undecided'}, goal: ${ctx.targetDegree ?? 'not set'}, countries: ${ctx.targetCountries.join(', ') || 'not set'}`
      : '';

    const fallback: DiagnosticStep = {
      id: 'ai-generated',
      type: 'choice',
      title: ctx?.isCollege
        ? 'What would make your next year a success?'
        : 'What matters most in your ideal college or career?',
      options: ctx?.isCollege
        ? [
            { value: 'internship', label: 'A great internship', emoji: '💼' },
            { value: 'skills', label: 'Mastering key skills', emoji: '🧠' },
            { value: 'network', label: 'Building connections', emoji: '🤝' },
            { value: 'clarity', label: 'Clear career direction', emoji: '🧭' },
          ]
        : [
            { value: 'impact', label: 'Making an impact', emoji: '🌍' },
            { value: 'income', label: 'Financial stability', emoji: '💰' },
            { value: 'creativity', label: 'Creative freedom', emoji: '✨' },
            { value: 'prestige', label: 'Top institutions', emoji: '🏆' },
          ],
    };

    return this.geminiService.generateStructured<DiagnosticStep>({
      systemPrompt: `You are a warm, professional student career coach for UniDiscover. Generate ONE short follow-up diagnostic question based on prior answers and student context. Reference their goals naturally. Keep it engaging, specific, and minimal. ${profileHint}`,
      userPrompt: JSON.stringify({ answers, profile: ctx }),
      schemaDescription: `{
        "id": "ai-generated",
        "type": "choice",
        "title": "string",
        "subtitle": "string optional",
        "options": [{"value":"string","label":"string","emoji":"string"}]
      }`,
      fallback,
    });
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.diagnosticSession.findFirst({
      where: { id: sessionId, userId },
      include: { template: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const answers = session.answers as Record<string, unknown>;
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

    return report;
  }

  private async generateReport(
    answers: Record<string, unknown>,
    userId?: string,
  ): Promise<DiagnosticReport> {
    const ctx = userId ? await this.getProfileContext(userId) : null;

    const fallbackInsights: string[] = [];
    if (ctx?.hasTranscript)
      fallbackInsights.push(
        `Academic records on file from ${ctx.transcriptInstitution ?? 'your institution'}`,
      );
    if (ctx?.cgpa)
      fallbackInsights.push(`CGPA ${ctx.cgpa} — solid academic foundation`);
    if (ctx?.targetDegree)
      fallbackInsights.push(
        `Targeting ${ctx.targetDegree}${ctx.targetCountries.length ? ` in ${ctx.targetCountries.join(', ')}` : ''}`,
      );
    if (ctx?.transcriptSubjects.length)
      fallbackInsights.push(
        `Strong subject exposure: ${ctx.transcriptSubjects.slice(0, 4).join(', ')}`,
      );

    const fallback: DiagnosticReport = {
      headline: ctx?.targetDegree
        ? `Your path toward ${ctx.targetDegree}`
        : 'Your unique path is taking shape',
      summary: ctx?.isCollege
        ? `As a ${ctx.stream ?? 'college'} student${ctx.cgpa ? ` with CGPA ${ctx.cgpa}` : ''}, your profile shows strong potential. Your discovery answers reinforce a thoughtful, goal-oriented approach.`
        : 'Based on your responses and profile, you show a blend of curiosity, creativity, and purpose-driven thinking.',
      strengths: ctx?.strengths?.length
        ? ctx.strengths.slice(0, 4)
        : ['Curiosity', 'Adaptability'],
      interests: ctx?.interests?.length
        ? ctx.interests.slice(0, 4)
        : ['Technology', 'Problem solving'],
      learningStyle: 'Hands-on explorer',
      recommendedDirections: ctx?.isCollege
        ? ['Industry internships', 'Skill specialization', 'Graduate pathways']
        : ['STEM exploration', 'Design & innovation'],
      nextBestAction: ctx?.isCollege
        ? 'View your personalized career map and explore internship opportunities'
        : 'Explore college matches tailored to your profile',
      profileInsights: fallbackInsights.length
        ? fallbackInsights
        : ['Complete your profile and upload transcripts for deeper insights'],
      careerMatches: ctx?.isCollege
        ? [
            'Software Engineer',
            'Data Scientist',
            'ML Engineer',
            'Product Manager',
          ]
        : ['Engineering', 'Medicine', 'Business', 'Design'],
      collegeFit: ctx?.targetCountries.length
        ? `Well-suited for programs in ${ctx.targetCountries.join(', ')} — focus on universities strong in ${ctx.stream ?? 'your field'}`
        : 'Explore universities matching your stream and academic performance',
      skillGaps: ctx?.isCollege
        ? [
            'Build portfolio projects',
            'Prepare for technical interviews',
            'Strengthen domain certifications',
          ]
        : [
            'Explore stream options',
            'Build foundational skills',
            'Research target colleges',
          ],
      actionPlan: [
        'Review your career map timeline',
        'Save 3–5 college matches',
        'Upload latest transcript if not done',
        'Explore relevant internships or programs',
      ],
      fitScore: ctx?.hasTranscript && ctx.targetDegree ? 78 : 65,
    };

    const fullProfile = ctx
      ? {
          name: ctx.name,
          educationLevel: ctx.isCollege ? 'college' : 'school',
          classGroup: ctx.classGroupLabel ?? ctx.classGroup,
          stream: ctx.stream,
          board: ctx.board,
          school: ctx.school,
          institution: ctx.transcriptInstitution,
          degree: ctx.transcriptDegree,
          program: ctx.transcriptProgram,
          cgpa: ctx.cgpa,
          academicScore: ctx.percentage,
          targetDegree: ctx.targetDegree,
          targetCountries: ctx.targetCountries,
          location: [ctx.city, ctx.country].filter(Boolean).join(', '),
          subjects: ctx.subjects,
          transcriptSubjects: ctx.transcriptSubjects,
          semesterCount: ctx.semesterCount,
          interests: ctx.interests,
          strengths: ctx.strengths,
          resumeSummary: ctx.resumeSummary,
          transcriptSummary: ctx.transcriptSummary,
          hasTranscript: ctx.hasTranscript,
          hasResume: ctx.hasResume,
          documentCount: ctx.documentCount,
        }
      : {};

    return this.geminiService.generateStructured<DiagnosticReport>({
      systemPrompt: `You are an expert student career advisor for UniDiscover. Generate a comprehensive, personalized diagnostic report synthesizing:
1) Their quiz answers
2) Full profile (education, goals, location)
3) Transcript/academic data if available
4) Resume summary if available

Be specific — reference their actual institution, CGPA, subjects, and goals by name. Write like a professional counselor, not generic. The report powers career map and college matching.`,
      userPrompt: JSON.stringify({ answers, profile: fullProfile }),
      schemaDescription: `{
        "headline": "string — punchy personalized title",
        "summary": "string — 3-4 sentences weaving profile + answers",
        "strengths": ["string — 3-5 specific strengths"],
        "interests": ["string — 3-5 interests"],
        "learningStyle": "string",
        "recommendedDirections": ["string — 3-4 career/education directions"],
        "nextBestAction": "string — single clear next step",
        "profileInsights": ["string — 3-5 insights from their full profile, transcript, resume"],
        "careerMatches": ["string — 4-6 specific career titles that fit"],
        "collegeFit": "string — paragraph on college/university fit based on goals and academics",
        "skillGaps": ["string — 2-4 areas to develop"],
        "actionPlan": ["string — 4-5 concrete action steps in order"],
        "fitScore": "number 0-100 — how aligned their profile is with stated goals"
      }`,
      fallback,
    });
  }
}
