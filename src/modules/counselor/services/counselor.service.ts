import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class CounselorService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(counselorId: string) {
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: { counselorId },
      include: {
        student: {
          include: {
            profile: true,
            diagnosticResults: { orderBy: { createdAt: 'desc' }, take: 1 },
            collegeRecommendations: { where: { isSaved: true } },
            savedActivities: true,
            applicationDocuments: { where: { deletedAt: null } },
          },
        },
      },
    });

    return {
      caseload: assignments.length,
      students: assignments.map((a) => ({
        id: a.student.id,
        name: a.student.name,
        email: a.student.email,
        profile: a.student.profile,
        diagnosticDone: a.student.profile?.diagnosticCompleted ?? false,
        collegesSaved: a.student.collegeRecommendations.length,
        activitiesSaved: a.student.savedActivities.length,
        documents: a.student.applicationDocuments.length,
        lastDiagnostic: a.student.diagnosticResults[0]?.createdAt,
      })),
    };
  }

  async getMessages(counselorId: string, studentId: string) {
    return this.prisma.counselorMessage.findMany({
      where: { counselorId, studentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(counselorId: string, studentId: string, content: string) {
    return this.prisma.counselorMessage.create({
      data: { counselorId, studentId, content, isFromCounselor: true },
    });
  }

  async getStudentMessages(studentId: string, counselorId: string) {
    return this.prisma.counselorMessage.findMany({
      where: { counselorId, studentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async studentReply(studentId: string, counselorId: string, content: string) {
    return this.prisma.counselorMessage.create({
      data: { counselorId, studentId, content, isFromCounselor: false },
    });
  }
}
