'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Material, Mesh, Texture } from 'three';
import { useHud } from './hud.store';

const SAMPLE_MS = 500;

function textureBytes(tex: Texture): number {
  const img = tex.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img?.height) return 0;
  const base = img.width * img.height * 4;
  return tex.generateMipmaps ? base * (4 / 3) : base;
}

/** Lives inside the Canvas and publishes renderer stats to the DOM HUD. */
export function HudProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  const last = useRef<number | null>(null);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    last.current ??= now;
    const elapsed = now - last.current;
    if (elapsed < SAMPLE_MS) return;

    // gl.info.render is reset at the start of each render(), so before this
    // frame renders it still holds the previous frame's numbers.
    const seen = new Set<Texture>();
    scene.traverse((o) => {
      const mats = (o as Mesh).material;
      if (!mats) return;
      for (const m of (Array.isArray(mats) ? mats : [mats]) as Material[]) {
        for (const v of Object.values(m)) if (v && (v as Texture).isTexture) seen.add(v as Texture);
        const uniforms = (m as Material & { uniforms?: Record<string, { value: unknown }> })
          .uniforms;
        if (uniforms)
          for (const u of Object.values(uniforms))
            if (u.value && (u.value as Texture).isTexture) seen.add(u.value as Texture);
      }
    });
    let bytes = 0;
    seen.forEach((t) => (bytes += textureBytes(t)));

    useHud.setState({
      fps: Math.round((frames.current * 1000) / elapsed),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      textures: gl.info.memory.textures,
      textureMB: Math.round((bytes / 1048576) * 10) / 10,
      dpr: Math.round(gl.getPixelRatio() * 100) / 100,
    });
    frames.current = 0;
    last.current = now;
  });

  return null;
}
