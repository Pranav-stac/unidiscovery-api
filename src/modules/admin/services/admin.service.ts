import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from '../../../infrastructure/database/repositories/users.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CreateActivityDto,
  CreateCareerDto,
  CreateCollegeDto,
  CreateCompetitionDto,
  CreateCounselorAssignmentDto,
  CreateDiagnosticTemplateDto,
  CreateMentorDto,
  CreatePlatformConfigDto,
  CreateSchoolDto,
  CreateSubjectDto,
  CreateTutoringQuestionDto,
  CreateUserDto,
  UpdateActivityDto,
  UpdateCareerDto,
  UpdateCollegeDto,
  UpdateCompetitionDto,
  UpdateDiagnosticTemplateDto,
  UpdateMentorDto,
  UpdateMentorConnectionDto,
  UpdatePlatformConfigDto,
  UpdateSchoolDto,
  UpdateSubjectDto,
  UpdateTutoringQuestionDto,
  UpdateUserDto,
} from '../dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private paginate(page: number, limit: number) {
    const maxPageSize = this.configService.get<number>(
      'pagination.maxPageSize',
      100,
    );
    const safeLimit = Math.min(Math.max(limit, 1), maxPageSize);
    const safePage = Math.max(page, 1);
    return { skip: (safePage - 1) * safeLimit, take: safeLimit, safePage, safeLimit };
  }

  private meta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDashboardStats() {
    const [
      students,
      admins,
      counselors,
      parents,
      diagnostics,
      colleges,
      activities,
      careers,
      mentors,
      competitions,
      tutoringQuestions,
      mentorConnections,
      schools,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: UserRole.STUDENT, deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          role: { in: [UserRole.ADMIN, UserRole.PROGRAM_MANAGER] },
          deletedAt: null,
        },
      }),
      this.prisma.user.count({
        where: { role: UserRole.COUNSELOR, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { role: UserRole.PARENT, deletedAt: null },
      }),
      this.prisma.diagnosticSession.count({ where: { status: 'COMPLETED' } }),
      this.prisma.college.count({
        where: { isActive: true, deletedAt: null },
      }),
      this.prisma.activity.count({
        where: { isActive: true, deletedAt: null },
      }),
      this.prisma.career.count({ where: { isActive: true } }),
      this.prisma.mentor.count({ where: { isActive: true } }),
      this.prisma.competition.count({ where: { isActive: true } }),
      this.prisma.tutoringQuestion.count({ where: { isActive: true } }),
      this.prisma.mentorConnection.count({ where: { status: 'PENDING' } }),
      this.prisma.school.count(),
    ]);

    return {
      students,
      admins,
      counselors,
      parents,
      completedDiagnostics: diagnostics,
      colleges,
      activities,
      careers,
      mentors,
      competitions,
      tutoringQuestions,
      pendingMentorConnections: mentorConnections,
      schools,
      platform: this.configService.get<string>('nodeEnv'),
    };
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  async listUsers(page: number, limit: number, role?: UserRole, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, meta: this.meta(safePage, safeLimit, total) };
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already in use');

    const saltRounds = this.configService.get<number>('bcrypt.saltRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role,
    });

    if (dto.role === UserRole.STUDENT) {
      await this.prisma.studentProfile.create({ data: { userId: user.id } });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) {
      const saltRounds = this.configService.get<number>('bcrypt.saltRounds', 12);
      data.passwordHash = await bcrypt.hash(dto.password, saltRounds);
    }

    const updated = await this.prisma.user.update({ where: { id }, data });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
    };
  }

  async deleteUser(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepository.softDelete(id);
    return { success: true };
  }

  // ─── Colleges ────────────────────────────────────────────────────────────

  async listColleges(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.CollegeWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { country: { contains: search, mode: 'insensitive' } },
              { field: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.college.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.college.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createCollege(dto: CreateCollegeDto) {
    return this.prisma.college.create({ data: dto });
  }

  async updateCollege(id: string, dto: UpdateCollegeDto) {
    await this.ensureExists('college', id);
    return this.prisma.college.update({ where: { id }, data: dto });
  }

  async deleteCollege(id: string) {
    await this.ensureExists('college', id);
    return this.prisma.college.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Activities ────────────────────────────────────────────────────────────

  async listActivities(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({ where, skip, take, orderBy: { title: 'asc' } }),
      this.prisma.activity.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createActivity(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        ...dto,
        interests: dto.interests ?? [],
      },
    });
  }

  async updateActivity(id: string, dto: UpdateActivityDto) {
    await this.ensureExists('activity', id);
    return this.prisma.activity.update({ where: { id }, data: dto });
  }

  async deleteActivity(id: string) {
    await this.ensureExists('activity', id);
    return this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Careers ───────────────────────────────────────────────────────────────

  async listCareers(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.CareerWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.career.findMany({ where, skip, take, orderBy: { title: 'asc' } }),
      this.prisma.career.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createCareer(dto: CreateCareerDto) {
    return this.prisma.career.create({
      data: {
        ...dto,
        subjects: dto.subjects ?? [],
        skills: dto.skills ?? [],
      },
    });
  }

  async updateCareer(id: string, dto: UpdateCareerDto) {
    await this.ensureExists('career', id);
    return this.prisma.career.update({ where: { id }, data: dto });
  }

  async deleteCareer(id: string) {
    await this.ensureExists('career', id);
    return this.prisma.career.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Subjects ──────────────────────────────────────────────────────────────

  async listSubjects(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.SubjectWhereInput = search
      ? { title: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({ where, skip, take, orderBy: { title: 'asc' } }),
      this.prisma.subject.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createSubject(dto: CreateSubjectDto) {
    return this.prisma.subject.create({
      data: {
        ...dto,
        careers: dto.careers ?? [],
        levels: dto.levels ?? [],
      },
    });
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    await this.ensureExists('subject', id);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async deleteSubject(id: string) {
    await this.ensureExists('subject', id);
    return this.prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Mentors ───────────────────────────────────────────────────────────────

  async listMentors(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.MentorWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { field: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mentor.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.mentor.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createMentor(dto: CreateMentorDto) {
    return this.prisma.mentor.create({
      data: { ...dto, expertise: dto.expertise ?? [] },
    });
  }

  async updateMentor(id: string, dto: UpdateMentorDto) {
    await this.ensureExists('mentor', id);
    return this.prisma.mentor.update({ where: { id }, data: dto });
  }

  async deleteMentor(id: string) {
    await this.ensureExists('mentor', id);
    return this.prisma.mentor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Competitions ──────────────────────────────────────────────────────────

  async listCompetitions(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.CompetitionWhereInput = search
      ? { title: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.competition.findMany({ where, skip, take, orderBy: { title: 'asc' } }),
      this.prisma.competition.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createCompetition(dto: CreateCompetitionDto) {
    return this.prisma.competition.create({
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async updateCompetition(id: string, dto: UpdateCompetitionDto) {
    await this.ensureExists('competition', id);
    const { deadline, ...rest } = dto;
    return this.prisma.competition.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline !== undefined
          ? { deadline: deadline ? new Date(deadline) : null }
          : {}),
      },
    });
  }

  async deleteCompetition(id: string) {
    await this.ensureExists('competition', id);
    return this.prisma.competition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Tutoring Questions ────────────────────────────────────────────────────

  async listTutoringQuestions(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.TutoringQuestionWhereInput = search
      ? { question: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tutoringQuestion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tutoringQuestion.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createTutoringQuestion(dto: CreateTutoringQuestionDto) {
    return this.prisma.tutoringQuestion.create({
      data: {
        ...dto,
        options: dto.options as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateTutoringQuestion(id: string, dto: UpdateTutoringQuestionDto) {
    await this.ensureExists('tutoringQuestion', id);
    const { options, ...rest } = dto;
    return this.prisma.tutoringQuestion.update({
      where: { id },
      data: {
        ...rest,
        ...(options !== undefined
          ? { options: options as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async deleteTutoringQuestion(id: string) {
    await this.ensureExists('tutoringQuestion', id);
    return this.prisma.tutoringQuestion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Diagnostic Templates ──────────────────────────────────────────────────

  async listDiagnosticTemplates(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.diagnosticTemplate.findMany({
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.diagnosticTemplate.count(),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createDiagnosticTemplate(dto: CreateDiagnosticTemplateDto) {
    return this.prisma.diagnosticTemplate.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        config: dto.config as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateDiagnosticTemplate(id: string, dto: UpdateDiagnosticTemplateDto) {
    await this.ensureExists('diagnosticTemplate', id);
    const { config, ...rest } = dto;
    return this.prisma.diagnosticTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(config !== undefined
          ? { config: config as Prisma.InputJsonValue, version: { increment: 1 } }
          : {}),
      },
    });
  }

  async deleteDiagnosticTemplate(id: string) {
    await this.ensureExists('diagnosticTemplate', id);
    return this.prisma.diagnosticTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listDiagnosticSessions(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.diagnosticSession.findMany({
        skip,
        take,
        orderBy: { startedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          template: { select: { slug: true, title: true } },
        },
      }),
      this.prisma.diagnosticSession.count(),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  // ─── Platform Config ─────────────────────────────────────────────────────────

  async listPlatformConfigs(page: number, limit: number, category?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.PlatformConfigWhereInput = category ? { category } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.platformConfig.findMany({
        where,
        skip,
        take,
        orderBy: { key: 'asc' },
      }),
      this.prisma.platformConfig.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createPlatformConfig(dto: CreatePlatformConfigDto) {
    return this.prisma.platformConfig.create({
      data: {
        key: dto.key,
        value: dto.value as Prisma.InputJsonValue,
        category: dto.category,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async updatePlatformConfig(id: string, dto: UpdatePlatformConfigDto) {
    await this.ensureExists('platformConfig', id);
    const { value, ...rest } = dto;
    return this.prisma.platformConfig.update({
      where: { id },
      data: {
        ...rest,
        ...(value !== undefined ? { value: value as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async deletePlatformConfig(id: string) {
    await this.ensureExists('platformConfig', id);
    await this.prisma.platformConfig.delete({ where: { id } });
    return { success: true };
  }

  // ─── Schools ─────────────────────────────────────────────────────────────────

  async listSchools(page: number, limit: number, search?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.SchoolWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.school.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createSchool(dto: CreateSchoolDto) {
    return this.prisma.school.create({ data: dto });
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    await this.ensureExists('school', id);
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async deleteSchool(id: string) {
    await this.ensureExists('school', id);
    await this.prisma.school.delete({ where: { id } });
    return { success: true };
  }

  // ─── Counselor Assignments ─────────────────────────────────────────────────

  async listCounselorAssignments(page: number, limit: number) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.counselorAssignment.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          counselor: { select: { id: true, name: true, email: true } },
          student: { select: { id: true, name: true, email: true } },
          school: { select: { id: true, name: true } },
        },
      }),
      this.prisma.counselorAssignment.count(),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async createCounselorAssignment(dto: CreateCounselorAssignmentDto) {
    return this.prisma.counselorAssignment.create({ data: dto });
  }

  async deleteCounselorAssignment(id: string) {
    await this.ensureExists('counselorAssignment', id);
    await this.prisma.counselorAssignment.delete({ where: { id } });
    return { success: true };
  }

  // ─── Mentor Connections ──────────────────────────────────────────────────────

  async listMentorConnections(page: number, limit: number, status?: string) {
    const { skip, take, safePage, safeLimit } = this.paginate(page, limit);
    const where: Prisma.MentorConnectionWhereInput = status
      ? { status: status as Prisma.EnumMentorConnectionStatusFilter['equals'] }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mentorConnection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          mentor: { select: { id: true, name: true, field: true } },
        },
      }),
      this.prisma.mentorConnection.count({ where }),
    ]);

    return { items, meta: this.meta(safePage, safeLimit, total) };
  }

  async updateMentorConnection(id: string, dto: UpdateMentorConnectionDto) {
    await this.ensureExists('mentorConnection', id);
    return this.prisma.mentorConnection.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async ensureExists(
    model:
      | 'college'
      | 'activity'
      | 'career'
      | 'subject'
      | 'mentor'
      | 'competition'
      | 'tutoringQuestion'
      | 'diagnosticTemplate'
      | 'platformConfig'
      | 'school'
      | 'counselorAssignment'
      | 'mentorConnection',
    id: string,
  ) {
    const delegates: Record<string, { findUnique: (args: { where: { id: string } }) => Promise<unknown> }> = {
      college: this.prisma.college,
      activity: this.prisma.activity,
      career: this.prisma.career,
      subject: this.prisma.subject,
      mentor: this.prisma.mentor,
      competition: this.prisma.competition,
      tutoringQuestion: this.prisma.tutoringQuestion,
      diagnosticTemplate: this.prisma.diagnosticTemplate,
      platformConfig: this.prisma.platformConfig,
      school: this.prisma.school,
      counselorAssignment: this.prisma.counselorAssignment,
      mentorConnection: this.prisma.mentorConnection,
    };

    const record = await delegates[model].findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`${model} not found`);
  }
}
