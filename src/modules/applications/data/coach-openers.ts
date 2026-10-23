import type { WritingToolSlug } from './writing-tools.config';

/** Instant first question per step — no LLM round-trip (typically ~7s saved). */
export const COACH_OPENERS: Partial<Record<WritingToolSlug, Partial<Record<string, string>>>> = {
  statement: {
    discover:
      'When do you feel most like yourself? It could be when you are helping someone, creating something, standing up for something, or laughing with friends.',
  },
  essay: {
    thesis:
      'In one sentence, what do you want your reader to believe or understand by the end of this essay?',
  },
  scholarship: {
    criteria:
      'What is one real achievement or experience that best shows you meet this scholarship’s criteria?',
    themes:
      'Which part of the official prompt feels most natural for you to answer honestly?',
  },
  recommendation: {
    facts:
      'How do you know the candidate, and in what context have you worked together?',
    examples:
      'Describe one specific moment when they showed a strength you would want to highlight.',
  },
  cv: {
    sections:
      'What is your most recent education or role, including dates if you know them?',
    polish:
      'Paste or name one bullet you want to make clearer—we will improve the wording without changing facts.',
  },
};

export function staticCoachOpener(tool: WritingToolSlug, stepKey: string): string | null {
  return COACH_OPENERS[tool]?.[stepKey] ?? null;
}

export type CoachStepPolicy = {
  minReplies: number;
  recommendedReplies: number;
  maxReplies: number;
};

export const COACH_STEP_POLICY: Record<string, CoachStepPolicy> = {
  discover: { minReplies: 1, recommendedReplies: 3, maxReplies: 8 },
  thesis: { minReplies: 2, recommendedReplies: 3, maxReplies: 6 },
  criteria: { minReplies: 2, recommendedReplies: 4, maxReplies: 8 },
  themes: { minReplies: 1, recommendedReplies: 3, maxReplies: 6 },
  facts: { minReplies: 2, recommendedReplies: 4, maxReplies: 8 },
  examples: { minReplies: 2, recommendedReplies: 4, maxReplies: 8 },
  sections: { minReplies: 2, recommendedReplies: 5, maxReplies: 10 },
  polish: { minReplies: 1, recommendedReplies: 2, maxReplies: 5 },
};

export function coachPolicyForStep(stepKey: string, tool?: WritingToolSlug): CoachStepPolicy {
  if (tool === 'statement' && stepKey === 'discover') {
    return { minReplies: 2, recommendedReplies: 3, maxReplies: 8 };
  }
  return COACH_STEP_POLICY[stepKey] ?? { minReplies: 1, recommendedReplies: 3, maxReplies: 8 };
}

export const COACH_READY_TAG = '[READY_FOR_NEXT]';
