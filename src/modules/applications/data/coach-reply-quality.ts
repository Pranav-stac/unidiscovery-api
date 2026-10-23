import type { WritingToolSlug } from './writing-tools.config';
import type { CoachStepPolicy } from './coach-openers';

function hasQuestion(text: string): boolean {
  return /\?/.test(text);
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type CoachFollowUpContext = {
  topic?: string;
  audience?: string;
  lastUserLine?: string;
  statementTheme?: string;
};

function isWeakOrTruncatedCoachReply(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (hasQuestion(t)) return false;
  if (t.length < 100) return true;
  if (!/[.!?]["']?$/.test(t)) return true;
  return false;
}

function statementDiscoverFollowUp(userTurnsThisStep: number, ctx: CoachFollowUpContext): string {
  const detail = ctx.lastUserLine ? clip(ctx.lastUserLine, 140) : '';
  const ref = detail ? `You mentioned “${detail}”. ` : '';

  const byTurn = [
    `${ref}Walk me through one specific scene: where were you, what were you doing, and what happened first?`,
    `${ref}What did you do next—and what did that teach you about yourself?`,
    `If an admissions reader remembered one vivid image from this story, what should it be, and why does it matter to you?`,
    `What value, skill, or perspective from this story do you want colleges to see in the rest of your application?`,
  ];
  const idx = Math.min(Math.max(userTurnsThisStep - 1, 0), byTurn.length - 1);
  return byTurn[idx];
}

/** Coach should keep asking until recommended depth unless the model explicitly ends the step. */
export function coachShouldAskFollowUp(
  userTurnsThisStep: number,
  policy: CoachStepPolicy,
): boolean {
  return userTurnsThisStep < policy.recommendedReplies;
}

export function defaultCoachFollowUp(
  tool: WritingToolSlug,
  stepKey: string,
  userTurnsThisStep: number,
  ctx: CoachFollowUpContext = {},
): string {
  if (tool === 'essay' && stepKey === 'thesis') {
    const topic = clip(ctx.topic ?? '', 140);
    const promptRef = topic
      ? `your essay question (“${topic}”)`
      : 'the question you are answering';
    const thesisRef = ctx.lastUserLine
      ? ` You said: “${clip(ctx.lastUserLine, 160)}”.`
      : '';
    const audience = ctx.audience?.trim();

    if (userTurnsThisStep <= 1) {
      return `For ${promptRef}, what is the strongest objection someone could raise to your position—and how would you answer it?${thesisRef}`;
    }
    if (userTurnsThisStep === 2) {
      return `What is one concrete example, reason, or piece of evidence that backs up your argument on ${promptRef}?`;
    }
    if (!audience) {
      return 'Who will read this essay, and what do they need to hear to take your argument seriously?';
    }
    return `What part of your argument about ${promptRef} still feels weakest or needs more support?`;
  }

  if (tool === 'essay' && stepKey === 'setup') {
    return 'What do you already know about this topic that you might use in your essay?';
  }

  if (tool === 'statement' && stepKey === 'discover') {
    return statementDiscoverFollowUp(userTurnsThisStep, ctx);
  }

  if (tool === 'scholarship' && stepKey === 'criteria') {
    return 'Can you name one verifiable detail (date, role, outcome) that supports that?';
  }

  if (tool === 'scholarship' && stepKey === 'themes') {
    return 'Which part of the prompt could you answer most honestly with a real example?';
  }

  return 'What is one more specific detail you could add before moving on?';
}

/**
 * Ensures interactive coach turns include a question while the step is still in progress.
 */
export function ensureCoachFollowUpQuestion(
  reply: string,
  tool: WritingToolSlug,
  stepKey: string,
  userTurnsThisStep: number,
  policy: CoachStepPolicy,
  ctx: CoachFollowUpContext = {},
): { text: string; injectedQuestion: boolean } {
  const trimmed = reply.trim();
  if (!coachShouldAskFollowUp(userTurnsThisStep, policy)) {
    return { text: trimmed, injectedQuestion: false };
  }
  if (hasQuestion(trimmed)) {
    return { text: trimmed, injectedQuestion: false };
  }

  const followUp = defaultCoachFollowUp(tool, stepKey, userTurnsThisStep, ctx);
  if (!trimmed || isWeakOrTruncatedCoachReply(trimmed)) {
    return { text: followUp, injectedQuestion: true };
  }
  return { text: `${trimmed}\n\n${followUp}`, injectedQuestion: true };
}

export function shouldMarkCoachStepReady(
  modelSentReadyTag: boolean,
  userTurnsThisStep: number,
  policy: CoachStepPolicy,
  injectedQuestion: boolean,
): boolean {
  if (userTurnsThisStep < policy.minReplies) {
    return false;
  }
  if (injectedQuestion) {
    return userTurnsThisStep >= policy.recommendedReplies;
  }
  if (userTurnsThisStep >= policy.recommendedReplies) {
    return true;
  }
  return modelSentReadyTag;
}
