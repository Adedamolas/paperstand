'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { MathUtils, type Mesh, type PerspectiveCamera, type ShaderMaterial, type Texture } from 'three';
import { createPaperGeometry } from './geometry';
import { createPaperMaterial, createPaperUniforms, PAPER_H, PAPER_W, type PaperUniforms } from './material';
import type { PaperConfig } from './paper.config';
import { Spring, Spring2, Tween } from './springs';

/**
 * Imperative input for one paper. Gesture and UI code writes here; the frame loop reads it.
 * Kept outside React state so a drag never re-renders the tree.
 */
export class PaperControls {
  /** Pointer drag offset in CSS px while a drag is active, else 0. */
  dragPx = { x: 0, y: 0 };
  /** Gyro tilt, normalised -1..1. */
  tilt = { x: 0, y: 0 };
  folded = false;
  /** Completed half-turns; even = front facing, odd = back facing. */
  turns = 0;
  readonly fold = new Tween();
  readonly turn = new Tween();
  reduced = false;

  setDrag(x: number, y: number) {
    this.dragPx = { x, y };
  }

  setTilt(x: number, y: number) {
    this.tilt = { x, y };
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }

  /** Jump straight to a pose (lab debugging: ?fold=0..1&turn=0..2). */
  pose(fold: number, turn: number) {
    this.folded = fold > 0.5;
    this.fold.start(fold, fold, 1);
    this.turns = Math.round(turn);
    this.turn.start(turn, turn, 1);
  }

  get busy() {
    return this.fold.running || this.turn.running;
  }

  setFolded(folded: boolean, ms: number) {
    if (folded === this.folded) return;
    this.folded = folded;
    this.fold.start(this.fold.value, folded ? 1 : 0, this.reduced ? 250 : ms);
  }

  turnOver(ms: number) {
    if (this.busy || this.folded) return;
    this.turn.start(this.turns, this.turns + 1, this.reduced ? 250 : ms);
    this.turns += 1;
  }
}

type Props = {
  controls: PaperControls;
  config: RefObject<PaperConfig>;
  front: Texture;
  back: Texture;
  grain: Texture;
  segments: [number, number];
};

