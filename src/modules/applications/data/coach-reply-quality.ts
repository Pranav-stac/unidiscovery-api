import type { WritingToolSlug } from './writing-tools.config';
import type { CoachStepPolicy } from './coach-openers';

function hasQuestion(text: string): boolean {
  return /\?/.test(text);
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
): string {
  if (tool === 'essay' && stepKey === 'thesis') {
    const prompts = [
      'What is the strongest counterargument someone might make—and how would you respond?',
      'What is one concrete fact, example, or reason that best supports your thesis?',
      'Who is your audience, and what do they need to hear to take your argument seriously?',
    ];
    return prompts[Math.min(userTurnsThisStep - 1, prompts.length - 1)];
  }

  if (tool === 'essay' && stepKey === 'setup') {
    return 'What do you already know about this topic that you might use in your essay?';
  }

  if (tool === 'statement' && stepKey === 'discover') {
    return 'What is one specific moment or detail that shows why this matters to you?';
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
): { text: string; injectedQuestion: boolean } {
  const trimmed = reply.trim();
  if (!coachShouldAskFollowUp(userTurnsThisStep, policy)) {
    return { text: trimmed, injectedQuestion: false };
  }
  if (hasQuestion(trimmed)) {
    return { text: trimmed, injectedQuestion: false };
  }

  const followUp = defaultCoachFollowUp(tool, stepKey, userTurnsThisStep);
  if (!trimmed) {
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
