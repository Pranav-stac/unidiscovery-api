import type { DiagnosticStep } from '../services/diagnostics.service';
import type { StoryProfileContext } from './story-profile.types';

type CollegeYear = 1 | 2 | 3 | 4;

interface CollegeQuestion {
  id: string;
  section: string;
  type: DiagnosticStep['type'];
  title: string | ((ctx: StoryProfileContext, year: CollegeYear) => string);
  subtitle?: string | ((ctx: StoryProfileContext, year: CollegeYear) => string);
  intro?: string | ((ctx: StoryProfileContext) => string);
  options?: Array<{ value: string; label: string; emoji?: string }>;
  dynamicOptions?: (
    ctx: StoryProfileContext,
    year?: CollegeYear,
  ) => Array<{ value: string; label: string; emoji?: string }>;
  min?: number;
  max?: number;
  maxSelections?: number;
  evaluationCategory: string;
  years?: CollegeYear[];
  skip?: (ctx: StoryProfileContext, year: CollegeYear) => boolean;
}

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

const SECTION_META: Record<
  string,
  {
    emoji: string;
    narrative: (ctx: StoryProfileContext, year: CollegeYear) => string;
  }
> = {
  'Campus Pulse': {
    emoji: '🎓',
    narrative: (c, y) =>
      c.hasTranscript
        ? `We already have your academic record from ${c.school ?? 'your university'}${c.cgpa ? ` (CGPA ${c.cgpa})` : ''}. Let's focus on where you are in Year ${y} — not generic school questions.`
        : `You're in ${c.classGroupLabel ?? 'college'}${c.stream ? ` studying ${c.stream}` : ''}. This chapter is about your real priorities right now.`,
  },
  'Energy & Interests': {
    emoji: '⚡',
    narrative: () =>
      'Forget textbook labels — what actually pulls you in when you code, build, research, or collaborate?',
  },
  'Skills & Experience': {
    emoji: '🛠️',
    narrative: (c) =>
      c.transcriptProgram
        ? `Your program (${c.transcriptProgram}) is the foundation. Now let's map what you've built on top of it.`
        : 'Projects, internships, and self-taught skills often matter more than marks. Let us capture yours.',
  },
  'Your Next Move': {
    emoji: '🧭',
    narrative: (c) =>
      c.targetDegree
        ? `You mentioned ${c.targetDegree}${c.targetCountries?.length ? ` in ${c.targetCountries.join(', ')}` : ''}. Let's sharpen that into an actionable path.`
        : 'Industry, grad school, startup, or still exploring — no wrong answer, just honesty.',
  },
  'Work Style & Values': {
    emoji: '💡',
    narrative: () =>
      'The best career fit is not only what you are good at — it is how you want to spend your days.',
  },
  'Practical Reality': {
    emoji: '🌍',
    narrative: (c) =>
      `Real plans need real constraints${c.country ? ` — studying from ${c.country}` : ''}.`,
  },
  'Your Vision': {
    emoji: '🔮',
    narrative: (c, y) =>
      y >= 3
        ? 'You are closer to the next big decision than you think. Paint the picture — we will help you reverse-engineer it.'
        : 'Long-term clarity starts with one honest conversation with yourself.',
  },
};

function resolveCollegeYear(ctx: StoryProfileContext): CollegeYear {
  const map: Record<string, CollegeYear> = {
    'college-y1': 1,
    'college-y2': 2,
    'college-y3': 3,
    'college-y4': 4,
  };
  if (ctx.classGroup && map[ctx.classGroup]) return map[ctx.classGroup];
  const g = ctx.grade;
  if (g && g >= 1 && g <= 4) return g as CollegeYear;
  return 4;
}

function isGradSchoolGoal(ctx: StoryProfileContext): boolean {
  const t = (ctx.targetDegree ?? '').toLowerCase();
  return /phd|doctorate|masters|ms |mba|m\.?tech|graduate|postgrad/.test(t);
}

function isTechStream(stream?: string | null): boolean {
  const s = (stream ?? '').toLowerCase();
  return /computer|engineering|it|ai|data|software|tech|cs|information/.test(s);
}

function isBusinessStream(stream?: string | null): boolean {
  const s = (stream ?? '').toLowerCase();
  return /commerce|business|bba|mba|finance|economics|management/.test(s);
}

