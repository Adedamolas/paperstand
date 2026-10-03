'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { detectTier } from '@/src/lib/tier';
import { useApp } from '@/src/state/store';
import { Hud } from '@/src/ui/Hud';
import styles from './Stage.module.css';

// three.js and the scene code load after the HTML skeleton (spec loading order).
const StageCanvas = dynamic(() => import('./StageCanvas'), { ssr: false });

export function Stage() {
  const renderTier = useApp((s) => s.renderTier);
  const showHud = useApp((s) => s.showHud);

  useEffect(() => {
    let cancelled = false;
    detectTier().then((t) => {
      if (cancelled) return;
      useApp.getState().init(t, new URLSearchParams(window.location.search).get('hud') === '1');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.stage}>
      {renderTier ? <StageCanvas tier={renderTier} /> : null}
      {showHud ? <Hud /> : null}
    </div>
  );
}
