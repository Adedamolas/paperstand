import type { Category } from './sources';

// Ranking (spec 4.4):
// score = clusterSize^0.8 * categoryWeight * 0.5^(ageHours / 6) * (1 + 0.1 * distinctSources)

export const CATEGORY_WEIGHT: Record<Category, number> = {
  politics: 1.15,
  national: 1.1,
  business: 1.0,
  metro: 0.95,
  sports: 0.9,
  entertainment: 0.85,
  world: 0.75,
};

export function score(clusterSize: number, distinctSources: number, category: Category, ageHours: number) {
  return (
    Math.pow(clusterSize, 0.8) *
    CATEGORY_WEIGHT[category] *
    Math.pow(0.5, Math.max(0, ageHours) / 6) *
    (1 + 0.1 * distinctSources)
  );
}
