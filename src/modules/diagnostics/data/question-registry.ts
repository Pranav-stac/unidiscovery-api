import type { DiagnosticStep } from '../services/diagnostics.service';

type RegistryStep = DiagnosticStep & { classGroups: string[] };

/** Condensed from legacy diagnostic tool — grade-specific depth without 30+ questions */
const REGISTRY: RegistryStep[] = [
  // ── All students: RIASEC-style forced choice (from legacy tool) ──
  {
    id: 'riasec_1',
    classGroups: [
      '6-8',
      '9-10',
      '11-12',
      'college-y1',
      'college-y2',
      'college-y3',
      'college-y4',
    ],
    type: 'choice',
    title: 'Would you rather…',
    subtitle: 'Pick the one that appeals to you more — go with your gut',
    options: [
      { value: 'analyze', label: 'Analyse data to find patterns', emoji: '📊' },
      {
        value: 'create',
        label: 'Design something visual or creative',
        emoji: '🎨',
      },
    ],
  },
  {
    id: 'riasec_2',
    classGroups: [
      '6-8',
      '9-10',
      '11-12',
      'college-y1',
      'college-y2',
      'college-y3',
      'college-y4',
    ],
    type: 'choice',
    title: 'Would you rather…',
    subtitle: 'No wrong answers',
    options: [
      {
        value: 'help',
        label: 'Help or mentor someone struggling',
        emoji: '🤝',
      },
      {
        value: 'build',
        label: 'Build a tool that solves a problem',
        emoji: '🛠️',
      },
    ],
  },
  {
    id: 'riasec_3',
    classGroups: [
      '9-10',
      '11-12',
      'college-y1',
      'college-y2',
      'college-y3',
      'college-y4',
    ],
    type: 'choice',
    title: 'Would you rather…',
    options: [
      { value: 'lead', label: 'Lead a team and pitch an idea', emoji: '🚀' },
      {
        value: 'research',
        label: 'Research quietly and write a detailed report',
        emoji: '📚',
      },
    ],
  },

  // ── School 9-10: stream direction ──
  {
    id: 'stream_pull',
    classGroups: ['9-10'],
    type: 'choice',
    title: 'Which stream pulls you in, even slightly?',
    subtitle: 'From legacy stream discovery questionnaire',
    options: [
      { value: 'science', label: 'Science (PCM / PCB)', emoji: '🔬' },
      { value: 'commerce', label: 'Commerce', emoji: '📊' },
      { value: 'arts', label: 'Arts / Humanities', emoji: '🎭' },
      { value: 'undecided', label: 'Still exploring', emoji: '🧭' },
    ],
  },

  // ── School 11-12: college direction ──
  {
    id: 'after_grade12',
    classGroups: ['11-12'],
    type: 'ai-followup',
    title: 'What are you considering after Grade 12?',
    subtitle: 'Fields, university types, countries — rough ideas count',
    intro: 'e.g. Computer Science in US/Canada, or Engineering in India…',
  },
  {
    id: 'family_budget',
    classGroups: ['11-12'],
    type: 'choice',
    title:
      'Approximate annual family budget for university (incl. living costs)?',
    options: [
      { value: 'under_15l', label: 'Under ₹15L / $18K', emoji: '💰' },
      { value: '15_35l', label: '₹15–35L / $18–42K', emoji: '💳' },
      { value: '35_65l', label: '₹35–65L / $42–80K', emoji: '🏦' },
      {
        value: 'need_scholarship',
        label: 'Need significant scholarship',
        emoji: '🎓',
      },
      { value: 'no_limit', label: 'No hard limit', emoji: '✨' },
    ],
  },
  {
    id: 'future_worry',
    classGroups: ['11-12', 'college-y3', 'college-y4'],
    type: 'ai-followup',
    title:
      "What's your biggest confusion or worry about your future right now?",
    subtitle: 'Honest answers = better AI insights',
    intro: 'e.g. choosing between MS abroad vs campus placement…',
  },

  // ── College students: career direction ──
  {
    id: 'work_environment',
    classGroups: ['college-y1', 'college-y2', 'college-y3', 'college-y4'],
    type: 'choice',
    title: 'Which work environment sounds most like you in 5 years?',
    subtitle: 'From legacy Grade 11–12 values assessment',
    options: [
      {
        value: 'independent',
        label: 'Independent — research, analysis, writing',
        emoji: '🔍',
      },
      {
        value: 'leading',
        label: 'Leading people & building something',
        emoji: '👥',
      },
      { value: 'helping', label: 'Helping people directly', emoji: '❤️' },
      {
        value: 'creating',
        label: 'Creating — design, media, art',
        emoji: '✨',
      },
      { value: 'technical', label: 'Solving technical problems', emoji: '⚙️' },
    ],
  },
  {
    id: 'hidden_strength',
    classGroups: ['college-y2', 'college-y3', 'college-y4'],
    type: 'ai-followup',
    title: "What are you genuinely good at that grades don't fully show?",
    subtitle: 'Hidden strengths your transcript might miss',
    intro: 'Projects, leadership, communication, self-taught skills…',
  },
  {
    id: 'internship_priority',
    classGroups: ['college-y3', 'college-y4'],
    type: 'choice',
    title: 'What would make your next year a success?',
    options: [
      { value: 'internship', label: 'A strong internship', emoji: '💼' },
      { value: 'skills', label: 'Mastering key technical skills', emoji: '🧠' },
      { value: 'grad_school', label: 'Grad school / MS admit', emoji: '🎓' },
      { value: 'placement', label: 'Campus placement offer', emoji: '🏢' },
      { value: 'startup', label: 'Starting my own venture', emoji: '🚀' },
    ],
  },

  // ── Middle school: learning style ──
  {
    id: 'learner_type',
    classGroups: ['6-8'],
    type: 'choice',
    title: 'I learn best when I…',
    options: [
      { value: 'watch', label: 'Watch or read first, then try', emoji: '📖' },
      { value: 'jump', label: 'Jump in and learn by doing', emoji: '🏃' },
      { value: 'discuss', label: 'Discuss and ask questions', emoji: '💬' },
      {
        value: 'quiet',
        label: 'Figure it out step by step alone',
        emoji: '🧘',
      },
    ],
  },
];

export function getRegistrySteps(
  classGroup: string | null | undefined,
  isCollege: boolean,
): DiagnosticStep[] {
  const group = isCollege
    ? (classGroup ?? 'college-y2')
    : (classGroup ?? '9-10');

  return REGISTRY.filter((q) => q.classGroups.includes(group)).map((q) => {
    const { classGroups, ...step } = q;
    void classGroups;
    return step;
  });
}