function skillOptions(ctx: StoryProfileContext) {
  if (isTechStream(ctx.stream)) {
    return [
      { value: 'programming', label: 'Programming & DSA', emoji: '💻' },
      { value: 'ml', label: 'AI / Machine Learning', emoji: '🤖' },
      { value: 'systems', label: 'Systems & backend', emoji: '⚙️' },
      { value: 'data', label: 'Data engineering & analytics', emoji: '📊' },
      { value: 'product', label: 'Product thinking & UX', emoji: '🎨' },
      { value: 'research', label: 'Research & papers', emoji: '📄' },
    ];
  }
  if (isBusinessStream(ctx.stream)) {
    return [
      { value: 'analytics', label: 'Business analytics', emoji: '📈' },
      { value: 'finance', label: 'Finance & accounting', emoji: '💰' },
      { value: 'marketing', label: 'Marketing & growth', emoji: '📣' },
      { value: 'strategy', label: 'Strategy & consulting', emoji: '🧩' },
      { value: 'ops', label: 'Operations & management', emoji: '🏢' },
      { value: 'entrepreneurship', label: 'Entrepreneurship', emoji: '🚀' },
    ];
  }
  return [
    { value: 'core', label: 'Core domain knowledge', emoji: '📚' },
    { value: 'research', label: 'Research & writing', emoji: '🔍' },
    {
      value: 'communication',
      label: 'Communication & presentation',
      emoji: '🎤',
    },
    { value: 'leadership', label: 'Leadership & teamwork', emoji: '👥' },
    { value: 'technical', label: 'Technical / digital skills', emoji: '💻' },
    { value: 'creative', label: 'Creative & design skills', emoji: '✨' },
  ];
}

function yearPriorityOptions(year: CollegeYear) {
  if (year === 1) {
    return [
      { value: 'explore', label: 'Exploring specializations', emoji: '🧭' },
      {
        value: 'foundation',
        label: 'Building strong fundamentals',
        emoji: '📚',
      },
      { value: 'clubs', label: 'Clubs, communities & networking', emoji: '🤝' },
      {
        value: 'skills',
        label: 'Learning in-demand skills early',
        emoji: '💻',
      },
      { value: 'clarity', label: 'Getting career clarity', emoji: '✨' },
    ];
  }
  if (year === 2) {
    return [
      { value: 'specialize', label: 'Choosing a specialization', emoji: '🎯' },
      { value: 'projects', label: 'Building portfolio projects', emoji: '🛠️' },
      { value: 'intern_prep', label: 'Preparing for internships', emoji: '💼' },
      { value: 'research', label: 'Exploring research', emoji: '🔬' },
      { value: 'balance', label: 'Balancing grades & growth', emoji: '⚖️' },
    ];
  }
  if (year === 3) {
    return [
      {
        value: 'internship',
        label: 'Landing a strong internship',
        emoji: '💼',
      },
      { value: 'grad_prep', label: 'Grad school applications', emoji: '🎓' },
      { value: 'skills', label: 'Deep technical/domain skills', emoji: '🧠' },
      { value: 'startup', label: 'Testing a startup idea', emoji: '🚀' },
      { value: 'network', label: 'Building professional network', emoji: '🌐' },
    ];
  }
  return [
    { value: 'placement', label: 'Campus placement / job offer', emoji: '🏢' },
    { value: 'grad_school', label: 'Grad school / PhD admits', emoji: '🎓' },
    { value: 'startup', label: 'Launching or joining a startup', emoji: '🚀' },
    { value: 'skills', label: 'Job-ready skill mastery', emoji: '⚡' },
    { value: 'pivot', label: 'Pivoting to a new field', emoji: '🔄' },
  ];
}

