import type { EditionManifest } from '@/src/lib/manifest';
import { StandClient } from '@/src/scene/StandClient';
import { EditionStamp } from './EditionStamp';
import styles from './StandPage.module.css';

/**
 * Server-rendered shell around the 3D stand: the edition stamp and today's headlines are in the
 * HTML before any JavaScript (spec 8 loading order, 9.2 accessibility, 9.3 SEO).
 */
export function StandPage({ manifest, initialHeld }: { manifest: EditionManifest | null; initialHeld?: string }) {
  const date = manifest ? new Date(manifest.generatedAt) : new Date();
  return (
    <main className={styles.main}>
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.roof} />
        <div className={styles.table} />
      </div>
      <h1 className="visually-hidden">Paperstand: today&apos;s Nigerian front pages</h1>
      <section className="visually-hidden" aria-label="Today's papers">
        {manifest?.papers.map((p) => (
          <article key={p.slug}>
            <h2>{p.title}</h2>
            <ul>
              {p.pages[0].stories.map((s) => (
                <li key={s.id}>
                  <a href={s.url} rel="noopener" target="_blank">
                    {s.headline}
                  </a>{' '}
                  ({s.source})
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <StandClient manifest={manifest} initialHeld={initialHeld} />
      <EditionStamp date={date} late={manifest?.late} />
      {!manifest ? <p className={styles.empty}>Today&apos;s papers are on their way. Please check back shortly.</p> : null}
    </main>
  );
}
