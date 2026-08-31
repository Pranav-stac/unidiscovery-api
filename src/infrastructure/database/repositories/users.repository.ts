import { Injectable } from '@nestjs/common';
import { User, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UserEntity = User;
export type CreateUserInput = {
  email: string;
  passwordHash: string;
  name: string;
  role?: UserRole;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async create(data: CreateUserInput): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role ?? UserRole.STUDENT,
      },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async softDelete(id: string): Promise<UserEntity> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async findAll(params: {
    skip: number;
    take: number;
    role?: UserRole;
  }): Promise<{ users: UserEntity[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.role ? { role: params.role } : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }
}
