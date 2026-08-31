import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ProfilesRepository } from '../../../infrastructure/database/repositories/profiles.repository';
import {
  GeminiService,
  GeminiApiError,
} from '../../../infrastructure/ai/gemini/gemini.service';

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  href: string;
  status: 'locked' | 'current' | 'completed';
  progress: number;
}

export interface UploadedAcademicFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

export interface ParsedAcademicDoc {
  documentType: string;
  studentName?: string;
  institution?: string;
  degree?: string;
  program?: string;
  semester?: string;
  board?: string;
  cgpa?: number;
  percentage?: number;
  sgpa?: number;
  subjects: Array<{
    name: string;
    grade?: string;
    score?: number;
    credits?: number;
  }>;
  summary?: string;
  strengths?: string[];
  parsedAt: string;
  sourceFile?: string;
  parseQuality?: 'full' | 'partial';
}

export interface AcademicProfile {
  studentName?: string;
  institution?: string;
  degree?: string;
  program?: string;
  level?: string;
  board?: string;
  cgpa?: number;
  percentage?: number;
  subjects: string[];
  semesterRecords: Array<{
    semester: string;
    sgpa?: number;
    percentage?: number;
  }>;
  documents: ParsedAcademicDoc[];
  aiSummary?: string;
  inferredStream?: string;
  inferredInterests?: string[];
  inferredStrengths?: string[];
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async getDashboard(userId: string) {
    const profile = await this.profilesRepository.findByUserId(userId);

    const [
      collegeSaved,
      activitiesSaved,
      documents,
      jobAssets,
      tutoringAttempts,
      tutoringAccuracy,
      careersSaved,
      planItems,
      careerMap,
    ] = await Promise.all([
      this.prisma.collegeRecommendation.count({
        where: { userId, isSaved: true },
      }),
      this.prisma.savedActivity.count({ where: { userId } }),
      this.prisma.applicationDocument.count({
        where: { userId, deletedAt: null },
      }),
      this.prisma.jobAsset.count({ where: { userId, deletedAt: null } }),
      this.prisma.tutoringAttempt.count({ where: { userId } }),
      this.prisma.tutoringAttempt.count({ where: { userId, isCorrect: true } }),
      this.prisma.careerRecommendation.count({
        where: { userId, isSaved: true },
      }),
      this.prisma.activityPlanItem.count({ where: { userId } }),
      this.prisma.careerMap.count({ where: { userId } }),
    ]);

    const onboardingDone = profile?.onboardingCompleted ?? false;
    const diagnosticDone = profile?.diagnosticCompleted ?? false;

    const journey: JourneyStep[] = [
      {
        id: 'profile-discovery',
        title: 'Know Yourself',
        description:
          onboardingDone && diagnosticDone
            ? 'Profile & AI discovery complete'
            : !onboardingDone
              ? 'Set up your profile'
              : 'Complete AI discovery',
        href: !onboardingDone ? '/onboarding' : '/diagnostics',
        status:
          onboardingDone && diagnosticDone
            ? 'completed'
            : !onboardingDone || !diagnosticDone
              ? 'current'
              : 'current',
        progress:
          onboardingDone && diagnosticDone
            ? 100
            : onboardingDone
              ? diagnosticDone
                ? 100
                : 50
              : Math.min(100, (profile?.onboardingStep ?? 0) * 25),
      },
      {
        id: 'career-map',
        title: 'Map Your Future',
        description:
          careerMap > 0
            ? 'Career map generated'
            : 'See your path from today to career',
        href: '/career-map',
        status: !diagnosticDone
          ? 'locked'
          : careerMap > 0
            ? 'completed'
            : 'current',
        progress: careerMap > 0 ? 100 : 0,
      },
      {
        id: 'explore',
        title: 'Explore Options',
        description:
          collegeSaved > 0 || careersSaved > 0
            ? `${collegeSaved} colleges · ${careersSaved} careers saved`
            : 'Colleges, careers & opportunities',
        href: '/discovery',
        status: !diagnosticDone
          ? 'locked'
          : collegeSaved > 0 || careersSaved > 0 || activitiesSaved > 0
            ? 'completed'
            : 'current',
        progress:
          collegeSaved > 0 || careersSaved > 0
            ? 100
            : activitiesSaved > 0
              ? 50
              : 0,
      },
      {
        id: 'plan-apply',
        title: 'Plan & Apply',
        description:
          documents > 0
            ? 'Application documents started'
            : planItems > 0
              ? 'Activity plan in progress'
              : 'Build profile & submit applications',
        href: planItems > 0 ? '/activity-planner' : '/applications',
        status: !diagnosticDone
          ? 'locked'
          : documents > 0 || planItems > 0
            ? 'completed'
            : 'current',
        progress: documents > 0 ? 100 : planItems > 0 ? 60 : 0,
      },
    ];

    const nextStep =
      journey.find((s) => s.status === 'current') ??
      journey[journey.length - 1];
    const overallProgress = Math.round(
      journey.reduce((sum, s) => sum + s.progress, 0) / journey.length,
    );

    return {
      profile,
      stats: {
        collegesSaved: collegeSaved,
        careersSaved,
        activitiesSaved,
        planItems,
        documents,
        jobAssets,
        tutoringAttempts,
        tutoringAccuracy: tutoringAttempts
          ? Math.round((tutoringAccuracy / tutoringAttempts) * 100)
          : 0,
        overallProgress,
      },
      journey,
      nextStep,
      greeting: this.buildGreeting(profile),
    };
  }

