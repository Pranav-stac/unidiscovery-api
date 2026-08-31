const ActivityType = {
  COMPETITION: 'COMPETITION',
  INTERNSHIP: 'INTERNSHIP',
  SUMMER_PROGRAM: 'SUMMER_PROGRAM',
  PROJECT: 'PROJECT',
  VOLUNTEER: 'VOLUNTEER',
  OTHER: 'OTHER',
} as const;

const TutoringTestType = {
  SAT: 'SAT',
  ACT: 'ACT',
  IELTS: 'IELTS',
} as const;

export const collegesSeed = [
  {
    name: 'Indian Institute of Technology Bombay',
    country: 'India',
    city: 'Mumbai',
    degree: 'B.Tech',
    field: 'Engineering & Technology',
    description:
      'Premier engineering institute known for computer science, mechanical, and electrical programs with strong industry placement.',
    metadata: {
      fields: ['technology', 'engineering', 'science', 'math'],
      avgGrade: 90,
      tags: ['STEM', 'Research'],
    },
  },
  {
    name: 'University of Oxford',
    country: 'United Kingdom',
    city: 'Oxford',
    degree: 'BA',
    field: 'Liberal Arts & Sciences',
    description:
      'World-leading university offering flexible courses across humanities, sciences, and social sciences.',
    metadata: {
      fields: ['humanities', 'science', 'history', 'english'],
      avgGrade: 95,
      tags: ['Global', 'Research'],
    },
  },
  {
    name: 'Massachusetts Institute of Technology',
    country: 'United States',
    city: 'Cambridge',
    degree: 'BS',
    field: 'Engineering & Innovation',
    description:
      'Top global institution for engineering, AI, robotics, and entrepreneurship with a maker culture.',
    metadata: {
      fields: ['technology', 'engineering', 'cs', 'math'],
      avgGrade: 96,
      tags: ['STEM', 'Innovation'],
    },
  },
  {
    name: 'National University of Singapore',
    country: 'Singapore',
    city: 'Singapore',
    degree: 'Bachelor',
    field: 'Business & Technology',
    description:
      'Leading Asian university blending business, computing, and design with strong Asia-Pacific networks.',
    metadata: {
      fields: ['business', 'technology', 'design', 'science'],
      avgGrade: 92,
      tags: ['Asia', 'Business'],
    },
  },
  {
    name: 'University of Toronto',
    country: 'Canada',
    city: 'Toronto',
    degree: 'Bachelor',
    field: 'Computer Science & Health Sciences',
    description:
      'Strong programs in CS, life sciences, and interdisciplinary research with co-op opportunities.',
    metadata: {
      fields: ['cs', 'science', 'health', 'math'],
      avgGrade: 88,
      tags: ['Co-op', 'Research'],
    },
  },
  {
    name: 'Ashoka University',
    country: 'India',
    city: 'Sonipat',
    degree: 'BA/BSc',
    field: 'Liberal Arts',
    description:
      'Interdisciplinary liberal arts university emphasizing critical thinking, leadership, and social impact.',
    metadata: {
      fields: ['humanities', 'social', 'economics', 'arts'],
      avgGrade: 85,
      tags: ['Liberal Arts', 'Leadership'],
    },
  },
  {
    name: 'Stanford University',
    country: 'United States',
    city: 'Stanford',
    degree: 'BS',
    field: 'Technology & Entrepreneurship',
    description:
      'Silicon Valley hub for computer science, design, and startup ecosystems.',
    metadata: {
      fields: ['technology', 'business', 'design', 'engineering'],
      avgGrade: 97,
      tags: ['Startup', 'STEM'],
    },
  },
  {
    name: 'University of Melbourne',
    country: 'Australia',
    city: 'Melbourne',
    degree: 'Bachelor',
    field: 'Health & Biomedical Sciences',
    description:
      'Highly ranked for medicine, biomedical research, and international student experience.',
    metadata: {
      fields: ['health', 'science', 'biology', 'research'],
      avgGrade: 87,
      tags: ['Health', 'Global'],
    },
  },
  {
    name: 'Delhi University',
    country: 'India',
    city: 'New Delhi',
    degree: 'BA/BSc',
    field: 'Arts, Commerce & Sciences',
    description:
      'Large public university with accessible programs across commerce, arts, and sciences.',
    metadata: {
      fields: ['commerce', 'arts', 'history', 'economics'],
      avgGrade: 75,
      tags: ['Accessible', 'Public'],
    },
  },
  {
    name: 'ETH Zurich',
    country: 'Switzerland',
    city: 'Zurich',
    degree: 'BSc',
    field: 'Engineering & Natural Sciences',
    description:
      'European leader in engineering, physics, and computational sciences with research excellence.',
    metadata: {
      fields: ['engineering', 'science', 'math', 'physics'],
      avgGrade: 94,
      tags: ['STEM', 'Europe'],
    },
  },
];

