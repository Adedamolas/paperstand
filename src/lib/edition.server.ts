import 'server-only';
import { parseManifest, type EditionManifest } from './manifest';

/** Server-side edition fetch for SSR (spec 9.3): cached for a minute, like the manifest itself. */
export async function getEdition(): Promise<EditionManifest | null> {
  const url = process.env.NEXT_PUBLIC_MANIFEST_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    return res.ok ? parseManifest(await res.json()) : null;
  } catch {
    return null;
  }
}
