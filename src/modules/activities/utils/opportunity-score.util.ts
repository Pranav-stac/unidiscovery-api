import { ActivityType, type Activity, type StudentProfile } from '@prisma/client';

export type OpportunityDetails = {
  organization?: string;
  category?: string;
  subcategory?: string;
  format?: string;
  deadline?: string | null;
  deadlineStatus?: string;
  cost?: string;
  country?: string;
  city?: string;
  region?: string;
  location?: string;
  locationType?: string;
  level?: string;
  scope?: string;
  openToInternational?: boolean;
  highlySelective?: boolean;
  websiteUrl?: string;
  logoUrl?: string;
  seasons?: string;
  tags?: string[];
  providerTier?: string;
  financialGrade?: string;
  expertsRating?: string | number;
  eligibility?: string;
};

export type OpportunityMatch = {
  score: number;
  eligible: boolean;
  reasons: string[];
};

const STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'your',
  'into',
  'program',
  'programme',
]);

function tokens(...values: Array<string | string[] | null | undefined>) {
  const out = new Set<string>();
  for (const value of values) {
    const parts = Array.isArray(value) ? value : value ? [value] : [];
    for (const part of parts) {
      part
        .toLowerCase()
        .replace(/[_/,]+/g, ' ')
        .split(/[^a-z0-9+]+/)
        .filter((word) => word.length > 2 && !STOP.has(word))
        .forEach((word) => out.add(word));
    }
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>) {
  let count = 0;
  for (const item of a) {
    if (b.has(item) || [...b].some((other) => other.includes(item) || item.includes(other))) {
      count += 1;
    }
  }
  return count;
}

function asMeta(metadata: unknown) {
  return (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>;
}

export function opportunityDetails(metadata: unknown): OpportunityDetails {
  const meta = asMeta(metadata);
  const tags = Array.isArray(meta.tags)
    ? meta.tags.map(String)
    : typeof meta.tags === 'string'
      ? meta.tags.split(/[;,]/).map((item) => item.trim()).filter(Boolean)
      : [];
  const location =
    String(meta.location ?? '') ||
    [meta.city, meta.region, meta.country].filter(Boolean).join(', ');

  return {
    organization: meta.organization ? String(meta.organization) : undefined,
    category: meta.category ? String(meta.category).replace(/_/g, ' ') : undefined,
    subcategory: meta.subcategory ? String(meta.subcategory).replace(/_/g, ' ') : undefined,
    format: meta.format ? String(meta.format) : undefined,
    deadline: meta.deadline ? String(meta.deadline) : null,
    deadlineStatus: meta.deadlineStatus ? String(meta.deadlineStatus) : undefined,
    cost: meta.cost ? String(meta.cost) : undefined,
    country: meta.country ? String(meta.country) : undefined,
    city: meta.city ? String(meta.city) : undefined,
    region: meta.region ? String(meta.region) : undefined,
    location: location || undefined,
    locationType: meta.locationType ? String(meta.locationType) : undefined,
    level: meta.level ? String(meta.level) : undefined,
    scope: meta.scope ? String(meta.scope) : undefined,
    openToInternational: Boolean(meta.openToInternational),
    highlySelective: Boolean(meta.highlySelective),
    websiteUrl: meta.websiteUrl ? String(meta.websiteUrl) : undefined,
    logoUrl: meta.logoUrl ? String(meta.logoUrl) : undefined,
    seasons: meta.seasons ? String(meta.seasons) : undefined,
    tags,
    providerTier: meta.providerTier ? String(meta.providerTier) : undefined,
    financialGrade: meta.financialGrade ? String(meta.financialGrade) : undefined,
    expertsRating: (meta.expertsRating as string | number | undefined) ?? undefined,
    eligibility: meta.eligibility ? String(meta.eligibility) : undefined,
  };
}

export function daysUntilDeadline(metadata: unknown) {
  const deadline = opportunityDetails(metadata).deadline;
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parsed.getTime() - today.getTime()) / 86400000);
}

