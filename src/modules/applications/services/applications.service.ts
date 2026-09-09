import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationDocumentType, StudentProfile } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';

export interface GenerateDocumentOptions {
  prompt?: string;
  targetCollege?: string;
  targetCountry?: string;
  tone?: string;
  wordLimit?: number;
  additionalInstructions?: string;
  excludedContextIds?: string[];
  attachmentNames?: string[];
}

export interface AgentChatOptions extends GenerateDocumentOptions {
  message: string;
  documentId?: string;
  currentContent?: string;
}

interface ParsedDocSummary {
  sourceFile?: string;
  documentType?: string;
  semester?: string;
  summary?: string;
  subjects?: Array<{ name: string; grade?: string; score?: number }>;
  institution?: string;
  program?: string;
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly profileContext: ProfileContextService,
  ) {}

  async list(userId: string) {
    return this.prisma.applicationDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(userId: string, id: string) {
    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(
    userId: string,
    id: string,
    data: { title?: string; content?: string },
  ) {
    await this.getById(userId, id);
    return this.prisma.applicationDocument.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        version: { increment: 1 },
      },
    });
  }

  async refine(userId: string, id: string, instruction: string) {
    const content = await this.collectStreamedText(
      this.streamRefineContent(userId, id, instruction),
    );
    return this.persistRefinedDocument(userId, id, instruction, content);
  }

  async generate(
    userId: string,
    type: ApplicationDocumentType,
    options: GenerateDocumentOptions = {},
  ) {
    const content = await this.collectStreamedText(
      this.streamGenerateContent(userId, type, options),
    );
    return this.persistGeneratedDocument(userId, type, options, content);
  }

  async streamGenerateToResponse(
    userId: string,
    type: ApplicationDocumentType,
    options: GenerateDocumentOptions,
    res: Response,
  ) {
    await this.pipeStreamToSse(
      res,
      this.streamGenerateContent(userId, type, options),
      async (content) => this.persistGeneratedDocument(userId, type, options, content),
      { tool: 'generate_document', action: 'generate' },
    );
  }

  async streamRefineToResponse(
    userId: string,
    id: string,
    instruction: string,
    res: Response,
  ) {
    await this.pipeStreamToSse(
      res,
      this.streamRefineContent(userId, id, instruction),
      async (content) => this.persistRefinedDocument(userId, id, instruction, content),
      { tool: 'edit_document', action: 'edit' },
    );
  }

  async streamAgentToResponse(
    userId: string,
    type: ApplicationDocumentType,
    options: AgentChatOptions,
    res: Response,
  ) {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const mode = this.resolveAgentMode(options);
    const tool = mode === 'edit' ? 'edit_document' : 'generate_document';

    if (mode === 'edit' && options.documentId) {
      await this.pipeStreamToSse(
        res,
        this.streamAgentContent(profile, type, options, 'edit'),
        async (content) =>
          this.persistRefinedDocument(userId, options.documentId!, options.message, content),
        { tool, action: 'edit' },
      );
      return;
    }

    await this.pipeStreamToSse(
      res,
      this.streamAgentContent(profile, type, options, 'generate'),
      async (content) => this.persistGeneratedDocument(userId, type, options, content),
      { tool, action: 'generate' },
    );
  }

  private resolveAgentMode(options: AgentChatOptions): 'generate' | 'edit' {
    const hasDraft = Boolean(options.documentId && options.currentContent?.trim());
    if (!hasDraft) return 'generate';

    const msg = options.message.toLowerCase();
    const wantsNew =
      /\b(generate|write|create|draft|from scratch|new document|start over)\b/.test(msg);
    const wantsEdit =
      /\b(edit|change|replace|shorten|lengthen|remove|add|rewrite|fix|update|revise|rephrase|paragraph|section)\b/.test(
        msg,
      );

    if (wantsNew && !wantsEdit) return 'generate';
    return 'edit';
  }

  private async *streamAgentContent(
    profile: StudentProfile,
    type: ApplicationDocumentType,
    options: AgentChatOptions,
    mode: 'generate' | 'edit',
  ): AsyncGenerator<string> {
    const prompt =
      mode === 'edit'
        ? this.buildAgentEditPrompt(profile, type, options)
        : this.buildAgentGeneratePrompt(profile, type, options);
    yield* this.geminiService.streamGenerateText(prompt);
  }

  private async *streamGenerateContent(
    userId: string,
    type: ApplicationDocumentType,
    options: GenerateDocumentOptions,
  ): AsyncGenerator<string> {
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const prompt = this.buildGeneratePrompt(profile, type, options);
    yield* this.geminiService.streamGenerateText(prompt);
  }

  private async *streamRefineContent(
    userId: string,
    id: string,
    instruction: string,
  ): AsyncGenerator<string> {
    const doc = await this.getById(userId, id);
    const profile = await this.profileContext.getProfileOrThrow(userId);
    const prompt = this.buildRefinePrompt(doc.type, doc.content, profile, instruction);
    yield* this.geminiService.streamGenerateText(prompt);
  }

  private async collectStreamedText(
    stream: AsyncGenerator<string>,
  ): Promise<string> {
    let content = '';
    for await (const chunk of stream) {
      content += chunk;
    }
    return content;
  }

  private async pipeStreamToSse(
    res: Response,
    stream: AsyncGenerator<string>,
    persist: (content: string) => Promise<unknown>,
    meta?: { tool?: string; action?: string },
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    if (meta?.tool) {
      res.write(`data: ${JSON.stringify({ tool: meta.tool })}\n\n`);
    }

    let content = '';
    try {
      for await (const chunk of stream) {
        content += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      const document = await persist(content);
      res.write(
        `data: ${JSON.stringify({ done: true, document, action: meta?.action })}\n\n`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stream failed';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  private buildFilteredContext(
    profile: StudentProfile,
    excludedIds: string[] = [],
  ): string {
    const excluded = new Set(excludedIds);
    const transcript = profile.transcriptData as {
      degree?: string;
      program?: string;
      institution?: string;
      cgpa?: number;
      studentName?: string;
      documents?: ParsedDocSummary[];
      semesterRecords?: Array<{ semester?: string; sgpa?: number; percentage?: number }>;
    } | null;

    let uploadedDocuments =
      transcript?.documents?.map((d) => ({
        file: d.sourceFile ?? 'Uploaded document',
        type: d.documentType,
        semester: d.semester,
        institution: d.institution,
        program: d.program,
        summary: d.summary,
        subjects: d.subjects?.map((s) => ({
          name: s.name,
          grade: s.grade,
          score: s.score,
        })),
      })) ?? [];

    uploadedDocuments = uploadedDocuments.filter(
      (d) => !excluded.has(`doc-${d.file}`),
    );

    const profileData = excluded.has('profile')
      ? {}
      : JSON.parse(this.profileContext.buildContextText(profile));

    return JSON.stringify(
      {
        ...(excluded.has('profile') ? {} : { studentName: transcript?.studentName }),
        ...(!excluded.has('profile')
          ? {
              academicLevel: [
                profile.classGroup ? `Class group: ${profile.classGroup}` : null,
                profile.grade ? `Grade: ${profile.grade}` : null,
                profile.stream ? `Stream: ${profile.stream}` : null,
                profile.board ? `Board: ${profile.board}` : null,
                profile.school ? `School: ${profile.school}` : null,
                excluded.has('score') ? null : profile.percentage ? `Overall: ${profile.percentage}%` : null,
              ]
                .filter(Boolean)
                .join(' · '),
            }
          : {}),
        profile: profileData,
        ...(!excluded.has('target-degree') ? { targetDegree: profile.targetDegree } : {}),
        ...(!excluded.has('interests') ? { interests: profile.interests } : {}),
        ...(!excluded.has('strengths') ? { strengths: profile.strengths } : {}),
        subjects: excluded.has('profile') ? undefined : profile.subjects,
        goals: excluded.has('profile') ? undefined : profile.goals,
        aiSummary: excluded.has('profile') ? undefined : profile.aiSummary,
        resumeSummary: excluded.has('resume') ? undefined : profile.resumeSummary,
        resumeStructured: excluded.has('resume')
          ? undefined
          : (profile.resumeData as Record<string, unknown> | null),
        uploadedDocuments,
        diagnosticHeadline: excluded.has('diagnostic') ? undefined : undefined,
        diagnosticStrengths: excluded.has('strengths') ? undefined : undefined,
        diagnosticSkillGaps: excluded.has('gaps') ? undefined : undefined,
        transcriptHighlights: excluded.has('profile')
          ? undefined
          : {
              institution: transcript?.institution,
              program: transcript?.program,
              degree: transcript?.degree,
              cgpa: transcript?.cgpa,
              semesterRecords: transcript?.semesterRecords,
            },
      },
      null,
      2,
    );
  }

  private buildAgentToolsPreamble(): string {
    return `You are an agentic application-writing assistant. You operate through tools:
- generate_document: write a new full draft from scratch
- edit_document: revise the entire draft (search/replace sections, shorten, expand, change tone, add facts from context)
- read_context: use only enabled student context — profile, resume, marksheets, diagnostic

Return ONLY the final document markdown in the canvas. No tool JSON, no preamble, no code fences.`;
  }

  private buildAgentGeneratePrompt(
    profile: StudentProfile,
    type: ApplicationDocumentType,
    options: AgentChatOptions,
  ): string {
    const {
      prompt,
      targetCollege,
      targetCountry,
      tone = 'authentic, first-person, specific',
      wordLimit = type === 'LETTER_OF_RECOMMENDATION' ? 350 : 300,
      message,
      attachmentNames,
      excludedContextIds,
    } = options;

    const attachments = attachmentNames?.length
      ? `\nUser attached files (reference by name): ${attachmentNames.join(', ')}`
      : '';

    return `${this.buildAgentToolsPreamble()}

TOOL: generate_document

${this.buildGeneratePrompt(profile, type, {
  prompt,
  targetCollege,
  targetCountry,
  tone,
  wordLimit,
  additionalInstructions: message,
  excludedContextIds,
  attachmentNames,
})}${attachments}`;
  }

  private buildAgentEditPrompt(
    profile: StudentProfile,
    type: ApplicationDocumentType,
    options: AgentChatOptions,
  ): string {
    const context = this.buildFilteredContext(profile, options.excludedContextIds);
    const { message, currentContent = '', attachmentNames } = options;
    const attachments = attachmentNames?.length
      ? `\nUser attached files for this edit: ${attachmentNames.join(', ')}`
      : '';

    return `${this.buildAgentToolsPreamble()}

TOOL: edit_document

You are editing a ${type} for college applications.

Current draft:
---
${currentContent}
---

Enabled student context:
${context}${attachments}

${this.buildPersonalizationRules(profile)}

User request: ${message}

Apply the request using edit/search-replace logic on the draft. Return ONLY the complete revised document.`;
  }

  private buildRichContext(profile: StudentProfile): string {
    const transcript = profile.transcriptData as {
      degree?: string;
      program?: string;
      institution?: string;
      cgpa?: number;
      studentName?: string;
      documents?: ParsedDocSummary[];
      semesterRecords?: Array<{ semester?: string; sgpa?: number; percentage?: number }>;
    } | null;

    const uploadedDocuments = (transcript?.documents ?? []).map((d) => ({
      file: d.sourceFile ?? 'Uploaded document',
      type: d.documentType,
      semester: d.semester,
      institution: d.institution,
      program: d.program,
      summary: d.summary,
      subjects: d.subjects?.map((s) => ({
        name: s.name,
        grade: s.grade,
        score: s.score,
      })),
    }));

    const resumeData = profile.resumeData as Record<string, unknown> | null;

    const academicLevel = [
      profile.classGroup ? `Class group: ${profile.classGroup}` : null,
      profile.grade ? `Grade: ${profile.grade}` : null,
      profile.stream ? `Stream: ${profile.stream}` : null,
      profile.board ? `Board: ${profile.board}` : null,
      profile.school ? `School: ${profile.school}` : null,
      profile.percentage ? `Overall: ${profile.percentage}%` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return JSON.stringify(
      {
        studentName: transcript?.studentName,
        academicLevel,
        profile: JSON.parse(this.profileContext.buildContextText(profile)),
        targetDegree: profile.targetDegree,
        targetCountries: profile.targetCountries,
        interests: profile.interests,
        strengths: profile.strengths,
        subjects: profile.subjects,
        goals: profile.goals,
        aiSummary: profile.aiSummary,
        resumeSummary: profile.resumeSummary,
        resumeStructured: resumeData,
        uploadedDocuments,
        transcriptHighlights: {
          institution: transcript?.institution,
          program: transcript?.program,
          degree: transcript?.degree,
          cgpa: transcript?.cgpa,
          semesterRecords: transcript?.semesterRecords,
        },
      },
      null,
      2,
    );
  }

  private buildPersonalizationRules(profile: StudentProfile): string {
    const level =
      profile.classGroup ??
      (profile.grade ? `Grade ${profile.grade}` : 'student');

    return `CRITICAL PERSONALIZATION RULES:
1. Write ONE document only — never combine multiple essays, statements, or letter types in a single output.
2. User instructions override default templates. If they ask for "Erasmus Mundus SOP", write ONLY that SOP — not a personal statement plus SOP.
3. Cite specific facts from the student context: school, board, grades, subject scores, resume roles/projects, interests, strengths, diagnostic insights.
4. Current academic level: ${level}. Match voice and achievements to this level unless the user explicitly requests graduate/professional application writing.
5. When resume or uploaded documents exist, weave in concrete details (job titles, companies, projects, skills, grades) — never generic filler.
6. Do NOT invent achievements, awards, employers, or institutions not supported by the context.
7. If resume describes professional experience but profile shows school-level grades, follow the user's instructions on which persona to use — default to instructions, then academic level.
8. Respect the word limit strictly.`;
  }

  private buildGeneratePrompt(
    profile: StudentProfile,
    type: ApplicationDocumentType,
    options: GenerateDocumentOptions,
  ): string {
    const context = this.buildFilteredContext(profile, options.excludedContextIds);
    const {
      prompt,
      targetCollege,
      targetCountry,
      tone = 'authentic, first-person, specific',
      wordLimit = type === 'LETTER_OF_RECOMMENDATION' ? 350 : 300,
      additionalInstructions,
    } = options;

    const targetLine = [
      targetCollege ? `Target college/program: ${targetCollege}` : '',
      targetCountry ? `Target country: ${targetCountry}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const structureHint = `
Format as a structured document using markdown:
- # document title (once)
- ## section headings, ### subsections
- Clear paragraphs; use "- " bullet lists where helpful
- For letters include Date/To/From lines at the top
Return ONLY the document text — no preamble or code fences.`;

    const typePrompts: Record<ApplicationDocumentType, string> = {
      PERSONAL_STATEMENT: `Write a compelling personal statement (~${wordLimit} words) for college admission. Tone: ${tone}. ${targetLine}
Sections: Opening hook, Academic journey, Why this field, Extracurricular impact, Future goals.`,
      SCHOLARSHIP: `Write a scholarship application essay (~${wordLimit} words) highlighting merit and need. Tone: ${tone}. ${targetLine}
Sections: Introduction, Achievements, Financial context, Impact statement.`,
      LETTER_OF_RECOMMENDATION: `Draft a letter of recommendation a teacher could sign for this student (~${wordLimit} words). Include specific examples from their profile. Tone: professional, warm. ${targetLine}
Include letter header (Date, To Whom It May Concern), body paragraphs, and closing signature block.`,
      ESSAY: `Write a college essay (~${wordLimit} words) on: "${prompt ?? 'a challenge that shaped my growth'}". Tone: ${tone}. Use vivid, specific details from the student profile. ${targetLine}
Sections: Hook, Story/conflict, Reflection, Connection to goals.`,
    };

    const userIntent = additionalInstructions
      ? `\n\nPRIMARY USER REQUEST (highest priority):\n${additionalInstructions}`
      : '';

    return `${typePrompts[type]}${userIntent}

${this.buildPersonalizationRules(profile)}
${structureHint}

Student context (use these facts explicitly in the draft):
${context}`;
  }

  private buildRefinePrompt(
    type: ApplicationDocumentType,
    currentContent: string,
    profile: StudentProfile,
    instruction: string,
    excludedContextIds?: string[],
  ): string {
    const context = this.buildFilteredContext(profile, excludedContextIds);

    return `You are editing a ${type} for college applications.

Current draft:
---
${currentContent}
---

Student context (reference specific facts when adding details):
${context}

${this.buildPersonalizationRules(profile)}

User instruction: ${instruction}

Apply the instruction to improve the draft. Return ONLY the revised full document text — no preamble. Keep ONE document type only.`;
  }

  private documentTitle(
    type: ApplicationDocumentType,
    options: GenerateDocumentOptions,
  ): string {
    const { prompt, targetCollege, additionalInstructions } = options;

    if (additionalInstructions?.toLowerCase().includes('erasmus')) {
      return targetCollege
        ? `Erasmus Mundus SOP — ${targetCollege}`
        : 'Erasmus Mundus Statement of Purpose';
    }

    const titles: Record<ApplicationDocumentType, string> = {
      PERSONAL_STATEMENT: targetCollege
        ? `Personal Statement — ${targetCollege}`
        : 'Personal Statement Draft',
      SCHOLARSHIP: 'Scholarship Application',
      LETTER_OF_RECOMMENDATION: 'Letter of Recommendation Draft',
      ESSAY: prompt ? `Essay: ${prompt.slice(0, 50)}` : 'College Essay',
    };

    return titles[type];
  }

  private async persistGeneratedDocument(
    userId: string,
    type: ApplicationDocumentType,
    options: GenerateDocumentOptions,
    content: string,
  ) {
    const {
      prompt,
      targetCollege,
      targetCountry,
      tone = 'authentic, first-person, specific',
      wordLimit = type === 'LETTER_OF_RECOMMENDATION' ? 350 : 300,
      additionalInstructions,
    } = options;

    return this.prisma.applicationDocument.create({
      data: {
        userId,
        type,
        title: this.documentTitle(type, options),
        content,
        metadata: {
          prompt,
          targetCollege,
          targetCountry,
          tone,
          wordLimit,
          additionalInstructions,
          generatedAt: new Date().toISOString(),
          streamed: true,
        },
      },
    });
  }

  private async persistRefinedDocument(
    userId: string,
    id: string,
    instruction: string,
    content: string,
  ) {
    const doc = await this.getById(userId, id);

    return this.prisma.applicationDocument.update({
      where: { id },
      data: {
        content,
        version: { increment: 1 },
        metadata: {
          ...(typeof doc.metadata === 'object' && doc.metadata ? doc.metadata : {}),
          lastRefinement: instruction,
          refinedAt: new Date().toISOString(),
          streamed: true,
        },
      },
    });
  }
}
