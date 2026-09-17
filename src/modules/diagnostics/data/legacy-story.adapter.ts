import {
  DIAGNOSTIC_QUESTIONS_REGISTRY,
  DiagnosticQuestion,
} from './legacy-questions.config';
import type { DiagnosticStep } from '../services/diagnostics.service';
import type { StoryProfileContext } from './story-profile.types';

export type { StoryProfileContext } from './story-profile.types';

/** Fixed grade band for the standard diagnostic (same questions for every student). */
const STANDARD_CLASS_GROUP = '11-12' as const;
const STANDARD_GRADE = 12;

const STATIC_SECTION_NARRATIVE: Record<string, string> = {
  'Academic Profile':
    'Tell us about your academic background and how you learn best.',
  'Outside the Classroom':
    'What you do beyond school often reveals as much as grades.',
  'Family & Context':
    'A few questions about your context and support system.',
  'Aptitude & Reasoning':
    'Quick brain teasers — no studying needed. Just show us how you think.',
  'Numerical Aptitude':
    'A few number puzzles to gauge your quantitative comfort.',
  'Logical Reasoning':
    'Logic questions — trust your instincts.',
  'Verbal Comprehension':
    "Short passages to see how you read and interpret information.",
  'Work Preference Mapping':
    'Classic choices that map your natural work style.',
  'Interest Mapping':
    'Pick what pulls you — each choice reveals a thread of your story.',
  'Motivators & Values':
    'What truly drives you? There are no right answers — only honest ones.',
  'Values & Motivators':
    'What would make you feel successful — not just on paper, but in life?',
  'Working Style':
    'How do you learn and grow best?',
  'Future Aspiration':
    'Where do you see yourself heading after school?',
  'Stream & Subject Direction':
    'Which subjects and streams interest you most?',
  'Extracurricular & College Direction':
    'Activities, interests, and the bigger picture beyond marks.',
};

function mapQuestionType(q: DiagnosticQuestion): DiagnosticStep['type'] {
  switch (q.questionType) {
    case 'single_choice':
      return 'choice';
    case 'multiple_choice':
      return 'multi-choice';
    case 'rating':
      return 'slider';
    case 'text':
    default:
      return 'ai-followup';
  }
}

function toDiagnosticStep(
  q: DiagnosticQuestion,
  chapter: string,
): DiagnosticStep {
  const type = mapQuestionType(q);
  const options = q.options?.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return {
    id: q.questionId,
    type,
    stepKind: 'question',
    chapter,
    title: q.questionText,
    subtitle: q.helperText,
    intro: q.questionType === 'text' ? q.helperText : undefined,
    options,
    min: q.questionType === 'rating' ? 1 : undefined,
    max: q.questionType === 'rating' ? 10 : undefined,
    maxSelections: q.questionType === 'multiple_choice' ? 3 : undefined,
    evaluationCategory: q.evaluationCategory,
  };
}

function chapterIntro(section: string): DiagnosticStep {
  const narrative =
    STATIC_SECTION_NARRATIVE[section] ?? `Next chapter: ${section}`;
  return {
    id: `chapter:${section}`,
    type: 'chapter',
    stepKind: 'chapter',
    chapter: section,
    title: section,
    subtitle: narrative,
    intro: section,
  };
}

/** Standard diagnostic — identical steps for every student. */
export function buildStandardDiagnosticSteps(): DiagnosticStep[] {
  const questions = DIAGNOSTIC_QUESTIONS_REGISTRY.filter(
    (q) =>
      q.applicableClassGroups.includes(STANDARD_CLASS_GROUP) &&
      q.applicableGrades.includes(STANDARD_GRADE),
  ).sort((a, b) => a.order - b.order);

  const steps: DiagnosticStep[] = [
    {
      id: 'story-prologue',
      type: 'chapter',
      stepKind: 'chapter',
      chapter: 'Your Story',
      title: 'Your discovery journey begins',
      subtitle:
        'A structured diagnostic covering academics, interests, aptitude, and future direction. Answer honestly — there are no wrong responses.',
      intro: 'Prologue',
    },
  ];

  let lastSection = '';
  const uniqueSections = [...new Set(questions.map((q) => q.section))];

  for (const q of questions) {
    if (q.section !== lastSection) {
      steps.push(chapterIntro(q.section));
      lastSection = q.section;
    }
    steps.push(toDiagnosticStep(q, q.section));
  }

  const chapterCount = uniqueSections.length + 1;
  steps.forEach((s) => {
    if (s.chapter) {
      const idx = uniqueSections.indexOf(s.chapter);
      s.chapterIndex =
        s.stepKind === 'chapter' ? (idx >= 0 ? idx + 1 : 0) : undefined;
      s.chapterTotal = chapterCount;
    }
  });

  steps.push({
    id: 'story-epilogue',
    type: 'chapter',
    stepKind: 'chapter',
    chapter: 'Finale',
    title: 'Almost there!',
    subtitle:
      'We will review your answers and generate an insight report based on what you shared in this diagnostic.',
    intro: 'Finale',
  });

  return steps;
}

/** @deprecated Profile context is ignored — use buildStandardDiagnosticSteps. */
export function buildStoryDiagnosticSteps(
  _ctx: StoryProfileContext,
): DiagnosticStep[] {
  return buildStandardDiagnosticSteps();
}

export function countStoryQuestions(steps: DiagnosticStep[]): number {
  return steps.filter((s) => s.stepKind === 'question').length;
}
