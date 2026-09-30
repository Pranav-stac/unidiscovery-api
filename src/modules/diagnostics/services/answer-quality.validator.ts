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

export const RETEST_MESSAGE =
  'We could not generate reliable insights from these answers. Please retake the diagnostic and answer each question thoughtfully — especially open-text and aptitude questions.';

const PLACEHOLDER_TOKENS = new Set([
  'asdf',
  'asdfgh',
  'qwer',
  'qwerty',
  'zxcv',
  'zxcvb',
  'hjkl',
  'test',
  'testing',
  'hello',
  'abc',
  'xyz',
  'na',
  'n/a',
  'none',
  'nope',
  'idk',
  'dunno',
  'whatever',
  'random',
  'skip',
  'skipped',
  'blah',
  'blahblah',
  'lorem',
  'ipsum',
  'fdsa',
  'gibberish',
  'gibberishh',
  'nonsense',
  'garbage',
  'trash',
  'dummy',
  'filler',
  'noidea',
  'dontknow',
  'aaa',
  'bbb',
  'xxx',
]);

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
  /^gibberish+$/i,
  /^nonsense+$/i,
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

const LOW_EFFORT_ONLY_ANSWERS = new Set([
  'gibberish',
  'nonsense',
  'no idea',
  "don't know",
  'dont know',
  'idk',
  'dunno',
  'just typing',
  'random text',
  'placeholder',
  'lorem ipsum',
  'asdf',
  'test',
  'skip',
  'n/a',
  'na',
  'none',
]);

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

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9']/g, '');
}

function isPlaceholderToken(token: string): boolean {
  const normalized = normalizeToken(token);
  if (!normalized) return true;
  if (PLACEHOLDER_TOKENS.has(normalized)) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function tokenize(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
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
  const compact = lower.replace(/\s+/g, '');
  const normalizedAnswer = lower.replace(/[^\w\s']/g, '').trim();

  // 1. Direct match on low effort answers
  if (LOW_EFFORT_ONLY_ANSWERS.has(normalizedAnswer) || PLACEHOLDER_TOKENS.has(normalizedAnswer)) {
    return true;
  }

  // 2. Pattern matching on placeholders
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(lower) || pattern.test(normalizedAnswer))) {
    return true;
  }

  // 3. Known keyboard mashing patterns
  if (KEYBOARD_MASH.test(compact)) {
    return true;
  }

  // Common random mash substrings
  const mashSubstrings = [
    'asdf', 'fdsa', 'qwer', 'rewq', 'zxcv', 'vcxz', 'hjkl', 'lkjh',
    'poiuy', 'yuiop', 'mnbv', 'vbnm', 'qazw', 'wsxe', 'edcr', 'rfvt',
    'tgb', 'yhn', 'ujm', 'ik,', 'ol.', 'p;/', '1234', '5678', '9012'
  ];
  let mashHits = 0;
  for (const m of mashSubstrings) {
    if (compact.includes(m)) mashHits += 1;
  }
  if (mashHits >= 2 || (compact.length <= 16 && mashHits >= 1 && compact.length >= 6 && !compact.includes(' '))) {
    return true;
  }

  // 4. Repeated identical characters (e.g., aaaaa, 11111, ....., ????)
  if (/(.)\1{3,}/.test(compact)) {
    return true;
  }

  // 5. Short repeating substrings (e.g. abababa, asdasd, lololo, xyzxyz)
  if (/^(.{2,4})\1{2,}$/.test(compact)) {
    return true;
  }

  // 6. Alpha checks & vowel distribution
  const alpha = lower.replace(/[^a-z]/gi, '');
  if (alpha.length === 0) {
    return !options.allowNumeric;
  }

  // If mostly alphabetic, check consonant clusters and vowel ratios
  if (alpha.length >= 4) {
    const vowels = alpha.match(/[aeiou]/g) || [];
    const vowelRatio = vowels.length / alpha.length;

    // Zero vowels in words > 4 chars is almost always gibberish (unless standard acronyms)
    if (alpha.length >= 5 && vowels.length === 0) {
      return true;
    }

    // Unnatural vowel ratio (less than 13% vowels in a word of 7+ chars)
    if (alpha.length >= 7 && vowelRatio < 0.14) {
      return true;
    }

    // More than 5 consecutive consonants in English is gibberish
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(alpha)) {
      return true;
    }

    // Consecutive identical vowels (e.g., aaaaa, eeeee)
    if (/[aeiou]{4,}/i.test(alpha)) {
      return true;
    }
  }

  // 7. Character entropy / uniqueness ratio
  if (compact.length >= 8) {
    const uniqueChars = new Set(compact).size;
    const uniquenessRatio = uniqueChars / compact.length;
    if (compact.length >= 10 && uniquenessRatio < 0.32) {
      return true;
    }
    if (compact.length >= 20 && uniquenessRatio < 0.28) {
      return true;
    }
  }

  // 8. Word-level token inspection
  const words = tokenize(text);
  if (words.length === 0) return true;

  // Single word checks
  if (words.length === 1) {
    const w = words[0];
    if (w.length >= 6 && !/[aeiou]/i.test(w)) return true;
    if (PLACEHOLDER_TOKENS.has(w) || PLACEHOLDER_PATTERNS.some((p) => p.test(w))) return true;
    if (/(.)\1{2,}/.test(w)) return true;
    if (w.length >= 12 && new Set(w).size / w.length < 0.35) return true;
  }

  // Multi-word checks
  if (words.length >= 2) {
    const uniqueWords = new Set(words);
    // All words identical
    if (uniqueWords.size === 1) {
      return true;
    }

    const placeholderCount = words.filter(isPlaceholderToken).length;
    if (placeholderCount / words.length >= 0.4) {
      return true;
    }

    // Count words that are individually gibberish
    const gibberishWordCount = words.filter((w) => {
      if (w.length <= 2) return false;
      const wVowels = w.match(/[aeiou]/g)?.length ?? 0;
      if (w.length >= 5 && wVowels === 0) return true;
      if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(w)) return true;
      if (/(.)\1{3,}/.test(w)) return true;
      if (w.length >= 8 && new Set(w).size / w.length < 0.35) return true;
      return false;
    }).length;

    if (gibberishWordCount / words.length >= 0.4) {
      return true;
    }

    if (words.length >= 4 && uniqueWords.size / words.length < 0.35) {
      return true;
    }
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
    return `"${step.title}" needs a bit more detail — please write at least one full sentence in your own words.`;
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

  if (choiceValues.length < 6) return null;

  const counts = new Map<string, number>();
  for (const value of choiceValues) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  if (maxCount / choiceValues.length >= 0.6) {
    return 'Many of your multiple-choice answers are identical — please answer each question on its own.';
  }

  return null;
}

