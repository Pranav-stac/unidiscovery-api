import { Injectable, Logger } from '@nestjs/common';
import { parseOfficialPracticePage, type OfficialPracticeItem } from '../data/official-exam.parser';

type CatalogPage = {
  url: string;
  source: string;
  hosts: string[];
};

const SAT_PAGES: CatalogPage[] = [
  {
    url: 'https://satsuite.collegeboard.org/practice/practice-tests/bluebook',
    source: 'College Board Bluebook',
    hosts: ['collegeboard.org', 'bluebook.collegeboard.org', 'khanacademy.org'],
  },
  {
    url: 'https://satsuite.collegeboard.org/practice',
    source: 'College Board SAT Suite',
    hosts: ['collegeboard.org', 'bluebook.collegeboard.org', 'khanacademy.org'],
  },
  {
    url: 'https://bluebook.collegeboard.org/students/practice',
    source: 'Bluebook',
    hosts: ['collegeboard.org', 'bluebook.collegeboard.org'],
  },
  {
    url: 'https://www.khanacademy.org/digital-sat',
    source: 'Khan Academy Official SAT Prep',
    hosts: ['khanacademy.org', 'collegeboard.org'],
  },
];

const SAT_CORE: OfficialPracticeItem[] = [
  {
    id: 'bluebook-app',
    title: 'Bluebook — official digital SAT practice tests',
    href: 'https://bluebook.collegeboard.org/students/practice',
    source: 'College Board',
    kind: 'app',
    note: 'This is where the real full-length SAT practice tests live. They are scored if you sign in.',
  },
  {
    id: 'college-board-bluebook-tests',
    title: 'Full-length digital practice tests on Bluebook',
    href: 'https://satsuite.collegeboard.org/practice/practice-tests/bluebook',
    source: 'College Board',
    kind: 'full-test',
    note: 'College Board currently publishes the live Bluebook SAT practice-test list here. Tests rotate; we do not copy the items.',
  },
  {
    id: 'student-question-bank',
    title: 'Student Question Bank — official SAT Suite questions',
    href: 'https://satsuite.collegeboard.org/practice/practice-tests/bluebook',
    source: 'College Board',
    kind: 'question-bank',
    note: 'Thousands of official questions, filtered by section and skill, inside your College Board account.',
  },
  {
    id: 'khan-official-sat',
    title: 'Official SAT Prep on Khan Academy',
    href: 'https://www.khanacademy.org/digital-sat',
    source: 'Khan Academy × College Board',
    kind: 'lesson',
    note: 'Official SAT questions and videos. Linked to your College Board practice results.',
  },
];

@Injectable()
export class OfficialExamService {
  private readonly logger = new Logger(OfficialExamService.name);
  private satCache: { at: number; items: OfficialPracticeItem[] } | null = null;

  async satCatalog(): Promise<OfficialPracticeItem[]> {
    if (this.satCache && Date.now() - this.satCache.at < 12 * 60 * 60 * 1000) {
      return this.satCache.items;
    }

    const scraped = (
      await Promise.all(
        SAT_PAGES.map(async (page) => {
          const html = await this.fetchHtml(page.url);
          return html ? parseOfficialPracticePage(html, page.source, page.hosts) : [];
        }),
      )
    ).flat();

    const merged = new Map<string, OfficialPracticeItem>();
    for (const item of [...SAT_CORE, ...scraped]) merged.set(item.id, item);
    const items = [...merged.values()];
    this.satCache = { at: Date.now(), items };
    return items;
  }

  private async fetchHtml(url: string) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          Accept: 'text/html',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) return '';
      return response.text();
    } catch (error) {
      this.logger.warn(`Official SAT catalog fetch failed for ${url}: ${String(error)}`);
      return '';
    }
  }
}
