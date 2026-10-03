// Device tiering (spec Section 8). Detection runs once on the client before the
// Canvas mounts, because antialias and DPR are fixed at context creation.
//
// M0 skeleton: GPU + memory + network signals and a ?tier= override. The 2s FPS
// probe result is recorded via `applyFpsProbe`; the /lite redirect for tier
// 'none' and runtime step-down land in M6.

export type Tier = 'none' | 'low' | 'mid' | 'high';
export type RenderTier = Exclude<Tier, 'none'>;

export type TierConfig = {
  dpr: [min: number, max: number];
  antialias: boolean;
  anisotropy: number;
  /** Paper mesh segments (spec 6.1). */
  segments: [x: number, y: number];
  targetFps: number;
};

export const TIER_CONFIG: Record<RenderTier, TierConfig> = {
  high: { dpr: [1, 2], antialias: true, anisotropy: 4, segments: [40, 58], targetFps: 55 },
  mid: { dpr: [1, 1.75], antialias: true, anisotropy: 2, segments: [28, 40], targetFps: 45 },
  low: { dpr: [1, 1.5], antialias: false, anisotropy: 1, segments: [18, 26], targetFps: 30 },
};

export type TierResult = {
  tier: Tier;
  reason: string;
  gpu?: string;
};

const ORDER: Tier[] = ['none', 'low', 'mid', 'high'];
const minTier = (a: Tier, b: Tier): Tier => (ORDER.indexOf(a) < ORDER.indexOf(b) ? a : b);

export function stepDown(tier: RenderTier): RenderTier {
  return tier === 'high' ? 'mid' : 'low';
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function parseOverride(): Tier | null {
  const t = new URLSearchParams(window.location.search).get('tier');
  return t && (ORDER as string[]).includes(t) ? (t as Tier) : null;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export async function detectTier(): Promise<TierResult> {
  const override = parseOverride();
  if (override) return { tier: override, reason: 'override' };

  if (!hasWebGL()) return { tier: 'none', reason: 'no-webgl' };

  const nav = navigator as NavigatorExtras;
  if (nav.connection?.saveData) return { tier: 'none', reason: 'save-data' };

  let tier: Tier = 'high';
  let gpu: string | undefined;
  try {
    // Lazy so detect-gpu stays out of the initial chunk.
    const { getGPUTier } = await import('detect-gpu');
    const result = await getGPUTier();
    gpu = result.gpu;
    // detect-gpu: 0 = blocklisted/unknown-bad, 1..3 = low..high
    tier = (['none', 'low', 'mid', 'high'] as const)[result.tier] ?? 'mid';
    if (result.type === 'FALLBACK') tier = 'mid';
  } catch {
    tier = 'mid';
  }

  const mem = nav.deviceMemory;
  if (mem !== undefined && mem <= 2) tier = minTier(tier, 'low');
  else if (mem !== undefined && mem <= 4) tier = minTier(tier, 'mid');

  const net = nav.connection?.effectiveType;
  if (net === 'slow-2g' || net === '2g') tier = minTier(tier, 'low');

  return { tier, reason: 'detected', gpu };
}

/** Called after the 2s FPS probe on first render. Under 20fps means tier 'none'. */
export function applyFpsProbe(result: TierResult, fps: number): TierResult {
  if (fps < 20) return { ...result, tier: 'none', reason: `fps-probe-${Math.round(fps)}` };
  return result;
}
