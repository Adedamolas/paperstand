import type { RankedStory } from '../assign';
import { adFor, notices } from '../classifieds';
import type { Weather } from '../weather';
import {
  DH,
  DW,
  FONT,
  box,
  drawLines,
  fitText,
  font,
  newPage,
  rule,
  stock,
  vrule,
  wrap,
  type Ctx,
} from './kit';
import { editionNumber, type PaperStyle } from './papers';
import { drawHalftone, loadPhoto, photoAllowed } from './photo';

// Page layouts in the late-90s/2000s Nigerian daily style: masthead with ears, a huge
// condensed banner, a halftone lead photo, dense justified excerpts with "Cont'd" lines,
// briefs, notices and a fictional ad. Every block has a fixed vertical budget, so nothing can
// overflow, and every story records its rectangle for hit-testing (spec 5.3, 6.6).

export type PlacedStory = {
  id: string;
  headline: string;
  excerpt: string;
  source: string;
  url: string;
  publishedAt: string;
  rect: [number, number, number, number];
  imageCredit?: string;
};

export type ComposeInput = {
  style: PaperStyle;
  kind: 'front' | 'back';
  stories: RankedStory[];
  date: Date;
  dateLabel: string;
  late: boolean;
  weather?: Weather;
  photos: boolean;
};

const M = 48;
const CW = DW - M * 2;

type Region = { x: number; y: number; w: number; h: number };

class Placer {
  placed: PlacedStory[] = [];
  add(s: RankedStory, r: Region, imageCredit?: string) {
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    this.placed.push({
      id: s.id,
      headline: s.lead.title,
      excerpt: s.lead.excerpt,
      source: s.lead.source,
      url: s.lead.url,
      publishedAt: new Date(s.lead.publishedAt).toISOString(),
      rect: [clamp(r.x / DW), clamp(r.y / DH), clamp(r.w / DW), clamp(r.h / DH)],
      imageCredit,
    });
  }
}

