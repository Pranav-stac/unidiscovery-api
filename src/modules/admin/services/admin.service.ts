import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { UsersRepository } from '../../../infrastructure/database/repositories/users.repository';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getDashboardStats() {
    const [students, admins, diagnostics, colleges, activities] =
      await Promise.all([
        this.prisma.user.count({
          where: { role: UserRole.STUDENT, deletedAt: null },
        }),
        this.prisma.user.count({
          where: {
            role: { in: [UserRole.ADMIN, UserRole.PROGRAM_MANAGER] },
            deletedAt: null,
          },
        }),
        this.prisma.diagnosticSession.count({ where: { status: 'COMPLETED' } }),
        this.prisma.college.count({
          where: { isActive: true, deletedAt: null },
        }),
        this.prisma.activity.count({
          where: { isActive: true, deletedAt: null },
        }),
      ]);

    return {
      students,
      admins,
      completedDiagnostics: diagnostics,
      colleges,
      activities,
      platform: this.configService.get<string>('nodeEnv'),
    };
  }

  async listUsers(page: number, limit: number, role?: UserRole) {
    const maxPageSize = this.configService.get<number>(
      'pagination.maxPageSize',
      100,
    );
    const safeLimit = Math.min(Math.max(limit, 1), maxPageSize);
    const skip = (Math.max(page, 1) - 1) * safeLimit;

    const { users, total } = await this.usersRepository.findAll({
      skip,
      take: safeLimit,
      role,
    });

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      })),
      meta: {
        page: Math.max(page, 1),
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
