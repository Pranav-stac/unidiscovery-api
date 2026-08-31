import { Injectable } from '@nestjs/common';
import { Prisma, UCASApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { gatsbyBenchmarksSeed } from '../../../../prisma/phase1-seed-data';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  getGatsbyBenchmarks() {
    return gatsbyBenchmarksSeed;
  }

  async getStudentGatsbyProgress(userId: string) {
    const logs = await this.prisma.gatsbyBenchmarkLog.findMany({
      where: { studentId: userId },
    });
    return gatsbyBenchmarksSeed.map((b) => {
      const log = logs.find((l) => l.benchmark === b.benchmark);
      return {
        ...b,
        status: log?.status ?? 'not_started',
        evidence: log?.evidence,
        completedAt: log?.completedAt,
      };
    });
  }

  async logGatsbyEncounter(
    userId: string,
    data: {
      benchmark: number;
      title: string;
      evidence?: string;
      status?: string;
    },
  ) {
    return this.prisma.gatsbyBenchmarkLog
      .upsert({
        where: { id: '00000000-0000-0000-0000-000000000000' },
        update: {},
        create: {
          studentId: userId,
          benchmark: data.benchmark,
          title: data.title,
          evidence: data.evidence,
          status: data.status ?? 'in_progress',
          completedAt: data.status === 'completed' ? new Date() : undefined,
        },
      })
      .catch(async () => {
        const existing = await this.prisma.gatsbyBenchmarkLog.findFirst({
          where: { studentId: userId, benchmark: data.benchmark },
        });
        if (existing) {
          return this.prisma.gatsbyBenchmarkLog.update({
            where: { id: existing.id },
            data: {
              evidence: data.evidence,
              status: data.status ?? existing.status,
              completedAt:
                data.status === 'completed' ? new Date() : existing.completedAt,
            },
          });
        }
        return this.prisma.gatsbyBenchmarkLog.create({
          data: {
            studentId: userId,
            benchmark: data.benchmark,
            title: data.title,
            evidence: data.evidence,
            status: data.status ?? 'in_progress',
            completedAt: data.status === 'completed' ? new Date() : undefined,
          },
        });
      });
  }

  async listEncounters(userId: string) {
    return this.prisma.cEIAGEncounter.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEncounter(
    userId: string,
    data: {
      type: string;
      title: string;
      provider?: string;
      notes?: string;
      benchmarks?: number[];
    },
  ) {
    return this.prisma.cEIAGEncounter.create({
      data: {
        studentId: userId,
        type: data.type,
        title: data.title,
        provider: data.provider,
        notes: data.notes,
        benchmarks: data.benchmarks ?? [],
        encounterDate: new Date(),
      },
    });
  }

  async getCeiagContent() {
    return this.prisma.platformConfig.findMany({
      where: { category: 'ceiag', isPublic: true },
    });
  }

  async getUcasApplication(userId: string) {
    return this.prisma.uCASApplication.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertUcasApplication(
    userId: string,
    data: {
      personalStatement?: string;
      courses?: unknown[];
      status?: UCASApplicationStatus;
    },
  ) {
    const existing = await this.getUcasApplication(userId);
    if (existing) {
      return this.prisma.uCASApplication.update({
        where: { id: existing.id },
        data: {
          personalStatement:
            data.personalStatement ?? existing.personalStatement,
          courses: (data.courses ?? existing.courses) as Prisma.InputJsonValue,
          status: data.status ?? existing.status,
        },
      });
    }
    return this.prisma.uCASApplication.create({
      data: {
        userId,
        personalStatement: data.personalStatement,
        courses: (data.courses ?? []) as Prisma.InputJsonValue,
        status: data.status ?? UCASApplicationStatus.DRAFT,
        deadlines: {
          equalConsideration: '2026-01-29',
          finalDeadline: '2026-06-30',
        },
      },
    });
  }

  async getMatReport(schoolId?: string) {
    const schools = schoolId
      ? await this.prisma.school.findMany({ where: { id: schoolId } })
      : await this.prisma.school.findMany();
    const logs = await this.prisma.gatsbyBenchmarkLog.findMany({
      where: schoolId ? { schoolId } : {},
    });
    return schools.map((school) => ({
      school: school.name,
      country: school.country,
      benchmarksCompleted: new Set(
        logs
          .filter((l) => l.schoolId === school.id && l.status === 'completed')
          .map((l) => l.benchmark),
      ).size,
      totalEncounters: logs.filter((l) => l.schoolId === school.id).length,
    }));
  }
}