export const activitiesSeed = [
  {
    title: 'International Science Olympiad (ISO)',
    type: ActivityType.COMPETITION,
    description:
      'Global science competition for high school students excelling in physics, chemistry, and biology.',
    gradeMin: 9,
    gradeMax: 12,
    interests: ['science', 'math', 'research'],
    url: 'https://www.imo-official.org/',
    metadata: { deadline: 'Varies by country', duration: '6 months prep' },
  },
  {
    title: 'Google Computer Science Summer Institute (CSSI)',
    type: ActivityType.SUMMER_PROGRAM,
    description:
      'Introductory computer science program for graduating high school seniors from underrepresented groups.',
    gradeMin: 12,
    gradeMax: 12,
    interests: ['technology', 'cs', 'programming'],
    url: 'https://buildyourfuture.withgoogle.com/programs/computer-science-summer-institute',
    metadata: { deadline: 'March', duration: '4 weeks' },
  },
  {
    title: 'Young Entrepreneurs Academy Internship',
    type: ActivityType.INTERNSHIP,
    description:
      'Hands-on startup internship helping students build business plans and pitch to investors.',
    gradeMin: 10,
    gradeMax: 12,
    interests: ['business', 'lead', 'entrepreneurship'],
    url: 'https://yeausa.org/',
    metadata: { deadline: 'Rolling', duration: '8 weeks' },
  },
  {
    title: 'Model United Nations (MUN)',
    type: ActivityType.COMPETITION,
    description:
      'Debate and diplomacy simulation developing public speaking, research, and global awareness.',
    gradeMin: 8,
    gradeMax: 12,
    interests: ['social', 'english', 'history', 'lead'],
    url: 'https://www.un.org/en/mun',
    metadata: { deadline: 'School-based', duration: 'Year-round' },
  },
  {
    title: 'NASA STEM Engagement Programs',
    type: ActivityType.SUMMER_PROGRAM,
    description:
      'Virtual and in-person NASA challenges in robotics, aerospace, and data science.',
    gradeMin: 9,
    gradeMax: 12,
    interests: ['science', 'engineering', 'technology'],
    url: 'https://www.nasa.gov/learning-resources/stem-engagement/',
    metadata: { deadline: 'Varies', duration: '2-8 weeks' },
  },
  {
    title: 'Khan Academy × College Board SAT Prep',
    type: ActivityType.PROJECT,
    description:
      'Free official SAT practice with personalized study plans and full-length tests.',
    gradeMin: 10,
    gradeMax: 12,
    interests: ['math', 'english', 'test-prep'],
    url: 'https://www.khanacademy.org/sat',
    metadata: { deadline: 'Self-paced', duration: 'Ongoing' },
  },
  {
    title: 'Local Community Teaching Volunteer',
    type: ActivityType.VOLUNTEER,
    description:
      'Tutor younger students in math or English — builds leadership and social impact profile.',
    gradeMin: 9,
    gradeMax: 12,
    interests: ['social', 'help', 'teaching'],
    metadata: { deadline: 'Ongoing', duration: '2-4 hrs/week' },
  },
  {
    title: 'Personal Portfolio Website Project',
    type: ActivityType.PROJECT,
    description:
      'Build and publish a portfolio showcasing projects, writing, or creative work.',
    gradeMin: 8,
    gradeMax: 12,
    interests: ['technology', 'create', 'design', 'arts'],
    metadata: { deadline: 'Self-paced', duration: '2-4 weeks' },
  },
];

export const tutoringQuestionsSeed = [
  {
    testType: TutoringTestType.SAT,
    question: 'If 3x + 7 = 22, what is the value of x?',
    options: ['3', '5', '7', '15'],
    correctAnswer: '5',
    explanation: 'Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.',
    difficulty: 1,
  },
  {
    testType: TutoringTestType.SAT,
    question:
      'Which word best completes the sentence: "Her argument was so _____ that even critics changed their minds."',
    options: ['tenuous', 'compelling', 'ambiguous', 'redundant'],
    correctAnswer: 'compelling',
    explanation:
      'Compelling means convincing — fitting the context of changing minds.',
    difficulty: 2,
  },
  {
    testType: TutoringTestType.ACT,
    question: 'What is the area of a circle with radius 4?',
    options: ['8π', '16π', '4π', '32π'],
    correctAnswer: '16π',
    explanation: 'Area = πr² = π × 4² = 16π.',
    difficulty: 2,
  },
  {
    testType: TutoringTestType.ACT,
    question: 'The passage suggests the author primarily wants to:',
    options: [
      'Criticize technology',
      'Encourage curiosity',
      'Reject tradition',
      'Promote consumerism',
    ],
    correctAnswer: 'Encourage curiosity',
    explanation:
      'ACT reading questions focus on author purpose — look for curiosity-themed language.',
    difficulty: 2,
  },
  {
    testType: TutoringTestType.IELTS,
    question:
      'Choose the correct form: "She has been living in London _____ 2019."',
    options: ['for', 'since', 'from', 'during'],
    correctAnswer: 'since',
    explanation:
      '"Since" is used with a specific point in time; "for" is used with a duration.',
    difficulty: 1,
  },
  {
    testType: TutoringTestType.IELTS,
    question:
      'Which is the best paraphrase of "The results were inconclusive"?',
    options: [
      'The results were final',
      'The results were unclear',
      'The results were negative',
      'The results were ignored',
    ],
    correctAnswer: 'The results were unclear',
    explanation: 'Inconclusive means not leading to a definite conclusion.',
    difficulty: 2,
  },
];

export const platformConfigSeed = [
  {
    key: 'diagnostic.max_steps',
    category: 'diagnostics',
    isPublic: true,
    value: { max: 6, adaptive: true },
  },
  {
    key: 'college.matching.top_n',
    category: 'colleges',
    isPublic: true,
    value: { count: 5 },
  },
  {
    key: 'tutoring.questions_per_session',
    category: 'tutoring',
    isPublic: true,
    value: { count: 5 },
  },
  {
    key: 'app.tagline',
    category: 'branding',
    isPublic: true,
    value: { text: 'Your AI-powered path from discovery to admission' },
  },
];
