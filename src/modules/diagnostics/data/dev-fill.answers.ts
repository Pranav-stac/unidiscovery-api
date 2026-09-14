import type { DiagnosticStep } from '../services/diagnostics.service';
import { validateSingleTextAnswer } from '../services/answer-quality.validator';

const DEV_TEXT_BY_ID: Record<string, string[]> = {
  g68_q1_profile: ['Aarav Sharma, Grade 8A, CBSE board, living in Pune, India.'],
  g68_q2_subjects: [
    'English, Mathematics, Science, Social Studies, Hindi, and Computer Science this year.',
  ],
  g68_q3_easy_hard: [
    'Maths and Science feel natural to me, while Hindi essays and detailed history notes take more focused effort.',
  ],
  g68_q4_outside_time: [
    'I play district-level badminton twice a week, edit short videos for a school club, and read science magazines on weekends.',
  ],
  g68_q6_aptitude_cricket: [
    'The average is 42 runs per match because (30 + 45 + 51) divided by 3 equals 42.',
  ],
  g68_q7_aptitude_fest: [
    '300 students joined the fest because 50% of 600 equals 300.',
  ],
  g68_q8_aptitude_profit: [
    'The profit is Rs. 10, which is 25% of the Rs. 40 cost price.',
  ],
  g68_q9_aptitude_pattern: [
    '32 comes next because each number doubles: 2, 4, 8, 16, 32.',
  ],
  g68_q11_aptitude_art_science: [
    'They chose Art because skipping the Maths Club means they cannot be in Science.',
  ],
  g68_q12_aptitude_odd_word: [
    'Teacher is the odd one out because the others are skilled trades and crafts roles.',
  ],
  g68_q31_world_time: [
    'I would spend unlimited time learning robotics, building small machines, and visiting science museums with friends.',
  ],
  g910_q1_profile: ['Priya Nair, Grade 10, CBSE curriculum, based in Bengaluru, India.'],
  g910_q2_subjects: [
    'Physics, Chemistry, Mathematics, English, Computer Science, and Economics this year.',
  ],
  g910_q3_easy_hard: [
    'Physics and Computer Science feel easier, while Chemistry numericals and literature analysis need more revision time.',
  ],
  g910_q4_outside_academics: [
    'I captain the school debate team, volunteer at a local library on Saturdays, and maintain a coding blog.',
  ],
  g910_q26_motivator_1: [
    'Happiness can come from different paths, so fit matters more than prestige when choosing work environments.',
  ],
  g910_q27_motivator_2: [
    'I would choose the smaller organisation because interesting work keeps me motivated even when the brand is unknown.',
  ],
  g910_q28_motivator_ratings: [
    '1) Making a difference, 2) Creative freedom, 3) Financial security, 4) Recognition, 5) Stability over time.',
  ],
  g910_q30_favorite_subjects: [
    'Physics and Computer Science are my favourites because I enjoy problem-solving projects.',
  ],
  g910_q31_change_subject: [
    'I would swap my extra language slot for an additional lab-based science elective to explore engineering topics.',
  ],
  g910_q33_vision_10yr: [
    'In ten years I hope to be designing useful technology products while mentoring younger students.',
  ],
  g1112_q1_profile: [
    'Ananya Mehta, Grade 12, ISC board, currently studying in Mumbai, India.',
  ],
  g1112_q2_subjects: [
    'Physics, Chemistry, Mathematics, Economics, and English Literature in my current combination.',
  ],
  g1112_q3_grades_scores: [
    'I am averaging about 87% overall with Economics near 91%, English around 89%, and Maths close to 82%. I have not taken the SAT yet but I am preparing for the December exam window.',
    'My predicted scores are roughly 85% aggregate with stronger marks in humanities and steady improvement in Maths practice papers. I will share formal exam scores once they are released.',
  ],
  g1112_q4_easy_hard: [
    'Economics and English feel intuitive, while Calculus-based Physics problems require extra practice sessions each week.',
  ],
  g1112_q27_values_rank: [
    '1) Making an impact, 2) Creative freedom, 3) Financial security, 4) Recognition, 5) Stability and structure.',
  ],
  g1112_q29_career_failure: [
    'I would feel my career failed if I stopped learning, ignored ethical choices, or worked on problems that do not matter to me.',
  ],
  g1112_q30_extracurriculars: [
    'Debate captain for 2 years, weekend coding club mentor for 1 year, district science fair finalist last year, and volunteer tutor for middle school Maths.',
  ],
  g1112_q31_after_grade12: [
    'I am exploring economics and public policy programmes in India and Singapore, with a backup plan in business analytics.',
  ],
  g1112_q32_hidden_strengths: [
    'I stay calm during group crises, explain complex ideas clearly, and notice patterns in data that classmates often miss.',
  ],
  g1112_q34_key_differentiator: [
    'I combine analytical thinking with empathy: I build study systems for classmates and follow through even when projects get difficult.',
  ],
  g1112_q35_future_worry: [
    'I worry about choosing the right university fit without locking myself into a path too early, especially across countries and costs.',
  ],
};

