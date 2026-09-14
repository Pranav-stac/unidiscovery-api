export type OfficialPracticeItem = {
  id: string;
  title: string;
  href: string;
  source: string;
  kind: 'full-test' | 'question-bank' | 'lesson' | 'app';
  note?: string;
};

const KIND_HINTS: Array<[OfficialPracticeItem['kind'], RegExp]> = [
  ['app', /bluebook/i],
  ['question-bank', /question bank|sqb|practice question/i],
  ['full-test', /practice test|full-length|bluebook/i],
  ['lesson', /khan|lesson|prep|tutoring/i],
];

export function parseOfficialPracticePage(
  html: string,
  source: string,
  allowedHosts: string[],
): OfficialPracticeItem[] {
  const found = new Map<string, OfficialPracticeItem>();

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    push(found, match[1], stripTags(match[2]), source, allowedHosts);
  }
  for (const match of html.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    push(found, match[2], match[1], source, allowedHosts);
  }

  return [...found.values()];
}

function push(
  found: Map<string, OfficialPracticeItem>,
  href: string,
  title: string,
  source: string,
  allowedHosts: string[],
) {
  const url = absoluteUrl(href);
  if (!url) return;
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return;
  }
  if (!allowedHosts.some((allowed) => host.endsWith(allowed))) return;
  if (/login|privacy|terms|cookie|careers|help-center\/contact/i.test(url)) return;

  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  if (cleanTitle.length < 8 || cleanTitle.length > 120) return;
  if (!/sat|bluebook|practice|khan|question|prep|digital/i.test(`${cleanTitle} ${url}`)) return;

  const id = slug(`${source}-${cleanTitle}`);
  if (found.has(id)) return;
  found.set(id, {
    id,
    title: cleanTitle,
    href: url,
    source,
    kind: KIND_HINTS.find(([, pattern]) => pattern.test(`${cleanTitle} ${url}`))?.[0] ?? 'lesson',
  });
}

function absoluteUrl(href: string) {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:')) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `https://satsuite.collegeboard.org${trimmed}`;
  return '';
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
