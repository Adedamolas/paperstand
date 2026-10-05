'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { Euler, MathUtils, Matrix4, Quaternion, Vector3, type Texture } from 'three';
import type { Lighting } from './lighting';
import { createPaperGeometry } from './paper/geometry';
import { applyLighting, createPaperMaterial, createPaperUniforms, PAPER_H, PAPER_W } from './paper/material';
import type { PegSlot, TableSlot } from './standLayout';

// The papers that are not in your hands (spec 6.1: low segment count). They share the held
// paper's shader, so a folded paper on the table and the one you pick up are the same object.

const TABLE_SEGMENTS: [number, number] = [18, 26];

/** World pose of a table paper's crease midpoint: lying face up, masthead away from the buyer. */
export function tablePose(slot: TableSlot, slide = 0) {
  const q = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, slot.yaw, 0, 'YXZ'));
  const along = new Vector3(-slide, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), slot.yaw);
  return { position: new Vector3(slot.x, slot.y + 0.006, slot.z).add(along), quaternion: q };
}

export function pegPose(slot: PegSlot) {
  return { position: new Vector3(slot.x, slot.y, slot.z), quaternion: new Quaternion().setFromEuler(new Euler(0, 0, slot.roll)) };
}

/** World matrix for a stone resting on a table paper at paper-local (x, y). */
export function stoneMatrix(slot: TableSlot, i: number) {
  if (!slot.stone) return null;
  const { position, quaternion } = tablePose(slot);
  const local = new Vector3(slot.stone[0], slot.stone[1], 0.03).applyQuaternion(quaternion);
  const rot = new Quaternion().setFromEuler(new Euler(0, i * 1.7 + slot.yaw, 0));
  const s = 0.9 + ((i * 37) % 10) / 25;
  return new Matrix4().compose(position.clone().add(local), rot, new Vector3(s, s, s));
}

type Shared = { time: { value: number }; grain: Texture; lighting: Lighting };

function usePaperMaterial(front: Texture | null, back: Texture | null, shared: Shared, setup: (u: ReturnType<typeof createPaperUniforms>) => void) {
  const material = useMemo(() => {
    if (!front) return null;
    const u = createPaperUniforms(front, back ?? front, shared.grain);
    // One clock for every paper on the stand.
    (u as unknown as Record<string, unknown>).uTime = shared.time;
    applyLighting(u, shared.lighting);
    setup(u);
    return createPaperMaterial(u);
    // setup is a stable inline config for each paper kind
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, back, shared]);
  useEffect(() => () => material?.dispose(), [material]);
  return material;
}

type PickHandlers = {
  onPick: (slug: string) => void;
  onPrefetch: (slug: string) => void;
  enabled: boolean;
};

function clickHandlers(slug: string, h: PickHandlers, setPressed: (v: boolean) => void) {
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!h.enabled) return;
      e.stopPropagation();
      setPressed(true);
      h.onPrefetch(slug);
    },
    onPointerUp: () => setPressed(false),
    onPointerOut: () => setPressed(false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      // A drag that pans the stand is not a tap.
      if (!h.enabled || e.delta > 10) return;
      e.stopPropagation();
      h.onPick(slug);
    },
  };
}

export function TablePaper({ slot, front, back, shared, hidden, handlers }: { slot: TableSlot; front: Texture | null; back: Texture | null; shared: Shared; hidden: boolean; handlers: PickHandlers }) {
  const geometry = useMemo(() => createPaperGeometry(PAPER_W, PAPER_H, ...TABLE_SEGMENTS), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = usePaperMaterial(front, back, shared, (u) => {
    u.uFold.value = 1;
    // Lying flat: the fold is all but closed, so the paper rests flat on the table.
    u.uFoldClosure.value = 0.995;
    u.uBreeze.value = 0.018;
    u.uBreezeScale.value = 2.4;
    // Hold it down under the stone, and under the neighbour lying on its right side.
    if (slot.stone) u.uPin0.value.set(slot.stone[0], slot.stone[1], slot.stone[2]);
    if (slot.coveredBy) u.uPin1.value.set(0.42, 0.36, 0.2);
  });
  const [pressed, setPressed] = useState(false);
  const pose = useMemo(() => tablePose(slot), [slot]);

  if (!material) return null;
  return (
    <group position={pose.position} quaternion={pose.quaternion} visible={!hidden}>
      {/* Spec 2.2: the pressed paper lifts about 3% as feedback. */}
      <mesh geometry={geometry} material={material} frustumCulled={false} position={[0, 0, pressed ? 0.012 : 0]} scale={pressed ? 1.03 : 1} />
      {/* Box collider over the visible (top) half of the folded paper (spec 6.6). */}
      <mesh position={[0, PAPER_H / 4, 0.01]} {...clickHandlers(slot.slug, handlers, setPressed)}>
        <planeGeometry args={[PAPER_W, PAPER_H / 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

export function PeggedPaper({ slot, front, back, shared, hidden, handlers }: { slot: PegSlot; front: Texture | null; back: Texture | null; shared: Shared; hidden: boolean; handlers: PickHandlers }) {
  const geometry = useMemo(() => createPaperGeometry(PAPER_W, PAPER_H, ...TABLE_SEGMENTS), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = usePaperMaterial(front, back, shared, (u) => {
    // Hanging from two pegs at the top edge: no fold, the free bottom edge flutters.
    u.uFold.value = 0;
    u.uGripY.value = PAPER_H / 2 - 0.02;
    u.uCurl.value = -0.02;
    u.uCurlBottom.value = 1;
    u.uBreeze.value = 0.03;
    u.uBreezeScale.value = 1.6;
    u.uPin0.value.set(-PAPER_W * 0.38, PAPER_H / 2 - 0.03, 0.06);
    u.uPin1.value.set(PAPER_W * 0.38, PAPER_H / 2 - 0.03, 0.06);
  });
  const [pressed, setPressed] = useState(false);
  const pose = useMemo(() => pegPose(slot), [slot]);
  if (!material) return null;
  return (
    <group position={pose.position} quaternion={pose.quaternion} visible={!hidden}>
      <mesh geometry={geometry} material={material} frustumCulled={false} scale={pressed ? 1.03 : 1} rotation={[MathUtils.degToRad(-4), 0, 0]} />
      <mesh position={[0, 0, 0.02]} {...clickHandlers(slot.slug, handlers, setPressed)}>
        <planeGeometry args={[PAPER_W, PAPER_H]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
