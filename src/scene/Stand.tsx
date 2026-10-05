'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fog, LinearMipmapLinearFilter, MathUtils, SRGBColorSpace, TextureLoader, Vector3, type PerspectiveCamera, type Texture } from 'three';
import type { EditionManifest } from '@/src/lib/manifest';
import { detectTier, TIER_CONFIG, type RenderTier } from '@/src/lib/tier';
import { installHistory, onHeld, onPutBackByGesture, seedDeepLink } from '@/src/state/history';
import { useApp } from '@/src/state/store';
import { Hud } from '@/src/ui/Hud';
import { HudProbe } from '@/src/ui/HudProbe';
import { HeldPaper, type PickPath } from './HeldPaper';
import { Kiosk } from './Kiosk';
import { lightingFor, type Lighting } from './lighting';
import { createGrainTexture } from './paper/mockPage';
import { PaperControls } from './paper/Paper';
import { PAPER_CONFIG, reducedMotion, type PaperConfig } from './paper/paper.config';
import { PeggedPaper, TablePaper, pegPose, stoneMatrix, tablePose } from './StandPapers';
import { layoutStand, STAND_FOV, standCamera } from './standLayout';
import { Stones } from './Stones';
import { Table } from './Table';
import styles from './Stand.module.css';

// The stand (spec 2.2, M4): kiosk, table, stones, the day's six papers fanned on the table and
// four pegged on the wall, and the held paper. Renders on demand while idle (spec 8).

const BREEZE_FPS = 15;

function loadTexture(url: string, anisotropy: number) {
  return new Promise<Texture>((resolve, reject) => {
    const l = new TextureLoader();
    l.setCrossOrigin('anonymous');
    l.load(
      url,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        t.minFilter = LinearMipmapLinearFilter;
        t.anisotropy = anisotropy;
        resolve(t);
      },
      undefined,
      reject,
    );
  });
}

/** Moves the stand camera toward its framing for the current pan; idles when settled. */
function StandCamera({ pan }: { pan: { current: number } }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const target = useRef(new Vector3());
  useFrame((state) => {
    const cam = state.camera as PerspectiveCamera;
    const aspect = size.width / size.height;
    if (cam.fov !== STAND_FOV) {
      cam.fov = STAND_FOV;
      cam.updateProjectionMatrix();
    }
    const c = standCamera(aspect, pan.current);
    pan.current = MathUtils.clamp(pan.current, -c.maxPan, c.maxPan);
    const goal = new Vector3(...c.position);
    const moving = cam.position.distanceToSquared(goal) > 1e-6;
    cam.position.lerp(goal, moving ? 0.25 : 1);
    target.current.set(...c.target).setX(cam.position.x);
    cam.lookAt(target.current);
    if (moving) invalidate();
  });
  return null;
}

/** Shared breeze clock; while idle on the stand, ticks frames at 15fps (spec 8). */
function Breeze({ time, idle }: { time: { value: number }; idle: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!idle) return;
    const id = window.setInterval(() => invalidate(), 1000 / BREEZE_FPS);
    return () => window.clearInterval(id);
  }, [idle, invalidate]);
  useFrame((state) => {
    time.value = state.clock.elapsedTime * 0.55;
  });
  return null;
}

function Lights({ l }: { l: Lighting }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new Fog(l.fog, 6, 16);
    scene.background = l.background;
  }, [scene, l]);
  return (
    <>
      <hemisphereLight args={[l.sky, l.ground, l.hemiIntensity]} />
      <directionalLight position={l.sunDir.clone().multiplyScalar(6)} intensity={l.sunIntensity} color={l.sunColor} />
    </>
  );
}

type Props = { manifest: EditionManifest | null; initialHeld?: string };

type Picked = { controls: PaperControls; path: PickPath; key: number };

/** Refs shared between the scene (inside the Canvas) and the gesture layer (outside it). */
type Shared3D = {
  pan: { current: number };
  picked: { current: Picked | null };
  config: { current: PaperConfig };
};

