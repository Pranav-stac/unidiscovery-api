export type BoardKey = 'cbse' | 'nios' | 'cambridge' | 'icse';

export type OfficialUnit = {
  chapter: number;
  title: string;
  bookCode?: string;
  textbookUrl?: string;
  videoUrl?: string;
  videos?: string[];
  audios?: string[];
  videoQuery: string;
};

export type OfficialSubject = {
  id: string;
  name: string;
  bookCode?: string;
  units: OfficialUnit[];
};

type BookEntry = { code?: string; titles: string[] };

const NCERT_BOOKS: Record<string, BookEntry> = {
  '6-mathematics': {
    code: 'fomh1',
    titles: [
      'Knowing Our Numbers',
      'Whole Numbers',
      'Playing with Numbers',
      'Basic Geometrical Ideas',
      'Understanding Elementary Shapes',
      'Integers',
      'Fractions',
      'Decimals',
      'Data Handling',
      'Mensuration',
      'Algebra',
      'Ratio and Proportion',
      'Symmetry',
      'Practical Geometry',
    ],
  },
  '6-science': {
    code: 'fesc1',
    titles: [
      'Food: Where Does It Come From?',
      'Components of Food',
      'Fibre to Fabric',
      'Sorting Materials into Groups',
      'Separation of Substances',
      'Changes Around Us',
      'Getting to Know Plants',
      'Body Movements',
      'The Living Organisms and Their Surroundings',
      'Motion and Measurement of Distances',
      'Light, Shadows and Reflections',
      'Electricity and Circuits',
      'Fun with Magnets',
      'Water',
      'Air Around Us',
      'Garbage In, Garbage Out',
    ],
  },
  '6-history': {
    code: 'fess1',
    titles: [
      'What, Where, How and When?',
      'From Hunting-Gathering to Growing Food',
      'In the Earliest Cities',
      'What Books and Burials Tell Us',
      'Kingdoms, Kings and an Early Republic',
      'New Questions and Ideas',
      'Ashoka, The Emperor Who Gave Up War',
      'Vital Villages, Thriving Towns',
      'Traders, Kings and Pilgrims',
      'New Empires and Kingdoms',
      'Buildings, Paintings and Books',
    ],
  },
  '6-geography': {
    code: 'fess2',
    titles: [
      'The Earth in the Solar System',
      'Globe: Latitudes and Longitudes',
      'Motions of the Earth',
      'Maps',
      'Major Domains of the Earth',
      'Major Landforms of the Earth',
      'Our Country — India',
      'India: Climate, Vegetation and Wildlife',
    ],
  },
  '6-civics': {
    code: 'fess3',
    titles: [
      'Understanding Diversity',
      'Diversity and Discrimination',
      'What is Government?',
      'Key Elements of a Democratic Government',
      'Panchayati Raj',
      'Rural Administration',
      'Urban Administration',
      'Rural Livelihoods',
      'Urban Livelihoods',
    ],
  },
  '6-english': {
    titles: [
      'A Tale of Two Birds',
      'The Friendly Mongoose',
      'The Shepherd’s Treasure',
      'Tansen',
      'The Monkey and the Crocodile',
      'The Wonder Called Sleep',
      'A Pact with the Sun',
      'Whatif',
    ],
  },
  '7-mathematics': {
    code: 'gemh1',
    titles: [
      'Integers',
      'Fractions and Decimals',
      'Data Handling',
      'Simple Equations',
      'Lines and Angles',
      'The Triangle and its Properties',
      'Congruence of Triangles',
      'Comparing Quantities',
      'Rational Numbers',
      'Practical Geometry',
      'Perimeter and Area',
      'Algebraic Expressions',
      'Exponents and Powers',
    ],
  },
  '7-science': {
    code: 'gesc1',
    titles: [
      'Nutrition in Plants',
      'Nutrition in Animals',
      'Fibre to Fabric',
      'Heat',
      'Acids, Bases and Salts',
      'Physical and Chemical Changes',
      'Weather, Climate and Adaptations of Animals to Climate',
      'Winds, Storms and Cyclones',
      'Soil',
      'Respiration in Organisms',
      'Transportation in Animals and Plants',
      'Reproduction in Plants',
      'Motion and Time',
    ],
  },
  '7-geography': {
    code: 'gess1',
    titles: [
      'Environment',
      'Inside Our Earth',
      'Our Changing Earth',
      'Air',
      'Water',
      'Natural Vegetation and Wild Life',
      'Human Environment: Settlement, Transport and Communication',
      'Human-Environment Interactions: The Tropical and the Subtropical Region',
    ],
  },
  '7-history': {
    code: 'gess2',
    titles: [
      'Tracing Changes Through a Thousand Years',
      'New Kings and Kingdoms',
      'The Delhi Sultans',
      'The Mughal Empire',
      'Rulers and Buildings',
      'Towns, Traders and Craftspersons',
      'Tribes, Nomads and Settled Communities',
    ],
  },
  '7-civics': {
    code: 'gess3',
    titles: [
      'On Equality',
      'Role of the Government in Health',
      'How the State Government Works',
      'Growing up as Boys and Girls',
      'Women Change the World',
      'Understanding Media',
      'Understanding Advertising',
      'Markets Around Us',
    ],
  },
  '7-english': {
    titles: [
      'Three Questions',
      'A Gift of Chappals',
      'Gopal and the Hilsa Fish',
      'The Ashes That Made Trees Bloom',
      'Quality',
      'Expert Detectives',
      'The Invention of Vita-Wonk',
      'Fire: Friend and Foe',
      'A Bicycle in Good Repair',
      'The Story of Cricket',
    ],
  },
  '8-mathematics': {
    code: 'hemh1',
    titles: [
      'Rational Numbers',
      'Linear Equations in One Variable',
      'Understanding Quadrilaterals',
      'Data Handling',
      'Squares and Square Roots',
      'Cubes and Cube Roots',
      'Comparing Quantities',
      'Algebraic Expressions and Identities',
      'Mensuration',
      'Exponents and Powers',
      'Direct and Inverse Proportions',
      'Factorisation',
      'Introduction to Graphs',
    ],
  },
  '8-science': {
    code: 'hesc1',
    titles: [
      'Crop Production and Management',
      'Microorganisms: Friend and Foe',
      'Coal and Petroleum',
      'Combustion and Flame',
      'Conservation of Plants and Animals',
      'Reproduction in Animals',
      'Reaching the Age of Adolescence',
      'Force and Pressure',
      'Friction',
      'Sound',
      'Chemical Effects of Electric Current',
      'Some Natural Phenomena',
      'Light',
    ],
  },
  '8-geography': {
    code: 'hess2',
    titles: [
      'Resources',
      'Land, Soil, Water, Natural Vegetation and Wildlife Resources',
      'Mineral and Power Resources',
      'Agriculture',
      'Industries',
      'Human Resources',
    ],
  },
  '8-history': {
    code: 'hess3',
    titles: [
      'How, When and Where',
      'From Trade to Territory',
      'Ruling the Countryside',
      'Tribals, Dikus and the Vision of a Golden Age',
      'When People Rebel',
      'Weavers, Iron Smelters and Factory Owners',
      'Civilising the Native, Educating the Nation',
      'Women, Caste and Reform',
    ],
  },
  '8-civics': {
    code: 'hess4',
    titles: [
      'The Indian Constitution',
      'Understanding Secularism',
      'Parliament and the Making of Laws',
      'Judiciary',
      'Understanding Marginalisation',
    ],
  },
  '8-english': {
    titles: [
      'The Best Christmas Present in the World',
      'The Tsunami',
      'Glimpses of the Past',
      "Bepin Choudhury's Lapse of Memory",
      'The Summit Within',
      "This is Jody's Fawn",
      'A Visit to Cambridge',
      'A Short Monsoon Diary',
      'The Great Stone Face — I',
      'The Great Stone Face — II',
    ],
  },
  '9-mathematics': {
    code: 'iemh1',
    titles: [
      'Number Systems',
      'Polynomials',
      'Coordinate Geometry',
      'Linear Equations in Two Variables',
      'Introduction to Euclid’s Geometry',
      'Lines and Angles',
      'Triangles',
      'Quadrilaterals',
      'Circles',
      'Heron’s Formula',
      'Surface Areas and Volumes',
      'Statistics',
    ],
  },
  '9-science': {
    code: 'iesc1',
    titles: [
      'Matter in Our Surroundings',
      'Is Matter Around Us Pure',
      'Atoms and Molecules',
      'Structure of the Atom',
      'The Fundamental Unit of Life',
      'Tissues',
      'Motion',
      'Force and Laws of Motion',
      'Gravitation',
      'Work and Energy',
      'Sound',
      'Improvement in Food Resources',
    ],
  },
  '9-geography': {
    code: 'iess1',
    titles: [
      'India: Size and Location',
      'Physical Features of India',
      'Drainage',
      'Climate',
      'Natural Vegetation and Wild Life',
      'Population',
    ],
  },
  '9-history': {
    code: 'iess2',
    titles: [
      'The French Revolution',
      'Socialism in Europe and the Russian Revolution',
      'Nazism and the Rise of Hitler',
      'Forest Society and Colonialism',
    ],
  },
  '9-civics': {
    code: 'iess3',
    titles: [
      'What is Democracy? Why Democracy?',
      'Constitutional Design',
      'Electoral Politics',
      'Working of Institutions',
      'Democratic Rights',
    ],
  },
  '9-economics': {
    code: 'iess4',
    titles: [
      'The Story of Village Palampur',
      'People as Resource',
      'Poverty as a Challenge',
      'Food Security in India',
    ],
  },
  '9-english': {
    titles: [
      'The Fun They Had',
      'The Sound of Music',
      'The Little Girl',
      'A Truly Beautiful Mind',
      'The Snake and the Mirror',
      'My Childhood',
      'Packing',
      'Reach for the Top',
      'The Bond of Love',
      'Kathmandu',
      'If I Were You',
    ],
  },
  '10-mathematics': {
    code: 'jemh1',
    titles: [
      'Real Numbers',
      'Polynomials',
      'Pair of Linear Equations in Two Variables',
      'Quadratic Equations',
      'Arithmetic Progressions',
      'Triangles',
      'Coordinate Geometry',
      'Introduction to Trigonometry',
      'Some Applications of Trigonometry',
      'Circles',
      'Areas Related to Circles',
      'Surface Areas and Volumes',
      'Statistics',
      'Probability',
    ],
  },
  '10-science': {
    code: 'jesc1',
    titles: [
      'Chemical Reactions and Equations',
      'Acids, Bases and Salts',
      'Metals and Non-metals',
      'Carbon and Its Compounds',
      'Life Processes',
      'Control and Coordination',
      'How do Organisms Reproduce?',
      'Heredity',
      'Light: Reflection and Refraction',
      'Human Eye and the Colourful World',
      'Electricity',
      'Magnetic Effects of Electric Current',
      'Our Environment',
    ],
  },
  '10-geography': {
    code: 'jess1',
    titles: [
      'Resources and Development',
      'Forest and Wildlife Resources',
      'Water Resources',
      'Agriculture',
      'Minerals and Energy Resources',
      'Manufacturing Industries',
      'Lifelines of National Economy',
    ],
  },
  '10-history': {
    code: 'jess2',
    titles: [
      'The Rise of Nationalism in Europe',
      'Nationalism in India',
      'The Making of a Global World',
      'The Age of Industrialisation',
      'Print Culture and the Modern World',
    ],
  },
  '10-civics': {
    code: 'jess3',
    titles: [
      'Power Sharing',
      'Federalism',
      'Gender, Religion and Caste',
      'Political Parties',
      'Outcomes of Democracy',
    ],
  },
  '10-economics': {
    code: 'jess4',
    titles: [
      'Development',
      'Sectors of the Indian Economy',
      'Money and Credit',
      'Globalisation and the Indian Economy',
      'Consumer Rights',
    ],
  },
  '11-mathematics': {
    code: 'kemh1',
    titles: [
      'Sets',
      'Relations and Functions',
      'Trigonometric Functions',
      'Complex Numbers and Quadratic Equations',
      'Linear Inequalities',
      'Permutations and Combinations',
      'Binomial Theorem',
      'Sequences and Series',
      'Straight Lines',
      'Conic Sections',
      'Introduction to Three Dimensional Geometry',
      'Limits and Derivatives',
      'Statistics',
      'Probability',
    ],
  },
  '11-physics': {
    code: 'keph1',
    titles: [
      'Units and Measurements',
      'Motion in a Straight Line',
      'Motion in a Plane',
      'Laws of Motion',
      'Work, Energy and Power',
      'System of Particles and Rotational Motion',
      'Gravitation',
      'Mechanical Properties of Solids',
      'Mechanical Properties of Fluids',
      'Thermal Properties of Matter',
      'Thermodynamics',
      'Kinetic Theory',
      'Oscillations',
      'Waves',
    ],
  },
  '11-chemistry': {
    code: 'kech1',
    titles: [
      'Some Basic Concepts of Chemistry',
      'Structure of Atom',
      'Classification of Elements and Periodicity in Properties',
      'Chemical Bonding and Molecular Structure',
      'Thermodynamics',
      'Equilibrium',
      'Redox Reactions',
      'Organic Chemistry: Some Basic Principles and Techniques',
      'Hydrocarbons',
    ],
  },
  '11-biology': {
    code: 'kebo1',
    titles: [
      'The Living World',
      'Biological Classification',
      'Plant Kingdom',
      'Animal Kingdom',
      'Morphology of Flowering Plants',
      'Anatomy of Flowering Plants',
      'Structural Organisation in Animals',
      'Cell: The Unit of Life',
      'Biomolecules',
      'Cell Cycle and Cell Division',
      'Photosynthesis in Higher Plants',
      'Respiration in Plants',
      'Plant Growth and Development',
      'Breathing and Exchange of Gases',
      'Body Fluids and Circulation',
      'Excretory Products and their Elimination',
      'Locomotion and Movement',
      'Neural Control and Coordination',
      'Chemical Coordination and Integration',
    ],
  },
  '11-english': {
    titles: [
      'The Portrait of a Lady',
      "We're Not Afraid to Die",
      'Discovering Tut',
      'The Ailing Planet',
      'The Browning Version',
      'Childhood',
      'Father to Son',
      'The Summer of the Beautiful White Horse',
    ],
  },
  '11-history': {
    code: 'kehs1',
    titles: [
      'From the Beginning of Time',
      'Writing and City Life',
      'An Empire Across Three Continents',
      'The Central Islamic Lands',
      'Nomadic Empires',
      'The Three Orders',
      'Changing Cultural Traditions',
      'Confrontation of Cultures',
      'The Industrial Revolution',
      'Displacing Indigenous Cultures',
      'Paths to Modernisation',
    ],
  },
  '11-geography': {
    code: 'kegy1',
    titles: [
      'Geography as a Discipline',
      'The Origin and Evolution of the Earth',
      'Interior of the Earth',
      'Distribution of Oceans and Continents',
      'Minerals and Rocks',
      'Geomorphic Processes',
      'Landforms and their Evolution',
      'Composition and Structure of Atmosphere',
      'Solar Radiation, Heat Balance and Temperature',
      'Atmospheric Circulation and Weather Systems',
      'Water in the Atmosphere',
      'World Climate and Climate Change',
      'Water (Oceans)',
      'Movements of Ocean Water',
      'Life on the Earth',
      'Biodiversity and Conservation',
    ],
  },
  '11-political-science': {
    code: 'keps1',
    titles: [
      'Political Theory: An Introduction',
      'Freedom',
      'Equality',
      'Social Justice',
      'Rights',
      'Citizenship',
      'Nationalism',
      'Secularism',
      'Peace',
      'Development',
    ],
  },
  '11-accountancy': {
    titles: [
      'Introduction to Accounting',
      'Theory Base of Accounting',
      'Recording of Transactions',
      'Bank Reconciliation Statement',
      'Depreciation, Provisions and Reserves',
      'Trial Balance and Rectification of Errors',
      'Financial Statements',
      'Accounts from Incomplete Records',
    ],
  },
  '11-business-studies': {
    titles: [
      'Nature and Purpose of Business',
      'Forms of Business Organisation',
      'Private, Public and Global Enterprises',
      'Business Services',
      'Emerging Modes of Business',
      'Social Responsibilities of Business',
      'Sources of Business Finance',
      'Small Business',
      'Internal Trade',
      'International Business',
    ],
  },
  '11-economics': {
    titles: [
      'Introduction to Microeconomics',
      'Theory of Consumer Behaviour',
      'Production and Costs',
      'The Theory of the Firm',
      'Market Equilibrium',
      'Non-competitive Markets',
      'Introduction to Statistics',
      'Collection and Organisation of Data',
      'Presentation of Data',
      'Measures of Central Tendency',
    ],
  },
  '12-mathematics': {
    code: 'lemh1',
    titles: [
      'Relations and Functions',
      'Inverse Trigonometric Functions',
      'Matrices',
      'Determinants',
      'Continuity and Differentiability',
      'Application of Derivatives',
      'Integrals',
      'Application of Integrals',
      'Differential Equations',
      'Vector Algebra',
      'Three Dimensional Geometry',
      'Linear Programming',
      'Probability',
    ],
  },
  '12-physics': {
    code: 'leph1',
    titles: [
      'Electric Charges and Fields',
      'Electrostatic Potential and Capacitance',
      'Current Electricity',
      'Moving Charges and Magnetism',
      'Magnetism and Matter',
      'Electromagnetic Induction',
      'Alternating Current',
      'Electromagnetic Waves',
      'Ray Optics and Optical Instruments',
      'Wave Optics',
      'Dual Nature of Radiation and Matter',
      'Atoms',
      'Nuclei',
      'Semiconductor Electronics',
    ],
  },
  '12-chemistry': {
    code: 'lech1',
    titles: [
      'Solutions',
      'Electrochemistry',
      'Chemical Kinetics',
      'The d and f Block Elements',
      'Coordination Compounds',
      'Haloalkanes and Haloarenes',
      'Alcohols, Phenols and Ethers',
      'Aldehydes, Ketones and Carboxylic Acids',
      'Amines',
      'Biomolecules',
    ],
  },
  '12-biology': {
    code: 'lebo1',
    titles: [
      'Sexual Reproduction in Flowering Plants',
      'Human Reproduction',
      'Reproductive Health',
      'Principles of Inheritance and Variation',
      'Molecular Basis of Inheritance',
      'Evolution',
      'Human Health and Disease',
      'Microbes in Human Welfare',
      'Biotechnology: Principles and Processes',
      'Biotechnology and its Applications',
      'Organisms and Populations',
      'Ecosystem',
      'Biodiversity and Conservation',
    ],
  },
  '12-english': {
    titles: [
      'The Last Lesson',
      'Lost Spring',
      'Deep Water',
      'The Rattrap',
      'Indigo',
      'Poets and Pancakes',
      'The Interview',
      'Going Places',
      'My Mother at Sixty-six',
      'Keeping Quiet',
    ],
  },
  '12-history': {
    code: 'lehs1',
    titles: [
      'Bricks, Beads and Bones',
      'Kings, Farmers and Towns',
      'Kinship, Caste and Class',
      'Thinkers, Beliefs and Buildings',
      'Through the Eyes of Travellers',
      'Bhakti-Sufi Traditions',
      'An Imperial Capital: Vijayanagara',
      'Peasants, Zamindars and the State',
      'Kings and Chronicles',
      'Colonialism and the Countryside',
      'Rebels and the Raj',
      'Colonial Cities',
      'Mahatma Gandhi and the Nationalist Movement',
      'Understanding Partition',
      'Framing the Constitution',
    ],
  },
  '12-geography': {
    code: 'legy1',
    titles: [
      'Human Geography: Nature and Scope',
      'The World Population: Distribution, Density and Growth',
      'Population Composition',
      'Human Development',
      'Primary Activities',
      'Secondary Activities',
      'Tertiary and Quaternary Activities',
      'Transport and Communication',
      'International Trade',
      'Human Settlements',
      'India: People and Economy',
    ],
  },
  '12-political-science': {
    code: 'leps1',
    titles: [
      'The Cold War Era',
      'The End of Bipolarity',
      'US Hegemony in World Politics',
      'Alternative Centres of Power',
      'Contemporary South Asia',
      'International Organisations',
      'Security in the Contemporary World',
      'Environment and Natural Resources',
      'Globalisation',
      'Challenges of Nation Building',
      'Era of One-Party Dominance',
      'Politics of Planned Development',
      'India’s External Relations',
      'Challenges to and Restoration of the Congress System',
      'The Crisis of Democratic Order',
      'Rise of Popular Movements',
      'Regional Aspirations',
      'Recent Developments in Indian Politics',
    ],
  },
  '12-accountancy': {
    titles: [
      'Accounting for Partnership Firms',
      'Reconstitution of a Partnership Firm',
      'Dissolution of Partnership Firm',
      'Accounting for Share Capital',
      'Issue of Debentures',
      'Financial Statements of a Company',
      'Analysis of Financial Statements',
      'Cash Flow Statement',
    ],
  },
  '12-business-studies': {
    titles: [
      'Nature and Significance of Management',
      'Principles of Management',
      'Business Environment',
      'Planning',
      'Organising',
      'Staffing',
      'Directing',
      'Controlling',
      'Financial Management',
      'Financial Markets',
      'Marketing Management',
      'Consumer Protection',
    ],
  },
  '12-economics': {
    titles: [
      'Introduction to Macroeconomics',
      'National Income Accounting',
      'Money and Banking',
      'Determination of Income and Employment',
      'Government Budget and the Economy',
      'Open Economy Macroeconomics',
      'Indian Economy on the Eve of Independence',
      'Indian Economy 1950–1990',
      'Liberalisation, Privatisation and Globalisation',
      'Human Capital Formation',
      'Rural Development',
      'Employment',
      'Environment and Sustainable Development',
    ],
  },
};

