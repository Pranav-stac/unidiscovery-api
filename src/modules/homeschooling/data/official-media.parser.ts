export type ScrapedUnit = {
  chapter: number;
  title: string;
  textbookUrl: string;
  videos: string[];
  audios: string[];
};

export type ScrapedCourseLink = {
  subjectId: string;
  name: string;
  pageUrl: string;
  code?: string;
};

const NIOS_ORIGIN = 'https://www.nios.ac.in';

export function parseNiosCoursePage(html: string): ScrapedUnit[] {
  const page = decodeEntities(html);
  const hits: Array<{ chapter: number; href: string; index: number }> = [];
  const pdfRe = /https?:\/\/[^\s"'<>\]]+Chapter-(\d+)\.pdf/gi;

  for (const match of page.matchAll(pdfRe)) {
    const href = match[0];
    if (/\/Hindi\//i.test(href)) continue;
    if (/worksheet|learnerguide|first_page|bifurcation|tma_/i.test(href)) continue;
    if (!/\/Eng(?:lish)?\//i.test(href) && !/chapter\s+\d+/i.test(page.slice(Math.max(0, (match.index ?? 0) - 180), match.index))) {
      continue;
    }
    hits.push({ chapter: Number(match[1]), href, index: match.index ?? 0 });
  }

  const firstByChapter = new Map<number, (typeof hits)[number]>();
  for (const hit of hits.sort((a, b) => a.index - b.index)) {
    if (!firstByChapter.has(hit.chapter)) firstByChapter.set(hit.chapter, hit);
  }
  const chapters = [...firstByChapter.values()].sort((a, b) => a.index - b.index);

  return chapters.map((hit, index) => {
    const end = chapters[index + 1]?.index ?? page.length;
    const slice = page.slice(hit.index, end);
    const nearby = page.slice(Math.max(0, hit.index - 240), end);
    return {
      chapter: hit.chapter,
      title: titleFromSlice(nearby, hit.chapter),
      textbookUrl: hit.href,
      videos: unique(youtubeUrls(slice)),
      audios: unique(audioUrls(slice)),
    };
  });
}

export function parseNiosListing(html: string): ScrapedCourseLink[] {
  const found = new Map<string, ScrapedCourseLink>();
  const pattern =
    /(?:https?:\/\/[^"'<\s]+)?\/online-course-material\/(secondary-courses|sr-secondary-courses)\/([^"'/?]+)-[Ss]yllabus\.aspx/g;

  for (const match of html.matchAll(pattern)) {
    const folder = match[1];
    const raw = decodeEntities(match[2]).replace(/_/g, ' ');
    if (/bifurcation|sample-question|lab-manual|learner/i.test(raw)) continue;
    const parsed = raw.match(/^(.*?)(?:-\(?(\d{3})\)?)?$/);
    const name = (parsed?.[1] ?? raw).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const subjectId = slug(name);
    if (!subjectId || found.has(subjectId)) continue;
    found.set(subjectId, {
      subjectId,
      name: titleCase(name),
      code: parsed?.[2],
      pageUrl: `${NIOS_ORIGIN}/online-course-material/${folder}/${match[2]}-syllabus.aspx`,
    });
  }

  return [...found.values()];
}

function titleFromSlice(slice: string, chapter: number) {
  const plain = stripTags(slice).replace(/\s+/g, ' ');
  const match = plain.match(new RegExp(`Chapter\\s+${chapter}[.)]?\\s+([^\\[(<]{3,90})`, 'i'));
  if (!match) return `Chapter ${chapter}`;
  const cleaned = match[1]
    .replace(/\([^)]*(mb|kb)[^)]*\)/gi, '')
    .replace(/pdf file|opens in a new window|youtube file|!\[.*?\]/gi, '')
    .replace(/[\]*]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || `Chapter ${chapter}`;
}

function youtubeUrls(slice: string) {
  const found: string[] = [];
  for (const match of slice.matchAll(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/gi)) {
    found.push(`https://www.youtube.com/watch?v=${match[1]}`);
  }
  for (const match of slice.matchAll(/https?:\/\/youtu\.be\/([\w-]{11})/gi)) {
    found.push(`https://www.youtube.com/watch?v=${match[1]}`);
  }
  return found;
}

function audioUrls(slice: string) {
  return [...slice.matchAll(/https?:\/\/[^\s"'<>\]]+\.mp3/gi)].map((match) => match[0]);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
