'use client';

import { useApp } from '@/src/state/store';
import { useHud } from './hud.store';
import styles from './Hud.module.css';

/** Dev HUD, shown with `?hud=1` (spec Section 8). Numbers go in every gate report. */
export function Hud() {
  const s = useHud();
  const tier = useApp((a) => a.tier);
  const phase = useApp((a) => a.phase);

  return (
    <dl className={styles.hud} aria-hidden="true">
      <dt>fps</dt>
      <dd>{s.fps}</dd>
      <dt>calls</dt>
      <dd>{s.calls}</dd>
      <dt>tris</dt>
      <dd>{s.triangles.toLocaleString()}</dd>
      <dt>tex</dt>
      <dd>
        {s.textures} / {s.textureMB}MB
      </dd>
      <dt>tier</dt>
      <dd>
        {tier?.tier ?? '…'}
        {tier?.reason === 'override' ? '*' : ''}
      </dd>
      <dt>dpr</dt>
      <dd>{s.dpr}</dd>
      <dt>state</dt>
      <dd>{phase}</dd>
      {tier?.gpu ? (
        <>
          <dt>gpu</dt>
          <dd className={styles.gpu}>{tier.gpu}</dd>
        </>
      ) : null}
    </dl>
  );
}
