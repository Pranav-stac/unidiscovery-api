import type { StudentProfile } from '@prisma/client';
import { CollegeMatchingService } from './college-matching.service';

describe('CollegeMatchingService', () => {
  const service = new CollegeMatchingService();
  const profile = {
    stream: 'Computer Science',
    targetDegree: "Bachelor's",
    targetCountries: ['United Kingdom'],
    subjects: ['Mathematics'],
    interests: ['Robotics'],
    strengths: [],
    transcriptData: null,
    percentage: 88,
    goals: {},
  } as unknown as StudentProfile;

  it('scores AI-researched colleges with partial metadata', () => {
    expect(() =>
      service.scoreCollege(profile, {
        id: 'college-id',
        name: 'Example University',
        country: 'United Kingdom',
        field: 'Computer Science',
        metadata: {
          website: 'https://example.edu',
        } as never,
      }),
    ).not.toThrow();
  });

  it('accepts string fields without throwing', () => {
    const result = service.scoreCollege(profile, {
      id: 'college-id',
      name: 'Example University',
      country: 'United Kingdom',
      field: 'Computer Science',
      metadata: {
        fields: 'Computer Science, Robotics',
      } as never,
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it('uses empty arrays when metadata arrays have invalid values', () => {
    const result = service.scoreCollege(profile, {
      id: 'college-id',
      name: 'Example University',
      country: 'Canada',
      field: 'Engineering',
      metadata: {
        fields: null,
        programs: 'Engineering',
        tags: {},
      } as never,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
