/** Rich matching metadata keyed by exact college name — used at seed time */
export interface CollegeMetadataSeed {
  fields?: string[];
  programs?: string[];
  streams?: string[];
  tags?: string[];
  minGradePercent?: number;
  minCgpa?: number;
  avgGrade?: number;
  acceptanceRate?: number;
  tuitionUsd?: number;
  tuitionInr?: number;
  scholarshipsAvailable?: boolean;
  needBlind?: boolean;
  qsWorldRank?: number;
  nationalRank?: number;
  examsAccepted?: string[];
  employmentRate?: number;
  avgPackageInr?: number;
  avgPackageUsd?: number;
  topEmployers?: string[];
  researchIntensity?: string;
  internationalStudentPercent?: number;
  idealFor?: string[];
  website?: string;
}

export const COLLEGE_METADATA_OVERRIDES: Record<string, CollegeMetadataSeed> = {
  'Indian Institute of Technology Bombay': {
    fields: ['technology', 'engineering', 'cs', 'ai', 'data-science', 'math'],
    programs: ['B.Tech', 'M.Tech', 'Dual Degree'],
    streams: ['engineering', 'computer-science', 'electrical', 'mechanical'],
    minCgpa: 8.0,
    minGradePercent: 90,
    acceptanceRate: 2,
    tuitionInr: 250000,
    scholarshipsAvailable: true,
    qsWorldRank: 149,
    nationalRank: 1,
    examsAccepted: ['JEE Advanced', 'GATE'],
    employmentRate: 95,
    avgPackageInr: 2200000,
    topEmployers: ['Google', 'Microsoft', 'Goldman Sachs', 'Qualcomm'],
    researchIntensity: 'high',
    internationalStudentPercent: 2,
    idealFor: ['Top STEM students', 'JEE Advanced rankers', 'Research-oriented engineers'],
    website: 'https://www.iitb.ac.in',
  },
  'Massachusetts Institute of Technology': {
    fields: ['technology', 'engineering', 'cs', 'ai', 'robotics', 'math', 'physics'],
    programs: ['BS', 'MEng', 'PhD'],
    streams: ['engineering', 'computer-science', 'business'],
    minGradePercent: 96,
    acceptanceRate: 4,
    tuitionUsd: 62000,
    scholarshipsAvailable: true,
    needBlind: true,
    qsWorldRank: 1,
    examsAccepted: ['SAT', 'ACT', 'TOEFL', 'IELTS'],
    employmentRate: 94,
    avgPackageUsd: 120000,
    topEmployers: ['Google', 'McKinsey', 'Tesla', 'NASA'],
    researchIntensity: 'high',
    internationalStudentPercent: 33,
    idealFor: ['Global STEM innovators', 'Research builders', 'Entrepreneurs'],
    website: 'https://www.mit.edu',
  },
  'University of Oxford': {
    fields: ['humanities', 'science', 'economics', 'law', 'medicine', 'cs'],
    programs: ['BA', 'MSc', 'MBA'],
    streams: ['liberal-arts', 'science', 'law', 'medicine'],
    minGradePercent: 95,
    acceptanceRate: 17,
    tuitionUsd: 45000,
    scholarshipsAvailable: true,
    qsWorldRank: 3,
    examsAccepted: ['UCAS', 'A-Levels', 'IB', 'SAT'],
    employmentRate: 91,
    avgPackageUsd: 65000,
    topEmployers: ['McKinsey', 'BBC', 'NHS', 'Barclays'],
    researchIntensity: 'high',
    internationalStudentPercent: 45,
    idealFor: ['Humanities & sciences', 'UK/EU applicants', 'Tutorial-style learners'],
    website: 'https://www.ox.ac.uk',
  },
  'Stanford University': {
    fields: ['technology', 'business', 'design', 'engineering', 'cs', 'ai'],
    programs: ['BS', 'MS', 'MBA'],
    streams: ['engineering', 'computer-science', 'business', 'design'],
    minGradePercent: 97,
    acceptanceRate: 4,
    tuitionUsd: 64000,
    scholarshipsAvailable: true,
    needBlind: true,
    qsWorldRank: 5,
    examsAccepted: ['SAT', 'ACT', 'TOEFL'],
    employmentRate: 93,
    avgPackageUsd: 115000,
    topEmployers: ['Google', 'Apple', 'Y Combinator startups', 'Meta'],
    researchIntensity: 'high',
    internationalStudentPercent: 24,
    idealFor: ['Silicon Valley path', 'Entrepreneurs', 'Interdisciplinary innovators'],
    website: 'https://www.stanford.edu',
  },
  'K J Somaiya Institute of Technology': {
    fields: ['engineering', 'cs', 'ai', 'data-science', 'it', 'technology'],
    programs: ['B.Tech', 'M.Tech'],
    streams: ['engineering', 'computer-science', 'artificial-intelligence'],
    minCgpa: 6.5,
    minGradePercent: 75,
    acceptanceRate: 45,
    tuitionInr: 400000,
    scholarshipsAvailable: true,
    nationalRank: 120,
    examsAccepted: ['MHT-CET', 'JEE Main', 'CAP Round'],
    employmentRate: 82,
    avgPackageInr: 850000,
    topEmployers: ['TCS', 'Infosys', 'Capgemini', 'Startups'],
    researchIntensity: 'medium',
    idealFor: ['Mumbai engineering students', 'AI/CS undergrads', 'Placement-focused learners'],
    website: 'https://somaiya.edu',
  },
  'University of Toronto': {
    fields: ['cs', 'health', 'business', 'engineering', 'math'],
    programs: ['Bachelor', 'Co-op'],
    streams: ['computer-science', 'life-sciences', 'commerce'],
    minGradePercent: 88,
    acceptanceRate: 43,
    tuitionUsd: 45000,
    scholarshipsAvailable: true,
    qsWorldRank: 21,
    examsAccepted: ['IB', 'CBSE', 'IELTS', 'TOEFL'],
    employmentRate: 88,
    avgPackageUsd: 65000,
    topEmployers: ['RBC', 'Shopify', 'Google', 'Hospitals'],
    internationalStudentPercent: 25,
    idealFor: ['Canada PR pathway', 'Co-op seekers', 'CS & health sciences'],
    website: 'https://www.utoronto.ca',
  },
  'University of Waterloo': {
    fields: ['cs', 'math', 'engineering', 'ai', 'technology'],
    programs: ['BCS', 'BMath', 'Co-op'],
    streams: ['computer-science', 'engineering', 'mathematics'],
    minGradePercent: 90,
    acceptanceRate: 53,
    tuitionUsd: 42000,
    scholarshipsAvailable: true,
    qsWorldRank: 112,
    examsAccepted: ['IB', 'CBSE', 'IELTS'],
    employmentRate: 96,
    avgPackageUsd: 85000,
    topEmployers: ['Google', 'Amazon', 'Shopify', 'BlackBerry'],
    researchIntensity: 'high',
    idealFor: ['Co-op & internships', 'CS/math strong students', 'Canada tech careers'],
    website: 'https://uwaterloo.ca',
  },
  'Carnegie Mellon University': {
    fields: ['cs', 'ai', 'robotics', 'engineering', 'design', 'business'],
    programs: ['BS', 'MS'],
    streams: ['computer-science', 'engineering', 'design'],
    minGradePercent: 95,
    acceptanceRate: 11,
    tuitionUsd: 63000,
    scholarshipsAvailable: true,
    qsWorldRank: 52,
    examsAccepted: ['SAT', 'ACT', 'TOEFL'],
    employmentRate: 92,
    avgPackageUsd: 110000,
    topEmployers: ['Google', 'Meta', 'Apple', 'Uber'],
    researchIntensity: 'high',
    idealFor: ['AI/CS specialists', 'Robotics', 'Top US tech careers'],
    website: 'https://www.cmu.edu',
  },
};

export function applyCollegeMetadataOverrides<T extends { name: string; metadata?: Record<string, unknown> }>(
  college: T,
): T {
  const override = COLLEGE_METADATA_OVERRIDES[college.name] ?? {};
  const base = college.metadata ?? {};
  return {
    ...college,
    metadata: {
      ...base,
      ...override,
      fields: override.fields ?? (base.fields as string[]) ?? [],
      programs: override.programs ?? (base.programs as string[]) ?? [],
      streams: override.streams ?? (base.streams as string[]) ?? [],
      tags: [...new Set([...((base.tags as string[]) ?? []), ...(override.tags ?? [])])],
    },
  };
}
