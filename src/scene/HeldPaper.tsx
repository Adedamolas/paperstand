'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { MathUtils, Quaternion, Vector3, type Group, type PerspectiveCamera, type Texture } from 'three';
import { useApp } from '@/src/state/store';
import { heldDistance } from './CameraRig';
import type { Lighting } from './lighting';
import { Paper, PaperControls } from './paper/Paper';
import type { PaperConfig } from './paper/paper.config';
import { easeInOut } from './paper/springs';

// The paper in your hands, and the trip there and back (spec 2.3, 2.4):
//
//   PICK:    slide out from under the neighbour  ->  lift in an arc toward you while it unfolds
//            and turns to face you  ->  HELD
//   PUTBACK: turn back to the front if needed  ->  refold and lower along the same arc  ->
//            slide back under the neighbour  ->  STAND
//
// The group carries the trip; the Paper inside carries the fold, the turn and all the flapping.

export const SLIDE_MS = 280;
export const LIFT_MS = 760;

type Mode = 'slide-out' | 'lift' | 'held' | 'unturn' | 'lower' | 'slide-in' | 'done';

export type PickPath = {
  position: Vector3;
  quaternion: Quaternion;
  /** World offset to clear the neighbour lying on top (zero when nothing covers it). */
  slide: Vector3;
  folded: boolean;
};

type Props = {
  path: PickPath;
  controls: PaperControls;
  config: RefObject<PaperConfig>;
  front: Texture;
  back: Texture;
  grain: Texture;
  segments: [number, number];
  lighting: Lighting;
  reduced: boolean;
};

const tmpPos = new Vector3();
const tmpQ = new Quaternion();
const fwd = new Vector3();

export function HeldPaper({ path, controls, config, front, back, grain, segments, lighting, reduced }: Props) {
  const group = useRef<Group>(null);
  const size = useThree((s) => s.size);
  const sim = useRef({ mode: (path.slide.lengthSq() > 0 ? 'slide-out' : 'lift') as Mode, t: 0, started: false });

  useEffect(() => {
    // Start in the source's shape: folded from the table, open from the wall.
    controls.setReduced(reduced);
    controls.pose(path.folded ? 1 : 0, 0);
  }, [controls, path.folded, reduced]);

  useFrame((state, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 30);
    const s = sim.current;
    const phase = useApp.getState().phase;
    const camera = state.camera as PerspectiveCamera;
    const slideMs = reduced ? 1 : SLIDE_MS;
    const liftMs = reduced ? 250 : LIFT_MS;

    // Held pose: facing the camera at the distance where it fills 92% of the view (spec 6.5).
    camera.getWorldDirection(fwd);
    const heldPos = tmpPos.copy(camera.position).addScaledVector(fwd, heldDistance(size.width / size.height, camera.fov));
    const heldQ = tmpQ.copy(camera.quaternion);
    const slidPos = path.position.clone().add(path.slide);

    // "Back" during the trip out reverses it from wherever it is.
    if (phase === 'PUTBACK' && (s.mode === 'held' || s.mode === 'lift' || s.mode === 'slide-out')) {
      if (s.mode === 'held') {
        s.t = 1;
        s.mode = controls.turns % 2 ? 'unturn' : 'lower';
        if (s.mode === 'unturn') controls.turnOver(reduced ? 250 : 520);
      } else s.mode = s.mode === 'lift' ? 'lower' : 'slide-in';
      if (s.mode === 'lower' && path.folded) controls.setFolded(true, liftMs * s.t);
    }

    switch (s.mode) {
      case 'slide-out': {
        s.t = Math.min(1, s.t + (dt * 1000) / slideMs);
        g.position.copy(path.position).addScaledVector(path.slide, easeInOut(s.t));
        g.quaternion.copy(path.quaternion);
        if (s.t >= 1) {
          s.mode = 'lift';
          s.t = 0;
        }
        break;
      }
      case 'lift':
      case 'lower': {
        if (s.mode === 'lift' && !s.started) {
          s.started = true;
          if (path.folded) controls.setFolded(false, liftMs);
        }
        s.t = MathUtils.clamp(s.t + ((s.mode === 'lift' ? 1 : -1) * dt * 1000) / liftMs, 0, 1);
        const p = easeInOut(s.t);
        // Quadratic arc: up off the table and toward you, then into the reading position.
        const ctrl = slidPos.clone().lerp(heldPos, 0.5);
        ctrl.y += 0.45;
        const a = slidPos.clone().lerp(ctrl, p);
        const b = ctrl.lerp(heldPos, p);
        g.position.copy(a.lerp(b, p));
        g.quaternion.slerpQuaternions(path.quaternion, heldQ, p);
        if (s.mode === 'lift' && s.t >= 1) {
          s.mode = 'held';
          useApp.getState().finishPick();
        }
        if (s.mode === 'lower' && s.t <= 0) {
          s.mode = path.slide.lengthSq() > 0 ? 'slide-in' : 'done';
          s.t = 1;
        }
        break;
      }
      case 'unturn': {
        g.position.copy(heldPos);
        g.quaternion.copy(heldQ);
        if (!controls.turn.running) {
          s.mode = 'lower';
          if (path.folded) controls.setFolded(true, liftMs);
        }
        break;
      }
      case 'held': {
        g.position.copy(heldPos);
        g.quaternion.copy(heldQ);
        if (phase === 'TURNOVER' && !controls.turn.running) useApp.getState().finishTurnOver();
        break;
      }
      case 'slide-in': {
        s.t = Math.max(0, s.t - (dt * 1000) / slideMs);
        g.position.copy(path.position).addScaledVector(path.slide, easeInOut(s.t));
        g.quaternion.copy(path.quaternion);
        if (s.t <= 0) s.mode = 'done';
        break;
      }
      case 'done': {
        useApp.getState().finishPutBack();
        break;
      }
    }
  });

  return (
    <group ref={group} position={path.position} quaternion={path.quaternion}>
      <Paper controls={controls} config={config} front={front} back={back} grain={grain} segments={segments} lighting={lighting} arc={false} />
    </group>
  );
}
