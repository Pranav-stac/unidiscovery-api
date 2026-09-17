import { ActivityPlanStatus, ActivityType, PlanCategory, PlanResponsibility } from '@prisma/client';

export type RoadmapTaskInput = {
  title: string;
  type: ActivityType;
  category: PlanCategory;
  subcategory?: string;
  startDate: Date;
  dueDate: Date;
  country?: string;
  description?: string;
  whyItMatters?: string;
  responsibility?: PlanResponsibility;
  priority?: number;
};

function monthOffset(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function range(startMonths: number, endMonths: number, base = new Date()) {
  return {
    startDate: monthOffset(base, startMonths),
    dueDate: monthOffset(base, endMonths),
  };
}

export function fallbackUsRoadmap(countries: string[]): RoadmapTaskInput[] {
  const base = new Date();
  const hasUk = countries.some((c) => /uk|united kingdom|britain/i.test(c));
  const tasks: RoadmapTaskInput[] = [
    {
      title: 'Maintain strong academics & transcripts',
      type: 'OTHER',
      category: 'ACADEMICS',
      subcategory: 'Transcripts',
      ...range(0, 10, base),
      description: 'Keep grades consistent and request official transcripts early.',
      whyItMatters: 'Admissions committees use academic rigor as a baseline filter.',
      responsibility: 'STUDENT',
      priority: 3,
    },
    {
      title: 'Register for SAT / ACT',
      type: 'OTHER',
      category: 'TEST_PREP',
      subcategory: 'Standardized tests',
      ...range(0, 2, base),
      country: 'United States',
      whyItMatters: 'Most US colleges still use test scores for merit aid and placement.',
      responsibility: 'STUDENT',
      priority: 3,
    },
    {
      title: 'SAT / ACT prep & practice tests',
      type: 'OTHER',
      category: 'TEST_PREP',
      subcategory: 'Standardized tests',
      ...range(1, 8, base),
      country: 'United States',
      whyItMatters: 'Structured prep improves section pacing and accuracy.',
      responsibility: 'STUDENT',
      priority: 2,
    },
    {
      title: 'Build leadership & profile activities',
      type: 'PROJECT',
      category: 'PROFILE',
      subcategory: 'Leadership and Teamwork',
      ...range(0, 9, base),
      whyItMatters: 'Depth in 2–3 activities beats a long shallow list.',
      responsibility: 'STUDENT',
      priority: 2,
    },
    {
      title: 'Books / materials to read',
      type: 'OTHER',
      category: 'PROFILE',
      subcategory: 'Books / Materials to Read',
      ...range(0, 6, base),
      whyItMatters: 'Intellectual curiosity signals fit for rigorous programs.',
      responsibility: 'STUDENT',
      priority: 1,
    },
    {
      title: 'Common Application / coalition setup',
      type: 'OTHER',
      category: 'APPLICATION',
      subcategory: 'Application portal',
      ...range(6, 9, base),
      country: 'United States',
      whyItMatters: 'Early portal setup prevents last-minute profile errors.',
      responsibility: 'STUDENT',
      priority: 3,
    },
    {
      title: 'Personal statement & supplemental essays',
      type: 'OTHER',
      category: 'APPLICATION',
      subcategory: 'Essays',
      ...range(7, 11, base),
      country: 'United States',
      whyItMatters: 'Essays are your voice when stats look similar to other applicants.',
      responsibility: 'STUDENT',
      priority: 3,
    },
    {
      title: 'Recommendation letters',
      type: 'OTHER',
      category: 'APPLICATION',
      subcategory: 'Recommendations',
      ...range(5, 8, base),
      whyItMatters: 'Give teachers 4–6 weeks and a brag sheet for stronger letters.',
      responsibility: 'STUDENT',
      priority: 3,
    },
    {
      title: 'Review offers & financial aid packages',
      type: 'OTHER',
      category: 'ENROLLMENT',
      subcategory: 'Offers',
      ...range(11, 14, base),
      whyItMatters: 'Compare net cost, not sticker price.',
      responsibility: 'PARENT',
      priority: 2,
    },
  ];

  if (hasUk) {
    tasks.push(
      {
        title: 'UCAS application & personal statement',
        type: 'OTHER',
        category: 'APPLICATION',
        subcategory: 'UCAS',
        ...range(6, 10, base),
        country: 'United Kingdom',
        whyItMatters: 'UK applications are course-specific — research fit early.',
        responsibility: 'STUDENT',
        priority: 3,
      },
      {
        title: 'Student visa / CAS documentation',
        type: 'OTHER',
        category: 'VISA',
        subcategory: 'Visa counselling',
        ...range(12, 15, base),
        country: 'United Kingdom',
        whyItMatters: 'Visa timelines vary by country — start after offer acceptance.',
        responsibility: 'PARENT',
        priority: 3,
      },
    );
  }

  return tasks;
}

export const PLANNER_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Upcoming',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
  OVERDUE: 'Overdue',
  UPCOMING: 'Upcoming',
};
