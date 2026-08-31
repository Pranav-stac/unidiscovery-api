export const careersSeed = [
  {
    slug: 'software-engineer',
    title: 'Software Engineer',
    category: 'Technology',
    description:
      'Design, build, and maintain software systems — from mobile apps to AI platforms.',
    subjects: ['Computer Science', 'Mathematics', 'Physics'],
    skills: ['Programming', 'Problem solving', 'System design'],
    salaryMin: 65000,
    salaryMax: 180000,
    salaryCurrency: 'USD',
    growthOutlook:
      'High growth — 22% projected over decade. AI and cloud driving demand globally.',
    hiringTrends: [
      'Remote-friendly',
      'AI/ML specialization premium',
      'Strong India & US hiring',
    ],
    limitations: ['Long screen hours', 'Rapid skill refresh needed'],
    combinations: ['STEM + Business (product)', 'CS + Design (UX engineering)'],
    employers: ['Google', 'Microsoft', 'Infosys', 'Stripe', 'OpenAI'],
  },
  {
    slug: 'doctor',
    title: 'Doctor / Physician',
    category: 'Health',
    description:
      'Diagnose and treat patients across hospitals, clinics, and research settings.',
    subjects: ['Biology', 'Chemistry', 'Physics'],
    skills: ['Empathy', 'Scientific reasoning', 'Communication'],
    salaryMin: 70000,
    salaryMax: 250000,
    salaryCurrency: 'USD',
    growthOutlook:
      'Steady demand worldwide. Aging populations increase need in UK, India, US.',
    hiringTrends: [
      'NHS UK hiring',
      'Telemedicine growth',
      'Specialization pathways',
    ],
    limitations: ['10+ years training', 'High stress', 'Regulatory exams'],
    combinations: ['Medicine + Public Health', 'Medicine + Research'],
    employers: ['NHS', 'Apollo Hospitals', 'Mayo Clinic', 'WHO'],
  },
  {
    slug: 'management-consultant',
    title: 'Management Consultant',
    category: 'Business',
    description:
      'Advise organizations on strategy, operations, and transformation.',
    subjects: ['Economics', 'Mathematics', 'Business Studies'],
    skills: ['Analysis', 'Presentation', 'Structured thinking'],
    salaryMin: 75000,
    salaryMax: 200000,
    salaryCurrency: 'USD',
    growthOutlook:
      'Moderate-high. Digital transformation and ESG consulting growing.',
    hiringTrends: ['MBB hiring from top universities', 'India consulting boom'],
    limitations: ['Travel-heavy', 'Long hours', 'Competitive entry'],
    combinations: ['Business + Technology', 'Economics + Policy'],
    employers: ['McKinsey', 'BCG', 'Bain', 'Deloitte', 'Accenture'],
  },
  {
    slug: 'product-designer',
    title: 'Product Designer',
    category: 'Design',
    description:
      'Shape user experiences for apps, websites, and digital products.',
    subjects: ['Art', 'Design', 'Psychology'],
    skills: ['Visual design', 'User research', 'Prototyping'],
    salaryMin: 55000,
    salaryMax: 150000,
    salaryCurrency: 'USD',
    growthOutlook:
      'Strong growth as every company becomes a digital product company.',
    hiringTrends: [
      'UX in fintech & health',
      'Design systems roles',
      'Remote global teams',
    ],
    limitations: ['Portfolio-dependent entry', 'Subjective feedback cycles'],
    combinations: [
      'Design + CS (design engineer)',
      'Design + Business (product)',
    ],
    employers: ['Apple', 'Figma', 'Airbnb', 'Razorpay', 'IDEO'],
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    category: 'Technology',
    description:
      'Extract insights from data using statistics, ML, and domain expertise.',
    subjects: ['Mathematics', 'Statistics', 'Computer Science'],
    skills: ['Python/R', 'Statistics', 'Storytelling with data'],
    salaryMin: 70000,
    salaryMax: 170000,
    salaryCurrency: 'USD',
    growthOutlook: 'Very high — AI boom accelerates demand across industries.',
    hiringTrends: [
      'AI/LLM roles',
      'Healthcare analytics',
      'Finance quant teams',
    ],
    limitations: ['Math-heavy', 'Tool churn', 'Ethics scrutiny'],
    combinations: ['Data Science + Domain (bio, finance)', 'Stats + Policy'],
    employers: ['Google DeepMind', 'JPMorgan', 'Flipkart', 'NHS Digital'],
  },
  {
    slug: 'civil-engineer',
    title: 'Civil Engineer',
    category: 'Engineering',
    description:
      'Design and oversee infrastructure — roads, bridges, buildings, smart cities.',
    subjects: ['Physics', 'Mathematics', 'Chemistry'],
    skills: ['Technical drawing', 'Project management', 'Safety compliance'],
    salaryMin: 50000,
    salaryMax: 120000,
    salaryCurrency: 'USD',
    growthOutlook:
      'Steady in India (infrastructure push) and UK (green retrofit projects).',
    hiringTrends: [
      'Smart cities',
      'Sustainable construction',
      'Government contracts',
    ],
    limitations: ['Site work', 'Regulatory licensing', 'Project delays'],
    combinations: ['Engineering + Urban Planning', 'Civil + Environmental'],
    employers: ['L&T', 'Arup', 'AECOM', 'National Highways UK'],
  },
  {
    slug: 'lawyer',
    title: 'Lawyer / Barrister',
    category: 'Law',
    description:
      'Represent clients, draft legal documents, and argue cases in courts.',
    subjects: ['English', 'History', 'Political Science'],
    skills: ['Argumentation', 'Research', 'Writing'],
    salaryMin: 60000,
    salaryMax: 200000,
    salaryCurrency: 'USD',
    growthOutlook: 'Stable. Corporate law and tech/IP law growing fastest.',
    hiringTrends: [
      'Tech regulation',
      'International arbitration',
      'Legal tech',
    ],
    limitations: ['Long qualification path', 'Competitive chambers'],
    combinations: ['Law + Economics', 'Law + Technology (legal tech)'],
    employers: [
      'Magic Circle firms',
      'AZB & Partners',
      'Clifford Chance',
      'Supreme Court clerks',
    ],
  },
  {
    slug: 'teacher-educator',
    title: 'Teacher / Educator',
    category: 'Education',
    description:
      'Inspire and educate students — classroom, online, or curriculum design.',
    subjects: ['Any subject specialization'],
    skills: ['Communication', 'Patience', 'Curriculum design'],
    salaryMin: 35000,
    salaryMax: 75000,
    salaryCurrency: 'USD',
    growthOutlook:
      'Consistent demand. EdTech and international schools expanding.',
    hiringTrends: [
      'Online tutoring',
      'IB/IGCSE schools',
      'Special needs education',
    ],
    limitations: ['Moderate pay in public sector', 'Emotional labour'],
    combinations: ['Education + Psychology', 'Subject expert + EdTech'],
    employers: [
      'International schools',
      'Khan Academy',
      "Byju's",
      'UK academies',
    ],
  },
];

