import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OpportunitySyncService } from '../../activities/services/opportunity-sync.service';
import type {
  BulkImportActivitiesDto,
  BulkImportCollegesDto,
  CreateParentLinkDto,
  UpdateApplicationDocumentDto,
  UpdateParentLinkDto,
  UpdateStudentProfileDto,
} from '../dto/admin.dto';

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly opportunitySync: OpportunitySyncService,
  ) {}

  private paginate(page: number, limit: number) {
    const maxPageSize = this.configService.get<number>('pagination.maxPageSize', 100);
    const safeLimit = Math.min(Math.max(limit, 1), maxPageSize);
    const safePage = Math.max(page, 1);
    return { skip: (safePage - 1) * safeLimit, take: safeLimit, safePage, safeLimit };
  }

  private meta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
  }

  async listStudentProfiles(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.StudentProfileWhereInput = search
      ? {
          OR: [
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { board: { contains: search, mode: 'insensitive' } },
            { school: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.studentProfile.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async getStudentProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } },
      },
    });
    if (!profile) throw new NotFoundException('Student profile not found');
    return profile;
  }

  async updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
    await this.getStudentProfile(userId);
    const { goals, preferences, ...rest } = dto;
    return this.prisma.studentProfile.update({
      where: { userId },
      data: {
        ...rest,
        ...(goals !== undefined ? { goals: goals as Prisma.InputJsonValue } : {}),
        ...(preferences !== undefined ? { preferences: preferences as Prisma.InputJsonValue } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listApplicationDocuments(
    page: number,
    limit: number,
    search?: string,
    userId?: string,
    type?: string,
  ) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.ApplicationDocumentWhereInput = {
      deletedAt: null,
      ...(userId ? { userId } : {}),
      ...(type ? { type: type as Prisma.EnumApplicationDocumentTypeFilter['equals'] } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.applicationDocument.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.applicationDocument.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async getApplicationDocument(id: string) {
    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async updateApplicationDocument(id: string, dto: UpdateApplicationDocumentDto) {
    await this.getApplicationDocument(id);
    const { metadata, ...rest } = dto;
    return this.prisma.applicationDocument.update({
      where: { id },
      data: {
        ...rest,
        ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}),
        version: { increment: 1 },
      },
    });
  }

  async deleteApplicationDocument(id: string) {
    await this.getApplicationDocument(id);
    return this.prisma.applicationDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listActivityPlanItems(page: number, limit: number, userId?: string, status?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.ActivityPlanItemWhereInput = {
      ...(userId ? { userId } : {}),
      ...(status ? { status: status as Prisma.EnumActivityPlanStatusFilter['equals'] } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityPlanItem.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          activity: { select: { id: true, title: true, type: true } },
        },
      }),
      this.prisma.activityPlanItem.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async deleteActivityPlanItem(id: string) {
    const item = await this.prisma.activityPlanItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Plan item not found');
    await this.prisma.activityPlanItem.delete({ where: { id } });
    return { success: true };
  }

  async listSavedActivities(page: number, limit: number, userId?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.SavedActivityWhereInput = userId ? { userId } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.savedActivity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          activity: { select: { id: true, title: true, type: true } },
        },
      }),
      this.prisma.savedActivity.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listCollegeRecommendations(page: number, limit: number, userId?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.CollegeRecommendationWhereInput = userId ? { userId } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collegeRecommendation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          college: { select: { id: true, name: true, country: true } },
        },
      }),
      this.prisma.collegeRecommendation.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listHomeschoolProgress(page: number, limit: number, userId?: string, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.HomeschoolProgressWhereInput = {
      ...(userId ? { userId } : {}),
      ...(search ? { unitId: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.homeschoolProgress.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.homeschoolProgress.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async deleteHomeschoolProgress(id: string) {
    const row = await this.prisma.homeschoolProgress.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Progress record not found');
    await this.prisma.homeschoolProgress.delete({ where: { id } });
    return { success: true };
  }

  async listHomeschoolSyllabi(page: number, limit: number, board?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.HomeschoolSyllabusWhereInput = board ? { board } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.homeschoolSyllabus.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.homeschoolSyllabus.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async deleteHomeschoolSyllabus(id: string) {
    const row = await this.prisma.homeschoolSyllabus.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Syllabus cache not found');
    await this.prisma.homeschoolSyllabus.delete({ where: { id } });
    return { success: true };
  }

  async listParentLinks(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.parentLink.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          parent: { select: { id: true, name: true, email: true } },
          student: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.parentLink.count(),
    ]);
    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createParentLink(dto: CreateParentLinkDto) {
    return this.prisma.parentLink.create({ data: dto });
  }

  async updateParentLink(id: string, dto: UpdateParentLinkDto) {
    const row = await this.prisma.parentLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Parent link not found');
    return this.prisma.parentLink.update({ where: { id }, data: dto });
  }

  async deleteParentLink(id: string) {
    const row = await this.prisma.parentLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Parent link not found');
    await this.prisma.parentLink.delete({ where: { id } });
    return { success: true };
  }

  async listJobAssets(page: number, limit: number, userId?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.JobAssetWhereInput = {
      deletedAt: null,
      ...(userId ? { userId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.jobAsset.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.jobAsset.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async deleteJobAsset(id: string) {
    const row = await this.prisma.jobAsset.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Job asset not found');
    return this.prisma.jobAsset.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async listTutoringAttempts(page: number, limit: number, userId?: string, testType?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.TutoringAttemptWhereInput = {
      ...(userId ? { userId } : {}),
      ...(testType ? { testType: testType as Prisma.EnumTutoringTestTypeFilter['equals'] } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tutoringAttempt.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          question: { select: { id: true, question: true, testType: true, metadata: true } },
        },
      }),
      this.prisma.tutoringAttempt.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listTutoringSessions(page: number, limit: number, userId?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.TutoringSessionWhereInput = userId ? { userId } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tutoringSession.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.tutoringSession.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listDiagnosticResults(page: number, limit: number, userId?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.DiagnosticResultWhereInput = userId ? { userId } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.diagnosticResult.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          session: { select: { id: true, status: true, startedAt: true, completedAt: true } },
        },
      }),
      this.prisma.diagnosticResult.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async getDiagnosticResult(sessionId: string) {
    const result = await this.prisma.diagnosticResult.findUnique({
      where: { sessionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        session: true,
      },
    });
    if (!result) throw new NotFoundException('Diagnostic result not found');
    return result;
  }

  async listGatsbyLogs(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.gatsbyBenchmarkLog.findMany({
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, email: true } },
          school: { select: { id: true, name: true } },
        },
      }),
      this.prisma.gatsbyBenchmarkLog.count(),
    ]);
    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listCeiagEncounters(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cEIAGEncounter.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.cEIAGEncounter.count(),
    ]);
    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listUcasApplications(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.uCASApplication.findMany({
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.uCASApplication.count(),
    ]);
    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  syncActivities(scrape?: boolean) {
    return this.opportunitySync.sync({ scrape });
  }

  async bulkImportColleges(dto: BulkImportCollegesDto) {
    let created = 0;
    for (const item of dto.items ?? []) {
      await this.prisma.college.create({ data: item });
      created += 1;
    }
    return { created };
  }

  async bulkImportActivities(dto: BulkImportActivitiesDto) {
    let created = 0;
    for (const item of dto.items ?? []) {
      await this.prisma.activity.create({
        data: { ...item, interests: item.interests ?? [] },
      });
      created += 1;
    }
    return { created };
  }

  async getExtendedStats() {
    const [
      studentProfiles,
      applicationDocuments,
      activityPlanItems,
      homeschoolProgress,
      homeschoolSyllabi,
      parentLinks,
      jobAssets,
      tutoringAttempts,
      collegeRecommendations,
      savedActivities,
      ucasApplications,
    ] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.applicationDocument.count({ where: { deletedAt: null } }),
      this.prisma.activityPlanItem.count(),
      this.prisma.homeschoolProgress.count(),
      this.prisma.homeschoolSyllabus.count(),
      this.prisma.parentLink.count(),
      this.prisma.jobAsset.count({ where: { deletedAt: null } }),
      this.prisma.tutoringAttempt.count(),
      this.prisma.collegeRecommendation.count(),
      this.prisma.savedActivity.count(),
      this.prisma.uCASApplication.count(),
    ]);

    return {
      studentProfiles,
      applicationDocuments,
      activityPlanItems,
      homeschoolProgress,
      homeschoolSyllabi,
      parentLinks,
      jobAssets,
      tutoringAttempts,
      collegeRecommendations,
      savedActivities,
      ucasApplications,
    };
  }

  async listNotifications(
    page: number,
    limit: number,
    filters?: { userId?: string; eventType?: string },
  ) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.NotificationWhereInput = {
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.eventType ? { eventType: filters.eventType as Prisma.EnumNotificationEventTypeFilter['equals'] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          deliveries: { select: { channel: true, status: true, sentAt: true, error: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async listNotificationDeliveries(
    page: number,
    limit: number,
    filters?: { status?: string; channel?: string },
  ) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.NotificationDeliveryWhereInput = {
      ...(filters?.status ? { status: filters.status as NotificationDeliveryStatus } : {}),
      ...(filters?.channel ? { channel: filters.channel as Prisma.EnumNotificationChannelFilter['equals'] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationDelivery.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          notification: {
            select: {
              id: true,
              title: true,
              eventType: true,
              category: true,
              userId: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);
    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async getNotificationStats() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [total, sentToday, failed, byChannel, byEvent] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notificationDelivery.count({
        where: { status: NotificationDeliveryStatus.SENT, sentAt: { gte: since } },
      }),
      this.prisma.notificationDelivery.count({
        where: { status: NotificationDeliveryStatus.FAILED },
      }),
      this.prisma.notificationDelivery.groupBy({
        by: ['channel'],
        _count: { _all: true },
      }),
      this.prisma.notification.groupBy({
        by: ['eventType'],
        _count: { _all: true },
      }),
    ]);
    return {
      totalNotifications: total,
      deliveriesSentToday: sentToday,
      failedDeliveries: failed,
      byChannel: byChannel.map((row) => ({ channel: row.channel, count: row._count._all })),
      byEvent: byEvent.map((row) => ({ eventType: row.eventType, count: row._count._all })),
      deviceTokens: await this.prisma.deviceToken.count(),
    };
  }
}
