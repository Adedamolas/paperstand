'use client';

import { Canvas } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { Leva, button, folder, useControls } from 'leva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectTier, TIER_CONFIG } from '@/src/lib/tier';
import { useApp } from '@/src/state/store';
import { Hud } from '@/src/ui/Hud';
import { HudProbe } from '@/src/ui/HudProbe';
import { TiltChip } from '@/src/ui/TiltChip';
import { HeldCamera } from '../CameraRig';
import { createGrainTexture, createMockPages } from './mockPage';
import { loadPageTextures, type PageTextures } from './pageTextures';
import { Paper, PaperControls } from './Paper';
import { PAPER_CONFIG, reducedMotion, type PaperConfig } from './paper.config';
import styles from './PaperLab.module.css';

// Slider ranges for every tunable. Anything missing falls back to 0..2x its default.
const RANGES: Partial<Record<string, [number, number, number]>> = {
  gripY: [-0.3, 0.4, 0.01],
  sag: [0, 0.25, 0.001],
  droop: [0, 1.5, 0.01],
  droopBottom: [-1, 1.5, 0.01],
  droopEdgeRelief: [0, 1, 0.01],
  curl: [-0.15, 0.15, 0.001],
  curlBottom: [-1, 1.5, 0.01],
  pinch: [0, 0.03, 0.0005],
  droopSpeed: [0, 1, 0.01],
  air: [0, 0.3, 0.001],
  flapImpulse: [0, 0.3, 0.001],
  flapK: [1, 30, 0.1],
  flapSpeed: [0, 30, 0.1],
  flapMax: [0, 0.2, 0.001],
  breeze: [0, 0.05, 0.0005],
  breezeScale: [0.5, 8, 0.1],
  breezeSpeed: [0, 3, 0.01],
  creaseRadius: [0.001, 0.03, 0.0005],
  foldClosure: [0.8, 1, 0.001],
  turnCurl: [0, 2.5, 0.01],
  turnMs: [200, 1500, 10],
  foldMs: [200, 1500, 10],
  dragScale: [0, 3, 0.01],
  dragLimit: [0, 1, 0.01],
  lagTilt: [0, 3, 0.01],
  flickVelocity: [0.2, 3, 0.05],
  tiltRange: [0, 0.5, 0.01],
  showThrough: [0, 0.3, 0.005],
  showThroughBacklit: [0, 0.5, 0.005],
};

type Flat = Record<string, number>;

function flatten(cfg: PaperConfig): Flat {
  const out: Flat = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (typeof v === 'number') out[k] = v;
  }
  for (const [name, s] of Object.entries(cfg.springs)) {
    out[`${name}.k`] = s.k;
    out[`${name}.c`] = s.c;
  }
  return out;
}

function unflatten(flat: Flat, base: PaperConfig): PaperConfig {
  const cfg = { ...base, springs: { ...base.springs } } as PaperConfig;
  for (const [k, v] of Object.entries(flat)) {
    const [a, b] = k.split('.');
    if (b) cfg.springs[a as keyof PaperConfig['springs']] = { ...cfg.springs[a as keyof PaperConfig['springs']], [b]: v };
    else (cfg as unknown as Flat)[a] = v;
  }
  return cfg;
}

function schemaFor(flat: Flat) {
  const groups: Record<string, string[]> = {
    shape: ['gripY', 'sag', 'droop', 'droopBottom', 'droopEdgeRelief', 'curl', 'curlBottom', 'pinch'],
    motion: ['droopSpeed', 'air', 'flapImpulse', 'flapK', 'flapSpeed', 'flapMax', 'dragScale', 'dragLimit', 'lagTilt', 'flickVelocity', 'tiltRange'],
    breeze: ['breeze', 'breezeScale', 'breezeSpeed'],
    'fold & turn': ['creaseRadius', 'foldClosure', 'turnCurl', 'turnMs', 'foldMs'],
    material: ['showThrough', 'showThroughBacklit'],
    springs: Object.keys(flat).filter((k) => k.includes('.')),
  };
  const schema: Record<string, ReturnType<typeof folder>> = {};
  for (const [g, keys] of Object.entries(groups)) {
    const entries: Record<string, { value: number; min: number; max: number; step: number }> = {};
    for (const k of keys) {
      const v = flat[k];
      const [min, max, step] = RANGES[k] ?? [0, Math.max(1, v * 2), Math.max(v / 100, 0.01)];
      entries[k] = { value: v, min, max, step };
    }
    schema[g] = folder(entries, { collapsed: g !== 'shape' });
  }
  return schema;
}

