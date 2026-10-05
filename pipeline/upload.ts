import { del, head, put } from '@vercel/blob';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { DH, DW } from './compose/kit';

// Image outputs (spec 5.1) and Blob storage (DECISIONS.md 2026-10-05: Vercel Blob instead of R2).
// Page images are content-hashed and immutable; manifests and state are short-lived.

const IMMUTABLE = 31536000;

export type PageImages = { lo: string; hi: string; hiLow: string; og: string; files: string[]; bytes: Record<string, number> };

function hash(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

async function putImmutable(prefix: string, buf: Buffer, ext: string, contentType: string) {
  const pathname = `${prefix}/${hash(buf)}.${ext}`;
  // Content-hashed: if it already exists it is byte-identical, so skip the upload.
  try {
    const existing = await head(pathname);
    return existing.url;
  } catch {
    const res = await put(pathname, buf, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType, cacheControlMaxAge: IMMUTABLE });
    return res.url;
  }
}

export async function renderAndUpload(png: Buffer): Promise<PageImages> {
  const base = sharp(png);
  const [lo, hi, hiLow, og] = await Promise.all([
    base.clone().resize(512).webp({ quality: 62, effort: 5 }).toBuffer(),
    base.clone().resize(1536).webp({ quality: 70, effort: 5 }).toBuffer(),
    base.clone().resize(1024).webp({ quality: 66, effort: 5 }).toBuffer(),
    // Share card: the top of the front page (masthead and banner), 1200 x 630.
    base
      .clone()
      .resize(1200, Math.round((1200 * DH) / DW))
      .extract({ left: 0, top: 0, width: 1200, height: 630 })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ]);
  const [loUrl, hiUrl, hiLowUrl, ogUrl] = await Promise.all([
    putImmutable('pages', lo, 'webp', 'image/webp'),
    putImmutable('pages', hi, 'webp', 'image/webp'),
    putImmutable('pages', hiLow, 'webp', 'image/webp'),
    putImmutable('og', og, 'png', 'image/png'),
  ]);
  return {
    lo: loUrl,
    hi: hiUrl,
    hiLow: hiLowUrl,
    og: ogUrl,
    files: [loUrl, hiUrl, hiLowUrl, ogUrl],
    bytes: { lo: lo.length, hi: hi.length, hiLow: hiLow.length, og: og.length },
  };
}

export async function putJson(pathname: string, data: unknown, maxAge: number) {
  const res = await put(pathname, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: maxAge,
  });
  return res.url;
}

export async function getJson<T>(pathname: string): Promise<T | null> {
  try {
    const meta = await head(pathname);
    const res = await fetch(`${meta.url}?t=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function deleteFiles(urls: string[]) {
  if (urls.length) await del(urls);
}
