import { parseOfficialPracticePage } from './official-exam.parser';

describe('official-exam.parser', () => {
  it('keeps official SAT practice links and drops unrelated ones', () => {
    const html = `
      <a href="https://bluebook.collegeboard.org/students/practice">Bluebook SAT practice tests</a>
      <a href="https://www.khanacademy.org/digital-sat">Official SAT Prep on Khan Academy</a>
      <a href="https://example.com/leaked-sat.pdf">Leaked SAT PDF</a>
      <a href="/privacy">Privacy</a>
    `;
    const items = parseOfficialPracticePage(html, 'College Board', [
      'collegeboard.org',
      'khanacademy.org',
    ]);
    expect(items.map((item) => item.href)).toEqual([
      'https://bluebook.collegeboard.org/students/practice',
      'https://www.khanacademy.org/digital-sat',
    ]);
  });
});