const DEV_CHOICE_BY_ID: Record<string, string> = {
  g910_q16_num_1: 'B',
  g910_q17_num_2: 'C',
  g910_q18_num_3: 'C',
  g910_q19_log_1: 'B',
  g910_q20_log_2: 'A',
  g910_q21_log_3: 'D',
  g910_q22_log_4: 'A',
  g910_q23_verb_1: 'B',
  g910_q24_verb_2: 'B',
  g910_q25_verb_3: 'C',
  g1112_q5_num_1: '60',
  g1112_q6_num_2: '80',
  g1112_q7_num_3: '280',
  g1112_q8_num_4: '1003520',
  g1112_q9_log_1: '38',
  g1112_q10_log_2: 'Contractor',
  g1112_q11_log_3: 'B',
  g1112_q12_log_4: 'Economics',
  g1112_q13_verb_1: 'B',
  g1112_q14_verb_2: 'B',
  g1112_q15_verb_3: 'B',
  g1112_q16_verb_4: 'B',
  g1112_q28_work_env: 'B',
  g1112_q33_family_budget: '15_35l',
};

function isTextStep(step: DiagnosticStep): boolean {
  return step.type === 'ai-followup' || step.type === 'voice-note';
}

function devTextCandidate(step: DiagnosticStep, textIndex: number): string {
  const mapped = DEV_TEXT_BY_ID[step.id];
  if (mapped?.length) return mapped[textIndex % mapped.length];

  const title = step.title.toLowerCase();
  if (title.includes('grade') && title.includes('score')) {
    return DEV_TEXT_BY_ID.g1112_q3_grades_scores[textIndex % 2];
  }
  if (title.includes('profile') || title.includes('name, current grade')) {
    return `Rohan Kapoor, Grade 11, CBSE board, studying in Delhi, India. (${textIndex + 1})`;
  }
  if (title.includes('stream') || title.includes('subjects are you')) {
    return `Science with Physics, Chemistry, Mathematics, and English as my core subjects. (${textIndex + 1})`;
  }
  if (title.includes('easy') && title.includes('effort')) {
    return `Maths clicks quickly for me, while language-heavy essays and memorisation-heavy chapters need more time. (${textIndex + 1})`;
  }
  if (title.includes('outside') || title.includes('extracurricular')) {
    return `${DEV_TEXT_BY_ID.g1112_q30_extracurriculars[0]} (${textIndex + 1})`;
  }
  if (title.includes('rank') && title.includes('values')) {
    return `${DEV_TEXT_BY_ID.g1112_q27_values_rank[0]} (${textIndex + 1})`;
  }
  if (title.includes('failure') && title.includes('career')) {
    return `${DEV_TEXT_BY_ID.g1112_q29_career_failure[0]} (${textIndex + 1})`;
  }
  if (title.includes('after grade 12') || title.includes('universit')) {
    return `${DEV_TEXT_BY_ID.g1112_q31_after_grade12[0]} (${textIndex + 1})`;
  }
  if (title.includes('hidden') || title.includes('genuinely good')) {
    return `${DEV_TEXT_BY_ID.g1112_q32_hidden_strengths[0]} (${textIndex + 1})`;
  }
  if (title.includes('employer') || (title.includes('university') && title.includes('know'))) {
    return `${DEV_TEXT_BY_ID.g1112_q34_key_differentiator[0]} (${textIndex + 1})`;
  }
  if (title.includes('worried') || title.includes('confused')) {
    return `${DEV_TEXT_BY_ID.g1112_q35_future_worry[0]} (${textIndex + 1})`;
  }

  const topics = [
    'school projects',
    'team collaboration',
    'future university plans',
    'creative hobbies',
    'community volunteering',
    'science competitions',
    'leadership experiences',
    'personal growth goals',
  ];
  const topic = topics[textIndex % topics.length];
  return `Reflection ${textIndex + 1}: ${topic} has shaped how I learn, collaborate, and think about my next academic steps.`;
}

export function getValidDevTextAnswer(step: DiagnosticStep, textIndex: number): string {
  for (let offset = 0; offset < 10; offset += 1) {
    const candidate = devTextCandidate(step, textIndex + offset);
    if (!validateSingleTextAnswer(step, candidate)) {
      return candidate;
    }
  }
  return `Reflection ${textIndex + 1}: I enjoy learning through projects, clubs, and thoughtful conversations with teachers and friends.`;
}

export function getDevFillAnswer(
  step: DiagnosticStep,
  choiceIndex: number,
  textIndex: number,
): unknown {
  if (step.type === 'choice' || step.type === 'swipe') {
    const mapped = DEV_CHOICE_BY_ID[step.id];
    if (mapped) return mapped;
    const options = step.options ?? [];
    if (!options.length) return 'a';
    const idx = (choiceIndex * 2 + 1) % options.length;
    return options[idx].value;
  }

  if (step.type === 'multi-choice') {
    const options = step.options ?? [];
    const max = Math.min(step.maxSelections ?? 3, options.length);
    const count = Math.max(1, (textIndex % max) + 1);
    const start = textIndex % options.length;
    const rotated = [...options.slice(start), ...options.slice(0, start)];
    return rotated.slice(0, count).map((option) => option.value);
  }

  if (step.type === 'slider') {
    const min = step.min ?? 1;
    const max = step.max ?? 10;
    return min + ((textIndex * 3) % (max - min + 1));
  }

  if (isTextStep(step)) {
    return getValidDevTextAnswer(step, textIndex);
  }

  const mapped = DEV_CHOICE_BY_ID[step.id];
  if (mapped) return mapped;

  return getValidDevTextAnswer(step, textIndex);
}
