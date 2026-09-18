import {
  DIAGNOSTIC_QUESTIONS_REGISTRY,
  DiagnosticQuestion,
  type ClassGroupType,
} from './legacy-questions.config';
import { buildCollegeStorySteps } from './college-story.config';
import type { DiagnosticStep } from '../services/diagnostics.service';
import type { StoryProfileContext } from './story-profile.types';

export type { StoryProfileContext } from './story-profile.types';

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

const SCHOOL_GROUP_LABELS: Record<ClassGroupType, string> = {
  '6-8': 'Classes 6–8',
  '9-10': 'Classes 9–10',
  '11-12': 'Classes 11–12',
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

function resolveSchoolClassGroup(
  classGroup: string | null | undefined,
): ClassGroupType {
  if (classGroup === '6-8' || classGroup === '9-10' || classGroup === '11-12') {
    return classGroup;
  }
  return '11-12';
}

function resolveEffectiveGrade(
  grade: number | null | undefined,
  classGroup: ClassGroupType,
): number {
  let effectiveGrade = grade ?? 12;
  if (classGroup === '6-8' && ![6, 7, 8].includes(effectiveGrade)) {
    effectiveGrade = 8;
  } else if (classGroup === '9-10' && ![9, 10].includes(effectiveGrade)) {
    effectiveGrade = 10;
  } else if (classGroup === '11-12' && ![11, 12].includes(effectiveGrade)) {
    effectiveGrade = 12;
  }
  return effectiveGrade;
}

/** Filter legacy registry by class group and grade — matches old diagnostic backend. */
export function getQuestionsForStudent(
  grade: number | null | undefined,
  classGroup: ClassGroupType,
): DiagnosticQuestion[] {
  const effectiveGrade = resolveEffectiveGrade(grade, classGroup);
  const filtered = DIAGNOSTIC_QUESTIONS_REGISTRY.filter(
    (q) =>
      q.applicableClassGroups.includes(classGroup) &&
      q.applicableGrades.includes(effectiveGrade),
  );

  if (filtered.length === 0) {
    return DIAGNOSTIC_QUESTIONS_REGISTRY.filter((q) =>
      q.applicableClassGroups.includes(classGroup),
    ).sort((a, b) => a.order - b.order);
  }

  return filtered.sort((a, b) => a.order - b.order);
}

function buildStepsFromQuestions(
  questions: DiagnosticQuestion[],
  prologueSubtitle: string,
): DiagnosticStep[] {
  const steps: DiagnosticStep[] = [
    {
      id: 'story-prologue',
      type: 'chapter',
      stepKind: 'chapter',
      chapter: 'Your Story',
      title: 'Your discovery journey begins',
      subtitle: prologueSubtitle,
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

export function buildSchoolDiagnosticSteps(
  classGroup: ClassGroupType,
  grade?: number | null,
): DiagnosticStep[] {
  const questions = getQuestionsForStudent(grade, classGroup);
  const label = SCHOOL_GROUP_LABELS[classGroup];
  return buildStepsFromQuestions(
    questions,
    `A structured diagnostic for ${label} — academics, interests, aptitude, and future direction. Answer honestly — there are no wrong responses.`,
  );
}

/** Grade- and class-specific diagnostic steps from profile context. */
export function buildStoryDiagnosticSteps(
  ctx: StoryProfileContext,
): DiagnosticStep[] {
  if (ctx.isCollege) {
    return buildCollegeStorySteps(ctx);
  }

  const classGroup = resolveSchoolClassGroup(ctx.classGroup);
  return buildSchoolDiagnosticSteps(classGroup, ctx.grade);
}

/** Fallback when profile is missing — defaults to Grade 11–12. */
export function buildStandardDiagnosticSteps(): DiagnosticStep[] {
  return buildSchoolDiagnosticSteps('11-12', 12);
}

export function countStoryQuestions(steps: DiagnosticStep[]): number {
  return steps.filter((s) => s.stepKind === 'question').length;
}