const NIOS_SECONDARY: Record<string, string[]> = {
  english: [
    'Reading and Comprehension',
    'Writing Skills',
    'Grammar in Use',
    'Literature and Life',
    'Letter and Report Writing',
    'Speaking and Listening',
  ],
  mathematics: [
    'Number Systems',
    'Algebra',
    'Geometry',
    'Mensuration',
    'Trigonometry',
    'Statistics',
    'Commercial Mathematics',
    'Coordinate Geometry',
  ],
  'science-and-technology': [
    'Measurement in Science',
    'Matter and Materials',
    'Motion and Force',
    'Energy',
    'The Living World',
    'Human Body',
    'Natural Resources',
    'Environment',
  ],
  'social-science': [
    'India and the World',
    'The Modern World',
    'Indian Freedom Movement',
    'Democracy and Constitution',
    'Economy and Development',
    'Geography of India',
  ],
  'business-studies': [
    'Nature of Business',
    'Forms of Business',
    'Office Practice',
    'Trade',
    'Banking and Insurance',
    'Entrepreneurship',
  ],
  economics: [
    'Introduction to Economics',
    'Consumer Behaviour',
    'Production',
    'National Income',
    'Money and Banking',
    'Indian Economy',
  ],
  'home-science': [
    'Food and Nutrition',
    'Family Resource Management',
    'Human Development',
    'Textiles',
    'Home Care',
  ],
  'data-entry-operations': [
    'Computer Basics',
    'Operating System',
    'Word Processing',
    'Spreadsheets',
    'Internet and Email',
  ],
};

