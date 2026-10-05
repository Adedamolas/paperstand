'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BoxGeometry, MeshLambertMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TABLE } from './standLayout';

// The vendor's low wooden table (spec 7): a slab top and four legs with a rail, merged into one
// mesh with a CC0 worn-wood texture (Poly Haven wood_table_worn, docs/ASSETS.md).

export function Table() {
  const wood = useLoader(TextureLoader, '/assets/tex/wood_table_worn.webp');
  useMemo(() => {
    wood.colorSpace = SRGBColorSpace;
    wood.wrapS = wood.wrapT = RepeatWrapping;
    wood.repeat.set(2, 1);
    wood.anisotropy = 4;
  }, [wood]);

  const geo = useMemo(() => {
    const w = TABLE.x1 - TABLE.x0;
    const d = TABLE.z1 - TABLE.z0;
    const cx = (TABLE.x0 + TABLE.x1) / 2;
    const cz = (TABLE.z0 + TABLE.z1) / 2;
    const parts: BufferGeometry[] = [];
    const top = new BoxGeometry(w, 0.05, d);
    top.translate(cx, TABLE.top - 0.025, cz);
    parts.push(top);
    for (const [x, z] of [
      [TABLE.x0 + 0.08, TABLE.z0 + 0.08],
      [TABLE.x1 - 0.08, TABLE.z0 + 0.08],
      [TABLE.x0 + 0.08, TABLE.z1 - 0.08],
      [TABLE.x1 - 0.08, TABLE.z1 - 0.08],
    ]) {
      const leg = new BoxGeometry(0.07, TABLE.height, 0.07);
      leg.translate(x, TABLE.top - TABLE.height / 2, z);
      parts.push(leg);
    }
    const apron = new BoxGeometry(w - 0.1, 0.09, 0.03);
    apron.translate(cx, TABLE.top - 0.095, TABLE.z1 - 0.06);
    parts.push(apron);
    const g = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(() => new MeshLambertMaterial({ map: wood, color: '#c9a479' }), [wood]);
  useEffect(() => () => mat.dispose(), [mat]);

  return <mesh geometry={geo} material={mat} />;
}
