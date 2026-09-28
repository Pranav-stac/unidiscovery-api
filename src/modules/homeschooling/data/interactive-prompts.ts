const SUBJECT_ALIASES: Record<string, string> = {
  math: 'mathematics',
  maths: 'mathematics',
  bio: 'biology',
  chem: 'chemistry',
  phy: 'physics',
  'business-studies': 'business',
  accountancy: 'business',
  'social-science': 'history',
  civics: 'history',
};

type SubjectPrompt = {
  focus: string;
  visualGuidance: string;
  teachingStyle: string;
  exampleGuidance: string;
};

const SUBJECT_PROMPTS: Record<string, SubjectPrompt> = {
  mathematics: {
    focus: 'Build from definitions → procedure → worked example → common mistake. Every concept needs intuition before formulas.',
    visualGuidance:
      'Use line-graph for functions, bar-chart for comparisons, diagram for relationships between terms, animation for step-by-step algebraic or geometric transformations.',
    teachingStyle:
      'Use concrete numbers first, then generalize. Show WHY a formula works, not just what it is. Connect to real measurements (money, distance, area).',
    exampleGuidance: 'Include at least one worked mini-example per concept with numbered reasoning steps in the explanation text.',
  },
  science: {
    focus: 'Phenomenon first, then model, then application. Link everyday observations to scientific principles.',
    visualGuidance:
      'Use animation frames for processes (e.g. photosynthesis, circuits), comparison for before/after states, diagram for systems and cycles, timeline for stages.',
    teachingStyle:
      'Start with "you have seen this when…" hooks. Use simple analogies. Separate observation from explanation clearly.',
    exampleGuidance: 'Ground each concept in a visible experiment or daily-life observation the student can picture.',
  },
  physics: {
    focus: 'Physical intuition → variables → equation meaning → units. Emphasize cause and effect.',
    visualGuidance:
      'Use animation for motion/forces/waves, line-graph for relationships (e.g. v-t graphs), diagram for force/field setups, comparison for scalar vs vector ideas.',
    teachingStyle:
      'Build mental models: what moves, what pushes, what stores energy. Always tie symbols back to physical meaning.',
    exampleGuidance: 'Use one numerical example per concept showing unit checks and sensible answers.',
  },
  chemistry: {
    focus: 'Particle-level picture → macro observation → rules → exceptions. Make the invisible visible.',
    visualGuidance:
      'Use animation for reactions/bonding/electron movement, diagram for structures and periodic trends, comparison for ionic vs covalent etc.',
    teachingStyle:
      'Explain at micro scale first, then lab-scale. Use color and state changes students recognize from class.',
    exampleGuidance: 'Name common substances students know (water, salt, vinegar) when illustrating ideas.',
  },
  biology: {
    focus: 'Structure → function → regulation → significance for life/health/environment.',
    visualGuidance:
      'Use diagram for organs/systems/pathways, animation for processes (digestion, mitosis, nerve signal), timeline for developmental or evolutionary sequences.',
    teachingStyle:
      'Connect to body, health, plants, or environment. Use "what would happen if…" to make ideas stick.',
    exampleGuidance: 'Relate each concept to student-relevant outcomes (nutrition, disease prevention, ecosystems).',
  },
  english: {
    focus: 'Meaning → technique → effect on reader → how to use it in writing/analysis.',
    visualGuidance:
      'Use comparison for contrasting texts/styles, diagram for essay/story structure, timeline for plot or historical context.',
    teachingStyle:
      'Show short quoted examples. Explain tone, purpose, and audience. Teach close reading, not memorization.',
    exampleGuidance: 'Embed brief sample sentences or phrases demonstrating the literary device or grammar rule.',
  },
  history: {
    focus: 'Context → causes → key events → consequences → why it matters today.',
    visualGuidance:
      'Use timeline for chronology, comparison for opposing sides or reforms, diagram for cause-effect chains.',
    teachingStyle:
      'Tell it as connected story, not isolated dates. Highlight human decisions and evidence.',
    exampleGuidance: 'Link each concept to one named event, figure, or source students should remember.',
  },
  geography: {
    focus: 'Place → process → pattern → human impact. Maps and models in the mind.',
    visualGuidance:
      'Use diagram for landforms/climate systems, bar-chart or line-graph for data trends, comparison for regions, animation for cycles (water, rock).',
    teachingStyle:
      'Anchor every idea to a real location or map feature. Explain processes spatially (where, why there).',
    exampleGuidance: 'Name specific regions, countries, or map features when illustrating patterns.',
  },
  economics: {
    focus: 'Real-world problem → economic concept → model/graph → policy or decision implication.',
    visualGuidance:
      'Use line-graph for supply-demand or growth, bar-chart for comparisons, diagram for circular flow or sectors, comparison for policies.',
    teachingStyle:
      'Start with household/market examples before abstract terms. Define jargon immediately in plain English.',
    exampleGuidance: 'Use relatable scenarios: pocket money, shop prices, jobs, government schemes.',
  },
  business: {
    focus: 'Situation → business concept → tool/framework → decision outcome.',
    visualGuidance:
      'Use diagram for org/process flows, comparison for strategies, bar-chart for performance metrics.',
    teachingStyle:
      'Case-style explanations: a small business faces X, concept Y helps decide Z.',
    exampleGuidance: 'Mini caselets with named roles (owner, customer, manager) per concept.',
  },
  default: {
    focus: 'Core definition → how it works → why it matters → one clear example.',
    visualGuidance:
      'Pick the best visual per idea: diagram for relationships, animation for processes, comparison for contrasts, charts for data.',
    teachingStyle:
      'Plain language, short paragraphs, no quiz gates. Flow like a great tutor explaining on a whiteboard.',
    exampleGuidance: 'One memorable example per concept tied to the student grade level.',
  },
};

