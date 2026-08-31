import { PrismaClient } from '@prisma/client';
import {
  activitiesSeed,
  collegesSeed,
  platformConfigSeed,
  tutoringQuestionsSeed,
} from './seed-data';
import {
  careersSeed,
  subjectsSeed,
  mentorsSeed,
  competitionsSeed,
  schoolsSeed,
  ceiagContentSeed,
} from './phase1-seed-data';
import {
  expandedCollegesSeed,
  expandedCareersSeed,
  expandedActivitiesSeed,
  expandedMentorsSeed,
} from './expanded-seed-data';
import { applyCollegeMetadataOverrides } from './college-metadata-overrides';

const allColleges = [...collegesSeed, ...expandedCollegesSeed];
const allCareers = [...careersSeed, ...expandedCareersSeed];
const allActivities = [...activitiesSeed, ...expandedActivitiesSeed];
const allMentors = [...mentorsSeed, ...expandedMentorsSeed];

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.diagnosticTemplate.upsert({
    where: { slug: 'adaptive-discovery-v1' },
    update: {},
    create: {
      slug: 'adaptive-discovery-v1',
      title: 'Adaptive Student Discovery',
      description: 'AI-assisted minimal diagnostic flow',
      config: { version: 1, maxSteps: 6, adaptive: true },
    },
  });

  for (const college of allColleges.map(applyCollegeMetadataOverrides)) {
    const existing = await prisma.college.findFirst({ where: { name: college.name } });
    if (existing) {
      await prisma.college.update({ where: { id: existing.id }, data: college });
    } else {
      await prisma.college.create({ data: college });
    }
  }

  for (const activity of allActivities) {
    const existing = await prisma.activity.findFirst({ where: { title: activity.title } });
    if (!existing) {
      await prisma.activity.create({ data: activity });
    }
  }

  for (const question of tutoringQuestionsSeed) {
    const existing = await prisma.tutoringQuestion.findFirst({
      where: { question: question.question },
    });
    if (!existing) {
      await prisma.tutoringQuestion.create({ data: question });
    }
  }

  for (const config of platformConfigSeed) {
    await prisma.platformConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, category: config.category, isPublic: config.isPublic },
      create: config,
    });
  }

  for (const career of allCareers) {
    await prisma.career.upsert({
      where: { slug: career.slug },
      update: career,
      create: career,
    });
  }

  for (const subject of subjectsSeed) {
    await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: subject,
      create: subject,
    });
  }

  for (const mentor of allMentors) {
    const existing = await prisma.mentor.findFirst({ where: { name: mentor.name } });
    if (!existing) await prisma.mentor.create({ data: mentor });
  }

  for (const comp of competitionsSeed) {
    const existing = await prisma.competition.findFirst({ where: { title: comp.title } });
    if (!existing) await prisma.competition.create({ data: comp });
  }

  for (const school of schoolsSeed) {
    const existing = await prisma.school.findFirst({ where: { name: school.name } });
    if (!existing) await prisma.school.create({ data: school });
  }

  for (const config of ceiagContentSeed) {
    await prisma.platformConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, category: config.category, isPublic: config.isPublic },
      create: config,
    });
  }

  const [colleges, activities, questions, careers, subjects] = await Promise.all([
    prisma.college.count(),
    prisma.activity.count(),
    prisma.tutoringQuestion.count(),
    prisma.career.count(),
    prisma.subject.count(),
  ]);

  console.log(`Seed complete: ${colleges} colleges, ${activities} activities, ${questions} tutoring, ${careers} careers, ${subjects} subjects`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
