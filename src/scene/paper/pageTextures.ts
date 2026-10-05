import { LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { fetchEdition } from '@/src/lib/edition';
import type { Paper } from '@/src/lib/manifest';
import { createMockPages } from './mockPage';

// Front and back textures for one held paper: today's real pages from the edition manifest,
// or the lab specimen when there is no edition (or `?mock=1`).

export type PageTextures = { front: Texture; back: Texture; paper: Paper | null; dispose: () => void };

function load(url: string, anisotropy: number) {
  return new Promise<Texture>((resolve, reject) => {
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = LinearMipmapLinearFilter;
        tex.anisotropy = anisotropy;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

export async function loadPageTextures(opts: { slug: string; lowTier: boolean; anisotropy: number; mock?: boolean }): Promise<PageTextures> {
  const edition = opts.mock ? null : await fetchEdition();
  const paper = edition?.papers.find((p) => p.slug === opts.slug) ?? edition?.papers[0] ?? null;
  if (paper) {
    try {
      const key = opts.lowTier ? 'hiLow' : 'hi';
      const [front, back] = await Promise.all([load(paper.pages[0][key], opts.anisotropy), load(paper.pages[1][key], opts.anisotropy)]);
      return { front, back, paper, dispose: () => (front.dispose(), back.dispose()) };
    } catch {
      // fall through to the specimen
    }
  }
  const mock = await createMockPages(opts.lowTier ? 1024 : 1536, opts.anisotropy);
  return { front: mock.front, back: mock.back, paper: null, dispose: () => (mock.front.dispose(), mock.back.dispose()) };
}
