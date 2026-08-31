import { Injectable } from '@nestjs/common';
import { Prisma, StudentProfile } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';

export interface CareerMilestone {
  year: number;
  grade?: string;
  stage: string;
  title: string;
  description: string;
  actions: string[];
  employers?: string[];
}

interface StudentContext {
  isCollege: boolean;
  collegeYear?: number;
  schoolGrade?: number;
  levelLabel: string;
}

@Injectable()
export class CareerMapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async getLatest(userId: string) {
    return this.prisma.careerMap.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
    });
  }

  async generate(userId: string) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const latest = await this.getLatest(userId);
    const version = (latest?.version ?? 0) + 1;
    const ctx = this.resolveStudentContext(profile);

    const prompt = ctx.isCollege
      ? this.buildCollegePrompt(profile, ctx)
      : this.buildSchoolPrompt(profile, ctx);

    const fallback = {
      headline: ctx.isCollege
        ? 'Your career launchpad'
        : 'Your personalised journey',
      summary:
        profile.aiSummary ?? 'A path shaped by your strengths and goals.',
      milestones: ctx.isCollege
        ? this.buildCollegeFallbackMilestones(ctx.collegeYear ?? 1, profile)
        : this.buildSchoolFallbackMilestones(ctx.schoolGrade ?? 9, profile),
    };

    const aiMap = await this.geminiService.generateStructured({
      systemPrompt: ctx.isCollege
        ? 'You are a career coach for university students. Create FORWARD-LOOKING maps only — never include past school years or elementary grades.'
        : 'You are a long-range career mapping expert for school students from middle school through university.',
      userPrompt: prompt,
      schemaDescription:
        '{ headline, summary, milestones: [{ year, grade, stage, title, description, actions[], employers[] }] }',
      fallback,
    });

    const mapData = this.normalizeMapData(aiMap, ctx, profile);

    return this.prisma.careerMap.create({
      data: {
        userId,
        version,
        grade: ctx.isCollege ? ctx.collegeYear : ctx.schoolGrade,
        mapData: mapData as Prisma.InputJsonValue,
      },
    });
  }

  private resolveStudentContext(profile: StudentProfile): StudentContext {
    const goals = profile.goals as {
      educationLevel?: string;
      collegeYear?: number;
    } | null;
    const isCollege =
      goals?.educationLevel === 'college' ||
      profile.classGroup?.startsWith('college-') === true;

    if (isCollege) {
      const yearMatch = profile.classGroup?.match(/college-y(\d)/);
      const collegeYear =
        goals?.collegeYear ??
        (yearMatch ? parseInt(yearMatch[1], 10) : (profile.grade ?? 1));
      return {
        isCollege: true,
        collegeYear,
        levelLabel: `College Year ${collegeYear}`,
      };
    }

    const gradeFromGroup =
      profile.classGroup === '11-12'
        ? 12
        : profile.classGroup === '9-10'
          ? 10
          : profile.classGroup === '6-8'
            ? 8
            : null;
    const schoolGrade = profile.grade ?? gradeFromGroup ?? 9;

    return {
      isCollege: false,
      schoolGrade,
      levelLabel: `Grade ${schoolGrade}`,
    };
  }

  private buildCollegePrompt(
    profile: StudentProfile,
    ctx: StudentContext,
  ): string {
    const year = ctx.collegeYear ?? 1;
    const isFinalYear = year >= 4;
    return `Create a FORWARD-LOOKING career map for a COLLEGE STUDENT currently in YEAR ${year}${isFinalYear ? ' (final year)' : ''}.
Program: ${profile.stream ?? 'undecided'} at ${profile.school ?? 'their university'}.
Target after graduation: ${profile.targetDegree ?? 'career or higher studies'}.
Countries of interest: ${profile.targetCountries?.join(', ') || 'global'}.
Interests: ${profile.interests?.join(', ') || 'general'}.

CRITICAL RULES:
- Start from the CURRENT academic year (${new Date().getFullYear()}). Do NOT mention elementary school or "Grade 4" etc.
- Map milestones from NOW through the next 5-7 years only.
- For Year 4 students: focus on placements, grad school applications, capstone projects, first job.
- For earlier years: internships, skill building, specialization, then career entry.
- Use stage labels like "Final Year", "Placement", "First Role", "Career Growth".
Return JSON with 5-7 milestones.`;
  }

  private buildSchoolPrompt(
    profile: StudentProfile,
    ctx: StudentContext,
  ): string {
    return `Create a career-years map for a SCHOOL student currently in ${ctx.levelLabel}, stream ${profile.stream ?? 'undecided'}.
Target degree: ${profile.targetDegree ?? 'undecided'}.
Countries: ${profile.targetCountries?.join(', ') || 'global'}.
Cover from current grade through age ~22-25: school → college → career → employers. Include 5-8 milestones.`;
  }

  private normalizeMapData(
    raw: Record<string, unknown>,
    ctx: StudentContext,
    profile: StudentProfile,
  ) {
    const nested = raw.mapData as Record<string, unknown> | undefined;
    const candidate = (nested?.headline ? nested : raw) as {
      headline?: string;
      summary?: string;
      milestones?: CareerMilestone[];
    };

    if (
      candidate.headline &&
      candidate.summary &&
      Array.isArray(candidate.milestones)
    ) {
      return candidate;
    }

    return {
      headline: ctx.isCollege
        ? 'Your career launchpad'
        : 'Your personalised journey',
      summary:
        profile.aiSummary ?? 'A path shaped by your strengths and goals.',
      milestones: ctx.isCollege
        ? this.buildCollegeFallbackMilestones(ctx.collegeYear ?? 1, profile)
        : this.buildSchoolFallbackMilestones(ctx.schoolGrade ?? 9, profile),
    };
  }

  async list(userId: string) {
    return this.prisma.careerMap.findMany({
      where: { userId },
      orderBy: { version: 'desc' },
    });
  }

  private buildCollegeFallbackMilestones(
    collegeYear: number,
    profile: {
      targetDegree?: string | null;
      stream?: string | null;
      interests: string[];
    },
  ): CareerMilestone[] {
    const y = new Date().getFullYear();
    const program = profile.stream ?? profile.targetDegree ?? 'your program';

    if (collegeYear >= 4) {
      return [
        {
          year: y,
          grade: 'Year 4',
          stage: 'Final Year',
          title: 'Capstone & placement prep',
          description: `Complete ${program} with strong projects and placement/grad-school applications.`,
          actions: [
            'Finish capstone project',
            'Update CV & LinkedIn',
            'Apply to target companies or MS programs',
          ],
          employers: ['Campus placement cell'],
        },
        {
          year: y + 1,
          stage: 'Launch',
          title:
            profile.targetDegree?.includes('MS') ||
            profile.targetDegree?.includes('MBA')
              ? 'Graduate school'
              : 'First full-time role',
          description:
            'Land your first role or enroll in your target graduate program.',
          actions: [
            'Onboard successfully',
            'Build professional network',
            'Set 12-month growth goals',
          ],
          employers: ['Google', 'Microsoft', 'Deloitte', 'TCS'],
        },
        {
          year: y + 3,
          stage: 'Career Growth',
          title: 'Specialist / Associate',
          description: `Deepen expertise in ${profile.interests[0] ?? 'your field'}.`,
          actions: ['Lead a project', 'Earn a certification', 'Mentor juniors'],
        },
        {
          year: y + 5,
          stage: 'Leadership',
          title: 'Senior role or advanced degree',
          description:
            'Move into senior IC or management track, or complete advanced studies.',
          actions: [
            'Promotion or role switch',
            'Industry conference speaking',
            'Build side portfolio',
          ],
          employers: ['Dream employer', 'Startup founder path'],
        },
      ];
    }

    return [
      {
        year: y,
        grade: `Year ${collegeYear}`,
        stage: 'Now',
        title: 'Build depth in your program',
        description: `Excel in ${program} coursework and explore real-world projects.`,
        actions: [
          'Maintain strong CGPA',
          'Join technical clubs',
          'Start portfolio projects',
        ],
      },
      {
        year: y + 1,
        grade: `Year ${collegeYear + 1}`,
        stage: 'Internship',
        title: 'Summer internship',
        description:
          'Gain industry experience aligned with your target career.',
        actions: [
          'Apply to internships',
          'Build GitHub/portfolio',
          'Network on LinkedIn',
        ],
      },
      {
        year: y + 2,
        stage: 'Specialization',
        title: 'Advanced projects & skills',
        description:
          'Specialize in areas matching your target role or grad school.',
        actions: [
          'Research project or thesis prep',
          'Competitions/hackathons',
          'Mentor connection',
        ],
      },
      {
        year: y + (5 - collegeYear),
        stage: 'Career Entry',
        title: profile.targetDegree ?? 'First career role',
        description:
          'Graduate and enter your target industry or pursue higher studies.',
        actions: [
          'Placement applications',
          'Grad school prep if applicable',
          'Interview practice',
        ],
        employers: ['Target companies in your field'],
      },
    ];
  }

  private buildSchoolFallbackMilestones(
    grade: number,
    profile: { targetDegree?: string | null; interests: string[] },
  ): CareerMilestone[] {
    const milestones: CareerMilestone[] = [];
    const y = new Date().getFullYear();

    milestones.push({
      year: y,
      grade: `Grade ${grade}`,
      stage: 'Now',
      title: 'Build foundation',
      description: 'Complete onboarding, diagnostic, and profile.',
      actions: [
        'Finish AI discovery',
        'Save target colleges',
        'Plan 2 activities',
      ],
    });

    if (grade <= 10) {
      milestones.push({
        year: y + 1,
        grade: `Grade ${grade + 1}`,
        stage: 'School',
        title: 'Stream & subject focus',
        description: 'Lock in subjects aligned with your target degree.',
        actions: ['Choose electives', 'Join 1 competition', 'Meet a mentor'],
      });
    }

    milestones.push({
      year: y + 2,
      stage: 'College prep',
      title: 'Applications & tests',
      description: 'Shortlist universities and build application materials.',
      actions: [
        'Draft personal statement',
        'SAT/IELTS if needed',
        'Request references',
      ],
    });

    milestones.push({
      year: y + 3,
      stage: 'University',
      title: profile.targetDegree ?? 'Undergraduate degree',
      description: 'Enroll in your matched program and explore internships.',
      actions: ['First-year modules', 'Summer internship', 'Campus clubs'],
      employers: ['University career centre'],
    });

    milestones.push({
      year: y + 5,
      stage: 'Career',
      title: 'First role',
      description: `Entry role aligned with ${profile.interests[0] ?? 'your strengths'}.`,
      actions: ['Graduate applications', 'Networking', 'Portfolio/CV polish'],
      employers: ['Google', 'Deloitte', 'NHS', 'Infosys'],
    });

    return milestones;
  }
}
