import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApplicationDocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GeminiService } from '../../../infrastructure/ai/gemini/gemini.service';
import { ProfileContextService } from '../../../common/services/profile-context.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  WRITING_TOOL_LABELS,
  WORKFLOW_STEPS,
  WritingToolSlug,
  toolSlugToDocumentType,
  documentTypeToToolSlug,
  WRITING_TOOL_SLUGS,
} from '../data/writing-tools.config';
import {
  anglesSystemPrompt,
  coachKickoffPrompt,
  coachSystemPrompt,
  COACH_ACTION_PROMPTS,
  OUTLINE_SCHEMA,
  REVIEW_CHECKLIST_SCHEMA,
  STORY_ANGLES_SCHEMA,
} from '../data/writing-tool-prompts';

export type WritingProjectMeta = {
  writingTool: WritingToolSlug;
  workflowStep: number;
  stepKey: string;
  inputs: Record<string, unknown>;
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  storyAngles?: Array<{
    id: string;
    theme: string;
    supportingDetails: string[];
    whyCompelling: string;
    missingInfo: string[];
  }>;
  selectedAngleId?: string;
  outline?: Array<{ id: string; title: string; bullets: string[] }>;
  recommendationMode?: 'request' | 'draft';
  cvTemplate?: string;
  reviewChecklist?: string[];
  coachKickoffSteps?: string[];
  reviewReport?: {
    items: Array<{ id: string; label: string; status: string; detail: string }>;
    summary: string;
  };
};

function parseMeta(raw: unknown): WritingProjectMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (!WRITING_TOOL_SLUGS.includes(m.writingTool as WritingToolSlug)) return null;
  return m as WritingProjectMeta;
}

type StoryAnglesResult = {
  angles: Array<{
    id?: string;
    theme: string;
    supportingDetails: string[];
    whyCompelling: string;
    missingInfo: string[];
  }>;
};

type OutlineResult = {
  sections: Array<{ id?: string; title: string; bullets: string[] }>;
};

function toDocumentMetadata(
  meta: WritingProjectMeta & { writingProject: true; createdAt?: string },
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(meta)) as Prisma.InputJsonValue;
}

function defaultMeta(tool: WritingToolSlug): WritingProjectMeta {
  const steps = WORKFLOW_STEPS[tool];
  return {
    writingTool: tool,
    workflowStep: 0,
    stepKey: steps[0],
    inputs: {},
    conversation: [],
  };
}

