import { GlobalFonts, createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import path from 'node:path';

// Drawing helpers for the page compositor. Measuring and drawing use the same canvas and the
// same font files, so a headline that fits in measurement fits on the page (spec 5.3).

export const DW = 1536; // design space (spec 5.1)
export const DH = 2227;

export type Ctx = SKRSContext2D;

export const FONT = {
  banner: 'PSBanner',
  head: 'PSHead',
  body: 'PSBody',
  black: 'PSBlackletter',
} as const;

let registered = false;
export function registerFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  const reg = (file: string, family: string) => {
    if (!GlobalFonts.registerFromPath(path.join(dir, file), family)) throw new Error(`font failed: ${file}`);
  };
  reg('Anton-Regular.ttf', FONT.banner);
  reg('Oswald-Regular.ttf', FONT.head);
  reg('Oswald-Medium.ttf', FONT.head);
  reg('Oswald-Bold.ttf', FONT.head);
  reg('SourceSerif4-Regular.ttf', FONT.body);
  reg('SourceSerif4-It.ttf', FONT.body);
  reg('SourceSerif4-Semibold.ttf', FONT.body);
  reg('SourceSerif4-Bold.ttf', FONT.body);
  reg('SourceSerif4-BoldIt.ttf', FONT.body);
  reg('UnifrakturMaguntia-Book.ttf', FONT.black);
  registered = true;
}

export function newPage() {
  registerFonts();
  const canvas = createCanvas(DW, DH);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

export function font(ctx: Ctx, family: string, size: number, weight = 400, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${Math.round(size)}px ${family}`;
}

export function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function justifyLine(ctx: Ctx, line: string, x: number, y: number, w: number) {
  const words = line.split(' ');
  const textW = words.reduce((a, s) => a + ctx.measureText(s).width, 0);
  const gap = words.length > 1 ? (w - textW) / (words.length - 1) : 0;
  if (words.length < 2 || gap > ctx.measureText(' ').width * 3.2) return void ctx.fillText(line, x, y);
  let xx = x;
  for (const s of words) {
    ctx.fillText(s, xx, y);
    xx += ctx.measureText(s).width + gap;
  }
}

export type TextStyle = { family: string; weight?: number; italic?: boolean; color: string; lh: number; caps?: boolean };

/** Largest size in [min, max] where text fits w in maxLines; returns size and lines. */
export function fitText(ctx: Ctx, text: string, w: number, maxLines: number, max: number, min: number, st: Omit<TextStyle, 'color' | 'lh'>) {
  const t = st.caps ? text.toUpperCase() : text;
  for (let size = max; size >= min; size -= 2) {
    font(ctx, st.family, size, st.weight, st.italic);
    const lines = wrap(ctx, t, w);
    if (lines.length <= maxLines) return { size, lines, ok: true };
  }
  font(ctx, st.family, min, st.weight, st.italic);
  return { size: min, lines: wrap(ctx, t, w), ok: false };
}

/** Draw pre-wrapped lines; returns the y below the block. */
export function drawLines(ctx: Ctx, lines: string[], x: number, y: number, size: number, st: TextStyle, opts: { justify?: number; align?: 'left' | 'center' | 'right'; width?: number } = {}) {
  ctx.fillStyle = st.color;
  font(ctx, st.family, size, st.weight, st.italic);
  const lh = size * st.lh;
  let yy = y + size * 0.82;
  lines.forEach((l, i) => {
    if (opts.justify && i < lines.length - 1) justifyLine(ctx, l, x, yy, opts.justify);
    else if (opts.align === 'center' && opts.width) {
      ctx.textAlign = 'center';
      ctx.fillText(l, x + opts.width / 2, yy);
      ctx.textAlign = 'left';
    } else ctx.fillText(l, x, yy);
    yy += lh;
  });
  return y + lines.length * lh;
}

export function rule(ctx: Ctx, x: number, y: number, w: number, weight: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, weight);
}

export function vrule(ctx: Ctx, x: number, y: number, h: number, weight: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, weight, h);
}

export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string | null, stroke?: string, lw = 2) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
  }
}

/** Deterministic PRNG so a given edition always lays out the same way. */
export function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Newsprint stock: a tint, faint ink-density blotches and a little edge darkening. */
export function stock(ctx: Ctx, tint: string, seed: string) {
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, DW, DH);
  const r = rng(seed);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(80, 60, 30, ${0.012 + r() * 0.02})`;
    ctx.beginPath();
    ctx.arc(r() * DW, r() * DH, 60 + r() * 160, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(DW / 2, DH / 2, DH * 0.35, DW / 2, DH / 2, DH * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(90, 65, 25, 0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DW, DH);
}

/** Spot colour printed slightly off-register against the black plate (spec 5.3). */
export function misregistered(ctx: Ctx, draw: (dx: number, dy: number, color: string) => void, spot: string, ink: string) {
  ctx.globalAlpha = 0.3;
  draw(-2, 1, ink);
  ctx.globalAlpha = 1;
  draw(0, 0, spot);
}