function StandScene({ manifest, tier, initialHeld, refs }: Props & { tier: RenderTier; refs: Shared3D }) {
  const tierCfg = TIER_CONFIG[tier];
  const phase = useApp((s) => s.phase);
  const heldSlug = useApp((s) => s.heldSlug);
  const pickSource = useApp((s) => s.pickSource);
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const lighting = useMemo(() => lightingFor(new Date(), typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('light') : null), []);
  const grain = useMemo(() => createGrainTexture(), []);
  const time = useMemo(() => ({ value: 0 }), []);
  const shared = useMemo(() => ({ time, grain, lighting }), [time, grain, lighting]);
  useEffect(() => () => grain.dispose(), [grain]);

  const papers = useMemo(() => manifest?.papers ?? [], [manifest]);
  const layout = useMemo(() => layoutStand(papers.map((p) => p.slug), manifest?.editionDate ?? 'none'), [papers, manifest]);
  const stones = useMemo(() => layout.table.map((s, i) => stoneMatrix(s, i)).filter((m): m is NonNullable<typeof m> => !!m), [layout]);

  // Lo textures for every paper (fronts and backs), "dropping" in as each one arrives (spec 8).
  const [lo, setLo] = useState<Record<string, { front?: Texture; back?: Texture }>>({});
  useEffect(() => {
    let alive = true;
    const made: Texture[] = [];
    for (const p of papers) {
      for (const [i, key] of [
        [0, 'front'],
        [1, 'back'],
      ] as const) {
        loadTexture(p.pages[i].lo, 2)
          .then((t) => {
            made.push(t);
            if (alive) setLo((prev) => ({ ...prev, [p.slug]: { ...prev[p.slug], [key]: t } }));
          })
          .catch(() => {});
      }
    }
    return () => {
      alive = false;
      made.forEach((t) => t.dispose());
    };
  }, [papers]);

  useEffect(() => {
    if (papers.length && papers.every((p) => lo[p.slug]?.front)) useApp.getState().ready();
  }, [papers, lo]);

  // Hi textures: prefetched on pointerdown, loaded on pick, disposed on put-back (spec 8).
  const hiCache = useRef(new Map<string, Promise<{ front: Texture; back: Texture } | null>>());
  const [hi, setHi] = useState<{ slug: string; front: Texture; back: Texture } | null>(null);
  const prefetch = useCallback(
    (slug: string) => {
      if (hiCache.current.has(slug)) return;
      const p = papers.find((x) => x.slug === slug);
      if (!p) return;
      const key = tier === 'low' ? 'hiLow' : 'hi';
      hiCache.current.set(
        slug,
        Promise.all([loadTexture(p.pages[0][key], tierCfg.anisotropy), loadTexture(p.pages[1][key], tierCfg.anisotropy)])
          .then(([front, back]) => ({ front, back }))
          .catch(() => null),
      );
    },
    [papers, tier, tierCfg.anisotropy],
  );

  useEffect(() => {
    if (!heldSlug) return;
    prefetch(heldSlug);
    let alive = true;
    hiCache.current.get(heldSlug)?.then((t) => {
      if (alive && t) setHi({ slug: heldSlug, ...t });
    });
    return () => {
      alive = false;
    };
  }, [heldSlug, prefetch]);

  useEffect(() => {
    if (phase !== 'STAND' || !hi) return;
    // Back on the table: only one hi texture pair is ever resident. The stale state is cleared
    // on the next pick (an event), so this effect only touches the GPU, never React state.
    hi.front.dispose();
    hi.back.dispose();
    hiCache.current.delete(hi.slug);
  }, [phase, hi]);

  // Pick: a fresh PaperControls per pick, and the path from wherever the paper was.
  useEffect(() => {
    refs.config.current = reduced ? reducedMotion(PAPER_CONFIG[tier]) : PAPER_CONFIG[tier];
  }, [refs, reduced, tier]);
  const [picked, setPicked] = useState<Picked | null>(null);
  const pickCount = useRef(0);
  const onPick = useCallback(
    (slug: string, source: 'table' | 'wall') => {
      if (!useApp.getState().pick(slug, source)) return;
      let path: PickPath;
      if (source === 'wall') {
        const slot = layout.pegged.find((s) => s.slug === slug)!;
        const pose = pegPose(slot);
        path = { ...pose, slide: new Vector3(), folded: false };
      } else {
        const slot = layout.table.find((s) => s.slug === slug)!;
        const pose = tablePose(slot);
        const slide = slot.coveredBy ? tablePose(slot, slot.clear).position.sub(pose.position) : new Vector3();
        path = { ...pose, slide, folded: true };
      }
      pickCount.current += 1;
      setHi(null);
      const next = { controls: new PaperControls(), path, key: pickCount.current };
      refs.picked.current = next;
      setPicked(next);
    },
    [layout, refs],
  );
  const tableHandlers = useMemo(() => ({ onPick: (s: string) => onPick(s, 'table'), onPrefetch: prefetch, enabled: phase === 'STAND' }), [onPick, prefetch, phase]);
  const wallHandlers = useMemo(() => ({ onPick: (s: string) => onPick(s, 'wall'), onPrefetch: prefetch, enabled: phase === 'STAND' }), [onPick, prefetch, phase]);

  // History: HELD pushes an entry; Android back puts the paper down (spec 2.7).
  useEffect(() => installHistory(), []);
  // Pushed as the pick starts, not when it lands, so back during the lift also puts it down.
  useEffect(() => {
    if ((phase === 'PICK' || phase === 'HELD') && heldSlug) onHeld(heldSlug);
  }, [phase, heldSlug]);

  // Deep link /p/[paper]: pick it up as soon as the stand is ready.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (!initialHeld || deepLinked.current || phase !== 'STAND') return;
    if (!papers.some((p) => p.slug === initialHeld)) return;
    deepLinked.current = true;
    seedDeepLink(initialHeld);
    // Responds to the stand becoming ready (textures arrived), not to a render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onPick(initialHeld, 'table');
  }, [initialHeld, phase, papers, onPick]);

  const heldTextures = hi && hi.slug === heldSlug ? hi : heldSlug ? lo[heldSlug] : undefined;

  return (
    <>
      <StandCamera pan={refs.pan} />
      <Lights l={lighting} />
      <Breeze time={time} idle={phase === 'STAND' || phase === 'LOADING'} />
      <Suspense fallback={null}>
        <Kiosk pegged={layout.pegged} lighting={lighting} />
        <Table />
      </Suspense>
      <Stones placements={stones} />
      {layout.table.map((slot) => (
        <TablePaper key={slot.slug} slot={slot} front={lo[slot.slug]?.front ?? null} back={lo[slot.slug]?.back ?? null} shared={shared} hidden={heldSlug === slot.slug && pickSource === 'table'} handlers={tableHandlers} />
      ))}
      {layout.pegged.map((slot) => (
        <PeggedPaper key={`peg-${slot.slug}`} slot={slot} front={lo[slot.slug]?.front ?? null} back={lo[slot.slug]?.back ?? null} shared={shared} hidden={heldSlug === slot.slug && pickSource === 'wall'} handlers={wallHandlers} />
      ))}
      {picked && heldSlug && heldTextures?.front && heldTextures.back ? (
        <HeldPaper
          key={picked.key}
          path={picked.path}
          controls={picked.controls}
          config={refs.config}
          front={heldTextures.front}
          back={heldTextures.back}
          grain={grain}
          segments={tierCfg.segments}
          lighting={lighting}
          reduced={reduced}
        />
      ) : null}
      <HudProbe />
    </>
  );
}