export function Paper({ controls, config, front, back, grain, segments }: Props) {
  const mesh = useRef<Mesh>(null);

  const geometry = useMemo(
    () => createPaperGeometry(PAPER_W, PAPER_H, segments[0], segments[1]),
    [segments],
  );
  const uniforms = useMemo(() => createPaperUniforms(front, back, grain), [front, back, grain]);
  const material = useMemo(() => createPaperMaterial(uniforms), [uniforms]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const simRef = useRef<ReturnType<typeof createSim> | null>(null);
  useFrame((state, rawDt) => {
    simRef.current ??= createSim();
    const sim = simRef.current;
    const m = mesh.current;
    if (!m) return;
    const u = (m.material as ShaderMaterial).uniforms as unknown as PaperUniforms;
    const camera = state.camera as PerspectiveCamera;
    const size = state.size;
    step(sim, u, m, camera, size.height, controls, config.current, rawDt);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

function createSim() {
  return {
    grip: new Spring2(),
    body: new Spring2(),
    flap: new Spring(),
    droop: new Spring(),
    sag: new Spring(),
    lastGripV: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    phase: 0,
    time: 0,
    primed: false,
  };
}

function step(
  sim: ReturnType<typeof createSim>,
  u: PaperUniforms,
  m: Mesh,
  camera: PerspectiveCamera,
  viewHeight: number,
  controls: PaperControls,
  cfg: PaperConfig,
  rawDt: number,
) {
  const dt = Math.min(rawDt, 1 / 30);
  if (!sim.primed) {
    sim.droop.snap(cfg.droop);
    sim.sag.snap(cfg.sag);
    sim.primed = true;
  }
  sim.time += dt;

  // Pointer px -> world units at the paper's depth.
  const dist = camera.position.length();
  const worldPerPx = (2 * dist * Math.tan(MathUtils.degToRad(camera.fov / 2))) / viewHeight;
  const lim = cfg.dragLimit;
  const tx = MathUtils.clamp(controls.dragPx.x * worldPerPx * cfg.dragScale, -lim, lim) + controls.tilt.x * cfg.tiltRange;
  const ty = MathUtils.clamp(-controls.dragPx.y * worldPerPx * cfg.dragScale, -lim, lim) + controls.tilt.y * cfg.tiltRange;

  const { grip, body, flap } = sim;
  grip.step(tx, ty, cfg.springs.grip.k, cfg.springs.grip.c, dt);
  body.step(grip.x.x, grip.y.x, cfg.springs.body.k, cfg.springs.body.c, dt);

  // Flap receives an impulse from changes in grip velocity (a shake, a stop, a start).
  const dvx = grip.x.v - sim.lastGripV.x;
  const dvy = grip.y.v - sim.lastGripV.y;
  sim.lastGripV.x = grip.x.v;
  sim.lastGripV.y = grip.y.v;
  flap.impulse(cfg.flapImpulse * (dvy + 0.6 * dvx) * 10);
  flap.step(0, cfg.springs.flap.k, cfg.springs.flap.c, dt);
  flap.x = MathUtils.clamp(flap.x, -cfg.flapMax, cfg.flapMax);
  sim.phase += cfg.flapSpeed * dt;

  const speed = grip.speed;
  sim.droop.step(cfg.droop + cfg.droopSpeed * Math.min(speed, 3), cfg.springs.shape.k, cfg.springs.shape.c, dt);
  sim.sag.step(cfg.sag * (1 + 0.5 * Math.min(speed, 1)), cfg.springs.shape.k, cfg.springs.shape.c, dt);
  const smooth = 1 - Math.exp(-dt * 12);
  sim.vel.x += (grip.x.v - sim.vel.x) * smooth;
  sim.vel.y += (grip.y.v - sim.vel.y) * smooth;

  const fold = controls.fold.step(dt);
  const turn = controls.turn.step(dt);
  const held = 1 - fold;

  u.uGripY.value = cfg.gripY * PAPER_H;
  u.uSag.value = sim.sag.x * held;
  u.uDroop.value = sim.droop.x * held;
  u.uDroopBottom.value = cfg.droopBottom;
  u.uDroopEdgeRelief.value = cfg.droopEdgeRelief;
  u.uCurl.value = cfg.curl * held;
  u.uCurlBottom.value = cfg.curlBottom;
  u.uFlapA.value = flap.x * held;
  u.uFlapPhase.value = sim.phase;
  u.uFlapK.value = cfg.flapK;
  u.uAir.value = cfg.air * held;
  u.uVel.value.set(sim.vel.x, sim.vel.y);
  u.uBreeze.value = cfg.breeze;
  u.uBreezeScale.value = cfg.breezeScale;
  u.uTime.value = sim.time * cfg.breezeSpeed;
  u.uFold.value = fold;
  u.uCreaseR.value = cfg.creaseRadius * PAPER_H;
  u.uFoldClosure.value = cfg.foldClosure;
  u.uTurn.value = turn % 2;
  u.uTurnCurl.value = cfg.turnCurl;
  u.uShow.value = cfg.showThrough;
  u.uShowBacklit.value = cfg.showThroughBacklit;

  // Hands at the grips; the body lags, which reads as the sheet yawing and pitching.
  m.position.set((grip.x.x + body.x.x) / 2, (grip.y.x + body.y.x) / 2, 0);
  m.rotation.set(
    -(grip.y.x - body.y.x) * cfg.lagTilt * 4,
    (grip.x.x - body.x.x) * cfg.lagTilt * 4,
    -(grip.x.x - body.x.x) * cfg.lagTilt,
  );

  // Lab preview of PICK/PUTBACK: folding also lays the paper back and away, along an arc.
  if (controls.reduced) {
    const pulse = Math.sin(Math.PI * controls.fold.t);
    m.scale.setScalar(1 - 0.04 * pulse);
    u.uOpacity.value = 1;
  } else {
    m.scale.setScalar(1);
  }
  const arc = Math.sin(fold * Math.PI) * 0.12;
  m.position.y += -fold * 0.28 + arc;
  m.position.z += -fold * 0.9;
  m.rotation.x += -fold * 0.95;
}
