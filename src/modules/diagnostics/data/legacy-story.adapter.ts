import {
  DIAGNOSTIC_QUESTIONS_REGISTRY,
  DiagnosticQuestion,
} from './legacy-questions.config';
import type { DiagnosticStep } from '../services/diagnostics.service';

import { buildCollegeStorySteps } from './college-story.config';
import type { StoryProfileContext } from './story-profile.types';

export type { StoryProfileContext } from './story-profile.types';

const SECTION_EMOJI: Record<string, string> = {
  'Academic Profile': '📚',
  'Outside the Classroom': '🌟',
  'Family & Context': '👨‍👩‍👧',
  'Aptitude & Reasoning': '🧩',
  'Numerical Aptitude': '🔢',
  'Logical Reasoning': '🧠',
  'Verbal Comprehension': '📖',
  'Work Preference Mapping': '⚖️',
  'Interest Mapping': '🧭',
  'Motivators & Values': '💡',
  'Values & Motivators': '💡',
  'Working Style': '🎯',
  'Future Aspiration': '🔮',
  'Stream & Subject Direction': '🛤️',
  'Extracurricular & College Direction': '🎓',
};

const SECTION_NARRATIVE: Record<string, (ctx: StoryProfileContext) => string> =
  {
    'Academic Profile': (c) =>
      c.hasTranscript
        ? `We've pulled your records from ${c.school ?? 'your institution'}${c.cgpa ? ` (CGPA ${c.cgpa})` : ''}. A few quick checks to fill any gaps.`
        : `Let's capture your academic world${c.school ? ` at ${c.school}` : ''}${c.stream ? ` in ${c.stream}` : ''}.`,
    'Outside the Classroom': () =>
      'Now the fun part — what you do when class ends. This reveals more than grades ever could.',
    'Family & Context': () =>
      'Every great story has context. These questions help us understand your real-world constraints and support.',
    'Aptitude & Reasoning': () =>
      'Quick brain teasers — no studying needed. Just show us how you think.',
    'Numerical Aptitude': () =>
      'Numbers tell a story too. A few puzzles to gauge your quantitative comfort.',
    'Logical Reasoning': () =>
      'Logic time — trust your instincts, these are not trick questions.',
    'Verbal Comprehension': () =>
      "Words matter. Let's see how you read between the lines.",
    'Work Preference Mapping': () =>
      'Would you rather…? Classic choices that map your natural work style (RIASEC-inspired).',
    'Interest Mapping': () =>
      'Pick what pulls you — each choice reveals a thread of your future career story.',
    'Motivators & Values': () =>
      'What truly drives you? There are no right answers — only honest ones.',
    'Values & Motivators': () =>
      'What would make you feel successful — not just on paper, but in life?',
    'Working Style': () =>
      'How do you learn and grow best? Every path is different.',
    'Future Aspiration': () =>
      'Close your eyes. Where do you see yourself? Let us write that chapter.',
    'Stream & Subject Direction': () =>
      'Streams shape doors. Let us see which ones you are drawn to.',
    'Extracurricular & College Direction': () =>
      'Colleges and careers care about the full you — not just marks. This chapter is about your bigger picture.',
  };

const CHOICE_EMOJIS = [
  '✨',
  '🎯',
  '💡',
  '🚀',
  '🤝',
  '📊',
  '🎨',
  '🔬',
  '💼',
  '🧠',
];

function resolveLegacyClassGroup(ctx: StoryProfileContext): ClassGroupType {
  const g = ctx.classGroup;
  if (g === '6-8' || g === '9-10' || g === '11-12') return g;
  return '9-10';
}

type ClassGroupType = '6-8' | '9-10' | '11-12';

function resolveGrade(
  ctx: StoryProfileContext,
  classGroup: ClassGroupType,
): number {
  if (ctx.grade) return ctx.grade;
  if (classGroup === '6-8') return 8;
  if (classGroup === '9-10') return 10;
  return 12;
}

