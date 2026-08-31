export interface CollegeMetadata {
  /** Tags used for interest/strength matching */
  fields: string[];
  programs: string[];
  streams: string[];
  tags: string[];
  /** Academic requirements */
  minGradePercent?: number;
  minCgpa?: number;
  avgGrade?: number;
  acceptanceRate?: number;
  /** Costs (annual approx) */
  tuitionUsd?: number;
  tuitionInr?: number;
  scholarshipsAvailable?: boolean;
  needBlind?: boolean;
  /** Rankings */
  qsWorldRank?: number;
  nationalRank?: number;
  /** Admissions */
  examsAccepted?: string[];
  intakeTerms?: string[];
  applicationDeadline?: string;
  /** Outcomes */
  employmentRate?: number;
  avgPackageInr?: number;
  avgPackageUsd?: number;
  topEmployers?: string[];
  /** Campus */
  campusType?: 'urban' | 'suburban' | 'rural';
  studentBodySize?: 'small' | 'medium' | 'large';
  researchIntensity?: 'low' | 'medium' | 'high';
  internationalStudentPercent?: number;
  /** Matching hints */
  idealFor?: string[];
  notIdealFor?: string[];
  website?: string;
}

export const DEFAULT_COLLEGE_METADATA: Partial<CollegeMetadata> = {
  scholarshipsAvailable: true,
  campusType: 'urban',
  studentBodySize: 'large',
  researchIntensity: 'medium',
  intakeTerms: ['Fall'],
};
