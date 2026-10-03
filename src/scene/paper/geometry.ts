import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * A plane in local XY like PlaneGeometry (spec 6.1), plus a few extra rows packed around the
 * fold line (y = 0). The crease radius is far smaller than a grid cell, so without these rows
 * the fold collapses into one long triangle band and shades as a hard hinge.
 */
export function createPaperGeometry(w: number, h: number, segX: number, segY: number) {
  const rows = new Set<number>();
  for (let j = 0; j <= segY; j++) rows.add(-h / 2 + (h * j) / segY);
  for (const f of [-0.024, -0.012, -0.005, -0.0015, 0, 0.0015, 0.005, 0.012, 0.024]) rows.add(f * h);
  const ys = [...rows].sort((a, b) => a - b);
  // Drop rows that ended up nearly coincident with a grid row.
  const clean = ys.filter((y, i) => i === 0 || y - ys[i - 1] > h * 0.0008);

  const cols = segX + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (const y of clean) {
    for (let i = 0; i < cols; i++) {
      const x = -w / 2 + (w * i) / segX;
      positions.push(x, y, 0);
      uvs.push(x / w + 0.5, y / h + 0.5);
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < clean.length - 1; r++) {
    for (let i = 0; i < segX; i++) {
      const a = r * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}