const COLLEGE_QUESTIONS: CollegeQuestion[] = [
  {
    id: 'coll_priority',
    section: 'Campus Pulse',
    type: 'choice',
    title: (_c, year) => `What's your #1 priority in Year ${year}?`,
    subtitle: 'Pick what matters most to you right now',
    dynamicOptions: (_c, year) => yearPriorityOptions(year!),
    evaluationCategory: 'career_focus',
  },
  {
    id: 'coll_clarity',
    section: 'Campus Pulse',
    type: 'slider',
    title: 'How clear do you feel about your next step after college?',
    subtitle: 'Slide honestly — we adapt recommendations to this',
    min: 1,
    max: 10,
    evaluationCategory: 'confidence',
  },
  {
    id: 'coll_energize',
    section: 'Energy & Interests',
    type: 'choice',
    title: (c) =>
      c.stream
        ? `In ${c.stream}, what kind of work energizes you most?`
        : 'What kind of work energizes you most?',
    dynamicOptions: (c) => {
      if (isTechStream(c.stream)) {
        return [
          {
            value: 'build',
            label: 'Building products people use',
            emoji: '🛠️',
          },
          {
            value: 'research',
            label: 'Research & pushing boundaries',
            emoji: '🔬',
          },
          { value: 'data', label: 'Finding patterns in data', emoji: '📊' },
          {
            value: 'systems',
            label: 'Scaling systems & infrastructure',
            emoji: '⚙️',
          },
          {
            value: 'teach',
            label: 'Teaching & explaining concepts',
            emoji: '🎓',
          },
        ];
      }
      return [
        { value: 'solve', label: 'Solving complex problems', emoji: '🧩' },
        { value: 'create', label: 'Creating something new', emoji: '✨' },
        { value: 'lead', label: 'Leading and organizing people', emoji: '👥' },
        { value: 'help', label: 'Helping others directly', emoji: '❤️' },
        { value: 'analyze', label: 'Analyzing and strategizing', emoji: '📈' },
      ];
    },
    evaluationCategory: 'interest',
  },
  {
    id: 'coll_riasec_1',
    section: 'Energy & Interests',
    type: 'choice',
    title: 'Would you rather…',
    subtitle: 'Go with your gut',
    options: [
      { value: 'ship', label: 'Ship a product used by thousands', emoji: '🚀' },
      {
        value: 'publish',
        label: 'Publish research that advances a field',
        emoji: '📄',
      },
    ],
    evaluationCategory: 'riasec',
  },
  {
    id: 'coll_riasec_2',
    section: 'Energy & Interests',
    type: 'choice',
    title: 'Would you rather…',
    options: [
      { value: 'mentor', label: 'Mentor juniors & grow a team', emoji: '🤝' },
      {
        value: 'solo',
        label: 'Work deeply alone on hard problems',
        emoji: '🧠',
      },
    ],
    evaluationCategory: 'riasec',
  },
  {
    id: 'coll_riasec_3',
    section: 'Energy & Interests',
    type: 'choice',
    title: 'Would you rather…',
    options: [
      {
        value: 'startup',
        label: 'Take risk at an early-stage startup',
        emoji: '🔥',
      },
      {
        value: 'stable',
        label: 'Join a stable company with clear growth',
        emoji: '🏢',
      },
    ],
    evaluationCategory: 'riasec',
  },
  {
    id: 'coll_project_types',
    section: 'Energy & Interests',
    type: 'multi-choice',
    title: 'Which project types have you enjoyed most?',
    subtitle: 'Pick up to 3',
    maxSelections: 3,
    dynamicOptions: (c) => {
      if (isTechStream(c.stream)) {
        return [
          { value: 'web', label: 'Web / mobile apps', emoji: '🌐' },
          { value: 'ml', label: 'ML / AI projects', emoji: '🤖' },
          {
            value: 'hackathon',
            label: 'Hackathons & competitions',
            emoji: '🏆',
          },
          {
            value: 'open_source',
            label: 'Open source contributions',
            emoji: '💻',
          },
          { value: 'research', label: 'Research projects', emoji: '🔬' },
          { value: 'freelance', label: 'Freelance / client work', emoji: '💼' },
        ];
      }
      return [
        { value: 'case', label: 'Case studies & analysis', emoji: '📊' },
        { value: 'campaign', label: 'Campaigns & events', emoji: '📣' },
        { value: 'research', label: 'Research & reports', emoji: '📄' },
        { value: 'social', label: 'Community / social impact', emoji: '🌍' },
        { value: 'startup', label: 'Startup or venture ideas', emoji: '🚀' },
        { value: 'creative', label: 'Creative portfolios', emoji: '🎨' },
      ];
    },
    evaluationCategory: 'activity_preference',
  },
  {
    id: 'coll_strongest',
    section: 'Skills & Experience',
    type: 'multi-choice',
    title: 'Where do you feel strongest today?',
    subtitle: 'Pick up to 3 — be honest, not humble',
    maxSelections: 3,
    dynamicOptions: skillOptions,
    evaluationCategory: 'academic_strength',
  },
  {
    id: 'coll_build_next',
    section: 'Skills & Experience',
    type: 'multi-choice',
    title: 'What do you most want to build in the next 12 months?',
    subtitle: 'Pick up to 3',
    maxSelections: 3,
    dynamicOptions: skillOptions,
    evaluationCategory: 'skill_gap',
  },
  {
    id: 'coll_experience',
    section: 'Skills & Experience',
    type: 'choice',
    title: 'How would you describe your hands-on experience so far?',
    options: [
      {
        value: 'none',
        label: 'Mostly coursework — ready to start',
        emoji: '🌱',
      },
      { value: 'projects', label: 'Personal or college projects', emoji: '🛠️' },
      { value: 'internship', label: 'Internship(s) completed', emoji: '💼' },
      { value: 'research', label: 'Research lab / publications', emoji: '🔬' },
      { value: 'work', label: 'Part-time or freelance work', emoji: '⚡' },
    ],
    evaluationCategory: 'extracurricular_profile',
  },
  {
    id: 'coll_hidden_strength',
    section: 'Skills & Experience',
    type: 'ai-followup',
    title: "What's a strength you have that doesn't show on your transcript?",
    subtitle: 'Leadership, communication, self-taught skills, side projects…',
    intro: 'e.g. I taught myself React and led our college tech fest…',
    evaluationCategory: 'academic_strength',
    skip: (c) => !!c.resumeSummary,
  },
  {
    id: 'coll_primary_path',
    section: 'Your Next Move',
    type: 'choice',
    title: 'Which path are you leaning toward most?',
    dynamicOptions: (c) => {
      const grad = isGradSchoolGoal(c);
      return [
        {
          value: 'industry',
          label: 'Industry job after graduation',
          emoji: '🏢',
        },
        { value: 'masters', label: "Master's abroad or in India", emoji: '🎓' },
        { value: 'phd', label: 'PhD / research career', emoji: '🔬' },
        { value: 'startup', label: 'Startup or entrepreneurship', emoji: '🚀' },
        {
          value: 'exploring',
          label: 'Still exploring — help me decide',
          emoji: '🧭',
        },
      ].filter((o) => !(grad && o.value === 'exploring'));
    },
    skip: (c) => isGradSchoolGoal(c) && !!c.targetDegree,
    evaluationCategory: 'future_aspiration',
  },
  {
    id: 'coll_path_confirm',
    section: 'Your Next Move',
    type: 'choice',
    title: (c) => `You mentioned ${c.targetDegree} — how committed are you?`,
    options: [
      {
        value: 'committed',
        label: 'Fully committed — actively preparing',
        emoji: '🎯',
      },
      {
        value: 'leaning',
        label: 'Leaning that way — need a plan',
        emoji: '🧭',
      },
      { value: 'backup', label: 'One option among several', emoji: '⚖️' },
      {
        value: 'unsure',
        label: 'Reconsidering — open to alternatives',
        emoji: '🔄',
      },
    ],
    skip: (c) => !c.targetDegree,
    evaluationCategory: 'future_aspiration',
  },
  {
    id: 'coll_timeline',
    section: 'Your Next Move',
    type: 'choice',
    title: 'When do you want to make your next big move?',
    options: [
      { value: '6m', label: 'Within 6 months', emoji: '⚡' },
      { value: '1y', label: 'Within 1 year', emoji: '📅' },
      { value: '2y', label: '1–2 years', emoji: '🗓️' },
      {
        value: 'flexible',
        label: 'Flexible — building foundations first',
        emoji: '🌱',
      },
    ],
    evaluationCategory: 'future_aspiration',
  },
  {
    id: 'coll_location',
    section: 'Your Next Move',
    type: 'multi-choice',
    title: (c) =>
      c.targetCountries?.length
        ? `Besides ${c.targetCountries.join(', ')}, where else would you consider?`
        : 'Where would you ideally work or study?',
    maxSelections: 3,
    options: [
      { value: 'india', label: 'India', emoji: '🇮🇳' },
      { value: 'us', label: 'United States', emoji: '🇺🇸' },
      { value: 'uk', label: 'United Kingdom', emoji: '🇬🇧' },
      { value: 'canada', label: 'Canada', emoji: '🇨🇦' },
      { value: 'europe', label: 'Europe (EU)', emoji: '🇪🇺' },
      { value: 'remote', label: 'Remote / anywhere', emoji: '🌐' },
    ],
    skip: (c) => !!(c.targetCountries?.length === 1 && c.targetDegree),
    evaluationCategory: 'target_universities',
  },
  {
    id: 'coll_work_env',
    section: 'Work Style & Values',
    type: 'choice',
    title: 'Which work environment sounds most like you in 5–10 years?',
    options: [
      { value: 'research', label: 'Research lab or academia', emoji: '🔬' },
      {
        value: 'product',
        label: 'Product company — ship & iterate',
        emoji: '📱',
      },
      {
        value: 'consulting',
        label: 'Consulting — variety & clients',
        emoji: '💼',
      },
      { value: 'startup', label: 'Building your own company', emoji: '🚀' },
      {
        value: 'impact',
        label: 'Mission-driven org (NGO, gov, social)',
        emoji: '🌍',
      },
    ],
    evaluationCategory: 'work_friction',
  },
  {
    id: 'coll_values',
    section: 'Work Style & Values',
    type: 'multi-choice',
    title: 'What would make you feel successful? (Pick top 3)',
    maxSelections: 3,
    options: [
      { value: 'income', label: 'Strong financial growth', emoji: '💰' },
      { value: 'impact', label: 'Meaningful impact on people', emoji: '❤️' },
      {
        value: 'prestige',
        label: 'Top institutions / brand names',
        emoji: '🏆',
      },
      { value: 'freedom', label: 'Creative freedom & autonomy', emoji: '✨' },
      {
        value: 'stability',
        label: 'Stability & work-life balance',
        emoji: '⚖️',
      },
      { value: 'learning', label: 'Constant learning & mastery', emoji: '🧠' },
    ],
    evaluationCategory: 'work_friction',
  },
  {
    id: 'coll_risk',
    section: 'Work Style & Values',
    type: 'slider',
    title: 'How comfortable are you with career risk?',
    subtitle: '1 = play safe · 10 = bet on myself',
    min: 1,
    max: 10,
    evaluationCategory: 'work_friction',
  },
  {
    id: 'coll_grad_budget',
    section: 'Practical Reality',
    type: 'choice',
    title: 'Approximate annual budget for grad school (tuition + living)?',
    subtitle: 'Helps us recommend realistic programs & scholarships',
    options: [
      { value: 'under_15l', label: 'Under ₹15L / $18K', emoji: '💰' },
      { value: '15_35l', label: '₹15–35L / $18–42K', emoji: '💳' },
      { value: '35_65l', label: '₹35–65L / $42–80K', emoji: '🏦' },
      {
        value: 'scholarship',
        label: 'Need significant scholarship / funding',
        emoji: '🎓',
      },
      {
        value: 'flexible',
        label: 'Flexible — show me best-fit options',
        emoji: '✨',
      },
    ],
    skip: (c) => !isGradSchoolGoal(c),
    evaluationCategory: 'college_degree',
  },
  {
    id: 'coll_constraints',
    section: 'Practical Reality',
    type: 'ai-followup',
    title: 'Any real-world constraints we should factor in?',
    subtitle:
      'Family expectations, finances, visa, health — optional but helpful',
    intro:
      'e.g. Need to stay in India for 2 years, or family expects campus placement…',
    evaluationCategory: 'diagnostic_goal',
  },
  {
    id: 'coll_worry',
    section: 'Your Vision',
    type: 'ai-followup',
    title: "What's your biggest confusion or worry about what comes next?",
    subtitle: 'The more honest, the better your AI insights',
    intro: 'e.g. PhD vs industry, whether my CGPA is enough for top programs…',
    evaluationCategory: 'diagnostic_goal',
  },
  {
    id: 'coll_vision',
    section: 'Your Vision',
    type: 'ai-followup',
    title: (c, year) =>
      year >= 4
        ? 'Where do you see yourself in 3 years after graduation?'
        : 'Describe your ideal outcome 3 years from now',
    subtitle: 'Role, location, type of work — rough is fine',
    intro: (c) =>
      c.targetDegree
        ? `e.g. PhD researcher in ${c.stream ?? 'my field'}, or ML engineer at a product company…`
        : 'e.g. AI researcher at a top lab, or founding a health-tech startup…',
    evaluationCategory: 'future_aspiration',
  },
];

