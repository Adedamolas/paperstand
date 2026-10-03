'use client';

import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { MathUtils, type PerspectiveCamera } from 'three';
import { PAPER_H, PAPER_W } from './paper/material';

export const CAMERA_FOV = 35;
const FILL = 0.92;

/**
 * Distance at which a held paper fills 92% of the viewport width in portrait or 92% of the
 * height in landscape (spec 6.5). Takes the larger distance so it always fits both ways.
 */
export function heldDistance(aspect: number, fov = CAMERA_FOV) {
  const t = Math.tan(MathUtils.degToRad(fov / 2));
  const byWidth = PAPER_W / (FILL * 2 * t * aspect);
  const byHeight = PAPER_H / (FILL * 2 * t);
  return aspect < 1 ? Math.max(byWidth, byHeight) : byHeight;
}

/** Fits the camera to a held paper and refits on resize and orientation change. */
export function HeldCamera() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    camera.fov = CAMERA_FOV;
    camera.position.set(0, 0, heldDistance(size.width / size.height));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [get, size.width, size.height]);
  return null;
}
