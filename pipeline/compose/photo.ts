import sharp from 'sharp';
import { USER_AGENT } from '../sources';
import type { Ctx } from './kit';

// Publisher photos (spec 4.6.5): lead stories only, grayscale halftone, "Photo: {Source}"
// credit, and suppressed when the story is about violence or tragedy.

const TRAGEDY = /\b(kill(ed|s|ing)?|dead|death|deaths|die[ds]?|dying|murder|corpse|bod(y|ies)|bomb|massacre|bandits?|terror|rape|raped|crash|accident|burn(t|ed)?|shot|shoot|gun(men)?|abduct|kidnap|lynch|blood|injur|casualt|funeral|mourn|tragedy|victims?|stab|behead|explosion|drown|collapse)\w*/i;

export function photoAllowed(enabled: boolean, headline: string, excerpt: string) {
  return enabled && !TRAGEDY.test(headline) && !TRAGEDY.test(excerpt);
}

const MAX_BYTES = 6 * 1024 * 1024;

export type Gray = { data: Buffer; width: number; height: number };

/** Fetch and convert to a grayscale buffer cropped to cover w x h (cell resolution). */
export async function loadPhoto(url: string, w: number, h: number): Promise<Gray | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return null;
    const { data, info } = await sharp(buf)
      .resize(Math.round(w), Math.round(h), { fit: 'cover', position: 'attention' })
      .grayscale()
      .normalise()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width < 8 || info.height < 8) return null;
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/**
 * Amplitude-modulated halftone: one dot per cell, radius from darkness, on a 45 degree screen,
 * the way newsprint photos looked.
 */
export function drawHalftone(ctx: Ctx, img: Gray, x: number, y: number, w: number, h: number, ink: string, cell = 7) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = ink;
  const angle = Math.PI / 4;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const reach = Math.hypot(w, h) / 2 + cell;
  for (let v = -reach; v < reach; v += cell) {
    for (let u = -reach; u < reach; u += cell) {
      const px = cx + u * ca - v * sa;
      const py = cy + u * sa + v * ca;
      if (px < x - cell || px > x + w + cell || py < y - cell || py > y + h + cell) continue;
      const sx = Math.min(img.width - 1, Math.max(0, Math.floor(((px - x) / w) * img.width)));
      const sy = Math.min(img.height - 1, Math.max(0, Math.floor(((py - y) / h) * img.height)));
      const lum = img.data[sy * img.width + sx] / 255;
      const dark = Math.pow(1 - lum, 0.9);
      const r = (cell / 2) * Math.sqrt(dark) * 1.18;
      if (r < 0.35) continue;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}
