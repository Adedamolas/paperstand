// Group the same story across outlets (spec 4.4): token-set Jaccard >= 0.5 within 36 hours,
// joined with union-find.

export type Clusterable = { id: string; tokens: string[]; publishedAt: number; source: string };

export const JACCARD_MIN = 0.5;
export const WINDOW_MS = 36 * 3600 * 1000;

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  let inter = 0;
  for (const t of new Set(b)) if (sa.has(t)) inter++;
  return inter / (sa.size + new Set(b).size - inter);
}

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/** Returns groups of item indices. O(n^2) pairs, fine for a few hundred items an hour. */
export function cluster<T extends Clusterable>(items: T[]): T[][] {
  const uf = new UnionFind(items.length);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (Math.abs(items[i].publishedAt - items[j].publishedAt) > WINDOW_MS) continue;
      if (jaccard(items[i].tokens, items[j].tokens) >= JACCARD_MIN) uf.union(i, j);
    }
  }
  const groups = new Map<number, T[]>();
  items.forEach((it, i) => {
    const r = uf.find(i);
    groups.set(r, [...(groups.get(r) ?? []), it]);
  });
  return [...groups.values()];
}
