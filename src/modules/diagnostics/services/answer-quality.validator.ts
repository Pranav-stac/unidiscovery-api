import type { DiagnosticStep } from './diagnostics.service';

export type AnswerQualityCode =
  | 'ANSWERS_INVALID'
  | 'INSUFFICIENT_ANSWERS'
  | 'GIBBERISH_DETECTED';

export interface AnswerQualityResult {
  valid: boolean;
  message: string;
  issues: string[];
  code: AnswerQualityCode;
}

const PLACEHOLDER_PATTERNS = [
  /^asdf/i,
  /^qwer/i,
  /^zxcv/i,
  /^hjkl/i,
  /^test(ing)?$/i,
  /^hello+$/i,
  /^abc+$/i,
  /^xyz+$/i,
  /^n\/?a$/i,
  /^none$/i,
  /^no+pe$/i,
  /^idk$/i,
  /^dunno$/i,
  /^whatever$/i,
  /^random$/i,
  /^skip(ped)?$/i,
  /^don'?t know$/i,
  /^no idea$/i,
  /^something$/i,
  /^anything$/i,
  /^blah+$/i,
  /^lorem/i,
  /^fdsa/i,
  /^jkl/i,
  /^123+$/,
  /^111+$/,
  /^aaa+$/i,
  /^bbb+$/i,
  /^xxx+$/i,
  /^\?+$/,
  /^\.+$/,
  /^-+$/,
];

const KEYBOARD_MASH =
  /^(asdfgh|qwerty|zxcvbn|qazwsx|poiuyt|lkjhgf|mnbvcx|yuiop|hjkl;|bnm,.)+$/i;

function isQuestionStep(step: DiagnosticStep): boolean {
  return step.stepKind === 'question' || (!step.stepKind && step.type !== 'chapter');
}

function isTextStep(step: DiagnosticStep): boolean {
  return step.type === 'ai-followup' || step.type === 'voice-note';
}

function isAptitudeStep(step: DiagnosticStep): boolean {
  const id = step.id.toLowerCase();
  const category = step.evaluationCategory?.toLowerCase() ?? '';
  const chapter = step.chapter?.toLowerCase() ?? '';
  return (
    id.includes('aptitude') ||
    category.includes('aptitude') ||
    chapter.includes('aptitude') ||
    chapter.includes('numerical') ||
    chapter.includes('logical') ||
    chapter.includes('verbal')
  );
}

export function isGibberishText(
  raw: string,
  options: { minLength?: number; allowNumeric?: boolean } = {},
): boolean {
  const text = raw.trim();
  const minLength = options.minLength ?? 4;

  if (!text) return true;
  if (text.length < minLength) return true;

  const lower = text.toLowerCase();

  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(lower))) {
    return true;
  }

  if (KEYBOARD_MASH.test(lower.replace(/\s/g, ''))) {
    return true;
  }

  const compact = lower.replace(/\s/g, '');
  if (/^(.)\1{4,}$/.test(compact)) {
    return true;
  }

  const alpha = lower.replace(/[^a-z]/gi, '');
  if (alpha.length === 0) {
    return !options.allowNumeric;
  }

  if (alpha.length > 6 && !/[aeiou]/i.test(alpha)) {
    return true;
  }

  if (compact.length > 12) {
    const unique = new Set(compact).size;
    if (unique / compact.length < 0.22) {
      return true;
    }
  }

  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length > 8 && !/[aeiou]/i.test(words[0])) {
    return true;
  }

  return false;
}

function validateTextAnswer(
  step: DiagnosticStep,
  answer: unknown,
): string | null {
  if (typeof answer !== 'string') {
    return `"${step.title}" needs a written answer.`;
  }

  const aptitude = isAptitudeStep(step);
  const minLength = aptitude ? 1 : 8;

  if (isGibberishText(answer, { minLength, allowNumeric: aptitude })) {
    if (aptitude) {
      return `"${step.title}" looks incomplete or random — aptitude answers need a real attempt.`;
    }
    return `"${step.title}" needs a thoughtful answer, not placeholder text.`;
  }

  if (!aptitude && answer.trim().split(/\s+/).length < 2 && answer.trim().length < 12) {
    return `"${step.title}" is too short — please add a bit more detail.`;
  }

  return null;
}

function detectSuspiciousChoicePattern(
  answers: Record<string, unknown>,
  steps: DiagnosticStep[],
): string | null {
  const choiceValues: string[] = [];

  for (const step of steps) {
    if (!isQuestionStep(step)) continue;
    if (step.type !== 'choice' && step.type !== 'swipe') continue;

    const answer = answers[step.id];
    if (typeof answer === 'string') {
      choiceValues.push(answer);
    }
  }

  if (choiceValues.length < 8) return null;

  const counts = new Map<string, number>();
  for (const value of choiceValues) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  if (maxCount / choiceValues.length >= 0.75) {
    return 'Many of your multiple-choice answers are identical — please answer each question on its own.';
  }

  return null;
}

export function validateDiagnosticAnswers(
  answers: Record<string, unknown>,
  steps: DiagnosticStep[],
): AnswerQualityResult {
  const questionSteps = steps.filter(isQuestionStep);
  const issues: string[] = [];

  if (questionSteps.length === 0) {
    return {
      valid: true,
      message: '',
      issues: [],
      code: 'ANSWERS_INVALID',
    };
  }

  const answeredCount = questionSteps.filter(
    (step) => answers[step.id] !== undefined && answers[step.id] !== null,
  ).length;

  const coverage = answeredCount / questionSteps.length;
  if (coverage < 0.85) {
    issues.push(
      `Only ${answeredCount} of ${questionSteps.length} questions were answered.`,
    );
  }

  for (const step of questionSteps) {
    if (!isTextStep(step)) continue;
    const answer = answers[step.id];
    if (answer === undefined || answer === null) continue;

    const issue = validateTextAnswer(step, answer);
    if (issue) issues.push(issue);
  }

  const choicePatternIssue = detectSuspiciousChoicePattern(answers, questionSteps);
  if (choicePatternIssue) issues.push(choicePatternIssue);

  if (issues.length === 0) {
    return {
      valid: true,
      message: '',
      issues: [],
      code: 'ANSWERS_INVALID',
    };
  }

  const hasGibberish = issues.some(
    (issue) =>
      issue.includes('placeholder') ||
      issue.includes('random') ||
      issue.includes('incomplete') ||
      issue.includes('too short'),
  );

  const code: AnswerQualityCode =
    coverage < 0.85
      ? 'INSUFFICIENT_ANSWERS'
      : hasGibberish
        ? 'GIBBERISH_DETECTED'
        : 'ANSWERS_INVALID';

  return {
    valid: false,
    code,
    issues,
    message:
      'We could not generate reliable insights from these answers. Please retake the diagnostic and answer each question thoughtfully — especially open-text and aptitude questions.',
  };
}

export function validateSingleTextAnswer(
  step: DiagnosticStep,
  answer: unknown,
): AnswerQualityResult | null {
  if (!isTextStep(step)) return null;

  const issue = validateTextAnswer(step, answer);
  if (!issue) return null;

  return {
    valid: false,
    code: 'GIBBERISH_DETECTED',
    issues: [issue],
    message: issue,
  };
}
