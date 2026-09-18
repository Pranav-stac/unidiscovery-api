import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityPlanStatus,
  ActivityType,
  PlanCategory,
  PlanResponsibility,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ActivitiesService } from '../../activities/services/activities.service';
import { daysUntilDeadline, opportunityDetails } from '../../activities/utils/opportunity-score.util';
import { fallbackUsRoadmap, type RoadmapTaskInput } from '../data/roadmap-templates';
import {
  deriveTemporalStatus,
  type TemporalPlanStatus,
} from '../utils/planner-status.util';

type PlanRow = Awaited<ReturnType<ActivityPlannerService['fetchRow']>>;

function isValidDate(value?: Date | null) {
  return Boolean(value && !Number.isNaN(value.getTime()));
}

function parseRoadmapDate(value: string | Date | undefined, monthOffset: number) {
  if (value instanceof Date && isValidDate(value)) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (isValidDate(parsed)) return parsed;
  }
  const fallback = new Date();
  fallback.setHours(0, 0, 0, 0);
  fallback.setMonth(fallback.getMonth() + monthOffset);
  return fallback;
}

function normalizeRoadmapTask(task: RoadmapTaskInput, index: number): RoadmapTaskInput {
  const startDate = parseRoadmapDate(task.startDate, 0);
  let dueDate = parseRoadmapDate(task.dueDate, 1);
  if (dueDate.getTime() <= startDate.getTime()) {
    dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  return {
    ...task,
    title: task.title?.trim() || `Roadmap task ${index + 1}`,
    startDate,
    dueDate,
    priority: task.priority ?? 2,
    responsibility: task.responsibility ?? 'STUDENT',
  };
}

@Injectable()
export class ActivityPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
    private readonly geminiService: GeminiService,
  ) {}

  private async fetchRow(userId: string, id: string) {
    const row = await this.prisma.activityPlanItem.findFirst({
      where: { id, userId },
      include: { activity: true },
    });
    if (!row) throw new NotFoundException('Plan item not found');
    return row;
  }

  private enrich(row: PlanRow) {
    const fromActivity = row.activity ? daysUntilDeadline(row.activity.metadata) : null;
    let fromDue: number | null = null;
    if (row.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      fromDue = Math.round((row.dueDate.getTime() - today.getTime()) / 86400000);
    } else if (row.targetYear && row.targetMonth) {
      const date = new Date(row.targetYear, row.targetMonth - 1, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      fromDue = Math.round((date.getTime() - today.getTime()) / 86400000);
    }

    const temporalStatus = deriveTemporalStatus(
      row.status,
      row.startDate,
      row.dueDate,
    );

    return {
      ...row,
      daysUntilDeadline: fromActivity ?? fromDue,
      temporalStatus,
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.activityPlanItem.findMany({
      where: { userId },
      include: { activity: true },
      orderBy: [{ dueDate: 'asc' }, { startDate: 'asc' }, { priority: 'desc' }],
    });
    return rows.map((row) => this.enrich(row));
  }

  async dashboard(userId: string) {
    const [items, competitions, suggested, profile] = await Promise.all([
      this.list(userId),
      this.listCompetitions(),
      this.activitiesService.recommend(userId).catch(() => []),
      this.prisma.studentProfile.findUnique({ where: { userId } }),
    ]);

    const plannedIds = new Set(items.map((item) => item.activityId).filter(Boolean));
    const upcoming = items
      .filter((item) => item.temporalStatus !== 'COMPLETED')
      .filter((item) => item.daysUntilDeadline == null || item.daysUntilDeadline <= 45)
      .slice(0, 8);

    const countries = [
      ...new Set(
        items.map((i) => i.country).filter(Boolean) as string[],
      ),
    ];
    if (profile?.targetCountries?.length) {
      profile.targetCountries.forEach((c) => {
        if (!countries.includes(c)) countries.push(c);
      });
    }

    const categoryCounts = this.countBy(items, 'category');
    const temporalCounts = this.countBy(items, 'temporalStatus');

    const timeline = this.buildTimeline(items);

    return {
      profile: profile
        ? {
            grade: profile.grade,
            targetDegree: profile.targetDegree,
            targetCountries: profile.targetCountries ?? [],
            stream: profile.stream,
            school: profile.school,
          }
        : null,
      items,
      timeline,
      countries,
      categories: categoryCounts,
      temporal: temporalCounts,
      competitions,
      upcoming,
      suggested: suggested
        .filter((row: { activity: { id: string } }) => !plannedIds.has(row.activity.id))
        .slice(0, 6),
      stats: {
        planned: items.filter((item) => item.status === 'PLANNED').length,
        inProgress: items.filter((item) => item.status === 'IN_PROGRESS').length,
        completed: items.filter((item) => item.temporalStatus === 'COMPLETED').length,
        dueSoon: items.filter(
          (item) =>
            item.daysUntilDeadline != null &&
            item.daysUntilDeadline <= 14 &&
            item.temporalStatus !== 'COMPLETED',
        ).length,
        overdue: items.filter((item) => item.temporalStatus === 'OVERDUE').length,
        total: items.length,
      },
    };
  }

  private countBy<T extends string>(items: Array<Record<string, unknown>>, key: string) {
    const map: Record<string, number> = {};
    for (const item of items) {
      const value = String(item[key] ?? 'OTHER');
      map[value] = (map[value] ?? 0) + 1;
    }
    return map;
  }

  private buildTimeline(items: Array<ReturnType<ActivityPlannerService['enrich']>>) {
    const dated = items.filter((item) => item.startDate || item.dueDate);
    if (!dated.length) return { months: [], bars: [] };

    const dates = dated.flatMap((item) =>
      [item.startDate, item.dueDate].filter(Boolean) as Date[],
    );
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    min.setDate(1);
    max.setDate(1);
    max.setMonth(max.getMonth() + 1);

    const months: Array<{ key: string; label: string; year: number; month: number }> = [];
    const cursor = new Date(min);
    while (cursor <= max) {
      months.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
        label: cursor.toLocaleString('en', { month: 'short' }),
        year: cursor.getFullYear(),
        month: cursor.getMonth() + 1,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const spanMs = max.getTime() - min.getTime() || 1;
    const bars = dated.map((item) => {
      const start = item.startDate ?? item.dueDate!;
      const end = item.dueDate ?? item.startDate!;
      const left = ((start.getTime() - min.getTime()) / spanMs) * 100;
      const width = Math.max(4, ((end.getTime() - start.getTime()) / spanMs) * 100 || 8);
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        temporalStatus: item.temporalStatus,
        left: Math.max(0, Math.min(96, left)),
        width: Math.min(100 - left, width),
        startDate: start.toISOString(),
        dueDate: end.toISOString(),
      };
    });

    return { months, bars, rangeStart: min.toISOString(), rangeEnd: max.toISOString() };
  }

  async create(
    userId: string,
    data: {
      title: string;
      type: ActivityType;
      category?: PlanCategory;
      subcategory?: string;
      activityId?: string;
      startDate?: Date;
      dueDate?: Date;
      targetMonth?: number;
      targetYear?: number;
      country?: string;
      priority?: number;
      notes?: string;
      description?: string;
      whyItMatters?: string;
      responsibility?: PlanResponsibility;
      linkedCareer?: string;
    },
  ) {
    const startDate = isValidDate(data.startDate) ? data.startDate : undefined;
    const dueDate = isValidDate(data.dueDate) ? data.dueDate : undefined;
    const targetMonth =
      dueDate?.getMonth() !== undefined
        ? dueDate.getMonth() + 1
        : Number.isFinite(data.targetMonth)
          ? data.targetMonth
          : undefined;
    const targetYear =
      dueDate?.getFullYear() ??
      (Number.isFinite(data.targetYear) ? data.targetYear : undefined);

    const row = await this.prisma.activityPlanItem.create({
      data: {
        userId,
        title: data.title,
        type: data.type,
        category: data.category ?? 'OTHER',
        subcategory: data.subcategory,
        activityId: data.activityId,
        startDate,
        dueDate,
        targetMonth,
        targetYear,
        country: data.country,
        priority: data.priority ?? 2,
        notes: data.notes,
        description: data.description,
        whyItMatters: data.whyItMatters,
        responsibility: data.responsibility ?? 'STUDENT',
        linkedCareer: data.linkedCareer,
      },
      include: { activity: true },
    });
    return this.enrich(row);
  }

  async update(
    userId: string,
    id: string,
    data: Partial<{
      title: string;
      status: ActivityPlanStatus;
      category: PlanCategory;
      subcategory: string;
      startDate: Date | null;
      dueDate: Date | null;
      targetMonth: number;
      targetYear: number;
      country: string;
      priority: number;
      notes: string;
      description: string;
      whyItMatters: string;
      responsibility: PlanResponsibility;
    }>,
  ) {
    await this.fetchRow(userId, id);
    const row = await this.prisma.activityPlanItem.update({
      where: { id },
      data,
      include: { activity: true },
    });
    return this.enrich(row);
  }

  async remove(userId: string, id: string) {
    await this.fetchRow(userId, id);
    await this.prisma.activityPlanItem.delete({ where: { id } });
    return { deleted: true };
  }

  async listCompetitions() {
    return this.prisma.competition.findMany({
      where: { isActive: true },
      orderBy: { deadline: 'asc' },
    });
  }

  async addFromActivity(userId: string, activityId: string) {
    const existing = await this.prisma.activityPlanItem.findFirst({
      where: { userId, activityId },
    });
    if (existing) {
      const row = await this.prisma.activityPlanItem.findFirstOrThrow({
        where: { id: existing.id },
        include: { activity: true },
      });
      return this.enrich(row);
    }

    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');
    const details = opportunityDetails(activity.metadata);
    const deadline = details.deadline ? new Date(details.deadline) : null;
    const validDeadline = deadline && !Number.isNaN(deadline.getTime()) ? deadline : new Date();
    const start = new Date(validDeadline);
    start.setMonth(start.getMonth() - 1);

    return this.create(userId, {
      title: activity.title,
      type: activity.type,
      category: 'PROFILE',
      activityId: activity.id,
      startDate: start,
      dueDate: validDeadline,
      targetMonth: validDeadline.getMonth() + 1,
      targetYear: validDeadline.getFullYear(),
      description: activity.description ?? undefined,
      notes: activity.description ?? undefined,
    });
  }

  async generateRoadmap(userId: string, replace = false) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    const countries = profile?.targetCountries ?? ['United States'];
    const context = {
      grade: profile?.grade,
      targetDegree: profile?.targetDegree,
      targetCountries: countries,
      stream: profile?.stream,
      interests: profile?.interests ?? [],
      strengths: profile?.strengths ?? [],
    };

    let tasks: RoadmapTaskInput[] = [];
    let source: 'ai' | 'template' = 'template';

    if (this.geminiService.isConfigured()) {
      const ai = await this.geminiService.generateStructured<{
        tasks: Array<{
          title: string;
          type: ActivityType;
          category: PlanCategory;
          subcategory?: string;
          startDate: string;
          dueDate: string;
          country?: string;
          description?: string;
          whyItMatters?: string;
          responsibility?: PlanResponsibility;
          priority?: number;
        }>;
      }>({
        systemPrompt:
          'You are an expert college admissions counselor. Generate a personalized admission roadmap as JSON.',
        schemaDescription: `{
  "tasks": [{
    "title": "string",
    "type": "COMPETITION|INTERNSHIP|SUMMER_PROGRAM|PROJECT|VOLUNTEER|OTHER",
    "category": "ACADEMICS|TEST_PREP|PROFILE|APPLICATION|INTERVIEW|ENROLLMENT|VISA|OTHER",
    "subcategory": "string optional",
    "startDate": "ISO date",
    "dueDate": "ISO date",
    "country": "string optional",
    "description": "string",
    "whyItMatters": "string",
    "responsibility": "STUDENT|PARENT|COUNSELOR",
    "priority": 1-3
  }]
}`,
        userPrompt: `Student context: ${JSON.stringify(context)}. Generate 12-18 tasks spanning academics, test prep, profile building, applications, enrollment, and visa if international. Use realistic dates starting from today (${new Date().toISOString().slice(0, 10)}).`,
        fallback: { tasks: [] },
      });

      if (ai.tasks?.length) {
        tasks = ai.tasks.map((task, index) =>
          normalizeRoadmapTask(
            {
              ...task,
              startDate: parseRoadmapDate(task.startDate, 0),
              dueDate: parseRoadmapDate(task.dueDate, 1),
              responsibility: task.responsibility ?? 'STUDENT',
            },
            index,
          ),
        );
        source = 'ai';
      }
    }

    if (!tasks.length) {
      tasks = fallbackUsRoadmap(countries);
      source = 'template';
    }

    tasks = tasks.map((task, index) => normalizeRoadmapTask(task, index));

    if (replace) {
      await this.prisma.activityPlanItem.deleteMany({ where: { userId } });
    }

    const created = await Promise.all(
      tasks.map((task) =>
        this.create(userId, {
          title: task.title,
          type: task.type,
          category: task.category,
          subcategory: task.subcategory,
          startDate: task.startDate,
          dueDate: task.dueDate,
          country: task.country,
          description: task.description,
          whyItMatters: task.whyItMatters,
          responsibility: task.responsibility ?? 'STUDENT',
          priority: task.priority ?? 2,
        }),
      ),
    );

    return {
      created: created.length,
      items: created,
      source,
    };
  }

  async enrichTask(userId: string, id: string) {
    const row = await this.fetchRow(userId, id);
    if (!this.geminiService.isConfigured()) {
      return this.enrich(row);
    }

    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    const result = await this.geminiService.generateStructured<{
      description?: string;
      whyItMatters?: string;
      subcategory?: string;
      tips?: string[];
    }>({
      systemPrompt: 'Enrich a student admission planner task with actionable guidance.',
      schemaDescription: `{
  "description": "2-3 sentences on what to do",
  "whyItMatters": "2-3 sentences on admissions impact",
  "subcategory": "short label",
  "tips": ["bullet tips"]
}`,
      userPrompt: `Task: ${row.title}. Category: ${row.category}. Student: grade ${profile?.grade}, targets ${profile?.targetCountries?.join(', ')}, degree ${profile?.targetDegree}.`,
      fallback: {
        description: row.description ?? '',
        whyItMatters: row.whyItMatters ?? '',
        subcategory: row.subcategory ?? '',
        tips: [],
      },
    });

    const updated = await this.prisma.activityPlanItem.update({
      where: { id },
      data: {
        description: result.description || row.description,
        whyItMatters: result.whyItMatters || row.whyItMatters,
        subcategory: result.subcategory || row.subcategory,
        notes: result.tips?.length ? result.tips.join('\n') : row.notes,
      },
      include: { activity: true },
    });

    return this.enrich(updated);
  }
}
