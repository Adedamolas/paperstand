import { Color, Vector3 } from 'three';
import { lightingPresetFor, watHour, type LightingPreset } from '@/src/lib/time';

// Time-of-day lighting (spec 2.9), picked from the WAT hour. The paper shader and the standard
// materials read the same values so paper and scene agree.

export type Lighting = {
  preset: LightingPreset;
  sunDir: Vector3;
  sunColor: Color;
  sunIntensity: number;
  sky: Color;
  ground: Color;
  hemiIntensity: number;
  background: Color;
  fog: Color;
  /** Warm bulb under the roof at night. */
  bulb: number;
};

const P: Record<LightingPreset, Omit<Lighting, 'preset' | 'sunDir'> & { sun: [number, number, number] }> = {
  morning: {
    sun: [-0.8, 0.55, 0.45],
    sunColor: new Color('#ffd9a8'),
    sunIntensity: 2.0,
    sky: new Color('#dfe6ea'),
    ground: new Color('#7a5c3e'),
    hemiIntensity: 1.35,
    background: new Color('#e9d6b4'),
    fog: new Color('#e5cfa8'),
    bulb: 0,
  },
  midday: {
    sun: [0.15, 1, 0.25],
    sunColor: new Color('#fff6e8'),
    sunIntensity: 2.6,
    sky: new Color('#e8eef2'),
    ground: new Color('#8a6a48'),
    hemiIntensity: 1.5,
    background: new Color('#f2ead8'),
    fog: new Color('#ece2cc'),
    bulb: 0,
  },
  evening: {
    sun: [0.85, 0.35, 0.4],
    sunColor: new Color('#ffb46b'),
    sunIntensity: 1.9,
    sky: new Color('#e3c7a4'),
    ground: new Color('#6e4e34'),
    hemiIntensity: 1.25,
    background: new Color('#d89a5f'),
    fog: new Color('#c98c58'),
    bulb: 0.4,
  },
  night: {
    sun: [0.1, 0.9, 0.3],
    sunColor: new Color('#7f8fb3'),
    sunIntensity: 0.45,
    sky: new Color('#56607d'),
    ground: new Color('#2a2018'),
    hemiIntensity: 0.8,
    background: new Color('#171a24'),
    fog: new Color('#1b1d27'),
    bulb: 2.2,
  },
};

export function lightingFor(date = new Date(), override?: string | null): Lighting {
  const preset = (override && override in P ? override : lightingPresetFor(watHour(date))) as LightingPreset;
  const p = P[preset];
  return { ...p, preset, sunDir: new Vector3(...p.sun).normalize() };
}
