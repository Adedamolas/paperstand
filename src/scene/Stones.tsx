'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { IcosahedronGeometry, MeshLambertMaterial, Object3D, type InstancedMesh, type Matrix4 } from 'three';

// One rock geometry instanced 3 to 4 times with varied scale and rotation (spec 7). The rock is
// an icosahedron with seeded radial noise, flat shaded, like a river stone off the roadside.

function rockGeometry() {
  const g = new IcosahedronGeometry(0.06, 1);
  const pos = g.getAttribute('position');
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    const k = seen.get(key) ?? 0.82 + r() * 0.3;
    seen.set(key, k);
    pos.setXYZ(i, pos.getX(i) * k * 1.25, pos.getY(i) * k * 0.62, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** `placements` are world matrices for each stone (resting on a paper). */
export function Stones({ placements }: { placements: Matrix4[] }) {
  const ref = useRef<InstancedMesh>(null);
  const geo = useMemo(() => rockGeometry(), []);
  const mat = useMemo(() => new MeshLambertMaterial({ color: '#7d7466', flatShading: true }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const tmp = new Object3D();
    placements.forEach((mat4, i) => {
      tmp.matrix.copy(mat4);
      m.setMatrixAt(i, tmp.matrix);
    });
    m.count = placements.length;
    m.instanceMatrix.needsUpdate = true;
  }, [placements]);

  return <instancedMesh ref={ref} args={[geo, mat, 4]} />;
}