  private buildGreeting(
    profile: Awaited<ReturnType<ProfilesRepository['findByUserId']>>,
  ) {
    if (!profile) return 'Your personalized student hub';

    const goals = (profile.goals ?? {}) as Record<string, unknown>;
    const isCollege =
      profile.classGroup?.startsWith('college-') ||
      goals.educationLevel === 'college';

    const levelLabel = isCollege
      ? this.collegeYearLabel(profile.classGroup)
      : (this.schoolGroupLabel(profile.classGroup) ??
        (profile.grade ? `Grade ${profile.grade}` : null));

    const parts = [levelLabel, profile.stream, profile.board].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Your personalized student hub';
  }

  private schoolGroupLabel(classGroup?: string | null) {
    const map: Record<string, string> = {
      '6-8': 'Classes 6–8',
      '9-10': 'Classes 9–10',
      '11-12': 'Classes 11–12',
    };
    return classGroup ? map[classGroup] : null;
  }

  private collegeYearLabel(classGroup?: string | null) {
    const map: Record<string, string> = {
      'college-y1': 'Year 1',
      'college-y2': 'Year 2',
      'college-y3': 'Year 3',
      'college-y4': 'Year 4+',
    };
    return classGroup ? (map[classGroup] ?? 'College') : 'College';
  }

  async parseTranscript(userId: string, rawText: string) {
    const parsed = await this.geminiService.generateStructured<{
      subjects: Array<{ name: string; grade: string; score?: number }>;
      gpa?: number;
      cgpa?: number;
      percentage?: number;
      board?: string;
      degree?: string;
      program?: string;
      institution?: string;
      summary?: string;
      strengths?: string[];
    }>({
      systemPrompt:
        'Parse academic transcripts into structured JSON. Handle Indian university semester marksheets, CBSE, ICSE, IB, GATE forms, and masters transcripts.',
      userPrompt: rawText,
      schemaDescription:
        '{ subjects: [{ name, grade, score? }], gpa?, cgpa?, percentage?, board?, degree?, program?, institution?, summary?, strengths?[] }',
      fallback: this.parseTranscriptFallback(rawText),
    });

    await this.mergeParsedIntoProfile(userId, {
      ...parsed,
      documentType: 'text',
      parsedAt: new Date().toISOString(),
    });

    return parsed;
  }

  async parseDocument(userId: string, file: UploadedAcademicFile) {
    if (!file?.buffer?.length) {
      return { error: 'No file received. Please try uploading again.' };
    }

    let mime = file.mimetype || 'application/pdf';
    if (mime === 'application/octet-stream') {
      const name = file.originalname?.toLowerCase() ?? '';
      if (name.endsWith('.pdf')) mime = 'application/pdf';
      else if (name.endsWith('.png')) mime = 'image/png';
      else if (name.endsWith('.webp')) mime = 'image/webp';
      else if (name.endsWith('.jpg') || name.endsWith('.jpeg'))
        mime = 'image/jpeg';
    }

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowed.includes(mime)) {
      return { error: `Unsupported file type: ${mime}. Use PDF or image.` };
    }

