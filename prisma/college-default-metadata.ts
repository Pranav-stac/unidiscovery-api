import type { CollegeMetadataSeed } from './college-metadata-overrides';

type CollegeLike = {
  name: string;
  country: string;
  city?: string | null;
  degree?: string | null;
  field?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

function countryKey(country: string): string {
  return country.toLowerCase();
}

function inferStreams(field?: string | null, fields: string[] = []): string[] {
  const haystack = `${field ?? ''} ${fields.join(' ')}`.toLowerCase();
  const streams: string[] = [];
  if (/cs|computer|software|ai|data|informatics/.test(haystack)) streams.push('computer-science');
  if (/engineer|technology|stem/.test(haystack)) streams.push('engineering');
  if (/business|commerce|finance|economics/.test(haystack)) streams.push('commerce');
  if (/medicine|health|biomedical/.test(haystack)) streams.push('medicine');
  if (/design|art|creative/.test(haystack)) streams.push('design');
  if (/humanities|liberal|arts|law/.test(haystack)) streams.push('liberal-arts');
  if (/science|physics|math/.test(haystack)) streams.push('science');
  return streams.length ? streams : ['general'];
}

function inferPrograms(degree?: string | null, country?: string): string[] {
  const d = (degree ?? '').toLowerCase();
  if (d.includes('b.tech') || d.includes('b.e')) return ['B.Tech', 'M.Tech', 'Dual Degree'];
  if (d.includes('bcs') || d.includes('bs') || d.includes('ba')) return ['BS', 'BA', 'MS'];
  if (d.includes('bachelor')) return ['Bachelor', 'Honours'];
  if (d.includes('beng') || d.includes('meng')) return ['BEng', 'MEng'];
  if (d.includes('bsc')) return ['BSc', 'MSc'];
  if (countryKey(country ?? '').includes('india')) return ['B.Tech', 'B.Sc', 'Integrated'];
  return ['Undergraduate', 'Postgraduate'];
}

function countryDefaults(country: string, avgGrade: number): Partial<CollegeMetadataSeed> {
  const c = countryKey(country);

  if (c.includes('india')) {
    return {
      tuitionInr: avgGrade >= 92 ? 350000 : avgGrade >= 85 ? 450000 : 250000,
      scholarshipsAvailable: true,
      examsAccepted: avgGrade >= 90 ? ['JEE Advanced', 'JEE Main', 'GATE'] : ['JEE Main', 'MHT-CET', 'State CET', 'CUET'],
      employmentRate: avgGrade >= 90 ? 92 : avgGrade >= 80 ? 78 : 65,
      avgPackageInr: avgGrade >= 92 ? 1800000 : avgGrade >= 85 ? 900000 : 500000,
      intakeTerms: ['July'],
      applicationDeadline: 'May–June (JEE/CAP rounds)',
      campusType: avgGrade >= 90 ? 'Residential research campus' : 'Urban/suburban campus',
      studentBodySize: avgGrade >= 90 ? '8,000–15,000' : '3,000–10,000',
      researchIntensity: avgGrade >= 90 ? 'high' : 'medium',
    };
  }

  if (c.includes('united states') || c === 'us') {
    return {
      tuitionUsd: avgGrade >= 95 ? 62000 : avgGrade >= 90 ? 52000 : 42000,
      scholarshipsAvailable: true,
      needBlind: avgGrade >= 96,
      examsAccepted: ['SAT', 'ACT', 'TOEFL', 'IELTS', 'AP'],
      employmentRate: avgGrade >= 93 ? 93 : 85,
      avgPackageUsd: avgGrade >= 95 ? 110000 : avgGrade >= 90 ? 85000 : 65000,
      intakeTerms: ['Fall (Aug/Sep)', 'Spring (Jan)'],
      applicationDeadline: 'Early Nov / Regular Jan (Fall intake)',
      campusType: avgGrade >= 95 ? 'Research university' : 'Comprehensive university',
      studentBodySize: avgGrade >= 95 ? '15,000–30,000+' : '8,000–20,000',
      researchIntensity: avgGrade >= 93 ? 'high' : 'medium',
      internationalStudentPercent: avgGrade >= 95 ? 22 : 12,
    };
  }

  if (c.includes('united kingdom') || c.includes('uk')) {
    return {
      tuitionUsd: avgGrade >= 94 ? 48000 : 38000,
      scholarshipsAvailable: true,
      examsAccepted: ['UCAS', 'A-Levels', 'IB', 'IELTS', 'BTEC'],
      employmentRate: avgGrade >= 92 ? 90 : 82,
      avgPackageUsd: avgGrade >= 94 ? 62000 : 48000,
      qsWorldRank: avgGrade >= 95 ? 10 : undefined,
      intakeTerms: ['September', 'January (select programs)'],
      applicationDeadline: 'UCAS: 15 Jan (most courses)',
      campusType: 'Collegiate / city campus',
      studentBodySize: '15,000–40,000',
      researchIntensity: avgGrade >= 92 ? 'high' : 'medium',
      internationalStudentPercent: 35,
    };
  }

  if (c.includes('canada')) {
    return {
      tuitionUsd: avgGrade >= 90 ? 45000 : 35000,
      scholarshipsAvailable: true,
      examsAccepted: ['IB', 'CBSE', 'IELTS', 'TOEFL', 'Provincial requirements'],
      employmentRate: avgGrade >= 90 ? 90 : 82,
      avgPackageUsd: avgGrade >= 92 ? 75000 : 58000,
      intakeTerms: ['Fall (Sep)', 'Winter (Jan)'],
      applicationDeadline: 'Jan–Mar for Fall; rolling for many programs',
      campusType: 'Research + co-op focused',
      studentBodySize: '25,000–90,000',
      researchIntensity: 'high',
      internationalStudentPercent: 25,
    };
  }

  if (c.includes('australia')) {
    return {
      tuitionUsd: avgGrade >= 88 ? 42000 : 32000,
      scholarshipsAvailable: true,
      examsAccepted: ['ATAR', 'IB', 'CBSE', 'IELTS'],
      employmentRate: 80,
      avgPackageUsd: 55000,
      intakeTerms: ['February', 'July'],
      applicationDeadline: 'Nov–Jan (Feb intake); May–Jul (Jul intake)',
      campusType: 'Large research campus',
      studentBodySize: '30,000–60,000',
      internationalStudentPercent: 30,
    };
  }

  if (c.includes('germany') || c.includes('netherlands') || c.includes('ireland') || c.includes('switzerland')) {
    return {
      tuitionUsd: c.includes('switzerland') ? 1500 : 500,
      scholarshipsAvailable: true,
      examsAccepted: ['IB', 'A-Levels', 'CBSE', 'IELTS', 'German proficiency (where required)'],
      employmentRate: 88,
      avgPackageUsd: 65000,
      intakeTerms: ['October', 'April (select)'],
      applicationDeadline: 'Varies — often Jan–July for winter intake',
      campusType: 'Technical / research university',
      researchIntensity: 'high',
      internationalStudentPercent: 20,
    };
  }

  if (c.includes('singapore') || c.includes('hong kong')) {
    return {
      tuitionUsd: avgGrade >= 92 ? 38000 : 28000,
      scholarshipsAvailable: true,
      examsAccepted: ['IB', 'A-Levels', 'CBSE', 'IELTS', 'SAT (optional)'],
      employmentRate: 90,
      avgPackageUsd: 72000,
      intakeTerms: ['August'],
      applicationDeadline: 'Mar–Apr (main intake)',
      campusType: 'Urban research campus',
      internationalStudentPercent: 28,
    };
  }

  return {
    tuitionUsd: 30000,
    scholarshipsAvailable: true,
    examsAccepted: ['IELTS', 'TOEFL', 'IB', 'National exams'],
    employmentRate: 75,
    avgPackageUsd: 50000,
    intakeTerms: ['Fall', 'Spring'],
    applicationDeadline: 'Varies by program',
    campusType: 'University campus',
    researchIntensity: 'medium',
  };
}

function inferIdealFor(college: CollegeLike, avgGrade: number): string[] {
  const ideals: string[] = [];
  const field = (college.field ?? '').toLowerCase();
  if (/cs|ai|data|computer/.test(field)) ideals.push('STEM & tech careers', 'Software and AI pathways');
  if (/engineer/.test(field)) ideals.push('Engineering aspirants', 'Project-based learners');
  if (/business|finance/.test(field)) ideals.push('Business & finance students');
  if (/medicine|health/.test(field)) ideals.push('Pre-med & health sciences');
  if (/liberal|humanities/.test(field)) ideals.push('Broad interdisciplinary exploration');
  if (avgGrade >= 95) ideals.push('Highly competitive applicants');
  if (countryKey(college.country).includes('india') && avgGrade < 85) ideals.push('Accessible regional options');
  return ideals.slice(0, 4);
}

function inferNotIdealFor(college: CollegeLike, avgGrade: number): string[] {
  const avoid: string[] = [];
  if (avgGrade >= 95) avoid.push('Students seeking low-selectivity entry');
  if (countryKey(college.country).includes('united states') && avgGrade >= 94) {
    avoid.push('Applicants unable to fund full-cost attendance without aid');
  }
  if (/research|iit|mit|stanford|oxford|cambridge/i.test(college.name)) {
    avoid.push('Students preferring purely vocational short courses');
  }
  if (avgGrade < 80) avoid.push('Applicants expecting elite global rankings only');
  return avoid.slice(0, 3);
}

function inferAcceptanceRate(avgGrade: number, tags: string[]): number {
  if (tags.some((t) => /iit|ivy|mit|oxford|cambridge|stanford/i.test(t))) return 5;
  if (avgGrade >= 96) return 8;
  if (avgGrade >= 93) return 18;
  if (avgGrade >= 88) return 35;
  if (avgGrade >= 82) return 50;
  return 65;
}

function inferTopEmployers(field?: string | null, country?: string): string[] {
  const f = (field ?? '').toLowerCase();
  const c = countryKey(country ?? '');
  if (/cs|ai|data|computer/.test(f)) {
    return ['Google', 'Microsoft', 'Amazon', 'Infosys', 'Startups'];
  }
  if (/engineer/.test(f)) {
    return c.includes('india') ? ['L&T', 'TCS', 'Mahindra', 'ISRO'] : ['Siemens', 'Boeing', 'Arup', 'Tesla'];
  }
  if (/business|finance/.test(f)) {
    return ['Deloitte', 'McKinsey', 'HSBC', 'Goldman Sachs'];
  }
  if (/medicine|health/.test(f)) {
    return c.includes('india') ? ['Apollo', 'Fortis', 'AIIMS network'] : ['NHS', 'Mayo Clinic', 'Hospitals'];
  }
  return ['Leading regional employers', 'Multinational firms', 'Public sector'];
}

/** Fill rich metadata for any college missing override fields */
export function deriveDefaultCollegeMetadata(college: CollegeLike): CollegeMetadataSeed {
  const base = college.metadata ?? {};
  const fields = (base.fields as string[]) ?? [];
  const tags = (base.tags as string[]) ?? [];
  const avgGrade = (base.avgGrade as number) ?? 85;
  const regional = countryDefaults(college.country, avgGrade);
  const streams = inferStreams(college.field, fields);
  const acceptanceRate = regional.acceptanceRate ?? inferAcceptanceRate(avgGrade, tags);

  return {
    fields,
    programs: inferPrograms(college.degree, college.country),
    streams,
    tags,
    minGradePercent: avgGrade >= 90 ? avgGrade - 2 : avgGrade - 5,
    minCgpa: countryKey(college.country).includes('india') ? (avgGrade >= 90 ? 8.0 : avgGrade >= 80 ? 7.0 : 6.0) : undefined,
    avgGrade,
    acceptanceRate,
    scholarshipsAvailable: regional.scholarshipsAvailable ?? true,
    needBlind: regional.needBlind,
    tuitionUsd: regional.tuitionUsd,
    tuitionInr: regional.tuitionInr,
    examsAccepted: regional.examsAccepted,
    employmentRate: regional.employmentRate,
    avgPackageUsd: regional.avgPackageUsd,
    avgPackageInr: regional.avgPackageInr,
    topEmployers: inferTopEmployers(college.field, college.country),
    researchIntensity: regional.researchIntensity,
    internationalStudentPercent: regional.internationalStudentPercent,
    intakeTerms: regional.intakeTerms,
    applicationDeadline: regional.applicationDeadline,
    campusType: regional.campusType,
    studentBodySize: regional.studentBodySize,
    idealFor: inferIdealFor(college, avgGrade),
    notIdealFor: inferNotIdealFor(college, avgGrade),
  };
}