function resolveText(
  value:
    | string
    | ((ctx: StoryProfileContext, year: CollegeYear) => string)
    | undefined,
  ctx: StoryProfileContext,
  year: CollegeYear,
): string | undefined {
  if (!value) return undefined;
  return typeof value === 'function' ? value(ctx, year) : value;
}

function toStep(
  q: CollegeQuestion,
  ctx: StoryProfileContext,
  year: CollegeYear,
): DiagnosticStep {
  const options =
    q.dynamicOptions?.(ctx, year) ??
    q.options?.map((o, i) => ({
      ...o,
      emoji: o.emoji ?? CHOICE_EMOJIS[i % CHOICE_EMOJIS.length],
    }));

  const intro = typeof q.intro === 'function' ? q.intro(ctx) : q.intro;

  return {
    id: q.id,
    type: q.type,
    stepKind: 'question',
    chapter: q.section,
    title: resolveText(q.title, ctx, year) ?? '',
    subtitle: resolveText(q.subtitle, ctx, year),
    intro,
    options,
    min: q.min,
    max: q.max,
    maxSelections: q.maxSelections,
    evaluationCategory: q.evaluationCategory,
  };
}

function chapterIntro(
  section: string,
  ctx: StoryProfileContext,
  year: CollegeYear,
): DiagnosticStep {
  const meta = SECTION_META[section];
  return {
    id: `chapter:${section}`,
    type: 'chapter',
    stepKind: 'chapter',
    chapter: section,
    title: section,
    subtitle: meta?.narrative(ctx, year) ?? `Next: ${section}`,
    intro: `${meta?.emoji ?? '📖'} ${section}`,
  };
}

