import {
  isGibberishText,
  validateDiagnosticAnswers,
} from './answer-quality.validator';
import type { DiagnosticStep } from './diagnostics.service';

describe('answer-quality.validator', () => {
  const textStep = (id: string, title: string): DiagnosticStep => ({
    id,
    type: 'ai-followup',
    stepKind: 'question',
    title,
  });

  const choiceStep = (id: string): DiagnosticStep => ({
    id,
    type: 'choice',
    stepKind: 'question',
    title: 'Pick one',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
  });

  it('flags gibberish text', () => {
    expect(isGibberishText('asdf')).toBe(true);
    expect(isGibberishText('test')).toBe(true);
    expect(isGibberishText('I enjoy building robots and coding games')).toBe(false);
  });

  it('rejects sessions with placeholder answers', () => {
    const steps: DiagnosticStep[] = [
      textStep('dream', 'Tell us your dream'),
      choiceStep('q1'),
      choiceStep('q2'),
    ];

    const result = validateDiagnosticAnswers(
      {
        dream: 'asdfghjkl',
        q1: 'a',
        q2: 'b',
      },
      steps,
    );

    expect(result.valid).toBe(false);
    expect(result.code).toBe('GIBBERISH_DETECTED');
  });

  it('accepts thoughtful answers', () => {
    const steps: DiagnosticStep[] = [
      textStep('dream', 'Tell us your dream'),
      choiceStep('q1'),
      choiceStep('q2'),
    ];

    const result = validateDiagnosticAnswers(
      {
        dream: 'I want to study computer science and build helpful apps.',
        q1: 'a',
        q2: 'b',
      },
      steps,
    );

    expect(result.valid).toBe(true);
  });
});