const NIOS_SENIOR: Record<string, string[]> = {
  english: [
    'Reading Unseen Passages',
    'Advanced Writing',
    'Grammar and Usage',
    'Literature Texts',
    'Communication Skills',
  ],
  mathematics: [
    'Sets and Functions',
    'Algebra',
    'Calculus',
    'Coordinate Geometry',
    'Vectors',
    'Probability',
    'Linear Programming',
  ],
  physics: [
    'Physical World and Measurement',
    'Kinematics',
    'Laws of Motion',
    'Work Energy Power',
    'Electrostatics',
    'Current Electricity',
    'Optics',
    'Modern Physics',
  ],
  chemistry: [
    'Basic Concepts',
    'Atomic Structure',
    'Chemical Bonding',
    'States of Matter',
    'Equilibrium',
    'Organic Chemistry',
    'Environmental Chemistry',
  ],
  biology: [
    'Diversity of Living Organisms',
    'Cell Structure',
    'Plant Physiology',
    'Human Physiology',
    'Reproduction',
    'Genetics',
    'Biotechnology',
    'Ecology',
  ],
  accountancy: [
    'Accounting Process',
    'Partnership Accounts',
    'Company Accounts',
    'Analysis of Financial Statements',
    'Computerised Accounting',
  ],
  'business-studies': [
    'Nature of Management',
    'Planning and Organising',
    'Staffing and Directing',
    'Business Finance',
    'Marketing',
    'Consumer Protection',
  ],
  economics: [
    'Microeconomics',
    'Macroeconomics',
    'Money and Banking',
    'Government Budget',
    'Indian Economic Development',
  ],
  history: [
    'Ancient India',
    'Medieval India',
    'Modern India',
    'World History Themes',
    'Independent India',
  ],
  geography: [
    'Physical Geography',
    'Human Geography',
    'India People and Economy',
    'Map Work',
  ],
  'political-science': [
    'Political Theory',
    'Indian Constitution',
    'Politics in India',
    'Contemporary World Politics',
  ],
};

