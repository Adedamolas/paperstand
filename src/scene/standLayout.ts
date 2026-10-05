import { MathUtils } from 'three';
import { PAPER_H, PAPER_W } from './paper/material';

// Stand layout (spec 2.2), seeded from the edition date so it is stable all day and changes daily.
//
// World units: the paper is W = 1 wide (about 30cm). The table top is at y = 0, the buyer stands
// at +z looking toward -z, the kiosk wall is behind the table.
//
// Table papers lie folded (top half up, crease toward the buyer) in two shingled rows: each paper
// is partly covered on its right by its neighbour, the front row overlaps the back row's lower
// edge, the way vendors fan papers so every masthead shows. A few carry stones.
// Pegged papers hang open from a string across the kiosk wall, facing the street.

export const TABLE = { x0: -1.85, x1: 1.85, z0: -0.85, z1: 0.8, top: 0, height: 0.9 };
export const WALL = { z: -1.3, x0: -2.1, x1: 2.1, y0: -0.9, y1: 3.1, stringY: 1.85 };
export const STAGE_W = 3.9;

export type TableSlot = {
  slug: string;
  /** Crease midpoint on the table. */
  x: number;
  z: number;
  y: number;
  yaw: number;
  /** Paper lying on top of this one's right side (it must slide left to come out), if any. */
  coveredBy: string | null;
  /** How far it must slide left to clear its cover. */
  clear: number;
  /** Stone in paper-local (pre-fold) coordinates, if any: x, y, radius. */
  stone: [number, number, number] | null;
};

export type PegSlot = { slug: string; x: number; y: number; z: number; roll: number };

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffle<T>(a: T[], r: () => number) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const STEP = 0.74; // centre-to-centre; neighbours overlap by W - STEP
const ROWS = [
  { creaseZ: -0.08, y: 0.0, dx: -0.12 },
  { creaseZ: 0.62, y: 0.012, dx: 0.1 },
];

export function layoutStand(slugs: string[], editionDate: string) {
  const r = rng(`stand-${editionDate}`);
  const order = shuffle(slugs, r);
  const table: TableSlot[] = [];
  ROWS.forEach((row, ri) => {
    const inRow = order.slice(ri * 3, ri * 3 + 3);
    inRow.forEach((slug, i) => {
      const jitter = (s: number) => (r() - 0.5) * 2 * s;
      table.push({
        slug,
        x: row.dx + (i - (inRow.length - 1) / 2) * STEP + jitter(0.035),
        z: row.creaseZ + jitter(0.03),
        // Later papers in a row lie on top of earlier ones.
        y: row.y + i * 0.004 + 0.002,
        yaw: MathUtils.degToRad(jitter(3.5)),
        coveredBy: inRow[i + 1] ?? null,
        clear: inRow[i + 1] ? PAPER_W - STEP + 0.08 : 0,
        stone: null,
      });
    });
  });
  // Stones on three papers, near the lower left of the visible half (clear of the cover).
  for (const t of shuffle(table, r).slice(0, 3)) {
    t.stone = [-0.32 + r() * 0.12, 0.12 + r() * 0.1, 0.075];
  }
  const pegged: PegSlot[] = shuffle(slugs, r)
    .slice(0, 4)
    .map((slug, i) => ({
      slug,
      x: (i - 1.5) * 0.98 + (r() - 0.5) * 0.06,
      y: WALL.stringY - PAPER_H / 2 - 0.02,
      z: WALL.z + 0.06 + i * 0.002,
      roll: MathUtils.degToRad((r() - 0.5) * 4),
    }));
  return { table, pegged };
}

export const STAND_FOV = 40;
const PITCH = MathUtils.degToRad(31);

/** Stand camera for a viewport aspect and a horizontal pan offset (clamped). */
export function standCamera(aspect: number, pan: number) {
  const vfov = MathUtils.degToRad(STAND_FOV);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  // Portrait phones see about one and a half papers and pan; wide screens see the whole stand.
  const want = aspect < 1 ? 2.0 : Math.min(STAGE_W + 0.2, 1.6 + aspect * 1.1);
  const byWidth = want / (2 * Math.tan(hfov / 2));
  const byHeight = 2.9 / (2 * Math.tan(vfov / 2));
  const dist = Math.max(byWidth, aspect < 1 ? 0 : byHeight);
  const visibleW = 2 * dist * Math.tan(hfov / 2);
  const maxPan = Math.max(0, (STAGE_W - visibleW) / 2);
  const x = MathUtils.clamp(pan, -maxPan, maxPan);
  const target: [number, number, number] = [x, 0.62, -0.5];
  const position: [number, number, number] = [x, target[1] + Math.sin(PITCH) * dist, target[2] + Math.cos(PITCH) * dist];
  return { position, target, maxPan, dist };
}