export function resolveSubjectPromptKey(subjectId: string): string {
  const slug = subjectId.toLowerCase().replace(/\s+/g, '-');
  return SUBJECT_ALIASES[slug] ?? slug;
}

export function subjectInteractivePrompt(subjectId: string, subjectName: string): SubjectPrompt {
  const key = resolveSubjectPromptKey(subjectId);
  if (SUBJECT_PROMPTS[key]) return SUBJECT_PROMPTS[key];
  const nameKey = resolveSubjectPromptKey(subjectName);
  return SUBJECT_PROMPTS[nameKey] ?? SUBJECT_PROMPTS.default;
}

export function buildInteractiveSystemPrompt(input: {
  boardLabel: string;
  grade: number;
  subjectId: string;
  subjectName: string;
}): string {
  const subject = subjectInteractivePrompt(input.subjectId, input.subjectName);
  return `You are an expert ${input.boardLabel} Class ${input.grade} ${input.subjectName} tutor creating a CONTINUOUS interactive learning experience — NOT a step-by-step quiz or checklist.

GOAL: Help the student deeply understand every fundamental concept in this chapter through clear explanations, visuals, and optional tap-to-explore interactions. It should read like an immersive lesson that flows naturally from one idea to the next.

SUBJECT-SPECIFIC APPROACH (${input.subjectName}):
- Focus: ${subject.focus}
- Visuals: ${subject.visualGuidance}
- Teaching: ${subject.teachingStyle}
- Examples: ${subject.exampleGuidance}

RULES:
- Output 5-8 concept blocks that together cover the FULL chapter syllabus.
- NO multiple-choice quizzes, fill-in-blank gates, or ordering tasks.
- Each concept: hook (1 engaging sentence) + explanation (4-8 sentences, fundamental and clear) + fundamental (one-line principle to remember).
- At least 4 concepts MUST include a visual (bar-chart, line-graph, pie, diagram, animation, comparison, or timeline) with real meaningful data.
- 2-3 concepts may include explore: tap-to-reveal cards ({ prompt, items: [{ label, detail }] }) for deeper optional detail — never required to proceed.
- Write opening as a warm 2-3 sentence intro. fundamentals: 3-5 chapter-wide core principles.
- Adapt depth to student skill gaps; use their interests in examples when provided.
- Use concept-1, concept-2, etc. as ids.`;
}

export const INTERACTIVE_SCHEMA_DESCRIPTION = `{
  title, subtitle, opening, estimatedMinutes: number, subjectFocus: string,
  fundamentals: string[],
  concepts: [{
    id, title, hook, explanation, fundamental,
    visual?: { type, title?, caption?, data?, nodes?, edges?, frames?, left?, right?, events? },
    explore?: { prompt, items: [{ label, detail }] }
  }],
  recap: string[]
}`;