function sourceLine(ctx: Ctx, s: RankedStory, x: number, y: number, w: number, color: string, size = 17) {
  const host = (() => {
    try {
      return new URL(s.lead.url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  font(ctx, FONT.head, size, 700);
  ctx.fillStyle = color;
  const label = s.lead.source.toUpperCase();
  ctx.fillText(label, x, y + size);
  const lw = ctx.measureText(label).width;
  font(ctx, FONT.head, size, 400);
  ctx.fillStyle = '#4a4238';
  const more = s.distinctSources > 1 ? `  •  ${host}  •  +${s.distinctSources - 1} more` : `  •  ${host}`;
  let text = more;
  while (text.length > 4 && ctx.measureText(text).width > w - lw) text = text.slice(0, -2);
  ctx.fillText(text, x + lw, y + size);
  return y + size * 1.45;
}

function contd(ctx: Ctx, x: number, y: number, page: number, ink: string, size = 18) {
  font(ctx, FONT.body, size, 700, true);
  ctx.fillStyle = ink;
  ctx.fillText(`Cont'd on page ${page}`, x, y + size);
  return y + size * 1.4;
}

type StoryOpts = { headMax: number; headMin: number; headLines: number; body: number; page: number; headFamily?: string; caps?: boolean };

/**
 * Headline + source + excerpt + "Cont'd" inside a region. Shrinks type within bounds, then
 * drops trailing excerpt lines; never draws below the region. With dry = true nothing is drawn
 * and only the height it would take is returned.
 */
function story(ctx: Ctx, st: PaperStyle, s: RankedStory, r: Region, o: StoryOpts, dry = false): number {
  const family = o.headFamily ?? FONT.head;
  const weight = family === FONT.head ? 700 : 400;
  const head = fitText(ctx, s.lead.title, r.w, o.headLines, o.headMax, o.headMin, { family, weight, caps: o.caps });
  const headLines = head.lines.slice(0, o.headLines);
  let y = dry ? r.y + headLines.length * head.size * 1.02 : drawLines(ctx, headLines, r.x, r.y, head.size, { family, weight, color: st.ink, lh: 1.02 });
  y += 8;
  y = dry ? y + 17 * 1.45 : sourceLine(ctx, s, r.x, y, r.w, st.spot);
  const bottom = r.y + r.h - 26;
  font(ctx, FONT.body, o.body);
  const lines = wrap(ctx, s.lead.excerpt, r.w);
  const lh = o.body * 1.3;
  const shown = lines.slice(0, Math.max(0, Math.floor((bottom - y) / lh)));
  y = dry ? y + shown.length * lh : drawLines(ctx, shown, r.x, y, o.body, { family: FONT.body, color: st.ink, lh: 1.3 }, { justify: r.w });
  const end = Math.min(y + 2, bottom);
  return dry ? end + 18 * 1.4 : contd(ctx, r.x, end, o.page, st.ink);
}

/**
 * Column flow: stack stories top to bottom until the column is full, like a real paper's
 * crowded inside columns. Returns how many stories were placed.
 */
function flow(ctx: Ctx, st: PaperStyle, list: RankedStory[], r: Region, placer: Placer, o: Omit<StoryOpts, 'page'>, firstPage: number) {
  let y = r.y;
  let n = 0;
  const minH = o.headMin * 2 + 17 * 1.45 + o.body * 1.3 * 3 + 30;
  for (const s of list) {
    const room = r.y + r.h - y;
    if (room < minH) break;
    const want = story(ctx, st, s, { x: r.x, y, w: r.w, h: room }, { ...o, page: firstPage + n * 2 }, true) - y + 26;
    const h = Math.min(room, want);
    if (n) rule(ctx, r.x, y - 10, r.w, 1.5, st.ink);
    story(ctx, st, s, { x: r.x, y, w: r.w, h }, { ...o, page: firstPage + n * 2 });
    placer.add(s, { x: r.x, y, w: r.w, h });
    y += h + 20;
    n++;
  }
  return n;
}

function earBox(ctx: Ctx, st: PaperStyle, x: number, y: number, w: number, h: number, lines: [string, number, string, number?][]) {
  box(ctx, x, y, w, h, null, st.ink, 2);
  let yy = y + 16;
  for (const [text, size, family, weight] of lines) {
    const f = fitText(ctx, text, w - 28, 1, size, 12, { family, weight });
    yy = drawLines(ctx, f.lines.slice(0, 1), x + 14, yy, f.size, { family, weight, color: st.ink, lh: 1.15 }) + 4;
  }
}

async function drawPhoto(ctx: Ctx, st: PaperStyle, s: RankedStory, r: Region, enabled: boolean) {
  if (!s.lead.imageUrl || !photoAllowed(enabled, s.lead.title, s.lead.excerpt)) return null;
  const cell = 8;
  const img = await loadPhoto(s.lead.imageUrl, r.w / cell * 2, r.h / cell * 2);
  if (!img) return null;
  drawHalftone(ctx, img, r.x, r.y, r.w, r.h, st.ink, cell);
  const credit = `Photo: ${s.lead.source}`;
  font(ctx, FONT.body, 16, 400, true);
  ctx.fillStyle = '#4a4238';
  ctx.fillText(credit, r.x, r.y + r.h + 20);
  return credit;
}

function masthead(ctx: Ctx, input: ComposeInput) {
  const { style: st } = input;
  // Index strip (decorative page numbers, spec 3.1)
  box(ctx, M, 26, CW, 46, st.spot);
  font(ctx, FONT.head, 24, 500);
  ctx.fillStyle = '#ffffff';
  const index = input.kind === 'front' ? 'INSIDE:  POLITICS 4   •   BUSINESS 12   •   METRO 18   •   GIST 30   •   SPORTS 40' : 'BACK PAGE';
  ctx.fillText(index, M + 18, 58);

  const top = 86;
  const h = 190;
  const ear = 230;
  const w = input.weather;
  earBox(ctx, st, M, top, ear, h, [
    ['LAGOS WEATHER', 22, FONT.head, 700],
    [w ? `${w.tempC}°C` : '--°C', 74, FONT.banner],
    [w ? w.label : 'Forecast unavailable', 20, FONT.body],
  ]);
  earBox(ctx, st, DW - M - ear, top, ear, h, [
    [`No. ${editionNumber(st, input.date).toLocaleString('en-NG')}`, 22, FONT.head, 700],
    [st.priceLabel, 74, FONT.banner],
    [input.late ? 'Late City Edition' : 'Morning Edition', 20, FONT.body],
  ]);
  st.masthead(ctx, M + ear + 24, top, CW - ear * 2 - 48, h, st);

  const dl = top + h + 14;
  rule(ctx, M, dl, CW, 5, st.ink);
  font(ctx, FONT.head, 22, 500);
  ctx.fillStyle = st.ink;
  ctx.fillText(input.dateLabel.toUpperCase(), M, dl + 33);
  ctx.textAlign = 'center';
  ctx.fillText(st.motto.toUpperCase(), DW / 2, dl + 33);
  ctx.textAlign = 'right';
  ctx.fillText('PAPERSTAND.VERCEL.APP', DW - M, dl + 33);
  ctx.textAlign = 'left';
  rule(ctx, M, dl + 46, CW, 2, st.ink);
  return dl + 62;
}

function backFlag(ctx: Ctx, input: ComposeInput) {
  const { style: st } = input;
  box(ctx, M, 26, CW, 150, st.slug === 'gbedu' ? st.spot : '#1f7a45');
  font(ctx, FONT.banner, 128);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(st.backFlag, M + 26, 148);
  font(ctx, FONT.head, 26, 700);
  ctx.textAlign = 'right';
  ctx.fillText(`${st.title.toUpperCase()}  •  BACK PAGE`, DW - M - 24, 80);
  font(ctx, FONT.head, 22, 400);
  ctx.fillText(input.dateLabel, DW - M - 24, 116);
  ctx.textAlign = 'left';
  return 196;
}

function footer(ctx: Ctx, st: PaperStyle) {
  rule(ctx, M, DH - 48, CW, 2, st.ink);
  font(ctx, FONT.head, 17, 400);
  ctx.fillStyle = st.ink;
  const text = `${st.title} is a fictional newspaper. Every story is credited and linked to its publisher. Read the full reports at their sources.`;
  ctx.textAlign = 'center';
  ctx.fillText(text, DW / 2, DH - 20);
  ctx.textAlign = 'left';
}

function noticesRow(ctx: Ctx, st: PaperStyle, seed: string, y: number, h: number) {
  const list = notices(seed, 3);
  const ad = adFor(seed);
  const nW = (CW - 3 * 16) / 4;
  list.forEach((n, i) => {
    const x = M + i * (nW + 16);
    box(ctx, x, y, nW, h, null, st.ink, 2);
    const t = fitText(ctx, n.title.toUpperCase(), nW - 24, 1, 26, 16, { family: FONT.head, weight: 700 });
    drawLines(ctx, t.lines, x, y + 12, t.size, { family: FONT.head, weight: 700, color: st.ink, lh: 1 }, { align: 'center', width: nW });
    rule(ctx, x + 14, y + 48, nW - 28, 2, st.ink);
    font(ctx, FONT.body, 17);
    const lines = wrap(ctx, n.body, nW - 28);
    const fits = Math.floor((h - 66) / 22);
    drawLines(ctx, lines.slice(0, fits), x + 14, y + 58, 17, { family: FONT.body, color: st.ink, lh: 1.3 }, { justify: nW - 28 });
  });
  // fictional ad: brand, one line, small print, each fitted inside the box
  const ax = M + 3 * (nW + 16);
  box(ctx, ax, y, nW, h, ad.colors[0]);
  box(ctx, ax + 10, y + 10, nW - 20, h - 20, ad.colors[1]);
  const innerW = nW - 44;
  const brandColor = ad.colors[0] === '#1b1712' ? '#1b1712' : ad.colors[0];
  const b = fitText(ctx, ad.brand, innerW, 2, Math.min(60, h * 0.28), 26, { family: FONT.banner });
  const by = drawLines(ctx, b.lines.slice(0, 2), ax + 22, y + 24, b.size, { family: FONT.banner, color: brandColor, lh: 0.95 });
  const l = fitText(ctx, ad.line, innerW, 2, 22, 14, { family: FONT.head, weight: 500 });
  const ly = drawLines(ctx, l.lines.slice(0, 2), ax + 22, by + 8, l.size, { family: FONT.head, weight: 500, color: '#1b1712', lh: 1.1 });
  const sm = fitText(ctx, ad.small, innerW, 2, 15, 11, { family: FONT.body, italic: true });
  if (ly + sm.size * 2.6 < y + h - 14) drawLines(ctx, sm.lines.slice(0, 2), ax + 22, ly + 8, sm.size, { family: FONT.body, italic: true, color: '#1b1712', lh: 1.2 });
}

/** Lead block: banner across the page, then photo + standfirst, or a two-column standfirst. */
async function leadBlock(ctx: Ctx, input: ComposeInput, s: RankedStory, top: number, bottom: number, placer: Placer, extra: RankedStory[]) {
  const st = input.style;
  // Kicker
  const kicker = s.category.toUpperCase();
  font(ctx, FONT.head, 28, 700);
  const kw = ctx.measureText(kicker).width + 32;
  box(ctx, M, top, kw, 42, st.spot2 === '#f2c230' || st.spot2 === '#f2d01e' ? st.spot : st.spot);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(kicker, M + 16, top + 32);

  const bannerMax = st.tabloid ? 200 : 170;
  const banner = fitText(ctx, s.lead.title, CW, 3, bannerMax, 70, { family: FONT.banner, caps: true });
  const bannerBottom = drawLines(ctx, banner.lines.slice(0, 3), M, top + 52, banner.size, { family: FONT.banner, color: st.ink, lh: 0.92 });

  const zoneTop = bannerBottom + 18;
  const zoneH = bottom - zoneTop;
  const photoW = Math.round(CW * 0.58);
  const photoH = Math.min(Math.round(zoneH * 0.72), 600);
  const credit = await drawPhoto(ctx, st, s, { x: M, y: zoneTop, w: photoW, h: photoH }, input.photos);

  const colX = credit ? M + photoW + 28 : M;
  const colW = credit ? CW - photoW - 28 : Math.round(CW * 0.58);
  // Standfirst: the excerpt, big and bold, with a drop rule
  rule(ctx, colX, zoneTop, colW, 4, st.spot);
  let y = zoneTop + 14;
  const sf = fitText(ctx, s.lead.excerpt, colW, credit ? 9 : 7, credit ? 32 : 38, 22, { family: FONT.body, weight: 600 });
  y = drawLines(ctx, sf.lines, colX, y, sf.size, { family: FONT.body, weight: 600, color: st.ink, lh: 1.25 }, { justify: colW });
  y = sourceLine(ctx, s, colX, y + 10, colW, st.spot, 19);
  y = contd(ctx, colX, y, 2, st.ink, 20);
  placer.add(s, { x: M, y: top, w: CW, h: (credit ? Math.max(zoneTop + photoH + 30, y) : y) - top }, credit ?? undefined);

  // Fill the remaining space in the lead zone with secondary stories.
  const slots: Region[] = [];
  if (credit) {
    const below = zoneTop + photoH + 40;
    if (bottom - below > 150) slots.push({ x: M, y: below, w: photoW, h: bottom - below });
    if (bottom - y > 220) slots.push({ x: colX, y: y + 16, w: colW, h: bottom - y - 16 });
  } else {
    const rx = M + colW + 28;
    const rw = CW - colW - 28;
    vrule(ctx, rx - 14, zoneTop, zoneH, 2, st.ink);
    slots.push({ x: rx, y: zoneTop, w: rw, h: Math.round(zoneH / 2) - 12 });
    slots.push({ x: rx, y: zoneTop + Math.round(zoneH / 2) + 12, w: rw, h: Math.round(zoneH / 2) - 12 });
    if (bottom - y > 150) slots.push({ x: M, y: y + 16, w: colW, h: bottom - y - 16 });
  }
  let used = 0;
  for (const r of slots) {
    if (used >= extra.length) break;
    rule(ctx, r.x, r.y - 8, r.w, 2, st.ink);
    used += flow(ctx, st, extra.slice(used), r, placer, { headMax: 46, headMin: 28, headLines: 3, body: 21 }, 3 + used * 2);
  }
  return used;
}

function briefsRow(ctx: Ctx, st: PaperStyle, list: RankedStory[], y: number, h: number, placer: Placer, firstPage: number) {
  const n = Math.min(4, list.length);
  if (!n) return;
  rule(ctx, M, y - 14, CW, 5, st.ink);
  const gw = 26;
  const w = (CW - gw * (n - 1)) / n;
  list.slice(0, n).forEach((s, i) => {
    const x = M + i * (w + gw);
    if (i) vrule(ctx, x - gw / 2, y, h, 1.5, st.ink);
    void s;
  });
  // Deal the remaining stories across the columns, each column flowing top to bottom.
  let used = 0;
  for (let i = 0; i < n && used < list.length; i++) {
    const x = M + i * (w + gw);
    const share = Math.ceil((list.length - used) / (n - i));
    used += flow(ctx, st, list.slice(used, used + share), { x, y, w, h }, placer, { headMax: 38, headMin: 24, headLines: 4, body: 19 }, firstPage + i * 3);
  }
}

export async function composePage(input: ComposeInput) {
  const { canvas, ctx } = newPage();
  const st = input.style;
  const seed = `${st.slug}-${input.kind}-${input.dateLabel}`;
  stock(ctx, st.stock, seed);
  const placer = new Placer();
  const [lead, ...rest] = input.stories;

  if (input.kind === 'front') {
    const top = masthead(ctx, input);
    const noticesH = 230;
    const noticesY = DH - 60 - noticesH;
    const briefsH = 330;
    const briefsY = noticesY - 40 - briefsH;
    if (lead) {
      const used = await leadBlock(ctx, input, lead, top, briefsY - 30, placer, rest);
      briefsRow(ctx, st, rest.slice(used), briefsY, briefsH, placer, 6);
    }
    rule(ctx, M, noticesY - 16, CW, 5, st.ink);
    noticesRow(ctx, st, seed, noticesY, noticesH);
  } else {
    const top = backFlag(ctx, input);
    const briefsH = 360;
    const briefsY = DH - 60 - briefsH;
    if (lead) {
      const used = await leadBlock(ctx, input, lead, top + 10, briefsY - 30, placer, rest);
      briefsRow(ctx, st, rest.slice(used), briefsY, briefsH, placer, 38);
    }
  }
  footer(ctx, st);
  return { canvas, stories: placer.placed };
}
