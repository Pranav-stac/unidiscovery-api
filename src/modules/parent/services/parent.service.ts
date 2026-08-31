import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  async getChildren(parentId: string) {
    const links = await this.prisma.parentLink.findMany({
      where: { parentId, consentGiven: true },
      include: {
        student: {
          include: {
            profile: true,
            careerMaps: { orderBy: { version: 'desc' }, take: 1 },
            collegeRecommendations: {
              where: { isSaved: true },
              include: { college: true },
            },
            savedActivities: { include: { activity: true } },
            applicationDocuments: { where: { deletedAt: null } },
          },
        },
      },
    });
    return links.map((l) => ({
      relationship: l.relationship,
      student: {
        id: l.student.id,
        name: l.student.name,
        profile: l.student.profile,
        careerMap: l.student.careerMaps[0]?.mapData,
        collegesSaved: l.student.collegeRecommendations,
        activities: l.student.savedActivities,
        documents: l.student.applicationDocuments.length,
      },
    }));
  }

  async getChildProgress(parentId: string, studentId: string) {
    const link = await this.prisma.parentLink.findFirst({
      where: { parentId, studentId, consentGiven: true },
    });
    if (!link)
      throw new NotFoundException('Child not linked or consent not given');

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        diagnosticResults: { orderBy: { createdAt: 'desc' }, take: 1 },
        careerMaps: { orderBy: { version: 'desc' }, take: 1 },
        gatsbyLogs: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    return {
      name: student.name,
      profile: student.profile,
      diagnosticReport: student.diagnosticResults[0]?.report,
      careerMap: student.careerMaps[0],
      gatsbyProgress: student.gatsbyLogs,
    };
  }
}
