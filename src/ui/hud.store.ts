import { create } from 'zustand';

export type HudStats = {
  fps: number;
  calls: number;
  triangles: number;
  textures: number;
  /** Estimated GPU texture memory in MB (RGBA8 + mip chain). */
  textureMB: number;
  dpr: number;
};

export const useHud = create<HudStats>(() => ({
  fps: 0,
  calls: 0,
  triangles: 0,
  textures: 0,
  textureMB: 0,
  dpr: 1,
}));
