import { XMLParser } from 'fast-xml-parser';
import pLimit from 'p-limit';
import { categoriseWithBasis, type CategoryBasis } from './categorise';
import { canonicalUrl, cleanText, displayTitle, excerpt, parseDate, stripBoilerplate, titleTokens } from './normalise';
import { FEEDS, USER_AGENT, type Category, type Feed } from './sources';
import type { FeedState, PipelineState } from './state';

export type Article = {
  id: string;
  source: string;
  url: string;
  title: string;
  excerpt: string;
  imageUrl?: string;
  publishedAt: number;
  fetchedAt: number;
  category: Category;
  categoryBasis: CategoryBasis;
  tokens: string[];
};

const TIMEOUT_MS = 10_000;
const CONCURRENCY = 4;
const DEGRADED_AFTER = 5;
const DAY_MS = 24 * 3600 * 1000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: false,
  processEntities: false,
  htmlEntities: false,
  trimValues: true,
});

function text(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) return text((v as Record<string, unknown>)['#text']);
  return '';
}

function list<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

type RawItem = Record<string, unknown>;

function findImage(item: RawItem): string | undefined {
  const candidates: unknown[] = [
    ...list(item['media:content'] as RawItem | RawItem[]),
    ...list(item['media:thumbnail'] as RawItem | RawItem[]),
    ...list(item['enclosure'] as RawItem | RawItem[]),
  ];
  for (const c of candidates) {
    const o = c as Record<string, string>;
    const url = o?.['@_url'];
    const type = o?.['@_type'] ?? o?.['@_medium'] ?? '';
    if (url && (!type || /image/.test(type)) && !/\.(mp4|mp3|webm)(\?|$)/i.test(url)) return url;
  }
  const html = text(item['content:encoded']) + text(item['description']);
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

// Publisher logos and avatars show up as the "image" of items that have no photo.
const LOGO_RE = /logo|favicon|gravatar|avatar|placeholder|default-image|blank\.(png|jpe?g|gif)/i;

function hashId(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function parseFeed(xml: string, feed: Feed, now: number): Article[] {
  const doc = parser.parse(xml) as Record<string, RawItem>;
  const channel = (doc.rss?.channel ?? doc['rdf:RDF'] ?? doc.feed) as RawItem | undefined;
  if (!channel) return [];
  const items = list((channel.item ?? channel.entry) as RawItem | RawItem[]);
  const out: Article[] = [];
  for (const item of items) {
    const linkRaw = text(item.link) || ((item.link as Record<string, string>)?.['@_href'] ?? '');
    const url = canonicalUrl(linkRaw);
    const title = displayTitle(cleanText(text(item.title)));
    if (!url || !title) continue;
    const published = parseDate(text(item.pubDate) || text(item['dc:date']) || text(item.published) || text(item.updated));
    const desc = stripBoilerplate(cleanText(text(item.description) || text(item.summary) || text(item['content:encoded'])));
    const tags = list(item.category as unknown).map(text).map(cleanText).filter(Boolean);
    const img = findImage(item);
    const [category, categoryBasis] = categoriseWithBasis(feed.category, tags, title);
    out.push({
      id: hashId(url),
      source: feed.source,
      url,
      title,
      excerpt: excerpt(desc),
      imageUrl: img && !LOGO_RE.test(img) ? canonicalUrl(img) ?? undefined : undefined,
      publishedAt: (published ?? new Date(now)).getTime(),
      fetchedAt: now,
      category,
      categoryBasis,
      tokens: titleTokens(title),
    });
  }
  return out;
}

async function get(url: string, headers: Record<string, string> = {}) {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*', ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
}

/** Minimal robots.txt check for our UA or *. */
export function robotsAllows(robots: string, path: string): boolean {
  let applies = false;
  const disallow: string[] = [];
  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [k, ...rest] = line.split(':');
    const v = rest.join(':').trim();
    if (/^user-agent$/i.test(k)) applies = v === '*' || /paperstand/i.test(v);
    else if (applies && /^disallow$/i.test(k) && v) disallow.push(v);
  }
  return !disallow.some((d) => path.startsWith(d));
}

async function robotsOk(feed: Feed, state: PipelineState, now: number) {
  const host = new URL(feed.url).host;
  const cached = state.robots[host];
  let body = cached?.body;
  if (!cached || now - cached.checkedAt > DAY_MS) {
    try {
      const res = await get(`https://${host}/robots.txt`);
      body = res.ok ? (await res.text()).slice(0, 50_000) : '';
    } catch {
      body = cached?.body ?? '';
    }
    state.robots[host] = { checkedAt: now, body: body ?? '' };
  }
  return robotsAllows(body ?? '', new URL(feed.url).pathname);
}

export type FeedReport = { url: string; source: string; status: 'ok' | 'not-modified' | 'failed' | 'skipped' | 'robots'; items: number; error?: string };

export async function ingest(state: PipelineState, now = Date.now(), feeds = FEEDS) {
  const limit = pLimit(CONCURRENCY);
  const reports: FeedReport[] = [];
  const fresh: Article[] = [];

  await Promise.all(
    feeds.map((feed) =>
      limit(async () => {
        const fs: FeedState = (state.feeds[feed.url] ??= { failCount: 0, status: 'ok' });
        // Degraded sources retry once a day.
        if (fs.status === 'degraded' && fs.lastFetchedAt && now - fs.lastFetchedAt < DAY_MS) {
          reports.push({ url: feed.url, source: feed.source, status: 'skipped', items: 0 });
          return;
        }
        if (!(await robotsOk(feed, state, now))) {
          reports.push({ url: feed.url, source: feed.source, status: 'robots', items: 0 });
          return;
        }
        try {
          const headers: Record<string, string> = {};
          if (fs.etag) headers['If-None-Match'] = fs.etag;
          if (fs.lastModified) headers['If-Modified-Since'] = fs.lastModified;
          const res = await get(feed.url, headers);
          fs.lastFetchedAt = now;
          if (res.status === 304) {
            fs.failCount = 0;
            fs.status = 'ok';
            reports.push({ url: feed.url, source: feed.source, status: 'not-modified', items: 0 });
            return;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const xml = await res.text();
          // Some publishers redirect topic feeds to their general feed (Punch does for our UA), so a
          // redirected category feed no longer vouches for its category.
          const redirected = res.redirected && new URL(res.url).pathname !== new URL(feed.url).pathname;
          const items = parseFeed(xml, redirected ? { ...feed, category: undefined } : feed, now);
          if (!items.length) throw new Error('no items');
          fs.etag = res.headers.get('etag') ?? undefined;
          fs.lastModified = res.headers.get('last-modified') ?? undefined;
          fs.failCount = 0;
          fs.status = 'ok';
          fresh.push(...items);
          reports.push({ url: feed.url, source: feed.source, status: 'ok', items: items.length });
        } catch (err) {
          fs.failCount += 1;
          fs.lastFetchedAt = now;
          if (fs.failCount >= DEGRADED_AFTER) fs.status = 'degraded';
          reports.push({ url: feed.url, source: feed.source, status: 'failed', items: 0, error: String((err as Error).message ?? err) });
        }
      }),
    ),
  );

  return { fresh, reports };
}
