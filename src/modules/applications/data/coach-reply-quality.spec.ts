import { coachPolicyForStep } from './coach-openers';
import {
  ensureCoachFollowUpQuestion,
  shouldMarkCoachStepReady,
} from './coach-reply-quality';

describe('coach-reply-quality', () => {
  const thesisPolicy = coachPolicyForStep('thesis');

  it('injects a follow-up when the model returns only praise', () => {
    const { text, injectedQuestion } = ensureCoachFollowUpQuestion(
      "That's a strong, clear stance!",
      'essay',
      'thesis',
      1,
      thesisPolicy,
    );
    expect(injectedQuestion).toBe(true);
    expect(text).toContain('?');
    expect(text).toContain("That's a strong, clear stance!");
  });

  it('does not mark ready after one user turn when a question was injected', () => {
    expect(shouldMarkCoachStepReady(true, 1, thesisPolicy, true)).toBe(false);
  });

  it('marks ready after recommended turns', () => {
    expect(shouldMarkCoachStepReady(false, 3, thesisPolicy, false)).toBe(true);
  });
});
