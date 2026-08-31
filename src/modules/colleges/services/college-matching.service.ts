import { StudentProfile } from '@prisma/client';
import { CollegeMetadata } from '../types/college-metadata.interface';

export interface CollegeMatchInput {
  id: string;
  name: string;
  country: string;
  field?: string | null;
  metadata: CollegeMetadata | null;
}

export interface CollegeMatchResult {
  score: number;
  breakdown: {
    fieldFit: number;
    countryFit: number;
    academicFit: number;
    interestFit: number;
    budgetFit: number;
  };
  matchReasons: string[];
  concerns: string[];
}

export class CollegeMatchingService {
  scoreCollege(
    profile: StudentProfile,
    college: CollegeMatchInput,
  ): CollegeMatchResult {
    const meta = college.metadata ?? {
      fields: [],
      programs: [],
      streams: [],
      tags: [],
    };
    const transcript = (profile.transcriptData ?? {}) as { cgpa?: number };
    const goals = (profile.goals ?? {}) as Record<string, unknown>;
    const studentCgpa =
      transcript.cgpa ??
      (profile.percentage && profile.percentage <= 10
        ? profile.percentage
        : undefined);

    const fieldFit = this.scoreFieldFit(profile, college, meta);
    const countryFit = this.scoreCountryFit(profile, college);
    const academicFit = this.scoreAcademicFit(
      studentCgpa,
      profile.percentage,
      meta,
    );
    const interestFit = this.scoreInterestFit(profile, meta);
    const budgetFit = this.scoreBudgetFit(goals, meta);

    const score = Math.round(
      fieldFit * 0.3 +
        countryFit * 0.25 +
        academicFit * 0.2 +
        interestFit * 0.15 +
        budgetFit * 0.1,
    );

    const matchReasons: string[] = [];
    const concerns: string[] = [];

    if (fieldFit >= 70)
      matchReasons.push(
        `Strong program fit for ${profile.stream ?? college.field ?? 'your field'}`,
      );
    if (countryFit >= 80)
      matchReasons.push(`Matches your target country: ${college.country}`);
    if (academicFit >= 75)
      matchReasons.push('Your academics align with typical admits');
    if (interestFit >= 70)
      matchReasons.push('Aligns with your interests and strengths');
    if (meta.scholarshipsAvailable)
      matchReasons.push('Scholarships/financial aid available');
    if (meta.employmentRate && meta.employmentRate >= 85)
      matchReasons.push(`High graduate employment (~${meta.employmentRate}%)`);

    if (academicFit < 50 && meta.minCgpa)
      concerns.push(`Typical CGPA requirement ~${meta.minCgpa}`);
    if (budgetFit < 50 && meta.tuitionUsd)
      concerns.push('May be above typical budget — check scholarships');
    if (meta.acceptanceRate && meta.acceptanceRate < 15)
      concerns.push(`Highly selective (~${meta.acceptanceRate}% acceptance)`);

    return {
      score: Math.min(100, Math.max(0, score)),
      breakdown: { fieldFit, countryFit, academicFit, interestFit, budgetFit },
      matchReasons,
      concerns,
    };
  }

  private scoreFieldFit(
    profile: StudentProfile,
    college: CollegeMatchInput,
    meta: CollegeMetadata,
  ): number {
    const stream = (profile.stream ?? '').toLowerCase();
    const targetDegree = (profile.targetDegree ?? '').toLowerCase();
    const field = (college.field ?? '').toLowerCase();
    const tokens = [
      ...meta.fields,
      ...meta.programs,
      ...meta.streams,
      field,
      ...meta.tags,
    ].map((t) => t.toLowerCase());

    const studentTokens = [
      stream,
      targetDegree,
      ...(profile.subjects ?? []),
      ...(profile.interests ?? []),
    ]
      .join(' ')
      .toLowerCase();

    if (!tokens.length) return 50;

    const hits = tokens.filter(
      (t) =>
        studentTokens.includes(t) ||
        [...t.split(/[\s/&]+/)].some(
          (p) => p.length > 2 && studentTokens.includes(p),
        ),
    );
    return Math.min(100, 40 + hits.length * 15);
  }

  private scoreCountryFit(
    profile: StudentProfile,
    college: CollegeMatchInput,
  ): number {
    const targets = profile.targetCountries ?? [];
    if (!targets.length) return 60;
    if (targets.some((c) => c.toLowerCase() === college.country.toLowerCase()))
      return 100;
    const regionMap: Record<string, string[]> = {
      usa: ['united states', 'us', 'usa'],
      uk: ['united kingdom', 'uk', 'england', 'scotland'],
      india: ['india'],
      canada: ['canada'],
      australia: ['australia'],
      singapore: ['singapore'],
      germany: ['germany'],
    };
    for (const t of targets) {
      const key = t.toLowerCase();
      const aliases = regionMap[key] ?? [key];
      if (aliases.some((a) => college.country.toLowerCase().includes(a)))
        return 90;
    }
    return 35;
  }

  private scoreAcademicFit(
    cgpa: number | undefined,
    percentage: number | null | undefined,
    meta: CollegeMetadata,
  ): number {
    const minCgpa =
      meta.minCgpa ?? (meta.avgGrade ? meta.avgGrade / 10 : undefined);
    const minPct = meta.minGradePercent ?? meta.avgGrade;

    if (cgpa && minCgpa) {
      if (cgpa >= minCgpa + 0.5) return 95;
      if (cgpa >= minCgpa) return 80;
      if (cgpa >= minCgpa - 0.5) return 60;
      return 40;
    }
    if (percentage && minPct) {
      if (percentage >= minPct + 5) return 90;
      if (percentage >= minPct) return 75;
      if (percentage >= minPct - 8) return 55;
      return 35;
    }
    return 65;
  }

  private scoreInterestFit(
    profile: StudentProfile,
    meta: CollegeMetadata,
  ): number {
    const pool = [
      ...(profile.interests ?? []),
      ...(profile.strengths ?? []),
      ...(profile.subjects ?? []),
    ];
    if (!pool.length || !meta.fields?.length) return 55;
    const normalized = pool.map((v) => v.toLowerCase());
    const matches = meta.fields.filter((f) =>
      normalized.some(
        (p) => p.includes(f.toLowerCase()) || f.toLowerCase().includes(p),
      ),
    );
    return Math.min(100, 35 + matches.length * 20);
  }

  private scoreBudgetFit(
    goals: Record<string, unknown>,
    meta: CollegeMetadata,
  ): number {
    const budget = goals.budget as string | undefined;
    if (!budget || !meta.tuitionUsd) return 70;

    const tuition = meta.tuitionUsd;
    const budgetMap: Record<string, [number, number]> = {
      under_15l: [0, 18000],
      '15_35l': [18000, 42000],
      '35_65l': [42000, 80000],
      no_limit: [0, 999999],
      need_scholarship: [0, 25000],
    };
    const range = budgetMap[budget];
    if (!range) return 70;
    if (tuition >= range[0] && tuition <= range[1]) return 90;
    if (meta.scholarshipsAvailable && budget === 'need_scholarship') return 75;
    if (tuition > range[1]) return 40;
    return 65;
  }
}
