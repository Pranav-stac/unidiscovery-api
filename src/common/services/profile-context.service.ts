import { Injectable, NotFoundException } from '@nestjs/common';
import { StudentProfile } from '@prisma/client';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';

@Injectable()
export class ProfileContextService {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async getProfileOrThrow(userId: string): Promise<StudentProfile> {
    const profile = await this.profilesRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return profile;
  }

  buildContextText(profile: StudentProfile): string {
    const transcript = profile.transcriptData as {
      degree?: string;
      program?: string;
      institution?: string;
      cgpa?: number;
      semesterRecords?: unknown[];
    } | null;
    return JSON.stringify({
      grade: profile.grade,
      classGroup: profile.classGroup,
      stream: profile.stream,
      country: profile.country,
      school: profile.school,
      board: profile.board,
      percentage: profile.percentage,
      subjects: profile.subjects,
      targetDegree: profile.targetDegree,
      targetCountries: profile.targetCountries,
      interests: profile.interests,
      strengths: profile.strengths,
      goals: profile.goals,
      aiSummary: profile.aiSummary,
      degree: transcript?.degree,
      program: transcript?.program,
      institution: transcript?.institution,
      cgpa: transcript?.cgpa,
      semesterRecords: transcript?.semesterRecords,
    });
  }

  scoreByInterests(
    itemInterests: string[],
    profileInterests: string[],
    profileStrengths: string[],
    profileSubjects: string[] = [],
  ): number {
    const normalized = (arr: string[]) => arr.map((v) => v.toLowerCase());
    const profileSet = new Set([
      ...normalized(profileInterests),
      ...normalized(profileStrengths),
      ...normalized(profileSubjects),
    ]);
    const matches = normalized(itemInterests).filter((i) =>
      [...profileSet].some((p) => p.includes(i) || i.includes(p)),
    );
    if (!itemInterests.length) return 50;
    return Math.min(
      100,
      Math.round((matches.length / itemInterests.length) * 100) + 20,
    );
  }
}
