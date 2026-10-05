// One edition run (spec 4.1): ingest -> cluster -> rank -> compose -> upload -> manifest.
// `pnpm pipeline:run` in GitHub Actions hourly; `--dry` composes without uploading.

import { mkdirSync, writeFileSync } from 'node:fs';
import pLimit from 'p-limit';
import { EditionManifestSchema, type EditionManifest, type Paper } from '../src/lib/manifest';
import { editionStamp, isLateCity, watDateKey } from '../src/lib/time';
import { planEdition, rankStories } from './assign';
import { composePage } from './compose/layout';
import { PAPERS } from './compose/papers';
import { ingest } from './ingest';
import { emptyState, mergeArticles, type PipelineState } from './state';
import { deleteFiles, getJson, putJson, renderAndUpload } from './upload';
import { lagosWeather } from './weather';

const STATE_PATH = 'state/pipeline.json';
const RETENTION_DAYS = 90;
const MIN_HEALTHY_SOURCES = 5;

function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
}

async function main() {
  const dry = process.argv.includes('--dry');
  const t0 = Date.now();
  const now = Date.now();
  const date = new Date(now);
  const editionDate = watDateKey(date);
  const photos = (process.env.ENABLE_PHOTOS ?? 'true') === 'true';

  if (!dry && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is not set');

  const state: PipelineState = (!dry && (await getJson<PipelineState>(STATE_PATH))) || emptyState();
  log(`state: ${state.articles.length} articles, ${Object.keys(state.feeds).length} feeds known`);

  const { fresh, reports } = await ingest(state, now);
  mergeArticles(state, fresh, now);
  const healthy = new Set(reports.filter((r) => r.status === 'ok' || r.status === 'not-modified').map((r) => r.source));
  log(`ingest: ${fresh.length} items, ${state.articles.length} in window, ${healthy.size} healthy sources`);
  for (const r of reports.filter((r) => r.status === 'failed')) log(`  feed failed: ${r.url} (${r.error})`);
  if (healthy.size < MIN_HEALTHY_SOURCES) {
    // NewsData.io fallback would go here (spec 4.2); it stays off until its terms are cleared.
    log(`warning: only ${healthy.size} healthy sources`);
  }
  if (!state.articles.length) throw new Error('no articles; keeping the last good edition');

  const ranked = rankStories(state.articles, now);
  const plan = planEdition(ranked);
  const weather = await lagosWeather();
  const late = isLateCity(date);
  const dateLabel = editionStamp(date, late).split(',')[0];

  const files: string[] = [];
  if (dry) mkdirSync('.pipeline-out', { recursive: true });
  // Three papers at a time: composing is CPU-bound, uploading is network-bound.
  const limit = pLimit(3);
  const papers: Paper[] = await Promise.all(
    plan.map((p) =>
      limit(async () => {
        const style = PAPERS[p.slug];
        const pages: Paper['pages'] = [];
        for (const kind of ['front', 'back'] as const) {
          const stories = kind === 'front' ? p.front : p.back;
          const { canvas, stories: placed } = await composePage({ style, kind, stories, date, dateLabel, late, weather, photos });
          const png = canvas.toBuffer('image/png');
          if (dry) {
            writeFileSync(`.pipeline-out/${p.slug}-${kind}.png`, png);
            const fake = `https://example.invalid/${p.slug}-${kind}`;
            pages.push({ kind, lo: `${fake}-lo.webp`, hi: `${fake}-hi.webp`, hiLow: `${fake}-hilow.webp`, og: `${fake}-og.png`, width: canvas.width, height: canvas.height, stories: placed });
            continue;
          }
          const img = await renderAndUpload(png);
          files.push(...img.files);
          log(`  ${p.slug} ${kind}: ${placed.length} stories, lo ${(img.bytes.lo / 1024).toFixed(0)}KB hi ${(img.bytes.hi / 1024).toFixed(0)}KB`);
          pages.push({ kind, lo: img.lo, hi: img.hi, hiLow: img.hiLow, og: img.og, width: canvas.width, height: canvas.height, stories: placed });
        }
        return { slug: p.slug, title: style.title, priceLabel: style.priceLabel, pages };
      }),
    ),
  );

  const revision = (state.revisions[editionDate] ?? 0) + 1;
  const manifest: EditionManifest = EditionManifestSchema.parse({
    editionDate,
    revision,
    generatedAt: new Date().toISOString(),
    late,
    weather,
    papers,
  });

  if (dry) {
    writeFileSync('.pipeline-out/manifest.json', JSON.stringify(manifest, null, 2));
    log(`dry run done in ${((Date.now() - t0) / 1000).toFixed(1)}s (.pipeline-out/)`);
    return;
  }

  const dayUrl = await putJson(`editions/${editionDate}.json`, manifest, 60);
  const latestUrl = await putJson('editions/latest.json', manifest, 60);
  state.revisions[editionDate] = revision;
  state.editions.push({ date: editionDate, revision, files });

  // Prune editions past the retention window (spec 4.5); files still referenced by a newer
  // edition (content-hashed, so unchanged pages are shared) are kept.
  const cutoff = watDateKey(new Date(now - RETENTION_DAYS * 86400e3));
  const keep = state.editions.filter((e) => e.date >= cutoff);
  const stale = state.editions.filter((e) => e.date < cutoff);
  const live = new Set(keep.flatMap((e) => e.files));
  const doomed = [...new Set(stale.flatMap((e) => e.files))].filter((f) => !live.has(f));
  if (doomed.length) {
    await deleteFiles(doomed);
    log(`pruned ${doomed.length} files from editions before ${cutoff}`);
  }
  state.editions = keep;
  for (const d of Object.keys(state.revisions)) if (d < cutoff) delete state.revisions[d];

  await putJson(STATE_PATH, state, 60);

  const hook = process.env.REVALIDATE_URL;
  if (hook && process.env.REVALIDATE_SECRET) {
    const res = await fetch(hook, { method: 'POST', headers: { Authorization: `Bearer ${process.env.REVALIDATE_SECRET}` } }).catch(() => null);
    log(`revalidate: ${res?.status ?? 'failed'}`);
  }

  log(`edition ${editionDate} r${revision} published in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  log(`latest: ${latestUrl}`);
  log(`day:    ${dayUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
