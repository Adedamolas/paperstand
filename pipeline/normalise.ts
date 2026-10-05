// Text and URL hygiene for feed items (spec 4.4). Everything here is pure and tested.

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '-',
  mdash: ', ',
  hellip: '...',
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  naira: '₦',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Strip tags (dropping script/style content), decode entities, collapse whitespace. */
export function cleanText(html: string): string {
  const noBlocks = html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<(script|style|figure|figcaption)[\s\S]*?<\/\1>/gi, ' ');
  // Decode first so entity-encoded tags (&lt;p&gt;) are stripped too, then strip, then decode
  // anything that remains (double-encoded feeds are common).
  const stripped = decodeEntities(noBlocks).replace(/<[^>]*>/g, ' ');
  return decodeEntities(stripped)
    .replace(/[​-‍﻿]/g, '')
    // House style: no em dashes in anything we print.
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Drop feed boilerplate like "The post X appeared first on Y." and "[...]". */
export function stripBoilerplate(s: string): string {
  return s
    .replace(/\bThe post .* appeared first on .*$/i, '')
    .replace(/\[(\.\.\.|…|&hellip;)\]/g, '')
    .replace(/\s*(Continue reading|Read more|Read More)\s*:?\s*(https?:\/\/\S+)?\s*$/i, '')
    .replace(/\s*https?:\/\/\S+\s*$/, '')
    .trim();
}

export const EXCERPT_MAX_WORDS = 40;

/**
 * First sentences of the description, at most 40 words (spec 4.4, hard rule 4.6.1). Cuts at a
 * sentence boundary when one fits, otherwise at a word boundary with an ellipsis.
 */
export function excerpt(text: string, maxWords = EXCERPT_MAX_WORDS): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  const capped = words.slice(0, maxWords).join(' ');
  const lastStop = Math.max(capped.lastIndexOf('. '), capped.lastIndexOf('? '), capped.lastIndexOf('! '));
  if (lastStop > capped.length * 0.5) return capped.slice(0, lastStop + 1);
  return `${words.slice(0, maxWords).join(' ').replace(/[,;:.\s]+$/, '')}...`;
}

export function wordCount(s: string) {
  return s.split(/\s+/).filter((w) => w && w !== '...').length;
}

/** Strip utm_* and other trackers, fragments and trailing slashes; force https; lowercase host. */
export function canonicalUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.protocol = 'https:';
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) {
    if (/^utm_/i.test(k) || ['fbclid', 'gclid', 'amp', 'ref', 'source'].includes(k.toLowerCase())) u.searchParams.delete(k);
  }
  u.searchParams.sort();
  let s = u.toString();
  if (u.pathname !== '/' || !u.search) s = s.replace(/\/(\?|$)/, '$1');
  return s;
}

export function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

// Stopwords for title clustering, including Nigerian news filler (spec 4.4).
const STOP = new Set(
  (
    'a an the and or but of to in on at for from by with as is are was were be been it its this that these those ' +
    'he she they we you i his her their our over after before into about against amid says said say tells told ' +
    'new not no will has have had how why what who when where breaking just in video photos photo watch live ' +
    'update updates full details latest exclusive news nigeria nigerian'
  ).split(' '),
);

export function titleTokens(title: string): string[] {
  const toks = title
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
  return [...new Set(toks)];
}

/**
 * Drop publisher labels around a headline ("BREAKING:", "JUST IN -", "| Watch Trailer"). The
 * headline's own words are never changed (hard rule 4.6.3).
 */
export function displayTitle(title: string): string {
  return title
    .replace(/^\s*(breaking( news)?|just in|exclusive|video|photos?|watch|live|updated?)\s*[:|\-]\s*/i, '')
    .replace(/\s*\|\s*(watch|see|read|listen)\b.*$/i, '')
    .trim();
}
