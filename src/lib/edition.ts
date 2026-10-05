import { parseManifest, type EditionManifest } from './manifest';

// Client edition loading (spec 5.2): fetch the manifest from the CDN and validate it. A bad or
// missing manifest keeps the last good one held in memory; callers fall back further (/lite or
// the specimen page in the lab) when there is none.

let lastGood: EditionManifest | null = null;

export async function fetchEdition(url = process.env.NEXT_PUBLIC_MANIFEST_URL): Promise<EditionManifest | null> {
  if (!url) return lastGood;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return lastGood;
    const parsed = parseManifest(await res.json());
    if (parsed) lastGood = parsed;
    return parsed ?? lastGood;
  } catch {
    return lastGood;
  }
}