export const subjectsSeed = [
  {
    slug: 'mathematics',
    title: 'Mathematics',
    category: 'STEM',
    description:
      'Numbers, algebra, calculus, statistics — foundation for engineering, finance, and data science.',
    careers: [
      'Software Engineer',
      'Data Scientist',
      'Management Consultant',
      'Civil Engineer',
    ],
    levels: ['GCSE', 'A-Level', 'IB HL', 'CBSE 11-12'],
  },
  {
    slug: 'computer-science',
    title: 'Computer Science',
    category: 'STEM',
    description: 'Programming, algorithms, systems — gateway to tech careers.',
    careers: ['Software Engineer', 'Data Scientist', 'Product Designer'],
    levels: ['IGCSE', 'A-Level', 'IB HL', 'CBSE PCM'],
  },
  {
    slug: 'biology',
    title: 'Biology',
    category: 'Science',
    description:
      'Life sciences — essential for medicine, biotech, and environmental careers.',
    careers: ['Doctor', 'Data Scientist', 'Research Scientist'],
    levels: ['GCSE', 'A-Level', 'IB HL', 'CBSE PCB'],
  },
  {
    slug: 'economics',
    title: 'Economics',
    category: 'Social Sciences',
    description: 'Markets, policy, and decision-making under scarcity.',
    careers: ['Management Consultant', 'Lawyer', 'Policy Analyst'],
    levels: ['A-Level', 'IB HL', 'CBSE Commerce'],
  },
  {
    slug: 'english-literature',
    title: 'English Literature',
    category: 'Humanities',
    description:
      'Critical reading, writing, and analysis — valued in law, media, and education.',
    careers: ['Lawyer', 'Teacher', 'Journalist'],
    levels: ['GCSE', 'A-Level', 'IB HL'],
  },
  {
    slug: 'art-design',
    title: 'Art & Design',
    category: 'Creative',
    description:
      'Visual expression, design thinking, and creative problem-solving.',
    careers: ['Product Designer', 'Architect', 'Creative Director'],
    levels: ['GCSE Art', 'A-Level Art', 'IB Visual Arts'],
  },
  {
    slug: 'physics',
    title: 'Physics',
    category: 'STEM',
    description: 'Matter, energy, and the laws governing the universe.',
    careers: ['Engineer', 'Data Scientist', 'Researcher'],
    levels: ['GCSE', 'A-Level', 'IB HL', 'CBSE PCM'],
  },
  {
    slug: 'business-studies',
    title: 'Business Studies',
    category: 'Commerce',
    description:
      'Entrepreneurship, marketing, finance, and organizational behavior.',
    careers: ['Management Consultant', 'Entrepreneur', 'Product Manager'],
    levels: ['A-Level', 'IB BM', 'CBSE Commerce'],
  },
];