function shouldSkipQuestion(
  q: DiagnosticQuestion,
  ctx: StoryProfileContext,
): boolean {
  const id = q.questionId;

  if (id.endsWith('_q1_profile')) {
    if (ctx.onboardingCompleted) return true;
    const hasGradeContext = !!(ctx.classGroup || ctx.grade);
    const hasLocation = !!ctx.country;
    const hasAcademicContext = !!(ctx.board || ctx.school);
    return hasGradeContext && hasLocation && hasAcademicContext;
  }

  if (id.endsWith('_q2_subjects')) {
    if (ctx.onboardingCompleted) return true;
    return !!(
      ctx.stream ||
      ctx.transcriptProgram ||
      (ctx.subjects?.length ?? 0) > 0
    );
  }

  if (id === 'g1112_q3_grades_scores' && (ctx.cgpa || ctx.percentage))
    return true;
  if (id === 'g910_q30_favorite_subjects' && (ctx.subjects?.length ?? 0) > 0)
    return true;
  if (id === 'g1112_q31_after_grade12' && ctx.targetDegree) return true;
  if (
    id === 'g1112_q32_hidden_strengths' &&
    ctx.hasTranscript &&
    ctx.transcriptProgram
  )
    return false;

  return false;
}

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
  const options = q.options?.map((o, i) => ({
    value: o.value,
    label: o.label,
    emoji: CHOICE_EMOJIS[i % CHOICE_EMOJIS.length],
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

function chapterIntro(
  section: string,
  ctx: StoryProfileContext,
): DiagnosticStep {
  const narrative =
    SECTION_NARRATIVE[section]?.(ctx) ?? `Next chapter: ${section}`;
  return {
    id: `chapter:${section}`,
    type: 'chapter',
    stepKind: 'chapter',
    chapter: section,
    title: section,
    subtitle: narrative,
    intro: `${SECTION_EMOJI[section] ?? '📖'} ${section}`,
  };
}

export function buildStoryDiagnosticSteps(
  ctx: StoryProfileContext,
): DiagnosticStep[] {
  if (ctx.isCollege) {
    return buildCollegeStorySteps(ctx);
  }

  const classGroup = resolveLegacyClassGroup(ctx);
  const grade = resolveGrade(ctx, classGroup);

  const legacyQuestions = DIAGNOSTIC_QUESTIONS_REGISTRY.filter((q) => {
    const matchGroup = q.applicableClassGroups.includes(classGroup);
    const matchGrade = q.applicableGrades.includes(grade);
    return matchGroup && matchGrade && !shouldSkipQuestion(q, ctx);
  }).sort((a, b) => a.order - b.order);

  const questions = legacyQuestions;

  const levelLabel =
    classGroup === '11-12'
      ? 'Classes 11–12'
      : classGroup === '9-10'
        ? 'Classes 9–10'
        : 'Classes 6–8';

  const steps: DiagnosticStep[] = [
    {
      id: 'story-prologue',
      type: 'chapter',
      stepKind: 'chapter',
      chapter: 'Your Story',
      title: `Hey ${ctx.name}, your discovery story begins`,
      subtitle: `A personalized ${levelLabel} journey — interactive chapters, not a boring form. We already know parts of your profile; we'll only ask what's missing.`,
      intro: '📖 Prologue',
    },
  ];

  let lastSection = '';
  const uniqueSections = [...new Set(questions.map((q) => q.section))];

  for (const q of questions) {
    if (q.section !== lastSection) {
      steps.push(chapterIntro(q.section, ctx));
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
      'AI is ready to weave your answers, profile, and transcript into a personalized insight report.',
    intro: '✨ Finale',
  });

  return steps;
}

export function countStoryQuestions(steps: DiagnosticStep[]): number {
  return steps.filter((s) => s.stepKind === 'question').length;
}