    const base64 = file.buffer.toString('base64');
    let parsed: {
      documentType: string;
      studentName?: string;
      institution?: string;
      degree?: string;
      program?: string;
      semester?: string;
      board?: string;
      cgpa?: number;
      sgpa?: number;
      percentage?: number;
      subjects: Array<{
        name: string;
        grade?: string;
        score?: number;
        credits?: number;
      }>;
      summary?: string;
      strengths?: string[];
    };

    try {
      parsed = await this.geminiService.parseDocument(
        base64,
        mime,
        `Extract all academic information from this document (marksheet, transcript, bonafide, or GATE form).
Identify: student name, institution, degree/program, semester, board, CGPA/SGPA/percentage, every subject with marks/grades/credits.
For engineering masters docs infer program like Computer Science, AI, Data Science etc.`,
        '{ documentType, studentName?, institution?, degree?, program?, semester?, board?, cgpa?, sgpa?, percentage?, subjects: [{ name, grade?, score?, credits? }], summary?, strengths?[] }',
        {
          documentType: 'unknown',
          subjects: [],
          summary: `Parsed ${file.originalname} — limited extraction without AI.`,
        },
      );
    } catch (error) {
      if (error instanceof GeminiApiError) {
        return { error: error.message, code: error.code };
      }
      throw error;
    }

    const normalized = this.normalizeGeminiAcademicParse(parsed);
    const usedFallback =
      (normalized.subjects?.length ?? 0) === 0 &&
      String(normalized.summary ?? '').includes('limited extraction');

    const doc: ParsedAcademicDoc = {
      ...normalized,
      parsedAt: new Date().toISOString(),
      sourceFile: file.originalname,
      parseQuality: usedFallback ? 'partial' : 'full',
    };

