import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorConnectionStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class MentorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(field?: string) {
    return this.prisma.mentor.findMany({
      where: {
        isActive: true,
        ...(field ? { field: { contains: field, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async connect(userId: string, mentorId: string, message?: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { id: mentorId },
    });
    if (!mentor) throw new NotFoundException('Mentor not found');
    return this.prisma.mentorConnection.upsert({
      where: { userId_mentorId: { userId, mentorId } },
      update: { message, status: MentorConnectionStatus.PENDING },
      create: {
        userId,
        mentorId,
        message,
        status: MentorConnectionStatus.PENDING,
      },
      include: { mentor: true },
    });
  }

  myConnections(userId: string) {
    return this.prisma.mentorConnection.findMany({
      where: { userId },
      include: { mentor: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
