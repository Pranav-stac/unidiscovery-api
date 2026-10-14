import { ApplicationDocumentType } from '@prisma/client';

export type WritingToolSlug =
  | 'statement'
  | 'essay'
  | 'scholarship'
  | 'recommendation'
  | 'cv';

export const WRITING_TOOL_SLUGS: WritingToolSlug[] = [
  'statement',
  'essay',
  'scholarship',
  'recommendation',
  'cv',
];

export function toolSlugToDocumentType(slug: WritingToolSlug): ApplicationDocumentType {
  const map: Record<WritingToolSlug, ApplicationDocumentType> = {
    statement: ApplicationDocumentType.PERSONAL_STATEMENT,
    essay: ApplicationDocumentType.ESSAY,
    scholarship: ApplicationDocumentType.SCHOLARSHIP,
    recommendation: ApplicationDocumentType.LETTER_OF_RECOMMENDATION,
    cv: ApplicationDocumentType.CV,
  };
  return map[slug];
}

export function documentTypeToToolSlug(
  type: ApplicationDocumentType,
): WritingToolSlug | null {
  const map: Partial<Record<ApplicationDocumentType, WritingToolSlug>> = {
    [ApplicationDocumentType.PERSONAL_STATEMENT]: 'statement',
    [ApplicationDocumentType.ESSAY]: 'essay',
    [ApplicationDocumentType.SCHOLARSHIP]: 'scholarship',
    [ApplicationDocumentType.LETTER_OF_RECOMMENDATION]: 'recommendation',
    [ApplicationDocumentType.CV]: 'cv',
  };
  return map[type] ?? null;
}

export const WRITING_TOOL_LABELS: Record<
  WritingToolSlug,
  { title: string; description: string; defaultTitle: string }
> = {
  statement: {
    title: 'New Statement',
    description:
      'Discover your story and develop a compelling personal statement.',
    defaultTitle: 'Personal statement',
  },
  essay: {
    title: 'New Essay',
    description:
      'Organize your ideas and write an essay with guided support.',
    defaultTitle: 'Essay',
  },
  scholarship: {
    title: 'New Scholarship',
    description:
      'Build a scholarship application essay around your goals, experiences, and achievements.',
    defaultTitle: 'Scholarship essay',
  },
  recommendation: {
    title: 'New Recommendation',
    description:
      'Prepare a personalized recommendation letter draft using accurate information about the candidate.',
    defaultTitle: 'Recommendation letter',
  },
  cv: {
    title: 'New CV',
    description:
      'Turn your real experience, education, and skills into a polished CV.',
    defaultTitle: 'CV',
  },
};

export const WORKFLOW_STEPS: Record<WritingToolSlug, string[]> = {
  statement: ['basics', 'discover', 'angles', 'outline', 'draft'],
  essay: ['setup', 'thesis', 'outline', 'draft', 'review'],
  scholarship: ['setup', 'criteria', 'themes', 'outline', 'draft'],
  recommendation: ['mode', 'facts', 'examples', 'draft', 'review'],
  cv: ['setup', 'sections', 'polish', 'preview'],
};
