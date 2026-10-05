// Dev helper: `pnpm tsx pipeline/dev-ingest.ts` runs one ingest against live feeds.
import { ingest } from './ingest';
import { planEdition, rankStories } from './assign';
import { emptyState, mergeArticles } from './state';

async function main() {
  const state = emptyState();
  const t0 = Date.now();
  const { fresh, reports } = await ingest(state);
  mergeArticles(state, fresh, Date.now());
  console.table(reports.map((r) => ({ source: r.source, url: r.url.replace(/^https:\/\/(www\.)?/, ''), status: r.status, items: r.items, error: r.error ?? '' })));
  console.log(`articles: ${state.articles.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const cats: Record<string, number> = {};
  for (const a of state.articles) cats[a.category] = (cats[a.category] ?? 0) + 1;
  console.log(cats);
  console.log(`with images: ${state.articles.filter((a) => a.imageUrl).length}`);
  const ranked = rankStories(state.articles, Date.now());
  console.log('\nTOP STORIES');
  for (const s of ranked.slice(0, 12)) console.log(`  ${s.score.toFixed(2)} [${s.category}] x${s.size} (${s.sources.join(', ')}) ${s.lead.title}`);
  for (const p of planEdition(ranked)) {
    console.log(`\n== ${p.slug.toUpperCase()}`);
    p.front.slice(0, 4).forEach((s, i) => console.log(`  ${i ? ' ' : '*'} ${s.lead.title} (${s.lead.source})`));
    console.log(`  back: ${p.back.slice(0, 2).map((s) => s.lead.title).join(' | ')}`);
  }
  for (const a of state.articles.slice(0, 0)) console.log(`- [${a.source}/${a.category}] ${a.title}\n    ${a.excerpt}\n    ${a.imageUrl ?? '(no image)'}`);
}

main();
