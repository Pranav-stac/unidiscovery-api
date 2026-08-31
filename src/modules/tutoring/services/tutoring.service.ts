import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TutoringTestType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';

@Injectable()
export class TutoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async getQuestions(testType: TutoringTestType, limit = 3) {
    const questions = await this.prisma.tutoringQuestion.findMany({
      where: { testType, isActive: true },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return questions.map((q) => ({
      id: q.id,
      testType: q.testType,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    }));
  }

  async submitAttempt(
    userId: string,
    questionId: string,
    testType: TutoringTestType,
    answer: string,
  ) {
    const question = await this.prisma.tutoringQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found');

    const isCorrect =
      question.correctAnswer?.toLowerCase() === answer.toLowerCase();

    await this.prisma.tutoringAttempt.create({
      data: { userId, questionId, testType, answer, isCorrect },
    });

    let explanation = question.explanation ?? '';
    if (!isCorrect) {
      explanation = await this.geminiService.generateText(
        `Explain why "${question.correctAnswer}" is correct for: ${question.question}. Keep it under 50 words, student-friendly.`,
      );
    }

    return { isCorrect, correctAnswer: question.correctAnswer, explanation };
  }

  async getProgress(userId: string, testType?: TutoringTestType) {
    const attempts = await this.prisma.tutoringAttempt.findMany({
      where: { userId, ...(testType ? { testType } : {}) },
    });
    const total = attempts.length;
    const correct = attempts.filter((a) => a.isCorrect).length;
    return {
      total,
      correct,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    };
  }

  async chat(userId: string, testType: TutoringTestType, message: string) {
    const session = await this.prisma.tutoringSession.create({
      data: {
        userId,
        testType,
        messages: [{ role: 'user', content: message }] as Prisma.InputJsonValue,
      },
    });

    const reply = await this.geminiService.generateText(
      `You are a friendly ${testType} tutor. Answer this student question clearly in under 100 words:\n${message}`,
    );

    const messages = [
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    ];

    await this.prisma.tutoringSession.update({
      where: { id: session.id },
      data: { messages: messages as Prisma.InputJsonValue },
    });

    return { reply, sessionId: session.id };
  }
}