    await this.mergeParsedIntoProfile(userId, doc);
    return doc;
  }

  private normalizeGeminiAcademicParse(
    parsed: Record<string, unknown>,
  ): ParsedAcademicDoc {
    const subjects: ParsedAcademicDoc['subjects'] = [
      ...((parsed.subjects as ParsedAcademicDoc['subjects']) ?? []),
    ];
    let semester: string | undefined =
      typeof parsed.semester === 'string' ? parsed.semester : undefined;

    const semesterData = parsed.semester;
    if (Array.isArray(semesterData)) {
      for (const sem of semesterData) {
        const entry = sem as {
          name?: string;
          sgpa?: number;
          subjects?: Array<{ name: string; grade?: string; credits?: number }>;
        };
        if (!semester && entry.name) semester = entry.name;
        for (const sub of entry.subjects ?? []) {
          subjects.push({
            name: sub.name,
            grade: sub.grade,
            score: sub.credits,
            credits: sub.credits,
          });
        }
      }
    }

    const strengths = Array.isArray(parsed.strengths)
      ? (parsed.strengths as string[])
      : undefined;

    const documentType =
      typeof parsed.documentType === 'string'
        ? parsed.documentType
        : 'document';

    return {
      documentType,
      studentName: parsed.studentName as string | undefined,
      institution: parsed.institution as string | undefined,
      degree: parsed.degree as string | undefined,
      program: parsed.program as string | undefined,
      semester,
      board: parsed.board as string | undefined,
      cgpa: typeof parsed.cgpa === 'number' ? parsed.cgpa : undefined,
      sgpa: typeof parsed.sgpa === 'number' ? parsed.sgpa : undefined,
      percentage:
        typeof parsed.percentage === 'number' ? parsed.percentage : undefined,
      subjects,
      summary: parsed.summary as string | undefined,
      strengths,
      parsedAt: '',
    };
  }

  async buildAcademicProfile(userId: string) {
    const profile = await this.profilesRepository.findByUserId(userId);
    const existing = (profile?.transcriptData as AcademicProfile | null) ?? {
      documents: [],
      subjects: [],
      semesterRecords: [],
    };
    const documents = existing.documents ?? [];

    const context = JSON.stringify(documents.slice(-12));
    const manualFallback = this.buildManualAcademicProfile(
      existing,
      documents,
      profile,
    );
    const unified = await this.geminiService.generateStructured<{
      studentName?: string;
      institution?: string;
      degree?: string;
      program?: string;
      level?: string;
      cgpa?: number;
      percentage?: number;
      inferredStream?: string;
      inferredInterests?: string[];
      inferredStrengths?: string[];
      aiSummary?: string;
      targetDegree?: string;
      targetCountries?: string[];
    }>({
      systemPrompt:
        'Synthesize multiple academic documents into one student profile for college/career guidance. Be specific and encouraging.',
      userPrompt: context,
      schemaDescription:
        '{ studentName?, institution?, degree?, program?, level?, cgpa?, percentage?, inferredStream?, inferredInterests?[], inferredStrengths?[], aiSummary?, targetDegree?, targetCountries?[] }',
      fallback: manualFallback,
    });

    const merged = { ...manualFallback, ...unified };

    const allSubjects = new Set<string>(existing.subjects ?? []);
    documents.forEach((d) =>
      d.subjects?.forEach((s) => allSubjects.add(s.name)),
    );

    const academicProfile: AcademicProfile = {
      ...existing,
      ...merged,
      subjects: [...allSubjects],
      documents,
    };

    const grade = this.inferGradeFromLevel(merged.level, profile?.grade);
    await this.profilesRepository.update(userId, {
      transcriptData: academicProfile as object,
      subjects: [...allSubjects],
      stream: merged.inferredStream ?? profile?.stream,
      interests: merged.inferredInterests?.length
        ? merged.inferredInterests
        : profile?.interests,
      strengths: merged.inferredStrengths?.length
        ? merged.inferredStrengths
        : profile?.strengths,
      aiSummary: merged.aiSummary,
      targetDegree: merged.targetDegree ?? profile?.targetDegree,
      targetCountries: merged.targetCountries?.length
        ? merged.targetCountries
        : profile?.targetCountries,
      percentage: merged.percentage ?? profile?.percentage,
      school: merged.institution ?? profile?.school,
      ...(grade ? { grade } : {}),
    });

    return academicProfile;
  }

  private buildManualAcademicProfile(
    existing: AcademicProfile,
    documents: ParsedAcademicDoc[],
    profile: {
      interests?: string[];
      strengths?: string[];
      targetDegree?: string | null;
      targetCountries?: string[];
    } | null,
  ) {
    const latest =
      [...documents].reverse().find((d) => d.institution || d.program) ??
      documents[documents.length - 1];
    const allSubjects = new Set<string>();
    documents.forEach((d) =>
      d.subjects?.forEach((s) => allSubjects.add(s.name)),
    );

    const interests = this.inferInterestsFromProgram(
      latest?.program ?? existing.program,
      [...allSubjects],
    );

    return {
      studentName: latest?.studentName ?? existing.studentName,
      institution: latest?.institution ?? existing.institution,
      degree: latest?.degree ?? existing.degree,
      program: latest?.program ?? existing.program,
      cgpa: latest?.cgpa ?? existing.cgpa,
      percentage: latest?.percentage ?? existing.percentage,
      inferredStream: latest?.program ?? existing.program,
      inferredInterests: interests.length
        ? interests
        : (profile?.interests ?? ['technology']),
      inferredStrengths: profile?.strengths ?? [],
      aiSummary:
        existing.aiSummary ??
        `Academic profile built from ${documents.length} uploaded document${documents.length === 1 ? '' : 's'}${
          latest?.institution ? ` at ${latest.institution}` : ''
        }${latest?.cgpa ? ` · CGPA ${latest.cgpa}` : ''}.`,
      targetDegree: profile?.targetDegree ?? undefined,
      targetCountries: profile?.targetCountries ?? [],
    };
  }

  private async mergeParsedIntoProfile(
    userId: string,
    doc: ParsedAcademicDoc | Record<string, unknown>,
  ) {
    const profile = await this.profilesRepository.findByUserId(userId);
    const existing = (profile?.transcriptData as AcademicProfile | null) ?? {
      documents: [],
      subjects: [],
      semesterRecords: [],
    };

    const parsedDoc = doc as ParsedAcademicDoc;
    const documents = [...(existing.documents ?? []), parsedDoc];
    const subjectNames = new Set(existing.subjects ?? []);
    (parsedDoc.subjects ?? []).forEach((s) => subjectNames.add(s.name));

    const semesterRecords = [...(existing.semesterRecords ?? [])];
    if (parsedDoc.semester) {
      semesterRecords.push({
        semester: parsedDoc.semester,
        sgpa: parsedDoc.sgpa ?? parsedDoc.cgpa,
        percentage: parsedDoc.percentage,
      });
    }

    const academicProfile: AcademicProfile = {
      ...existing,
      studentName: parsedDoc.studentName ?? existing.studentName,
      institution: parsedDoc.institution ?? existing.institution,
      degree: parsedDoc.degree ?? existing.degree,
      program: parsedDoc.program ?? existing.program,
      cgpa: parsedDoc.cgpa ?? existing.cgpa,
      percentage: parsedDoc.percentage ?? existing.percentage,
      board: parsedDoc.board ?? existing.board,
      subjects: [...subjectNames],
      semesterRecords,
      documents,
    };

    const strengths = parsedDoc.strengths?.length
      ? [...new Set([...(profile?.strengths ?? []), ...parsedDoc.strengths])]
      : profile?.strengths;

    const inferredInterests = this.inferInterestsFromProgram(
      parsedDoc.program ?? academicProfile.program,
      [...subjectNames],
    );

    await this.profilesRepository.update(userId, {
      transcriptData: academicProfile as object,
      subjects: [...subjectNames],
      percentage: parsedDoc.percentage ?? profile?.percentage,
      board: parsedDoc.board ?? profile?.board,
      strengths,
      interests: inferredInterests.length
        ? [...new Set([...(profile?.interests ?? []), ...inferredInterests])]
        : profile?.interests,
      stream: parsedDoc.program?.toLowerCase().includes('science')
        ? 'Science'
        : profile?.stream,
      school: parsedDoc.institution ?? profile?.school,
      resumeSummary: parsedDoc.summary ?? profile?.resumeSummary,
      targetDegree:
        profile?.targetDegree ??
        `M.Tech / MS in ${parsedDoc.program ?? 'Computer Science'}`,
    });
  }

  private inferInterestsFromProgram(
    program?: string,
    subjects?: string[],
  ): string[] {
    const interests = new Set<string>();
    const text = `${program ?? ''} ${(subjects ?? []).join(' ')}`.toLowerCase();
    if (
      text.includes('artificial intelligence') ||
      text.includes('machine learning')
    ) {
      interests.add('artificial intelligence');
      interests.add('machine learning');
    }
    if (text.includes('data')) interests.add('data science');
    if (text.includes('computer') || text.includes('software'))
      interests.add('technology');
    if (text.includes('network')) interests.add('computer networks');
    return [...interests];
  }

  private inferGradeFromLevel(
    level?: string,
    current?: number | null,
  ): number | undefined {
    if (current) return current;
    if (!level) return undefined;
    const l = level.toLowerCase();
    if (
      l.includes('master') ||
      l.includes('postgraduate') ||
      l.includes('m.tech') ||
      l.includes('ms')
    )
      return 12;
    if (l.includes('bachelor') || l.includes('undergraduate')) return 11;
    if (l.includes('12')) return 12;
    if (l.includes('10')) return 10;
    return undefined;
  }

  private parseTranscriptFallback(rawText: string) {
    const lines = rawText.split('\n').filter(Boolean);
    const subjects = lines.slice(0, 6).map((line) => {
      const parts = line.split(/[:\-,]/);
      return { name: parts[0]?.trim() ?? line, grade: parts[1]?.trim() ?? '—' };
    });
    return {
      subjects,
      summary: 'Transcript saved — add GEMINI_API_KEY for smarter parsing.',
    };
  }
}