const CAMBRIDGE_IGCSE: Record<string, string[]> = {
  mathematics: [
    'Number',
    'Algebra and graphs',
    'Coordinate geometry',
    'Geometry',
    'Mensuration',
    'Trigonometry',
    'Transformations',
    'Probability',
    'Statistics',
  ],
  'english-language': [
    'Reading comprehension',
    'Summary writing',
    'Directed writing',
    'Composition',
    'Grammar and vocabulary',
  ],
  biology: [
    'Characteristics of living organisms',
    'Cells',
    'Biological molecules',
    'Enzymes',
    'Plant nutrition',
    'Human nutrition',
    'Transport',
    'Respiration',
    'Coordination and response',
    'Reproduction',
    'Inheritance',
    'Ecology',
  ],
  chemistry: [
    'States of matter',
    'Atoms and the periodic table',
    'Bonding',
    'Stoichiometry',
    'Electricity and chemistry',
    'Chemical energetics',
    'Chemical reactions',
    'Acids bases and salts',
    'Organic chemistry',
  ],
  physics: [
    'Motion',
    'Forces',
    'Energy',
    'Thermal physics',
    'Waves',
    'Electricity',
    'Magnetism',
    'Atomic physics',
  ],
  economics: [
    'The basic economic problem',
    'Allocation of resources',
    'Microeconomic decision makers',
    'Government and the economy',
    'Economic development',
    'International trade',
  ],
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeBoard(value?: string | null): BoardKey {
  const raw = (value ?? '').toLowerCase();
  if (raw.includes('nios') || raw.includes('open')) return 'nios';
  if (raw.includes('cambridge') || raw.includes('igcse') || raw.includes('a-level')) {
    return 'cambridge';
  }
  if (raw.includes('icse') || raw.includes('isc') || raw.includes('cisce')) return 'icse';
  return 'cbse';
}

export function normalizeGrade(grade?: number | null, classGroup?: string | null) {
  if (grade && grade >= 1 && grade <= 12) return grade;
  const group = classGroup ?? '';
  if (group.includes('6-8')) return 8;
  if (group.includes('9-10')) return 10;
  if (group.includes('11-12')) return 12;
  return 10;
}

export function normalizeStream(stream?: string | null) {
  const raw = (stream ?? '').toLowerCase();
  if (raw.includes('comm')) return 'commerce';
  if (raw.includes('art') || raw.includes('human')) return 'arts';
  if (raw.includes('sci')) return 'science';
  return '';
}

export function ncertPdfUrl(bookCode: string, chapter: number) {
  return `https://www.ncert.nic.in/textbook/pdf/${bookCode}${String(chapter).padStart(2, '0')}.pdf`;
}

export function officialPortal(board: BoardKey, grade: number) {
  if (board === 'nios') {
    return grade <= 10
      ? 'https://www.nios.ac.in/online-course-material/secondary-courses.aspx'
      : 'https://www.nios.ac.in/online-course-material/sr-secondary-courses.aspx';
  }
  if (board === 'cambridge') {
    return 'https://www.cambridgeinternational.org/programmes-and-qualifications/';
  }
  return 'https://ncert.nic.in/textbook.php';
}

export function videoSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function unitsFromTitles(
  titles: string[],
  board: BoardKey,
  grade: number,
  subjectLabel: string,
  bookCode?: string,
): OfficialUnit[] {
  return titles.filter(Boolean).map((title, index) => {
    const chapter = index + 1;
    const videoQuery =
      board === 'nios'
        ? `NIOS Class ${grade <= 10 ? 10 : 12} ${subjectLabel} ${title}`
        : board === 'cambridge'
          ? `Cambridge IGCSE ${subjectLabel} ${title}`
          : `NCERT Class ${grade} ${subjectLabel} ${title}`;
    return {
      chapter,
      title,
      bookCode,
      textbookUrl: bookCode ? ncertPdfUrl(bookCode, chapter) : officialPortal(board, grade),
      videos: [],
      audios: [],
      videoQuery,
    };
  });
}

function bookToSubject(
  id: string,
  name: string,
  board: BoardKey,
  grade: number,
  book?: BookEntry,
): OfficialSubject | null {
  if (!book?.titles.length) return null;
  return {
    id,
    name,
    bookCode: book.code,
    units: unitsFromTitles(book.titles, board, grade, name, book.code),
  };
}

const CORE_BY_GRADE: Record<number, string[]> = {
  6: ['mathematics', 'science', 'english', 'history', 'geography', 'civics'],
  7: ['mathematics', 'science', 'english', 'history', 'geography', 'civics'],
  8: ['mathematics', 'science', 'english', 'history', 'geography', 'civics'],
  9: ['mathematics', 'science', 'english', 'history', 'geography', 'civics', 'economics'],
  10: ['mathematics', 'science', 'english', 'history', 'geography', 'civics', 'economics'],
};

const STREAM_SUBJECTS: Record<string, string[]> = {
  science: ['mathematics', 'physics', 'chemistry', 'biology', 'english'],
  commerce: ['accountancy', 'business-studies', 'economics', 'mathematics', 'english'],
  arts: ['history', 'political-science', 'geography', 'economics', 'english'],
};

const SUBJECT_NAMES: Record<string, string> = {
  mathematics: 'Mathematics',
  science: 'Science',
  english: 'English',
  history: 'History',
  geography: 'Geography',
  civics: 'Political Science',
  economics: 'Economics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  accountancy: 'Accountancy',
  'business-studies': 'Business Studies',
  'political-science': 'Political Science',
  'science-and-technology': 'Science and Technology',
  'social-science': 'Social Science',
  'home-science': 'Home Science',
  'data-entry-operations': 'Data Entry Operations',
  'english-language': 'English Language',
};

export function subjectName(id: string) {
  return SUBJECT_NAMES[id] ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const SCHOOL_EXTRA_BLOCKLIST =
  /semester|credit|laboratory|\blab\b|engineering|activity-based|project-based|skill-based|workshop|professional-communication/i;

export function isSchoolSubjectExtra(value: string) {
  const id = slugify(value);
  if (!id || id.length > 48) return false;
  if (SCHOOL_EXTRA_BLOCKLIST.test(id)) return false;
  if (id.split('-').length > 5) return false;
  return true;
}

export function defaultSubjectIds(
  board: BoardKey,
  grade: number,
  stream: string,
  extraSubjects: string[] = [],
) {
  let ids: string[] = [];
  if (board === 'nios') {
    ids =
      grade <= 10
        ? Object.keys(NIOS_SECONDARY)
        : Object.keys(NIOS_SENIOR);
  } else if (board === 'cambridge') {
    ids = Object.keys(CAMBRIDGE_IGCSE);
  } else if (grade >= 11) {
    ids = STREAM_SUBJECTS[stream] ?? STREAM_SUBJECTS.science;
  } else {
    ids = CORE_BY_GRADE[grade] ?? (grade < 6 ? CORE_BY_GRADE[6] : CORE_BY_GRADE[10]);
  }

  const extras = extraSubjects
    .map(slugify)
    .filter((id) => id && isSchoolSubjectExtra(id));
  return [...new Set([...ids, ...extras])];
}

export function officialSubject(
  board: BoardKey,
  grade: number,
  subjectId: string,
): OfficialSubject | null {
  const name = subjectName(subjectId);
  if (board === 'nios') {
    const titles =
      grade <= 10 ? NIOS_SECONDARY[subjectId] : NIOS_SENIOR[subjectId];
    if (!titles) return null;
    return {
      id: subjectId,
      name,
      units: unitsFromTitles(titles, board, grade, name),
    };
  }
  if (board === 'cambridge') {
    const titles = CAMBRIDGE_IGCSE[subjectId];
    if (!titles) return null;
    return {
      id: subjectId,
      name,
      units: unitsFromTitles(titles, board, grade, name),
    };
  }
  const lookupGrade = board === 'icse' ? grade : grade;
  const book = NCERT_BOOKS[`${lookupGrade}-${subjectId}`];
  if (book) return bookToSubject(subjectId, name, 'cbse', grade, book);
  return null;
}

export const BOARD_LABELS: Record<BoardKey, string> = {
  cbse: 'CBSE / NCERT',
  nios: 'NIOS',
  cambridge: 'Cambridge',
  icse: 'ICSE / CISCE',
};
