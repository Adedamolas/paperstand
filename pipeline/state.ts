import type { Article } from './ingest';

// Pipeline state, kept as one JSON document in Blob storage instead of Postgres
// (DECISIONS.md, 2026-10-05). Holds per-feed fetch etiquette and a rolling window of articles
// so clusters survive 304 Not Modified responses and span runs.

export type FeedState = {
  etag?: string;
  lastModified?: string;
  lastFetchedAt?: number;
  failCount: number;
  status: 'ok' | 'degraded';
};

export type PipelineState = {
  version: 1;
  feeds: Record<string, FeedState>;
  robots: Record<string, { checkedAt: number; body: string }>;
  articles: Article[];
  /** Edition bookkeeping: date (WAT) -> last revision number. */
  revisions: Record<string, number>;
  /** Content-hashed image URLs of past editions, for the 90-day prune. */
  editions: { date: string; revision: number; files: string[] }[];
};

export const ARTICLE_WINDOW_MS = 48 * 3600 * 1000;

export function emptyState(): PipelineState {
  return { version: 1, feeds: {}, robots: {}, articles: [], revisions: {}, editions: [] };
}

/** Merge fresh articles in (dedupe on canonical URL), drop ones older than the window. */
export function mergeArticles(state: PipelineState, fresh: Article[], now: number) {
  const byUrl = new Map(state.articles.map((a) => [a.url, a]));
  for (const a of fresh) {
    const prev = byUrl.get(a.url);
    if (!prev) {
      byUrl.set(a.url, a);
      continue;
    }
    // Keep the earliest fetch time and the most reliable category (category feed > tag > keyword).
    const better = a.categoryBasis <= prev.categoryBasis ? a : prev;
    byUrl.set(a.url, { ...a, fetchedAt: prev.fetchedAt, category: better.category, categoryBasis: better.categoryBasis, imageUrl: a.imageUrl ?? prev.imageUrl });
  }
  state.articles = [...byUrl.values()].filter((a) => now - a.publishedAt < ARTICLE_WINDOW_MS && a.publishedAt - now < 3600e3);
}
