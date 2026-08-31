export type ClassGroupType = '6-8' | '9-10' | '11-12';

export type QuestionType =
  'single_choice' | 'multiple_choice' | 'text' | 'rating';

export type EvaluationCategory =
  | 'academic_strength'
  | 'academic_performance'
  | 'interest'
  | 'curiosity'
  | 'activity_preference'
  | 'aspiration'
  | 'work_friction'
  | 'future_aspiration'
  | 'career_interest'
  | 'diagnostic_goal'
  | 'college_degree'
  | 'target_universities'
  | 'university_priorities'
  | 'extracurricular_profile'
  | 'future_preparation';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface DiagnosticQuestion {
  questionId: string;
  section: string;
  questionText: string;
  helperText?: string;
  questionType: QuestionType;
  options?: QuestionOption[];
  applicableGrades: number[];
  applicableClassGroups: ClassGroupType[];
  required: boolean;
  order: number;
  evaluationCategory: EvaluationCategory;
}

export const DIAGNOSTIC_QUESTIONS_REGISTRY: DiagnosticQuestion[] = [
  // =========================================================================
  // GRADE 6–8 COMPREHENSIVE CAREER & APTITUDE DIAGNOSTIC QUESTIONNAIRE (32 Qs)
  // =========================================================================
  {
    questionId: 'g68_q1_profile',
    section: 'Academic Profile',
    questionText: 'Your current grade, section, and school board.',
    helperText: 'Example: Grade 8A, CBSE',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 1,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g68_q2_subjects',
    section: 'Academic Profile',
    questionText: 'Which subjects are you studying this year?',
    helperText: 'Example: English, Maths, Science, Social Studies, Arabic',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 2,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g68_q3_easy_hard',
    section: 'Academic Profile',
    questionText:
      'Which subjects feel genuinely easy for you and which take real effort?',
    helperText:
      'Be honest, this is not about what you like, it is about what comes naturally.',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 3,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g68_q4_outside_time',
    section: 'Outside the Classroom',
    questionText: 'Outside school, what do you spend time on?',
    helperText:
      'Sports, games, music, building things, reading, drawing, public speaking, social media, helping at home, anything counts.',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 4,
    evaluationCategory: 'activity_preference',
  },
  {
    questionId: 'g68_q5_family_opinions',
    section: 'Family & Context',
    questionText:
      'Do your parents or family have strong opinions about what you should study or become?',
    questionType: 'single_choice',
    options: [
      { value: 'yes_strongly', label: 'Yes, strongly' },
      {
        value: 'somewhat',
        label: 'Somewhat / They have opinions but I have some say',
      },
      { value: 'not_really', label: 'Not really / It is fully my choice' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 5,
    evaluationCategory: 'aspiration',
  },

  // Aptitude Tests
  {
    questionId: 'g68_q6_aptitude_cricket',
    section: 'Aptitude & Reasoning',
    questionText:
      'A cricket team scores 30, 45, and 51 runs in three matches. What is their average score per match?',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 6,
    evaluationCategory: 'academic_performance',
  },
  {
    questionId: 'g68_q7_aptitude_fest',
    section: 'Aptitude & Reasoning',
    questionText:
      'A school has 600 students. 50% of them joined the annual fest. How many students is that?',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 7,
    evaluationCategory: 'academic_performance',
  },
  {
    questionId: 'g68_q8_aptitude_profit',
    section: 'Aptitude & Reasoning',
    questionText:
      'A shopkeeper buys a notebook for Rs. 40 and sells it for Rs. 50. How much profit did he make? And what percentage of the cost price is that?',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 8,
    evaluationCategory: 'academic_performance',
  },
  {
    questionId: 'g68_q9_aptitude_pattern',
    section: 'Aptitude & Reasoning',
    questionText: 'What comes next in this pattern? 2, 4, 8, 16, ___',
    helperText: 'Hint: look at how each number relates to the one before it.',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 9,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g68_q10_aptitude_gold_star',
    section: 'Aptitude & Reasoning',
    questionText:
      'All students who finish their project on time get a gold star. Priya got a gold star. Which of the following is DEFINITELY true?',
    questionType: 'single_choice',
    options: [
      { value: 'option_a', label: 'A) Priya finished her project on time' },
      {
        value: 'option_b',
        label: 'B) Priya may or may not have finished on time',
      },
      { value: 'option_c', label: 'C) Only Priya got a gold star' },
      { value: 'option_d', label: 'D) Priya did not finish her project' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 10,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g68_q11_aptitude_art_science',
    section: 'Aptitude & Reasoning',
    questionText:
      'A student can choose Art or Science, not both. If they choose Science, they must also join the Maths Club. They did not join the Maths Club. What did they choose?',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 11,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g68_q12_aptitude_odd_word',
    section: 'Aptitude & Reasoning',
    questionText:
      'Which word does NOT belong? Carpenter, Plumber, Electrician, Teacher, Welder. Write your answer and your reason.',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 12,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g68_q13_aptitude_reading',
    section: 'Aptitude & Reasoning',
    questionText:
      'Read this and answer: "Students who help others, by tutoring classmates, organising events, or simply listening, often build skills that cannot be taught in a classroom. These include patience, communication, and the ability to understand different people." What is the main point of this passage?',
    questionType: 'single_choice',
    options: [
      { value: 'option_a', label: 'A) Classroom learning is not useful' },
      {
        value: 'option_b',
        label: 'B) Helping others builds important life skills',
      },
      { value: 'option_c', label: 'C) Only patient students can help others' },
      {
        value: 'option_d',
        label: 'D) Communication is the single most important skill',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 13,
    evaluationCategory: 'curiosity',
  },

  // Forced-Choice RIASEC Mapping Pairs (10 Pairs)
  {
    questionId: 'g68_q14_forced_1',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) Analyse a chart to spot patterns in data' },
      { value: 'B', label: 'B) Design a poster or visual campaign for school' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 14,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q15_forced_2',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Help a younger student who is struggling with a subject',
      },
      {
        value: 'B',
        label: 'B) Build a working model or app that solves a problem',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 15,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q16_forced_3',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Lead a group and pitch a new idea to an audience',
      },
      {
        value: 'B',
        label:
          'B) Research quietly and write a detailed, well researched report',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 16,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q17_forced_4',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Organise a school event with a clear schedule and budget',
      },
      {
        value: 'B',
        label: 'B) Write a story or create a piece of art for that event',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 17,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q18_forced_5',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Listen to a friend who is going through a tough time',
      },
      {
        value: 'B',
        label: 'B) Help settle a disagreement fairly between two classmates',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 18,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q19_forced_6',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Conduct a science experiment and record the findings',
      },
      {
        value: 'B',
        label: 'B) Build or repair something physical with your hands',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 19,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q20_forced_7',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Keep track of money and records for a class project',
      },
      {
        value: 'B',
        label: 'B) Be the one who makes the key decisions for the project',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 20,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q21_forced_8',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Teach something you understand well to a group',
      },
      {
        value: 'B',
        label: 'B) Figure out why something is not working and fix it',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 21,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q22_forced_9',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'A) Direct a short film or lead a creative project',
      },
      {
        value: 'B',
        label: 'B) Plan the schedule and manage the details of that project',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 22,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g68_q23_forced_10',
    section: 'Work Preference Mapping',
    questionText: 'Would you rather:',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) Start something brand new from scratch' },
      {
        value: 'B',
        label:
          'B) Join something that already exists and help make it work better',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 23,
    evaluationCategory: 'interest',
  },

  // Motivators, Working Style & Future Vision
  {
    questionId: 'g68_q24_group_unnoticed',
    section: 'Motivators & Values',
    questionText:
      'You worked really hard on a group project. Your whole group gets equal credit and nobody knows how much you personally contributed. Does that bother you?',
    questionType: 'single_choice',
    options: [
      { value: 'a_lot', label: 'A lot' },
      { value: 'a_little', label: 'A little' },
      { value: 'not_at_all', label: 'Not at all' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 24,
    evaluationCategory: 'work_friction',
  },
  {
    questionId: 'g68_q25_free_afternoon',
    section: 'Motivators & Values',
    questionText:
      'You have a free afternoon, no homework, no plans. You would most likely:',
    questionType: 'single_choice',
    options: [
      {
        value: 'take_apart',
        label: 'A) Take apart something to see how it works',
      },
      { value: 'create', label: 'B) Read, write, draw, or create something' },
      {
        value: 'organise',
        label: 'C) Organise an activity or game for your friends',
      },
      { value: 'help', label: 'D) Help someone at home or in your community' },
      {
        value: 'practise',
        label: 'E) Practise a skill you are already trying to learn',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 25,
    evaluationCategory: 'aspiration',
  },
  {
    questionId: 'g68_q26_instruction_preference',
    section: 'Working Style',
    questionText:
      'You are choosing between two after school activities: one where you are told exactly what to do and get really good at it, another where you figure things out yourself but might struggle sometimes. Which do you prefer?',
    questionType: 'single_choice',
    options: [
      { value: 'clear_instructions', label: 'Clear instructions' },
      { value: 'figure_it_myself', label: 'Figure it out myself' },
      { value: 'depends', label: 'Depends' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 26,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g68_q27_proud_work',
    section: 'Motivators & Values',
    questionText:
      'Your teacher asks: What kind of work would make you feel most proud?',
    questionType: 'single_choice',
    options: [
      {
        value: 'solved_problem',
        label: 'A) I solved a problem nobody else could figure out',
      },
      {
        value: 'helped_someone',
        label: 'B) I helped someone who really needed it',
      },
      {
        value: 'made_something',
        label: 'C) I made something people can actually see and use',
      },
      {
        value: 'led_group',
        label: 'D) I led a group to pull off something big together',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 27,
    evaluationCategory: 'aspiration',
  },
  {
    questionId: 'g68_q28_keep_studying',
    section: 'Future Aspiration',
    questionText:
      'Think about the subjects you enjoy most right now. Do you think you would want to keep studying those or are you still figuring things out?',
    questionType: 'single_choice',
    options: [
      { value: 'definitely_keep', label: 'Definitely keep them' },
      { value: 'still_exploring', label: 'Still exploring' },
      { value: 'not_sure_yet', label: 'Not sure yet' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 28,
    evaluationCategory: 'future_aspiration',
  },
  {
    questionId: 'g68_q29_grown_up_exciting',
    section: 'Future Aspiration',
    questionText:
      'When you imagine yourself grown up and working, which feels most exciting to you? Pick the closest one.',
    questionType: 'single_choice',
    options: [
      {
        value: 'numbers_tech',
        label: 'A) Working with numbers, data, or technology to solve problems',
      },
      {
        value: 'people_leading',
        label: 'B) Working with people, helping, teaching, or leading them',
      },
      {
        value: 'creating_art',
        label: 'C) Creating things, art, writing, designs, or inventions',
      },
      {
        value: 'managing_organising',
        label:
          'D) Organising or managing things, making sure everything runs smoothly',
      },
      {
        value: 'discovering_science',
        label:
          'E) Discovering things, researching, experimenting, or investigating',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 29,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g68_q30_learner_type',
    section: 'Working Style',
    questionText: 'What kind of learner are you? I learn best when I…',
    questionType: 'single_choice',
    options: [
      {
        value: 'watch_first',
        label: 'A) Watch or read something first, then try it myself',
      },
      {
        value: 'jump_in',
        label: 'B) Jump in and try it myself, even if I make mistakes',
      },
      {
        value: 'discuss_ask',
        label: 'C) Discuss it with someone and ask lots of questions',
      },
      {
        value: 'step_by_step_quiet',
        label: 'D) Figure it out step by step on my own, quietly',
      },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 30,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g68_q31_world_time',
    section: 'Future Aspiration',
    questionText:
      'Is there something you would love to learn more about, inside or outside school, if you had all the time in the world? Share anything: a topic, a skill, something you saw online, anything that excites you.',
    questionType: 'text',
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 31,
    evaluationCategory: 'future_aspiration',
  },
  {
    questionId: 'g68_q32_parents_decided',
    section: 'Family & Context',
    questionText:
      'Is there anything your parents have already decided about your future studies or career?',
    questionType: 'single_choice',
    options: [
      { value: 'yes_strongly', label: 'Yes, strongly' },
      {
        value: 'have_opinions',
        label: 'They have opinions but I have some say',
      },
      { value: 'no_my_choice', label: 'No, it is my choice' },
    ],
    applicableGrades: [6, 7, 8],
    applicableClassGroups: ['6-8'],
    required: true,
    order: 32,
    evaluationCategory: 'aspiration',
  },

  // =========================================================================
  // GRADE 9–10 CAREER & STREAM DISCOVERY QUESTIONNAIRE (34 Qs)
  // =========================================================================
  {
    questionId: 'g910_q1_profile',
    section: 'Academic Profile',
    questionText: 'Your name, current grade, school board, and country',
    helperText:
      'e.g. "Aanya, Grade 10th, IB, India" or "Rohan, Grade 9, CBSE, UAE"',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 1,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q2_subjects',
    section: 'Academic Profile',
    questionText:
      'What stream or subjects are you currently studying? (or: what stream did you choose / are you leaning toward)',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 2,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q3_easy_hard',
    section: 'Academic Profile',
    questionText:
      'Which subjects feel genuinely easy — and which require real effort?',
    helperText:
      'Be honest, this helps us understand natural strengths versus effort.',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 3,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q4_outside_academics',
    section: 'Outside the Classroom',
    questionText: 'What do you do outside academics?',
    helperText:
      'Activities, hobbies, side projects, sports, creative work, anything counts.',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 4,
    evaluationCategory: 'activity_preference',
  },
  // RIASEC Interest Mapping Forced Choice Pairs (10 Qs)
  {
    questionId: 'g910_q5_forced_1',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText:
      'Pick the ONE option that appeals to you MORE. Go with your gut.',
    questionType: 'single_choice',
    options: [
      {
        value: 'analyse_data',
        label: 'Analyse data to find patterns in a business problem',
      },
      {
        value: 'design_campaign',
        label: 'Design a visual campaign to launch that same business',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 5,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q6_forced_2',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'mentor_student',
        label: 'Mentor a younger student through a difficult subject',
      },
      {
        value: 'build_app',
        label: 'Build a working app or tool that solves a problem',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 6,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q7_forced_3',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'lead_pitch',
        label: 'Lead a team and pitch a new idea to an audience',
      },
      {
        value: 'research_report',
        label: 'Quietly research and write a detailed report on that idea',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 7,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q8_forced_4',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'organise_event',
        label: 'Organise a large school event with a clear schedule and budget',
      },
      {
        value: 'write_creative',
        label: 'Write a short story or produce a creative piece for that event',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 8,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q9_forced_5',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'counsel_peer',
        label: 'Counsel a peer who is going through a tough time',
      },
      {
        value: 'negotiate_deal',
        label: 'Negotiate a deal between two parties who disagree',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 9,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q10_forced_6',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'conduct_experiment',
        label: 'Conduct a scientific experiment and document the findings',
      },
      {
        value: 'repair_build',
        label: 'Repair or build something physical with your hands',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 10,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q11_forced_7',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'manage_finances',
        label: 'Manage the finances and records of a project',
      },
      {
        value: 'lead_project',
        label: 'Lead the project and make the key decisions',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 11,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q12_forced_8',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'teach_group',
        label: 'Teach a concept you understand well to a group',
      },
      {
        value: 'fix_issue',
        label: "Investigate why something isn't working and fix it",
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 12,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q13_forced_9',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'direct_film',
        label: 'Direct a short film or produce a creative project',
      },
      {
        value: 'plan_logistics',
        label: 'Plan and execute the logistics for that same project',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 13,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q14_forced_10',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'start_business',
        label: 'Start a small business or social initiative from scratch',
      },
      {
        value: 'join_organisation',
        label: 'Join an existing organisation and improve how it runs',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 14,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q15_family_views',
    section: 'Family & Context',
    questionText:
      'Do your parents have strong views on your stream or career direction?',
    questionType: 'single_choice',
    options: [
      { value: 'yes_decided', label: 'Yes, decided / clear expectation' },
      {
        value: 'have_preferences',
        label: 'They have preferences, but I have some say',
      },
      { value: 'mostly_my_choice', label: 'Mostly my choice' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 15,
    evaluationCategory: 'aspiration',
  },
  // Numerical Aptitude (3 Qs)
  {
    questionId: 'g910_q16_num_1',
    section: 'Numerical Aptitude',
    questionText:
      'A coaching institute has 600 students. 45% are in the Science batch. Of those, 1 in 3 is aiming for IIT. How many students are aiming for IIT?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) 75' },
      { value: 'B', label: 'B) 90' },
      { value: 'C', label: 'C) 110' },
      { value: 'D', label: 'D) 135' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 16,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q17_num_2',
    section: 'Numerical Aptitude',
    questionText:
      'A student scores 72, 68, 80, and 76 in four subjects. What score in the fifth subject gives an average of 75?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) 74' },
      { value: 'B', label: 'B) 77' },
      { value: 'C', label: 'C) 79' },
      { value: 'D', label: 'D) 82' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 17,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q18_num_3',
    section: 'Numerical Aptitude',
    questionText:
      'A skill course costs ₹12,000. It increases in price by 10% every year. What will it cost in 2 years?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) ₹13,200' },
      { value: 'B', label: 'B) ₹14,400' },
      { value: 'C', label: 'C) ₹14,520' },
      { value: 'D', label: 'D) ₹15,000' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 18,
    evaluationCategory: 'academic_strength',
  },
  // Logical & Verbal Aptitude (7 Qs)
  {
    questionId: 'g910_q19_log_1',
    section: 'Logical Reasoning',
    questionText:
      'In a group of 5 friends, one person always tells the truth and one always lies. The others sometimes do both. Arjun says "I never lie." What can you conclude?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) Arjun is definitely the truth-teller' },
      { value: 'B', label: 'B) Arjun cannot be the habitual liar' },
      {
        value: 'C',
        label:
          'C) Arjun could be the truth-teller, the liar, or a flexible speaker',
      },
      { value: 'D', label: 'D) Arjun is definitely lying' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 19,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g910_q20_log_2',
    section: 'Logical Reasoning',
    questionText:
      'Find the missing numbers in the series: (1, 4, 9, 16, 25, __) and (3, 4, 6, 9, 13, __)',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) 36 and 18' },
      { value: 'B', label: 'B) 36 and 17' },
      { value: 'C', label: 'C) 30 and 18' },
      { value: 'D', label: 'D) 32 and 19' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 20,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g910_q21_log_3',
    section: 'Logical Reasoning',
    questionText:
      'Read this carefully: "All students who score above 90 are eligible for the scholarship. Some students who are eligible for the scholarship also play a sport. No student who plays a sport has failed a subject." Which of the following must be true?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) All scholarship students play a sport' },
      {
        value: 'B',
        label:
          'B) A student who scored above 90 has not failed a subject (cannot be confirmed)',
      },
      { value: 'C', label: 'C) No student who plays a sport scored below 90' },
      {
        value: 'D',
        label:
          'D) Some high scorers may also play a sport and have not failed a subject',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 21,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g910_q22_log_4',
    section: 'Logical Reasoning',
    questionText:
      'Five friends — Aman, Bina, Charu, Dev, and Esha — each prefer a different subject: Maths, Science, History, Art, and Commerce. Clues: Aman does not like Maths or Science. Bina likes the subject that comes first alphabetically among her options. Charu and Dev both avoid Arts. Dev likes Science. Esha does not like History. Who prefers Art?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) Aman' },
      { value: 'B', label: 'B) Bina' },
      { value: 'C', label: 'C) Esha' },
      { value: 'D', label: 'D) Charu' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 22,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g910_q23_verb_1',
    section: 'Verbal Comprehension',
    questionText:
      'Read this passage: "Specialisation has made modern economies extraordinarily productive — a surgeon, a software engineer, and a supply chain manager each do one thing deeply well. But there is a growing argument that young people are pushed toward specialisation too early, before they have had the chance to discover what they are actually good at or interested in. The cost of getting that choice wrong is higher than it has ever been." What tension is the author identifying?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) Specialists earn more than generalists' },
      {
        value: 'B',
        label:
          'B) Early specialisation conflicts with the need for self-discovery',
      },
      {
        value: 'C',
        label: 'C) Modern economies demand too many different skills',
      },
      {
        value: 'D',
        label: 'D) Young people are not talented enough to specialise early',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 23,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g910_q24_verb_2',
    section: 'Verbal Comprehension',
    questionText:
      'Rearrange these sentences into a coherent paragraph:\n1. This is especially true when that feedback comes from someone whose opinion we respect.\n2. Most people find it genuinely difficult to hear that their work needs improvement.\n3. Learning to separate the feedback from your sense of self-worth is one of the harder — and more valuable — things to practise.\n4. The discomfort is not a sign of weakness; it is a normal response to perceived judgment.',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) 2 -> 1 -> 4 -> 3' },
      { value: 'B', label: 'B) 2 -> 4 -> 1 -> 3' },
      { value: 'C', label: 'C) 1 -> 2 -> 3 -> 4' },
      { value: 'D', label: 'D) 3 -> 2 -> 4 -> 1' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 24,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g910_q25_verb_3',
    section: 'Verbal Comprehension',
    questionText:
      'Which word is the odd one out, and why? Fluent · Articulate · Eloquent · Verbose · Persuasive (Hint: four are positive descriptions of communication; one carries a different implication).',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A) Fluent' },
      { value: 'B', label: 'B) Articulate' },
      { value: 'C', label: 'C) Verbose (uses too many words unnecessarily)' },
      { value: 'D', label: 'D) Persuasive' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 25,
    evaluationCategory: 'interest',
  },
  // Values and Motivators (4 Qs)
  {
    questionId: 'g910_q26_motivator_1',
    section: 'Values & Motivators',
    questionText:
      'Two equally talented people graduate together. One takes a government job — predictable, secure, slower growth. The other joins a startup — uncertain, demanding, potentially high reward. Five years later both are happy. What does this tell you?',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 26,
    evaluationCategory: 'work_friction',
  },
  {
    questionId: 'g910_q27_motivator_2',
    section: 'Values & Motivators',
    questionText:
      "You've been offered two internships. One is at a well-known company doing work you find slightly boring. The other is at a small unknown organisation doing work you find genuinely interesting. Which do you choose, and why?",
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 27,
    evaluationCategory: 'work_friction',
  },
  {
    questionId: 'g910_q28_motivator_ratings',
    section: 'Values & Motivators',
    questionText:
      'Rank / rate what matters most to you in future work (Financial security, Creative freedom, Making a difference, Being recognised as excellent, Having control over time):',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 28,
    evaluationCategory: 'work_friction',
  },
  {
    questionId: 'g910_q29_career_friction',
    section: 'Values & Motivators',
    questionText:
      'Which of these would make you feel your career was going wrong, even if you were earning well?',
    questionType: 'single_choice',
    options: [
      {
        value: 'same_thing_everyday',
        label: 'Doing the same thing every day with no new challenges',
      },
      {
        value: 'working_alone',
        label: 'Working alone with little human connection',
      },
      {
        value: 'work_doesnt_matter',
        label: "Feeling like your work doesn't matter to anyone",
      },
      {
        value: 'no_say_in_time',
        label: 'Having no say in how you spend your time',
      },
      {
        value: 'seen_as_ordinary',
        label: 'Being seen as ordinary or average at what you do',
      },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 29,
    evaluationCategory: 'work_friction',
  },
  // Stream & Future Direction (5 Qs)
  {
    questionId: 'g910_q30_favorite_subjects',
    section: 'Stream & Subject Direction',
    questionText: 'Which Subjects are your favorites to study?',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 30,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q31_change_subject',
    section: 'Stream & Subject Direction',
    questionText:
      'If you could change one of your current subject combinations, what would it be?',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: false,
    order: 31,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g910_q32_stream_pull',
    section: 'Stream & Subject Direction',
    questionText:
      'Of the three streams — Science, Commerce, Arts — which one do you currently feel pulled toward, even slightly?',
    questionType: 'single_choice',
    options: [
      { value: 'science', label: 'Science (PCM / PCB)' },
      { value: 'commerce', label: 'Commerce' },
      { value: 'arts', label: 'Arts / Humanities' },
      { value: 'no_idea', label: 'No idea yet' },
      { value: 'keep_open', label: 'I want to keep all options open' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 32,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g910_q33_vision_10yr',
    section: 'Stream & Subject Direction',
    questionText:
      "When you imagine yourself at work in 10 years, what's one thing that's definitely true about that picture?",
    helperText: 'One sentence vision.',
    questionType: 'text',
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 33,
    evaluationCategory: 'future_aspiration',
  },
  {
    questionId: 'g910_q34_family_decided',
    section: 'Stream & Subject Direction',
    questionText:
      "Is there anything your family has already decided about your future that you haven't been fully asked about?",
    questionType: 'single_choice',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'somewhat', label: 'Somewhat' },
      { value: 'no', label: 'No' },
    ],
    applicableGrades: [9, 10],
    applicableClassGroups: ['9-10'],
    required: true,
    order: 34,
    evaluationCategory: 'aspiration',
  },

  // =========================================================================
  // GRADE 11–12 CAREER, COLLEGE & DEGREE DIRECTION QUESTIONNAIRE (35 Qs)
  // =========================================================================
  {
    questionId: 'g1112_q1_profile',
    section: 'Academic Profile',
    questionText: 'Your name, current grade, school board, and country',
    helperText:
      'e.g. "Aanya, Grade 11, IB, India" or "Rohan, Grade 12, CBSE, UAE"',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 1,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g1112_q2_subjects',
    section: 'Academic Profile',
    questionText: 'What stream or subjects are you currently studying?',
    helperText:
      'e.g. "Science with Biology and Maths" or "Commerce with Economics and Accounts" or "IB HL: Physics, Maths, Economics"',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 2,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g1112_q3_grades_scores',
    section: 'Academic Profile',
    questionText:
      'What are your current grades or predicted scores? Any standardised test scores?',
    helperText:
      'Approximate is fine. e.g. "85% overall, strong in Eco and English, average in Maths" or "Predicted 36 IB, SAT 1280 not taken yet"',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 3,
    evaluationCategory: 'academic_performance',
  },
  {
    questionId: 'g1112_q4_easy_hard',
    section: 'Academic Profile',
    questionText:
      'Which subjects do you find genuinely easy — and which require real effort?',
    helperText:
      "Be honest. This helps us understand your natural strengths vs. where you're working hard.",
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 4,
    evaluationCategory: 'academic_strength',
  },
  // Numerical Aptitude (4 Qs)
  {
    questionId: 'g1112_q5_num_1',
    section: 'Numerical Aptitude',
    questionText:
      'A school has 500 students. 40% are in the Science stream. Of those, 30% plan to apply abroad. How many Science students plan to apply abroad?',
    questionType: 'single_choice',
    options: [
      { value: '50', label: '50' },
      { value: '60', label: '60' },
      { value: '80', label: '80' },
      { value: '120', label: '120' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 5,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g1112_q6_num_2',
    section: 'Numerical Aptitude',
    questionText:
      'If a student scores 68, 74, 80, and 78 in four subjects, what score do they need in the fifth subject to average 76?',
    questionType: 'single_choice',
    options: [
      { value: '76', label: '76' },
      { value: '78', label: '78' },
      { value: '80', label: '80' },
      { value: '82', label: '82' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 6,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g1112_q7_num_3',
    section: 'Numerical Aptitude',
    questionText:
      'A university accepts 8% of applicants. If 3,500 students apply, approximately how many get accepted?',
    questionType: 'single_choice',
    options: [
      { value: '240', label: '240' },
      { value: '280', label: '280' },
      { value: '320', label: '320' },
      { value: '350', label: '350' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 7,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g1112_q8_num_4',
    section: 'Numerical Aptitude',
    questionText:
      'Fees increase by 12% each year. If a course costs ₹8,00,000 today, what will it cost in 2 years?',
    questionType: 'single_choice',
    options: [
      { value: '896000', label: '₹8,96,000' },
      { value: '960000', label: '₹9,60,000' },
      { value: '1003520', label: '₹10,03,520' },
      { value: '1024000', label: '₹10,24,000' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 8,
    evaluationCategory: 'academic_strength',
  },
  // Logical & Verbal Aptitude (8 Qs)
  {
    questionId: 'g1112_q9_log_1',
    section: 'Logical Reasoning',
    questionText: 'What comes next in this series? 3, 6, 11, 18, 27, ?',
    questionType: 'single_choice',
    options: [
      { value: '36', label: '36' },
      { value: '38', label: '38' },
      { value: '39', label: '39' },
      { value: '40', label: '40' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 9,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g1112_q10_log_2',
    section: 'Logical Reasoning',
    questionText:
      'Which word does NOT belong? Architect · Engineer · Surgeon · Contractor · Lawyer',
    questionType: 'single_choice',
    options: [
      { value: 'Architect', label: 'Architect' },
      { value: 'Surgeon', label: 'Surgeon' },
      { value: 'Lawyer', label: 'Lawyer' },
      { value: 'Contractor', label: 'Contractor' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 10,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g1112_q11_log_3',
    section: 'Logical Reasoning',
    questionText:
      'All students who study abroad speak English. Priya speaks English. Which of the following is definitely true?',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'Priya studies abroad' },
      { value: 'B', label: 'Priya may or may not study abroad' },
      { value: 'C', label: 'All English speakers study abroad' },
      { value: 'D', label: 'Priya does not study abroad' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 11,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g1112_q12_log_4',
    section: 'Logical Reasoning',
    questionText:
      'A student can take either Economics or Psychology — not both. If they take Psychology, they must take Sociology. They chose not to take Sociology. What did they take?',
    questionType: 'single_choice',
    options: [
      { value: 'Psychology', label: 'Psychology' },
      { value: 'Economics', label: 'Economics' },
      { value: 'Both', label: 'Both' },
      { value: 'Neither', label: 'Neither' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 12,
    evaluationCategory: 'curiosity',
  },
  {
    questionId: 'g1112_q13_verb_1',
    section: 'Verbal Comprehension',
    questionText:
      'Read this and answer: "Universities increasingly value students who have pursued independent projects outside the classroom. While grades remain important, admissions officers are looking for evidence that students take initiative, pursue genuine curiosity, and contribute meaningfully to their communities." Which of the following can be inferred from this passage?',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label: 'Grades no longer matter for university admissions',
      },
      {
        value: 'B',
        label:
          'A student with good grades and no ECs may be less competitive than one with both',
      },
      {
        value: 'C',
        label: 'Community service is the most important extracurricular',
      },
      { value: 'D', label: 'Independent projects guarantee admission' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 13,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g1112_q14_verb_2',
    section: 'Verbal Comprehension',
    questionText:
      'Read this: "The most successful career paths are rarely linear. Many professionals report that the skills developed in seemingly unrelated roles contributed significantly to their eventual expertise." What does this passage suggest about career planning?',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label:
          'You should plan a specific career path from age 16 and stick to it',
      },
      {
        value: 'B',
        label:
          'Diverse experiences can build valuable skills even if they seem unrelated',
      },
      { value: 'C', label: 'Linear careers lead to the most success' },
      { value: 'D', label: 'Career planning is not worth doing' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 14,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g1112_q15_verb_3',
    section: 'Verbal Comprehension',
    questionText: 'Which sentence uses the word "ambiguous" correctly?',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label:
          'The instructions were ambiguous — nobody could agree on what they meant',
      },
      {
        value: 'B',
        label: 'She gave an ambiguous answer, which was very clear and direct',
      },
      {
        value: 'C',
        label: 'The ambiguous result showed exactly what we expected',
      },
      {
        value: 'D',
        label: 'His ambiguous performance was the best in the class',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 15,
    evaluationCategory: 'interest',
  },
  {
    questionId: 'g1112_q16_verb_4',
    section: 'Verbal Comprehension',
    questionText:
      'Rearrange these sentences into a logical paragraph: (1) This makes the decision feel overwhelming. (2) Most students narrow it down by talking to people already in those fields. (3) Grade 11 students often face dozens of possible career paths. (4) Without real information, choosing feels like guessing.',
    questionType: 'single_choice',
    options: [
      { value: '3-1-4-2', label: '3, 1, 4, 2' },
      { value: '1-3-2-4', label: '1, 3, 2, 4' },
      { value: '3-4-1-2', label: '3, 4, 1, 2' },
      { value: '2-3-1-4', label: '2, 3, 1, 4' },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 16,
    evaluationCategory: 'interest',
  },
  // RIASEC Interest Mapping Forced Choice Pairs (10 Qs)
  {
    questionId: 'g1112_q17_forced_1',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText:
      'Pick the ONE option that appeals to you MORE. Go with your gut.',
    questionType: 'single_choice',
    options: [
      {
        value: 'analyse_data',
        label: 'Analyse data to find patterns in a business problem',
      },
      {
        value: 'design_campaign',
        label: 'Design a visual campaign to launch that same business',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 17,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q18_forced_2',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'mentor_student',
        label: 'Mentor a younger student through a difficult subject',
      },
      {
        value: 'build_app',
        label: 'Build a working app or tool that solves a problem',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 18,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q19_forced_3',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'lead_pitch',
        label: 'Lead a team and pitch a new idea to an audience',
      },
      {
        value: 'research_report',
        label: 'Quietly research and write a detailed report on that idea',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 19,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q20_forced_4',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'organise_event',
        label: 'Organise a large school event with a clear schedule and budget',
      },
      {
        value: 'write_creative',
        label: 'Write a short story or produce a creative piece for that event',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 20,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q21_forced_5',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'counsel_peer',
        label: 'Counsel a peer who is going through a tough time',
      },
      {
        value: 'negotiate_deal',
        label: 'Negotiate a deal between two parties who disagree',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 21,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q22_forced_6',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'conduct_experiment',
        label: 'Conduct a scientific experiment and document the findings',
      },
      {
        value: 'repair_build',
        label: 'Repair or build something physical with your hands',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 22,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q23_forced_7',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'manage_finances',
        label: 'Manage the finances and records of a project',
      },
      {
        value: 'lead_project',
        label: 'Lead the project and make the key decisions',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 23,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q24_forced_8',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'teach_group',
        label: 'Teach a concept you understand well to a group',
      },
      {
        value: 'fix_issue',
        label: "Investigate why something isn't working and fix it",
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 24,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q25_forced_9',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'direct_film',
        label: 'Direct a short film or produce a creative project',
      },
      {
        value: 'plan_logistics',
        label: 'Plan and execute the logistics for that same project',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 25,
    evaluationCategory: 'career_interest',
  },
  {
    questionId: 'g1112_q26_forced_10',
    section: 'Interest Mapping',
    questionText: 'Would you rather:',
    helperText: 'Pick the ONE option that appeals to you MORE.',
    questionType: 'single_choice',
    options: [
      {
        value: 'start_business',
        label: 'Start a small business or social initiative from scratch',
      },
      {
        value: 'join_organisation',
        label: 'Join an existing organisation and improve how it runs',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 26,
    evaluationCategory: 'career_interest',
  },
  // Values, Work Environment & Motivators (3 Qs)
  {
    questionId: 'g1112_q27_values_rank',
    section: 'Values & Motivators',
    questionText:
      'Rank these career values from most to least important to you (1 = most important):',
    helperText:
      'Financial security (earning well consistently), Making an impact (work that matters beyond yourself), Creative freedom (expressing your own ideas), Recognition (being respected and known in your field), Stability (clear structure, predictable path)',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 27,
    evaluationCategory: 'work_friction',
  },
  {
    questionId: 'g1112_q28_work_env',
    section: 'Values & Motivators',
    questionText: 'Which work environment sounds most like you in 10 years?',
    questionType: 'single_choice',
    options: [
      {
        value: 'A',
        label:
          'A · Working independently on complex problems — research, analysis, writing',
      },
      {
        value: 'B',
        label:
          'B · Leading people and building something — team, startup, organisation',
      },
      {
        value: 'C',
        label:
          'C · Helping people directly — teaching, counselling, medicine, social work',
      },
      {
        value: 'D',
        label: 'D · Creating things — design, media, writing, performance',
      },
      {
        value: 'E',
        label:
          'E · Solving technical or physical problems — engineering, architecture, computing',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 28,
    evaluationCategory: 'work_friction',
  },
  {
    questionId: 'g1112_q29_career_failure',
    section: 'Values & Motivators',
    questionText:
      'What would make you feel like your career was a failure, even if you were earning well?',
    helperText: 'This is the most revealing values question. Answer honestly.',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 29,
    evaluationCategory: 'work_friction',
  },
  // Extracurriculars & Future Directions (6 Qs)
  {
    questionId: 'g1112_q30_extracurriculars',
    section: 'Extracurricular & College Direction',
    questionText:
      'What do you do outside of academics? List everything with how long you have been doing it.',
    helperText:
      'Clubs, sports, volunteering, jobs, competitions, self-taught skills, passion projects. e.g. "debate captain for 2 years".',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 30,
    evaluationCategory: 'extracurricular_profile',
  },
  {
    questionId: 'g1112_q31_after_grade12',
    section: 'Extracurricular & College Direction',
    questionText:
      'What are you considering after Grade 12 — fields, types of universities, countries?',
    helperText:
      'Even rough ideas count. e.g. "Somewhere in business or law, probably abroad but not sure where".',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 31,
    evaluationCategory: 'college_degree',
  },
  {
    questionId: 'g1112_q32_hidden_strengths',
    section: 'Extracurricular & College Direction',
    questionText:
      "What do you think you're genuinely good at that your grades or school record don't show?",
    helperText:
      'Hidden strengths — things you notice about yourself that teachers or report cards miss.',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 32,
    evaluationCategory: 'academic_strength',
  },
  {
    questionId: 'g1112_q33_family_budget',
    section: 'Extracurricular & College Direction',
    questionText:
      "What's your approximate annual family budget for university including living costs?",
    questionType: 'single_choice',
    options: [
      { value: 'under_15l', label: 'Under ₹15L / $18K per year' },
      { value: '15_35l', label: '₹15–35L / $18–42K per year' },
      { value: '35_65l', label: '₹35–65L / $42–80K per year' },
      { value: 'no_limit', label: 'No hard limit' },
      {
        value: 'need_scholarship',
        label: 'Need significant scholarship to make it work',
      },
    ],
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 33,
    evaluationCategory: 'target_universities',
  },
  {
    questionId: 'g1112_q34_key_differentiator',
    section: 'Extracurricular & College Direction',
    questionText:
      "What's the one thing you want a university or future employer to know about you that won't show up in your grades or CV?",
    helperText:
      'Take your time. This is the most important question in the whole assessment.',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 34,
    evaluationCategory: 'future_aspiration',
  },
  {
    questionId: 'g1112_q35_future_worry',
    section: 'Extracurricular & College Direction',
    questionText:
      "What's the one thing you're most confused or worried about regarding your future right now?",
    helperText:
      'No wrong answers. The more honest, the more useful your report will be.',
    questionType: 'text',
    applicableGrades: [11, 12],
    applicableClassGroups: ['11-12'],
    required: true,
    order: 35,
    evaluationCategory: 'future_aspiration',
  },
];