export function scoreOpportunity(
  activity: Pick<Activity, 'title' | 'type' | 'description' | 'interests' | 'gradeMin' | 'gradeMax' | 'metadata'>,
  profile: Pick<
    StudentProfile,
    | 'grade'
    | 'stream'
    | 'country'
    | 'city'
    | 'board'
    | 'interests'
    | 'strengths'
    | 'subjects'
    | 'targetDegree'
    | 'targetCountries'
  >,
): OpportunityMatch {
  const details = opportunityDetails(activity.metadata);
  const reasons: string[] = [];
  let score = 16;

  const grade = profile.grade && profile.grade >= 1 && profile.grade <= 12 ? profile.grade : null;
  if (grade) {
    if (
      (activity.gradeMin != null && grade < activity.gradeMin) ||
      (activity.gradeMax != null && grade > activity.gradeMax)
    ) {
      return { score: 0, eligible: false, reasons: ['Outside your class range'] };
    }
    score += 14;
    reasons.push(`Fits Class ${grade}`);
  }

  const profileTokens = tokens(
    profile.interests,
    profile.strengths,
    profile.subjects,
    profile.stream,
    profile.targetDegree,
    profile.board,
  );
  const itemTokens = tokens(
    activity.interests,
    activity.title,
    activity.description,
    details.category,
    details.subcategory,
    details.tags,
    details.organization,
  );
  const hits = overlap(itemTokens, profileTokens);
  if (hits >= 4) {
    score += 36;
    reasons.push('Strong match to your interests');
  } else if (hits >= 2) {
    score += 24;
    reasons.push('Matches several of your interests');
  } else if (hits === 1) {
    score += 12;
    reasons.push('Related to one of your interests');
  }

  const studentCountry = (profile.country ?? '').toLowerCase();
  const oppCountry = (details.country ?? '').toLowerCase();
  const targets = (profile.targetCountries ?? []).map((item) => item.toLowerCase());
  if (studentCountry && oppCountry && (oppCountry.includes(studentCountry) || studentCountry.includes(oppCountry))) {
    score += 12;
    reasons.push(`Based in ${details.country}`);
  } else if (details.openToInternational) {
    score += 8;
    reasons.push('Open to international students');
  } else if (targets.some((country) => oppCountry.includes(country))) {
    score += 10;
    reasons.push('In a target country');
  }

  const days = daysUntilDeadline(activity.metadata);
  if (days != null && days >= 0 && days <= 21) {
    score += 10;
    reasons.push('Deadline is soon');
  } else if (days != null && days <= 60) {
    score += 5;
    reasons.push('Upcoming deadline');
  } else if (!details.deadline || /rolling|ongoing/i.test(details.deadlineStatus ?? '')) {
    score += 4;
    reasons.push('Rolling applications');
  }

  const cost = (details.cost ?? '').toLowerCase();
  if (/(free|no cost|scholarship|funded|0)/.test(cost)) {
    score += 7;
    reasons.push('Low or no cost');
  }

  const stream = (profile.stream ?? '').toLowerCase();
  const scienceTypes: ActivityType[] = [ActivityType.PROJECT, ActivityType.COMPETITION, ActivityType.INTERNSHIP];
  if (stream.includes('sci') && scienceTypes.includes(activity.type)) {
    score += 6;
    reasons.push('Useful for a science path');
  }
  if (stream.includes('comm') && /business|econ|entrepreneur|finance/i.test(`${activity.title} ${details.category}`)) {
    score += 6;
    reasons.push('Useful for commerce');
  }
  if (details.highlySelective) {
    score += 3;
    reasons.push('Selective — strong profile signal');
  }

  return {
    score: Math.min(100, Math.round(score)),
    eligible: true,
    reasons: reasons.slice(0, 4),
  };
}

export function presentActivity<T extends Activity>(
  activity: T,
  match?: OpportunityMatch,
) {
  const details = opportunityDetails(activity.metadata);
  return {
    id: activity.id,
    title: activity.title,
    type: activity.type,
    description: activity.description,
    gradeMin: activity.gradeMin,
    gradeMax: activity.gradeMax,
    interests: activity.interests,
    url: activity.url ?? details.websiteUrl ?? null,
    details,
    matchScore: match?.score ?? null,
    matchReasons: match?.reasons ?? [],
    eligible: match?.eligible ?? true,
    daysUntilDeadline: daysUntilDeadline(activity.metadata),
  };
}
