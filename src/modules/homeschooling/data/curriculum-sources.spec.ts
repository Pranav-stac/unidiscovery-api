import {
  enrichSubjectTitles,
  isGenericChapterTitle,
  officialSubject,
} from './curriculum-sources';

describe('curriculum-sources', () => {
  it('includes Class 10 English chapter titles such as A Letter to God', () => {
    const english = officialSubject('cbse', 10, 'english');
    expect(english).not.toBeNull();
    expect(english!.units[0]?.title).toBe('A Letter to God');
    expect(english!.units.length).toBeGreaterThanOrEqual(9);
  });

  it('detects generic placeholder chapter titles', () => {
    expect(isGenericChapterTitle('')).toBe(true);
    expect(isGenericChapterTitle('Chapter 3')).toBe(true);
    expect(isGenericChapterTitle('English — Chapter 3', 'English')).toBe(true);
    expect(isGenericChapterTitle('A Letter to God')).toBe(false);
  });

  it('replaces cached generic titles with official NCERT names', () => {
    const cached = {
      id: 'english',
      name: 'English',
      units: [
        {
          chapter: 1,
          title: 'English — Chapter 1',
          textbookUrl: 'https://www.ncert.nic.in/textbook/pdf/jeff101.pdf',
          videoQuery: 'test',
        },
      ],
    };
    const enriched = enrichSubjectTitles(cached, 'cbse', 10);
    expect(enriched.units[0].title).toBe('A Letter to God');
  });
});
