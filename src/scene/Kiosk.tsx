'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type BufferGeometry,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Lighting } from './lighting';
import { PAPER_H, PAPER_W } from './paper/material';
import { WALL, type PegSlot } from './standLayout';

// The roadside kiosk from the references: a plank wall behind the table, a corrugated zinc roof
// sloping toward the street, wooden posts, and a string across the front of the wall where papers
// hang from clothes pegs facing buyers. Procedural placeholders, swappable for modelled assets
// (spec 7); everything static is merged so the kiosk costs a handful of draw calls.

const ROOF = { back: { y: 3.15, z: WALL.z - 0.15 }, front: { y: 2.85, z: 0.35 }, x0: -2.35, x1: 2.35 };

function setupTexture(t: Texture, repeat: [number, number]) {
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
}

function posts(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const add = (x: number, z: number, y0: number, y1: number) => {
    const g = new BoxGeometry(0.09, y1 - y0, 0.09);
    g.translate(x, (y0 + y1) / 2, z);
    parts.push(g);
  };
  add(ROOF.x0 + 0.12, ROOF.front.z - 0.05, WALL.y0, ROOF.front.y);
  add(ROOF.x1 - 0.12, ROOF.front.z - 0.05, WALL.y0, ROOF.front.y);
  add(WALL.x0 - 0.05, WALL.z + 0.05, WALL.y0, ROOF.back.y);
  add(WALL.x1 + 0.05, WALL.z + 0.05, WALL.y0, ROOF.back.y);
  // cross beam under the roof edge
  const beam = new BoxGeometry(ROOF.x1 - ROOF.x0, 0.08, 0.08);
  beam.translate(0, ROOF.front.y - 0.06, ROOF.front.z - 0.05);
  parts.push(beam);
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return g;
}

function stringAndPegs(pegged: PegSlot[]): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const string = new CylinderGeometry(0.006, 0.006, WALL.x1 - WALL.x0, 5);
  string.rotateZ(Math.PI / 2);
  string.translate(0, WALL.stringY, WALL.z + 0.07);
  parts.push(string);
  for (const p of pegged) {
    for (const dx of [-PAPER_W * 0.38, PAPER_W * 0.38]) {
      const peg = new BoxGeometry(0.03, 0.11, 0.035);
      peg.rotateZ(p.roll);
      peg.translate(p.x + dx, WALL.stringY - 0.025, p.z + 0.02);
      parts.push(peg);
    }
  }
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return g;
}

/** Out-of-focus street plate behind the kiosk (spec 7): painted into a canvas, no download. */
function streetPlate(l: Lighting) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, `#${l.background.clone().offsetHSL(0, 0, 0.08).getHexString()}`);
  sky.addColorStop(0.55, `#${l.background.getHexString()}`);
  sky.addColorStop(0.56, '#6f5a44');
  sky.addColorStop(1, '#4a3a2b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.filter = 'blur(10px)';
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // buildings and stalls
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = ['#8a6b52', '#a48a6c', '#6c5a4a', '#b59b7a', '#5d6f6a'][i % 5];
    const w = 60 + r() * 120;
    const h = 80 + r() * 160;
    ctx.fillRect(r() * 1024, 290 - h, w, h);
  }
  // a yellow danfo and some people
  ctx.fillStyle = '#e9b625';
  ctx.fillRect(620, 250, 210, 70);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(640, 262, 50, 22);
  ctx.fillRect(705, 262, 50, 22);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = ['#b33a2b', '#e2c04a', '#ecebe4', '#2f5f8a', '#1f7a55', '#7a3f8a'][i % 6];
    const x = r() * 1024;
    const h = 60 + r() * 40;
    ctx.fillRect(x, 330 - h, 20, h);
    ctx.fillStyle = '#4a2e1f';
    ctx.beginPath();
    ctx.arc(x + 10, 330 - h - 10, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function Kiosk({ pegged, lighting }: { pegged: PegSlot[]; lighting: Lighting }) {
  const [planks, zinc, wood] = useLoader(TextureLoader, ['/assets/tex/rough_wood.webp', '/assets/tex/corrugated_iron.webp', '/assets/tex/wood_table_worn.webp']);
  useMemo(() => {
    setupTexture(planks, [2.5, 2]);
    setupTexture(zinc, [3, 1.6]);
    setupTexture(wood, [1, 4]);
  }, [planks, zinc, wood]);

  const geo = useMemo(() => {
    const wall = new PlaneGeometry(WALL.x1 - WALL.x0, WALL.y1 - WALL.y0);
    wall.translate(0, (WALL.y0 + WALL.y1) / 2, WALL.z);
    const roofLen = Math.hypot(ROOF.front.z - ROOF.back.z, ROOF.back.y - ROOF.front.y);
    const roof = new PlaneGeometry(ROOF.x1 - ROOF.x0, roofLen);
    roof.rotateX(-Math.PI / 2 + Math.atan2(ROOF.back.y - ROOF.front.y, ROOF.front.z - ROOF.back.z));
    roof.translate(0, (ROOF.back.y + ROOF.front.y) / 2, (ROOF.back.z + ROOF.front.z) / 2);
    const ground = new PlaneGeometry(40, 40);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, WALL.y0, 0);
    const plate = new PlaneGeometry(26, 13);
    plate.translate(0, 3.5, -9);
    return { wall, roof, ground, plate, posts: posts(), string: stringAndPegs(pegged) };
  }, [pegged]);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const plate = useMemo(() => streetPlate(lighting), [lighting]);
  useEffect(() => () => plate.dispose(), [plate]);

  const mats = useMemo(
    () => ({
      wall: new MeshLambertMaterial({ map: planks, color: '#d2bc98' }),
      roof: new MeshLambertMaterial({ map: zinc, color: '#c9c4ba', side: DoubleSide, emissive: '#3a3833' }),
      posts: new MeshLambertMaterial({ map: wood, color: '#a8875f' }),
      string: new MeshLambertMaterial({ color: '#d8cfb8' }),
      ground: new MeshLambertMaterial({ color: '#a58462' }),
      plate: new MeshLambertMaterial({ map: plate, fog: false }),
    }),
    [planks, zinc, wood, plate],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  return (
    <group>
      <mesh geometry={geo.plate} material={mats.plate} />
      <mesh geometry={geo.ground} material={mats.ground} />
      <mesh geometry={geo.wall} material={mats.wall} />
      <mesh geometry={geo.roof} material={mats.roof} />
      <mesh geometry={geo.posts} material={mats.posts} />
      <mesh geometry={geo.string} material={mats.string} />
      {lighting.bulb > 0 ? (
        <>
          <mesh position={[0.4, ROOF.front.y - 0.25, -0.2]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshBasicMaterial color="#ffd27a" />
          </mesh>
          <pointLight position={[0.4, ROOF.front.y - 0.32, -0.2]} intensity={lighting.bulb} distance={5} decay={1.4} color="#ffc56b" />
        </>
      ) : null}
    </group>
  );
}

export const PAPER_SIZE = { w: PAPER_W, h: PAPER_H };
