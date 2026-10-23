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
      {
        topic: 'Should schools ban phones?',
        lastUserLine: 'Schools should ban phones in class.',
      },
    );
    expect(injectedQuestion).toBe(true);
    expect(text).toContain('?');
    expect(text).not.toContain("That's a strong");
    expect(text).toContain('Should schools ban phones?');
  });

  it('does not mark ready after one user turn when a question was injected', () => {
    expect(shouldMarkCoachStepReady(true, 1, thesisPolicy, true)).toBe(false);
  });

  it('marks ready after recommended turns', () => {
    expect(shouldMarkCoachStepReady(false, 3, thesisPolicy, false)).toBe(true);
  });

  it('replaces vague praise with a contextual discover follow-up', () => {
    const discoverPolicy = coachPolicyForStep('discover', 'statement');
    const { text, injectedQuestion } = ensureCoachFollowUpQuestion(
      "That's a fantastic project, using AI to directly help farmers with crop",
      'statement',
      'discover',
      2,
      discoverPolicy,
      { lastUserLine: 'I built an AI for farmers in their native language.' },
    );
    expect(injectedQuestion).toBe(true);
    expect(text).toContain('?');
    expect(text).not.toContain("That's a fantastic");
    expect(text).toContain('farmers');
  });

  it('rotates statement discover follow-ups by turn', () => {
    const discoverPolicy = coachPolicyForStep('discover', 'statement');
    const first = ensureCoachFollowUpQuestion('', 'statement', 'discover', 1, discoverPolicy, {
      lastUserLine: 'AI for crops',
    });
    const second = ensureCoachFollowUpQuestion('', 'statement', 'discover', 2, discoverPolicy, {
      lastUserLine: 'AI for crops',
    });
    expect(first.text).not.toBe(second.text);
  });
});