export function Stand({ manifest, initialHeld }: Props) {
  const renderTier = useApp((s) => s.renderTier);
  const showHud = useApp((s) => s.showHud);
  const phase = useApp((s) => s.phase);
  const [refs] = useState<Shared3D>(() => ({ pan: { current: 0 }, picked: { current: null }, config: { current: PAPER_CONFIG.mid } }));

  useEffect(() => {
    let cancelled = false;
    detectTier().then((t) => {
      if (!cancelled) useApp.getState().init(t, new URLSearchParams(window.location.search).get('hud') === '1');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bind = useDrag(
    ({ movement: [mx, my], delta: [dx], last, velocity: [vx, vy], direction: [, dirY], tap }) => {
      const state = useApp.getState();
      const held = refs.picked.current;
      if (state.phase === 'STAND') {
        if (tap) return;
        // Horizontal swipe pans along the table on narrow screens (spec 2.2).
        refs.pan.current -= dx * 0.004;
        return;
      }
      if (!held || (state.phase !== 'HELD' && state.phase !== 'TURNOVER')) return;
      const cfg = refs.config.current;
      if (tap) return; // story hit-testing arrives in M5
      if (!last) {
        held.controls.setDrag(mx, my);
        return;
      }
      held.controls.setDrag(0, 0);
      if (vy > cfg.flickVelocity && vy > vx) {
        if (dirY < 0 && state.turnOver()) held.controls.turnOver(cfg.turnMs);
        else if (dirY > 0 && state.putBack()) onPutBackByGesture();
      }
    },
    { filterTaps: true, pointer: { touch: true } },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useApp.getState();
      if (e.key === 'Escape' && state.putBack()) onPutBackByGesture();
      if ((e.key === ' ' || e.key === 'ArrowUp') && state.turnOver()) refs.picked.current?.controls.turnOver(refs.config.current.turnMs);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refs]);

  if (!manifest) return null;
  const tierCfg = renderTier ? TIER_CONFIG[renderTier] : null;
  return (
    <div className={styles.stand} {...bind()}>
      {renderTier && tierCfg ? (
        <Canvas
          aria-hidden="true"
          dpr={tierCfg.dpr}
          frameloop={phase === 'STAND' || phase === 'LOADING' ? 'demand' : 'always'}
          gl={{ antialias: tierCfg.antialias, powerPreference: 'high-performance' }}
          camera={{ fov: STAND_FOV, near: 0.05, far: 40, position: [0, 2.4, 2.6] }}
        >
          <StandScene manifest={manifest} initialHeld={initialHeld} tier={renderTier} refs={refs} />
        </Canvas>
      ) : null}
      {showHud ? <Hud /> : null}
    </div>
  );
}