function LabScene({ tier, reduced }: { tier: 'low' | 'mid' | 'high'; reduced: boolean }) {
  const tierCfg = TIER_CONFIG[tier];
  const base = useMemo(() => (reduced ? reducedMotion(PAPER_CONFIG[tier]) : PAPER_CONFIG[tier]), [tier, reduced]);
  const config = useRef<PaperConfig>(base);
  const controls = useMemo(() => new PaperControls(), []);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    controls.setReduced(reduced);
    const q = new URLSearchParams(window.location.search);
    if (q.has('fold') || q.has('turn')) controls.pose(Number(q.get('fold') ?? 0), Number(q.get('turn') ?? 0));
  }, [controls, reduced]);

  const flat = useMemo(() => flatten(base), [base]);
  const values = useControls(() => ({
    ...schemaFor(flat),
    'Fold / unfold': button(() => controls.setFolded(!controls.folded, config.current.foldMs)),
    'Turn over': button(() => controls.turnOver(config.current.turnMs)),
    'Copy config': button(() => {
      const ts = `// paste into PAPER_CONFIG in src/scene/paper/paper.config.ts\n${JSON.stringify(config.current, null, 2)}\n`;
      console.log(ts);
      navigator.clipboard?.writeText(ts).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    }),
  }))[0] as Flat;

  useEffect(() => {
    config.current = unflatten(values, base);
  }, [values, base]);

  const [textures, setTextures] = useState<PageTextures | null>(null);
  const grain = useMemo(() => createGrainTexture(), []);
  useEffect(() => () => grain.dispose(), [grain]);
  useEffect(() => {
    let alive = true;
    let made: PageTextures | null = null;
    const q = new URLSearchParams(window.location.search);
    loadPageTextures({ slug: q.get('paper') ?? 'lantern', lowTier: tier === 'low', anisotropy: tierCfg.anisotropy, mock: q.get('mock') === '1' }).then((t) => {
      made = t;
      if (alive) setTextures(t);
      else t.dispose();
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [tier, tierCfg.anisotropy]);

  const bind = useDrag(
    ({ movement: [mx, my], last, velocity: [vx, vy], direction: [, dy], tap }) => {
      const cfg = config.current;
      if (tap) {
        // Tapping a folded paper picks it up. Story hit-testing arrives in M5.
        if (controls.folded) controls.setFolded(false, cfg.foldMs);
        return;
      }
      if (!last) {
        controls.setDrag(mx, my);
        return;
      }
      controls.setDrag(0, 0);
      if (vy > cfg.flickVelocity && vy > vx) {
        if (dy < 0) controls.turnOver(cfg.turnMs);
        else if (dy > 0) controls.setFolded(true, cfg.foldMs);
      }
    },
    { filterTaps: true, pointer: { touch: true } },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') controls.turnOver(config.current.turnMs);
      if (e.key === 'f') controls.setFolded(!controls.folded, config.current.foldMs);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controls]);

  const onTilt = useCallback(
    (x: number, y: number) => {
      controls.setTilt(x, y);
    },
    [controls],
  );

  return (
    <>
      <div className={styles.canvas} {...bind()}>
        <Canvas
          aria-hidden="true"
          dpr={tierCfg.dpr}
          gl={{ antialias: tierCfg.antialias, powerPreference: 'high-performance' }}
        >
          <HeldCamera />
          {textures ? (
            <Paper
              controls={controls}
              config={config}
              front={textures.front}
              back={textures.back}
              grain={grain}
              segments={tierCfg.segments}
            />
          ) : null}
          <HudProbe />
        </Canvas>
      </div>
      <div className={styles.bar}>
        <TiltChip onTilt={onTilt} />
        <span className={styles.hint}>
          {textures?.paper ? `${textures.paper.title}, today. ` : textures ? 'Specimen page. ' : 'Loading today\u2019s paper. '}
          Drag to move. Flick up to turn over. Swipe down to put back, tap to pick up.
          {copied ? ' Config copied.' : ''}
        </span>
      </div>
    </>
  );
}

/** `?flat=front|back` shows the page texture flat, for reviewing the layout itself. */
function FlatPage({ side }: { side: 'front' | 'back' }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    createMockPages(1536, 1).then(({ canvases }) => alive && setSrc(canvases[side].toDataURL('image/png')));
    return () => {
      alive = false;
    };
  }, [side]);
  return src ? (
    <div className={styles.flatWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from a canvas */}
      <img src={src} alt={`Specimen ${side} page`} className={styles.flat} />
    </div>
  ) : null;
}

export default function PaperLab() {
  const renderTier = useApp((s) => s.renderTier);
  const [flat] = useState(() =>
    typeof window === 'undefined' ? null : (new URLSearchParams(window.location.search).get('flat') as 'front' | 'back' | null),
  );
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches || q.get('reduced') === '1');
    detectTier().then((t) => {
      useApp.getState().init(t, true);
      update();
    });
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (flat === 'front' || flat === 'back') return <FlatPage side={flat} />;

  return (
    <main className={styles.lab}>
      <Leva collapsed titleBar={{ title: 'Paper lab' }} />
      {renderTier ? <LabScene key={`${renderTier}-${reduced}`} tier={renderTier} reduced={reduced} /> : null}
      <Hud />
    </main>
  );
}