export const mentorsSeed = [
  {
    name: 'Priya Sharma',
    field: 'Technology',
    company: 'Google',
    country: 'India',
    bio: 'Senior SWE who went from CBSE Class 12 to IIT to Silicon Valley. Happy to guide STEM students.',
    expertise: ['Software Engineering', 'College applications', 'Internships'],
  },
  {
    name: 'James Mitchell',
    field: 'Law',
    company: 'Clifford Chance',
    country: 'United Kingdom',
    bio: 'UK barrister with Oxford PPE background. Advises on UCAS, law careers, and Gatsby encounters.',
    expertise: ['Law', 'UCAS', 'UK applications'],
  },
  {
    name: 'Sarah Chen',
    field: 'Medicine',
    company: 'NHS',
    country: 'United Kingdom',
    bio: 'Junior doctor who navigated A-Levels → medical school → foundation training.',
    expertise: ['Medicine', 'UK healthcare', 'A-Levels'],
  },
  {
    name: 'Arjun Patel',
    field: 'Business',
    company: 'McKinsey',
    country: 'India',
    bio: 'Consultant from commerce stream. Helps students explore business + STEM dual paths.',
    expertise: ['Consulting', 'Case prep', 'Profile building'],
  },
  {
    name: 'Emily Watson',
    field: 'Design',
    company: 'Figma',
    country: 'United States',
    bio: 'Product designer who built portfolio through competitions and internships.',
    expertise: ['Design', 'Portfolio', 'US applications'],
  },
];

export const competitionsSeed = [
  {
    title: 'UniDiscover Innovation Challenge',
    description:
      'Build a solution for education access. Top teams get mentor sessions with hiring partners.',
    partner: 'TechCorp',
    gradeMin: 9,
    gradeMax: 12,
    url: 'https://example.com/innovation',
  },
  {
    title: 'Global Case Competition',
    description:
      '48-hour business case with live judging. Double-dip: winners fast-tracked to partner internships.',
    partner: 'Deloitte',
    gradeMin: 11,
    gradeMax: 12,
  },
  {
    title: 'Young Scientists Olympiad',
    description:
      'National-level science competition feeding into international olympiads.',
    gradeMin: 8,
    gradeMax: 12,
  },
  {
    title: 'Code Sprint Championship',
    description:
      'Algorithmic programming contest with public leaderboard and university recognition.',
    partner: 'Infosys',
    gradeMin: 9,
    gradeMax: 12,
  },
];

export const schoolsSeed = [
  {
    name: 'Westminster Academy',
    country: 'United Kingdom',
    type: 'K12',
    metadata: { mat: 'London MAT', students: 1200 },
  },
  {
    name: 'Delhi Public School',
    country: 'India',
    type: 'K12',
    metadata: { board: 'CBSE', students: 2500 },
  },
  {
    name: 'International School of Geneva',
    country: 'Switzerland',
    type: 'K12',
    metadata: { curriculum: 'IB', students: 1800 },
  },
];

export const gatsbyBenchmarksSeed = [
  {
    benchmark: 1,
    title: 'A stable careers programme',
    description: 'Every pupil has access to a structured careers programme.',
  },
  {
    benchmark: 2,
    title: 'Learning from career and labour market information',
    description: 'Pupils understand LMI and how it informs decisions.',
  },
  {
    benchmark: 3,
    title: 'Addressing the needs of each pupil',
    description:
      'Careers programme raises aspirations and challenges stereotypes.',
  },
  {
    benchmark: 4,
    title: 'Linking curriculum learning to careers',
    description: 'Subject teachers link curriculum to careers.',
  },
  {
    benchmark: 5,
    title: 'Encounters with employers and employees',
    description: 'At least 2 encounters per year from Year 7-13.',
  },
  {
    benchmark: 6,
    title: 'Experiences of workplaces',
    description: 'At least one experience by age 16, one more by 18.',
  },
  {
    benchmark: 7,
    title: 'Encounters with further and higher education',
    description: 'All pupils understand full range of learning options.',
  },
  {
    benchmark: 8,
    title: 'Personal guidance',
    description: 'Every pupil has guidance interviews by age 16 and 18.',
  },
];

export const ceiagContentSeed = [
  {
    key: 'ceiag.year9.intro',
    category: 'ceiag',
    isPublic: true,
    value: {
      title: 'Exploring Options (Year 9)',
      topics: ['Subject choices', 'Skills audit', 'Career stereotypes'],
      statutory: 'Gatsby 1, 3',
    },
  },
  {
    key: 'ceiag.year11.pathways',
    category: 'ceiag',
    isPublic: true,
    value: {
      title: 'Post-16 Pathways (Year 11)',
      topics: ['A-Levels vs BTEC', 'Apprenticeships', 'T-Levels'],
      statutory: 'Gatsby 7, 8',
    },
  },
  {
    key: 'ceiag.year13.ucas',
    category: 'ceiag',
    isPublic: true,
    value: {
      title: 'UCAS Application Cycle',
      topics: ['Personal statement', 'References', 'Deadlines'],
      statutory: 'Gatsby 7, 8',
    },
  },
];
