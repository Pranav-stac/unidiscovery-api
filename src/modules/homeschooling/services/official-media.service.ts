import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  BOARD_LABELS,
  BoardKey,
  OfficialSubject,
  officialPortal,
  slugify,
  subjectName,
} from '../data/curriculum-sources';
import {
  parseNiosCoursePage,
  parseNiosListing,
  type ScrapedCourseLink,
} from '../data/official-media.parser';

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_MS = 10000;

@Injectable()
export class OfficialMediaService {
  private readonly logger = new Logger(OfficialMediaService.name);
  private readonly inflight = new Map<string, Promise<OfficialSubject | null>>();

  constructor(private readonly prisma: PrismaService) {}

  async peekListing(grade: number): Promise<ScrapedCourseLink[]> {
    const cacheKey = this.listingKey(grade);
    const cached = await this.prisma.homeschoolSyllabus.findUnique({ where: { cacheKey } });
    return (cached?.payload as { courses?: ScrapedCourseLink[] } | null)?.courses ?? [];
  }

  async loadSubject(
    board: BoardKey,
    grade: number,
    subjectId: string,
  ): Promise<OfficialSubject | null> {
    if (board !== 'nios') return null;
    const cacheKey = this.subjectKey(board, grade, subjectId);
    const existing = this.inflight.get(cacheKey);
    if (existing) return existing;
    const run = this.scrapeSubject(board, grade, subjectId).finally(() => {
      this.inflight.delete(cacheKey);
    });
    this.inflight.set(cacheKey, run);
    return run;
  }

  private async scrapeSubject(
    board: BoardKey,
    grade: number,
    subjectId: string,
  ): Promise<OfficialSubject | null> {
    try {
      const pageUrl = await this.coursePageUrl(grade, subjectId);
      if (!pageUrl) return null;
      const html = await this.fetchHtml(pageUrl);
      if (!html) return null;
      const units = parseNiosCoursePage(html);
      if (!units.length) return null;
      const name = subjectName(subjectId);
      const subject: OfficialSubject = {
        id: subjectId,
        name,
        units: units.map((unit) => ({
          chapter: unit.chapter,
          title: unit.title,
          textbookUrl: unit.textbookUrl,
          videoUrl: unit.videos[0],
          videos: unit.videos,
          audios: unit.audios,
          videoQuery: `${BOARD_LABELS[board]} Class ${grade} ${name} ${unit.title}`,
        })),
      };
      await this.save(this.subjectKey(board, grade, subjectId), board, grade, subjectId, subject);
      return subject;
    } catch (error) {
      this.logger.warn(`Official media scrape failed for ${subjectId}: ${String(error)}`);
      return null;
    }
  }

  private async coursePageUrl(grade: number, subjectId: string) {
    const listing = await this.loadListing(grade);
    const match = listing.find((item) => item.subjectId === subjectId);
    if (match) return match.pageUrl;

    const folder = grade <= 10 ? 'secondary-courses' : 'sr-secondary-courses';
    const listingHtml = await this.fetchHtml(officialPortal('nios', grade));
    const fromListing = listingHtml?.match(
      new RegExp(
        `/online-course-material/${folder}/[^"'\\s]*${subjectId}[^"'\\s]*-[Ss]yllabus\\.aspx`,
        'i',
      ),
    );
    if (fromListing) {
      return `https://www.nios.ac.in${fromListing[0]}`;
    }

    const guesses = [
      `https://www.nios.ac.in/online-course-material/${folder}/${subjectId}-syllabus.aspx`,
    ];
    for (const guess of guesses) {
      const html = await this.fetchHtml(guess);
      if (html && parseNiosCoursePage(html).length) return guess;
    }
    return null;
  }

  private async loadListing(grade: number): Promise<ScrapedCourseLink[]> {
    const cacheKey = this.listingKey(grade);
    const cached = await this.prisma.homeschoolSyllabus.findUnique({ where: { cacheKey } });
    if (cached && Date.now() - cached.updatedAt.getTime() < FRESH_MS) {
      return (cached.payload as { courses?: ScrapedCourseLink[] }).courses ?? [];
    }

    const html = await this.fetchHtml(officialPortal('nios', grade));
    const courses = html ? parseNiosListing(html) : [];
    if (courses.length) {
      await this.save(cacheKey, 'nios', grade, '__listing__', { courses });
    }
    return courses;
  }

  private async save(
    cacheKey: string,
    board: BoardKey,
    grade: number,
    subject: string,
    payload: object,
  ) {
    await this.prisma.homeschoolSyllabus.upsert({
      where: { cacheKey },
      create: { cacheKey, board, grade, subject, payload },
      update: { payload },
    });
  }

  private async fetchHtml(url: string) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_MS),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) return '';
    return response.text();
  }

  private listingKey(grade: number) {
    return `nios:${grade <= 10 ? 10 : 12}:__listing__`;
  }

  private subjectKey(board: BoardKey, grade: number, subjectId: string) {
    return `${board}:${grade}:${slugify(subjectId)}`;
  }
}

export function isFreshSyllabus(updatedAt?: Date | null) {
  if (!updatedAt) return false;
  return Date.now() - updatedAt.getTime() < FRESH_MS;
}

export function hasOfficialFiles(subject: OfficialSubject) {
  return subject.units.some((unit) => /\.pdf(\?|#|$)/i.test(unit.textbookUrl ?? ''));
}