function detectFirstOptionSpam(
  answers: Record<string, unknown>,
  steps: DiagnosticStep[],
): string | null {
  let firstOptionCount = 0;
  let choiceCount = 0;

  for (const step of steps) {
    if (!isQuestionStep(step)) continue;
    if (step.type !== 'choice' && step.type !== 'swipe') continue;
    if (!step.options?.length) continue;

    const answer = answers[step.id];
    if (typeof answer !== 'string') continue;

    choiceCount += 1;
    if (answer === step.options[0].value) {
      firstOptionCount += 1;
    }
  }

  if (choiceCount >= 10 && firstOptionCount / choiceCount >= 0.85) {
    return 'Your multiple-choice answers look like they were selected without reading — please retake thoughtfully.';
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
      valid: false,
      message:
        'Diagnostic questions are not available right now. Please refresh the page and retake the diagnostic.',
      issues: ['No diagnostic questions were loaded for this session.'],
      code: 'INSUFFICIENT_ANSWERS',
    };
  }

  const textSteps = questionSteps.filter(
    (step) => isTextStep(step) && !isAptitudeStep(step),
  );

  const answeredCount = questionSteps.filter(
    (step) => answers[step.id] !== undefined && answers[step.id] !== null,
  ).length;

  const coverage = answeredCount / questionSteps.length;
  if (coverage < 0.8) {
    issues.push(
      `Only ${answeredCount} of ${questionSteps.length} questions were answered.`,
    );
  }

  for (const step of textSteps) {
    const answer = answers[step.id];
    if (
      answer === undefined ||
      answer === null ||
      (typeof answer === 'string' && !answer.trim())
    ) {
      issues.push(`"${step.title}" was not answered.`);
      continue;
    }

    const issue = validateTextAnswer(step, answer);
    if (issue) issues.push(issue);
  }

  const choicePatternIssue = detectSuspiciousChoicePattern(answers, questionSteps);
  if (choicePatternIssue) issues.push(choicePatternIssue);

  const firstOptionIssue = detectFirstOptionSpam(answers, questionSteps);
  if (firstOptionIssue) issues.push(firstOptionIssue);

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
      issue.includes('more detail') ||
      issue.includes('placeholder') ||
      issue.includes('random') ||
      issue.includes('incomplete') ||
      issue.includes('too short') ||
      issue.includes('not answered'),
  );

  const code: AnswerQualityCode =
    coverage < 0.8
      ? 'INSUFFICIENT_ANSWERS'
      : hasGibberish
        ? 'GIBBERISH_DETECTED'
        : 'ANSWERS_INVALID';

  return {
    valid: false,
    code,
    issues,
    message: RETEST_MESSAGE,
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
