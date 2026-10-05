import { cluster } from './cluster';
import type { Article } from './ingest';
import { score } from './rank';
import type { Category } from './sources';

// Cluster, rank, and deal stories out to the six papers (spec 3 and 4.4).

export type RankedStory = {
  id: string;
  lead: Article;
  size: number;
  distinctSources: number;
  sources: string[];
  category: Category;
  score: number;
};

export type PaperSlug = 'lantern' | 'chronicle' | 'marketday' | 'goalmouth' | 'gbedu' | 'metro';

export type PaperPlan = {
  slug: PaperSlug;
  front: RankedStory[];
  back: RankedStory[];
};

/** Category weights per paper: which stories each paper wants, and how much. */
const MIX: Record<PaperSlug, { front: Partial<Record<Category, number>>; back: Partial<Record<Category, number>> }> = {
  lantern: { front: { politics: 1, national: 1, business: 0.9, metro: 0.8, world: 0.7, sports: 0.5, entertainment: 0.4 }, back: { sports: 1 } },
  chronicle: { front: { politics: 1.3, national: 1 }, back: { sports: 1 } },
  marketday: { front: { business: 1.4, politics: 0.4, national: 0.3 }, back: { sports: 1 } },
  goalmouth: { front: { sports: 1 }, back: { sports: 1 } },
  gbedu: { front: { entertainment: 1 }, back: { entertainment: 1 } },
  metro: { front: { metro: 1.4, national: 0.9, politics: 0.4 }, back: { sports: 1 } },
};

export const FRONT_STORIES = 14;
export const BACK_STORIES = 12;
const DOMINANT_SOURCES = 5;
const MAX_LEADS_FOR_DOMINANT = 3;

function pickLead(group: Article[]): Article {
  // Prefer the earliest report that has a photo and a real excerpt.
  return [...group].sort((a, b) => {
    const qa = (a.imageUrl ? 2 : 0) + (a.excerpt.length > 60 ? 1 : 0);
    const qb = (b.imageUrl ? 2 : 0) + (b.excerpt.length > 60 ? 1 : 0);
    return qb - qa || a.publishedAt - b.publishedAt;
  })[0];
}

function clusterCategory(group: Article[]): Category {
  // The most reliably categorised member decides; ties go to the most common category.
  const best = Math.min(...group.map((a) => a.categoryBasis));
  const counts = new Map<Category, number>();
  for (const a of group) if (a.categoryBasis === best) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function rankStories(articles: Article[], now: number): RankedStory[] {
  return cluster(articles.map((a) => ({ ...a, tokens: a.tokens })))
    .map((group) => {
      const lead = pickLead(group);
      const sources = [...new Set(group.map((a) => a.source))];
      const category = clusterCategory(group);
      const newest = Math.max(...group.map((a) => a.publishedAt));
      return {
        id: lead.id,
        lead,
        size: group.length,
        distinctSources: sources.length,
        sources,
        category,
        score: score(group.length, sources.length, category, (now - newest) / 3600e3),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function pickFor(stories: RankedStory[], weights: Partial<Record<Category, number>>, n: number, skip: Set<string>, offset = 0) {
  const pool = stories
    .filter((s) => weights[s.category] && !skip.has(s.id))
    .map((s) => ({ s, w: s.score * (weights[s.category] ?? 0) }))
    .sort((a, b) => b.w - a.w)
    .map((x) => x.s);
  // Rotate the pool a little so papers with the same mix don't print identical pages.
  const rotated = offset ? [...pool.slice(offset), ...pool.slice(0, offset)] : pool;
  return rotated.slice(0, n);
}

export function planEdition(stories: RankedStory[]): PaperPlan[] {
  const slugs: PaperSlug[] = ['lantern', 'chronicle', 'marketday', 'goalmouth', 'gbedu', 'metro'];
  const dominant = stories.find((s) => s.distinctSources >= DOMINANT_SOURCES);
  let dominantLeads = 0;

  return slugs.map((slug, i) => {
    const mix = MIX[slug];
    const used = new Set<string>();
    let front = pickFor(stories, mix.front, FRONT_STORIES, used);

    // A dominant story may lead up to three papers, as happens in real life (spec 4.4).
    if (dominant && dominantLeads < MAX_LEADS_FOR_DOMINANT && mix.front[dominant.category] && front[0]?.id !== dominant.id) {
      front = [dominant, ...front.filter((s) => s.id !== dominant.id)].slice(0, FRONT_STORIES);
    }
    if (dominant && front[0]?.id === dominant.id) dominantLeads++;

    front.forEach((s) => used.add(s.id));
    // Back pages share the sports pool, so offset each paper's slice of it.
    const back = pickFor(stories, mix.back, BACK_STORIES, used, slug === 'goalmouth' || slug === 'gbedu' ? 0 : (i % 3) * 2);
    return { slug, front, back };
  });
}