@Injectable()
export class WritingProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly profileContext: ProfileContextService,
    private readonly cacheService: CacheService,
  ) {}

  async create(userId: string, tool: WritingToolSlug, title?: string) {
    if (!WRITING_TOOL_SLUGS.includes(tool)) {
      throw new BadRequestException('Unknown writing tool');
    }
    const type = toolSlugToDocumentType(tool);
    const label = WRITING_TOOL_LABELS[tool];
    const doc = await this.prisma.applicationDocument.create({
      data: {
        userId,
        type,
        title: title?.trim() || `Untitled ${label.defaultTitle}`,
        content: '',
        metadata: toDocumentMetadata({
          writingProject: true,
          ...defaultMeta(tool),
          createdAt: new Date().toISOString(),
        }),
      },
    });
    void this.cacheService.invalidateStudentCaches(userId);
    return this.hydrate(doc);
  }

  async get(userId: string, id: string) {
    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Project not found');
    return this.hydrate(doc);
  }

  async listProjects(userId: string) {
    const docs = await this.prisma.applicationDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    return docs
      .filter((d) => {
        const meta = d.metadata as Record<string, unknown> | null;
        return meta?.writingProject === true || documentTypeToToolSlug(d.type);
      })
      .map((d) => this.hydrate(d));
  }

  async updateProject(
    userId: string,
    id: string,
    data: {
      title?: string;
      content?: string;
      workflowStep?: number;
      inputs?: Record<string, unknown>;
      selectedAngleId?: string;
      recommendationMode?: 'request' | 'draft';
      cvTemplate?: string;
    },
  ) {
    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);
    const steps = WORKFLOW_STEPS[meta.writingTool];

    if (data.workflowStep !== undefined) {
      const step = Math.max(0, Math.min(steps.length - 1, data.workflowStep));
      meta.workflowStep = step;
      meta.stepKey = steps[step];
    }
    if (data.inputs) {
      meta.inputs = { ...meta.inputs, ...data.inputs };
    }
    if (data.selectedAngleId !== undefined) meta.selectedAngleId = data.selectedAngleId;
    if (data.recommendationMode) meta.recommendationMode = data.recommendationMode;
    if (data.cvTemplate) meta.cvTemplate = data.cvTemplate;
    if (data.inputs?.cvTemplate && typeof data.inputs.cvTemplate === 'string') {
      meta.cvTemplate = data.inputs.cvTemplate;
    }

    const updated = await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content, version: { increment: 1 } } : {}),
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });
    void this.cacheService.invalidateStudentCaches(userId);
    return this.hydrate(updated);
  }

  async coachTurn(userId: string, id: string, userMessage: string) {
    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);
    const trimmed = userMessage.trim();
    if (!trimmed) throw new BadRequestException('Message is required');

    meta.conversation = [
      ...meta.conversation,
      { role: 'user', content: trimmed },
    ];

    let profileSnippet = '';
    try {
      const profile = await this.profileContext.getProfileOrThrow(userId);
      profileSnippet = this.profileContext.buildContextText(profile);
    } catch {
      profileSnippet = 'No profile on file yet.';
    }
    const history = meta.conversation
      .slice(-12)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `${coachSystemPrompt(meta.writingTool, meta.stepKey)}

Student profile context (do not invent beyond this):
${profileSnippet}

Project inputs:
${JSON.stringify(meta.inputs)}

Conversation:
${history}

Respond as the coach with one primary question or brief guidance for this step.`;

    const reply =
      (await this.gemini.generateText(prompt)) ||
      'Thank you for sharing that. What is one specific moment from that experience that stands out to you?';

    meta.conversation.push({ role: 'assistant', content: reply });

    await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });

    return { reply, project: await this.get(userId, id) };
  }

  async coachKickoff(userId: string, id: string) {
    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);
    meta.coachKickoffSteps = meta.coachKickoffSteps ?? [];

    if (meta.coachKickoffSteps.includes(meta.stepKey)) {
      return { project: await this.get(userId, id) };
    }

    let profileSnippet = '';
    try {
      const profile = await this.profileContext.getProfileOrThrow(userId);
      profileSnippet = this.profileContext.buildContextText(profile);
    } catch {
      profileSnippet = 'No profile on file yet.';
    }

    const prompt = `${coachKickoffPrompt(meta.writingTool, meta.stepKey)}

Student profile context (do not invent beyond this):
${profileSnippet}

Project inputs:
${JSON.stringify(meta.inputs)}

Conversation so far:
${meta.conversation.map((m) => `${m.role}: ${m.content}`).join('\n') || '(none)'}`;

    const reply =
      (await this.gemini.generateText(prompt)) ||
      'What is one experience or idea you would like to explore in this piece?';

    meta.conversation.push({ role: 'assistant', content: reply });
    meta.coachKickoffSteps.push(meta.stepKey);

    await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });

    return { reply, project: await this.get(userId, id) };
  }

  async coachAction(
    userId: string,
    id: string,
    action: string,
    draftExcerpt?: string,
  ) {
    const instruction = COACH_ACTION_PROMPTS[action];
    if (!instruction) {
      throw new BadRequestException('Unknown coach action');
    }

    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);
    const excerpt = (draftExcerpt ?? doc.content).trim().slice(0, 12000);

    const userMessage = excerpt
      ? `[${action}] Review this draft excerpt:\n\n${excerpt}`
      : `[${action}] I need help with this step.`;

    meta.conversation = [...meta.conversation, { role: 'user', content: userMessage }];

    const prompt = `${coachSystemPrompt(meta.writingTool, meta.stepKey)}

Special mode: ${action}
${instruction}

Project inputs:
${JSON.stringify(meta.inputs)}

Student message:
${userMessage}

Respond with focused, actionable guidance. Do not invent facts or citations.`;

    const reply =
      (await this.gemini.generateText(prompt)) ||
      'Share a bit more detail and I can give targeted feedback.';

    meta.conversation.push({ role: 'assistant', content: reply });

    await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });

    return { reply, project: await this.get(userId, id) };
  }

  async generateReviewReport(userId: string, id: string) {
    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);

    type ReviewResult = {
      items: Array<{ id: string; label: string; status: string; detail: string }>;
      summary: string;
    };

    const result = await this.gemini.generateStructured<ReviewResult>({
      systemPrompt:
        'Review the draft against the project inputs. Flag unsupported claims, missing evidence, word-limit risk, and clarity issues. Never invent facts.',
      schemaDescription: REVIEW_CHECKLIST_SCHEMA,
      userPrompt: JSON.stringify({
        tool: meta.writingTool,
        inputs: meta.inputs,
        content: doc.content.slice(0, 12000),
      }),
      fallback: { items: [], summary: 'Add a draft to run a review.' },
    });

    meta.reviewReport = result;

    await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });

    return this.get(userId, id);
  }

  async generateStoryAngles(userId: string, id: string) {
    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);
    const context = meta.conversation.map((m) => `${m.role}: ${m.content}`).join('\n');

    const result = await this.gemini.generateStructured<StoryAnglesResult>({
      systemPrompt: anglesSystemPrompt(meta.writingTool),
      schemaDescription: STORY_ANGLES_SCHEMA,
      userPrompt: `Inputs: ${JSON.stringify(meta.inputs)}\n\nConversation:\n${context}`,
      fallback: { angles: [] },
    });

    meta.storyAngles = result.angles.map((a, i) => ({
      ...a,
      id: a.id || `angle-${i + 1}`,
    }));

    await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });

    return this.get(userId, id);
  }

  async generateOutline(userId: string, id: string) {
    const doc = await this.get(userId, id);
    const meta = doc.projectMeta ?? defaultMeta(doc.toolSlug!);
    const selected = meta.storyAngles?.find((a) => a.id === meta.selectedAngleId);

    const result = await this.gemini.generateStructured<OutlineResult>({
      systemPrompt:
        'Create an outline using the student\'s own details. Sections should match the tool type. No invented experiences.',
      schemaDescription: OUTLINE_SCHEMA,
      userPrompt: JSON.stringify({
        tool: meta.writingTool,
        inputs: meta.inputs,
        selectedAngle: selected,
        conversation: meta.conversation.slice(-8),
      }),
      fallback: { sections: [] },
    });

    meta.outline = result.sections.map((s, i) => ({
      ...s,
      id: s.id || `section-${i + 1}`,
    }));

    await this.prisma.applicationDocument.update({
      where: { id },
      data: {
        metadata: toDocumentMetadata({
          ...(doc.rawMetadata as object),
          ...meta,
          writingProject: true,
        }),
      },
    });

    return this.get(userId, id);
  }

  private hydrate(doc: {
    id: string;
    type: ApplicationDocumentType;
    title: string;
    content: string;
    version: number;
    metadata: unknown;
    updatedAt: Date;
    createdAt: Date;
  }) {
    const rawMetadata = (doc.metadata ?? {}) as Record<string, unknown>;
    let projectMeta = parseMeta(rawMetadata);
    const toolSlug = documentTypeToToolSlug(doc.type);

    if (!projectMeta && toolSlug) {
      projectMeta = defaultMeta(toolSlug);
    }

    return {
      id: doc.id,
      type: doc.type,
      title: doc.title,
      content: doc.content,
      version: doc.version,
      updatedAt: doc.updatedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      toolSlug: projectMeta?.writingTool ?? toolSlug,
      projectMeta,
      rawMetadata,
    };
  }
}
