'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Mesh } from 'three';
import { TIER_CONFIG, applyFpsProbe, type RenderTier } from '@/src/lib/tier';
import { useApp } from '@/src/state/store';
import { HudProbe } from '@/src/ui/HudProbe';

const PROBE_MS = 2000;

/** Measures average FPS over the first 2s of rendering (spec Section 8). */
function FpsProbe() {
  const start = useRef<number | null>(null);
  const frames = useRef(0);
  const done = useRef(false);

  useFrame(() => {
    if (done.current) return;
    const now = performance.now();
    start.current ??= now;
    frames.current++;
    const elapsed = now - start.current;
    if (elapsed < PROBE_MS) return;
    done.current = true;
    const { tier, setTier } = useApp.getState();
    if (tier) setTier(applyFpsProbe(tier, (frames.current * 1000) / elapsed));
  });

  return null;
}

/** M0 placeholder: a newsprint-coloured sheet so the HUD has something to measure. */
function PlaceholderSheet({ segments }: { segments: [number, number] }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.6) * 0.25;
    ref.current.rotation.x = -0.15 + Math.sin(t * 0.45) * 0.05;
  });
  return (
    <mesh ref={ref}>
      <planeGeometry args={[1, 1.45, segments[0], segments[1]]} />
      <meshLambertMaterial color="#efe8d8" side={DoubleSide} />
    </mesh>
  );
}

export default function StageCanvas({ tier }: { tier: RenderTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <Canvas
      aria-hidden="true"
      dpr={cfg.dpr}
      gl={{ antialias: cfg.antialias, powerPreference: 'high-performance' }}
      camera={{ fov: 35, position: [0, 0, 4.6] }}
    >
      <hemisphereLight args={['#fff6e6', '#6b5a44', 0.9]} />
      <directionalLight position={[1.5, 2, 2]} intensity={1.6} color="#ffe2b8" />
      <PlaceholderSheet segments={cfg.segments} />
      <FpsProbe />
      <HudProbe />
    </Canvas>
  );
}