export function buildCollegeStorySteps(
  ctx: StoryProfileContext,
): DiagnosticStep[] {
  const year = resolveCollegeYear(ctx);
  const institution = ctx.school ?? 'your university';
  const goalLine = ctx.targetDegree ? ` · aiming for ${ctx.targetDegree}` : '';

  const activeQuestions = COLLEGE_QUESTIONS.filter((q) => {
    if (q.years && !q.years.includes(year)) return false;
    if (q.skip?.(ctx, year)) return false;
    return true;
  });

  const uniqueSections = [...new Set(activeQuestions.map((q) => q.section))];

  const steps: DiagnosticStep[] = [
    {
      id: 'story-prologue',
      type: 'chapter',
      stepKind: 'chapter',
      chapter: 'Your Story',
      title: `Hey ${ctx.name}, your college discovery starts here`,
      subtitle: `Built for ${ctx.classGroupLabel ?? 'college'} students — not school questionnaires. ${ctx.stream ? `${ctx.stream} at ${institution}` : institution}${goalLine}. Fast, interactive, and tuned to where you actually are.`,
      intro: '🎓 College Discovery',
    },
  ];

  let lastSection = '';
  for (const q of activeQuestions) {
    if (q.section !== lastSection) {
      steps.push(chapterIntro(q.section, ctx, year));
      lastSection = q.section;
    }
    steps.push(toStep(q, ctx, year));
  }

  const chapterCount = uniqueSections.length + 1;
  for (const s of steps) {
    if (!s.chapter) continue;
    const idx = uniqueSections.indexOf(s.chapter);
    if (s.stepKind === 'chapter') {
      s.chapterIndex = idx >= 0 ? idx + 1 : 0;
    }
    s.chapterTotal = chapterCount;
  }

  steps.push({
    id: 'story-epilogue',
    type: 'chapter',
    stepKind: 'chapter',
    chapter: 'Finale',
    title: 'Ready for your personalized insights',
    subtitle: `We'll combine your answers with your profile${ctx.hasTranscript ? ', transcript' : ''}${ctx.targetDegree ? `, and ${ctx.targetDegree} goal` : ''} into a career map built for you — not a generic school report.`,
    intro: '✨ Finale',
  });

  return steps;
}
