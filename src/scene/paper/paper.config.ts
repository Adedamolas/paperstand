import type { RenderTier } from '@/src/lib/tier';

// Every tunable for the paper simulation (spec 6.3). /lab/paper exposes all of these through
// leva; "Copy config" prints a replacement for PAPER_CONFIG. Units are world units with the
// paper width W = 1 and height H = 1.45.

export type SpringParams = { k: number; c: number };

export type PaperConfig = {
  /** Grip line height above centre, as a fraction of H. */
  gripY: number;

  // Rest shape while held (side grips: the sheet wraps a vertical-axis cylinder)
  /** Bow depth at the centre between the hands, in units of W. */
  sag: number;
  droop: number;
  /** Bottom region bends with droop * droopBottom (negative = toward viewer). */
  droopBottom: number;
  /** How much droop weakens near the gripped edges (0 = none, 1 = full at edges). */
  droopEdgeRelief: number;
  curl: number;
  /** Bottom corners curl by curl * curlBottom (top corners flop the most). */
  curlBottom: number;

  // Motion response
  /** Extra droop per unit of grip speed. */
  droopSpeed: number;
  /** Free-edge deflection against the direction of motion (air drag). */
  air: number;
  /** Flap spring impulse per unit of grip speed. */
  flapImpulse: number;
  /** Flap wave number along distance from the grip line. */
  flapK: number;
  /** Flap phase speed (radians per second). */
  flapSpeed: number;
  flapMax: number;

  breeze: number;
  breezeScale: number;
  breezeSpeed: number;

  /** Fold crease radius as a fraction of H (spec 6.2: about 0.4%). */
  creaseRadius: number;
  /** Max fold closure (1 = perfectly closed, which real paper never does). */
  foldClosure: number;
  /** Extra bend of the trailing half during TURNOVER. */
  turnCurl: number;
  turnMs: number;
  foldMs: number;

  /** Pointer drag to grip offset scale and clamp (world units). */
  dragScale: number;
  dragLimit: number;
  /** Paper yaw/pitch per unit of body lag behind the grips (radians). */
  lagTilt: number;
  /** Flick-up velocity threshold (px/ms) to trigger TURNOVER. */
  flickVelocity: number;
  tiltRange: number;

  showThrough: number;
  showThroughBacklit: number;

  springs: {
    grip: SpringParams;
    body: SpringParams;
    flap: SpringParams;
    shape: SpringParams;
  };
};

const base: PaperConfig = {
  gripY: 0.1,
  sag: 0.085,
  droop: 0.14,
  droopBottom: 0.05,
  droopEdgeRelief: 0,
  curl: 0.05,
  curlBottom: 0.25,
  droopSpeed: 0.12,
  air: 0.05,
  flapImpulse: 0.05,
  flapK: 9,
  flapSpeed: 9,
  flapMax: 0.06,
  breeze: 0.006,
  breezeScale: 2.2,
  breezeSpeed: 0.55,
  creaseRadius: 0.004,
  foldClosure: 0.97,
  turnCurl: 0.9,
  turnMs: 650,
  foldMs: 700,
  dragScale: 1,
  dragLimit: 0.35,
  lagTilt: 0.9,
  flickVelocity: 0.9,
  tiltRange: 0.18,
  showThrough: 0.06,
  showThroughBacklit: 0.16,
  springs: {
    grip: { k: 260, c: 30 },
    body: { k: 120, c: 16 },
    flap: { k: 70, c: 3.2 },
    shape: { k: 40, c: 11 },
  },
};

export const PAPER_CONFIG: Record<RenderTier, PaperConfig> = {
  high: base,
  mid: base,
  // Fewer segments make high-frequency flap waves alias, so soften them on low.
  low: { ...base, flapK: 7, breezeScale: 1.8 },
};

/** Tunables for reduced motion (spec 6.7): no flap, breeze, or curl; static gentle droop. */
export function reducedMotion(cfg: PaperConfig): PaperConfig {
  return { ...cfg, flapImpulse: 0, breeze: 0, curl: 0, air: 0, droopSpeed: 0, droop: cfg.droop * 0.7 };
}
