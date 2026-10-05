import {
  CanvasTexture,
  DataTexture,
  LinearMipmapLinearFilter,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';

// Placeholder pages for /lab/paper (spec M1: "a mock front page generated with any quick
// method"), laid out like a Nigerian daily of the late 90s and 2000s: a coloured masthead block,
// a huge condensed banner, a colour lead photo, a teaser rail, crowded notices and a colour ad.
// Specimen copy only: never real news, never lorem ipsum. The real pages come from M3.

const DW = 1536; // design space (spec 5.1)
const DH = 2227;

const C = {
  paper: '#efe8d6',
  ink: '#1b1712',
  inkSoft: '#3d362d',
  red: '#c8211b',
  blue: '#1f4fa3',
  yellow: '#f2c230',
  green: '#1f8a4c',
  salmon: '#f1c9b4',
};

// Family names are plain identifiers: some browsers parse FontFace families as CSS, and an
// unquoted name containing a word that starts with a digit ("Source Serif 4") is a SyntaxError.
const F = {
  banner: 'PaperstandBanner',
  head: 'PaperstandHead',
  body: 'PaperstandBody',
  black: 'PaperstandBlackletter',
};

const FONT_FILES: [family: string, file: string, desc?: FontFaceDescriptors][] = [
  [F.banner, 'Anton-Regular.ttf'],
  [F.head, 'Oswald.ttf', { weight: '200 700' }],
  [F.body, 'SourceSerif4.ttf', { weight: '200 900' }],
  [F.body, 'SourceSerif4-Italic.ttf', { weight: '200 900', style: 'italic' }],
  [F.black, 'UnifrakturMaguntia-Book.ttf'],
];

const FALLBACK: Record<string, string> = {
  [F.banner]: 'Impact, "Arial Narrow", sans-serif',
  [F.head]: '"Arial Narrow", Arial, sans-serif',
  [F.body]: 'Georgia, serif',
  [F.black]: '"Times New Roman", serif',
};

let fontsReady: Promise<void> | null = null;
function loadFonts() {
  fontsReady ??= Promise.all(
    FONT_FILES.map(async ([family, file, desc]) => {
      try {
        const face = new FontFace(family, `url(/fonts/${file})`, desc);
        document.fonts.add(await face.load());
      } catch (err) {
        // A missing font must never blank the page; the canvas falls back to system fonts.
        console.warn(`[paperstand] font ${file} failed to load`, err);
      }
    }),
  ).then(() => undefined);
  return fontsReady;
}

const COPY = [
  'This is a specimen page printed for the Paperstand paper lab, where the fold, the flap and the slump of real newsprint are tuned before any news is laid on the table.',
  'Vendors at the junction said the morning breeze lifts any paper without a stone on it, and that the corners always curl first.',
  'Readers are reminded that this page carries no real news. Every story on the finished stand will be credited to its publisher and linked to the original report.',
  'The fold should never close perfectly, one vendor explained, holding a copy up to the light so the back page showed through faintly.',
  'Engineers measured the sag between two hands and the lag of the free edges when the paper is moved quickly, then wrote it all down.',
  'A free reader who stood at the stand for forty minutes said he had only come to check the headlines, and promised to buy tomorrow.',
];

type Ctx = CanvasRenderingContext2D;

function font(ctx: Ctx, family: string, size: number, weight = 400, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}, ${FALLBACK[family] ?? 'serif'}`;
}

function wrap(ctx: Ctx, text: string, maxW: number) {
  const words = text.split(/\s+/);
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

function justify(ctx: Ctx, line: string, x: number, y: number, w: number) {
  const words = line.split(' ');
  if (words.length < 2) return ctx.fillText(line, x, y);
  const textW = words.reduce((a, s) => a + ctx.measureText(s).width, 0);
  const gap = (w - textW) / (words.length - 1);
  if (gap > ctx.measureText(' ').width * 3) return ctx.fillText(line, x, y);
  let xx = x;
  for (const s of words) {
    ctx.fillText(s, xx, y);
    xx += ctx.measureText(s).width + gap;
  }
}

/** Justified body copy that fills exactly [y, y + h] and ends with a "Cont'd" line. */
function body(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, cont?: number, size = 22) {
  ctx.fillStyle = C.ink;
  font(ctx, F.body, size, 400);
  const lh = Math.round(size * 1.28);
  const lines: string[] = [];
  for (let i = seed; lines.length * lh < h + lh * 8; i++) lines.push(...wrap(ctx, COPY[i % COPY.length], w), '');
  const max = Math.floor(h / lh) - (cont ? 1 : 0);
  let yy = y + size;
  for (let i = 0; i < max; i++) {
    const l = lines[i];
    if (l) {
      const lastOfPara = !lines[i + 1];
      if (lastOfPara) ctx.fillText(l, x, yy);
      else justify(ctx, l, x, yy, w);
    }
    yy += l ? lh : lh * 0.4;
    if (yy > y + h - (cont ? lh : 0)) break;
  }
  if (cont) {
    font(ctx, F.body, size - 1, 700, true);
    ctx.fillText(`Cont'd on page ${cont}`, x, y + h - 4);
  }
}

/** Multi-column body with hairline column rules. */
function columns(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, seed: number, cont?: number) {
  const gutter = 22;
  const cw = (w - gutter * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const cx = x + i * (cw + gutter);
    body(ctx, cx, y, cw, h, seed + i * 2, i === n - 1 ? cont : undefined);
    if (i > 0) {
      ctx.fillStyle = C.inkSoft;
      ctx.fillRect(cx - gutter / 2, y, 1.5, h);
    }
  }
}

/** Heavy condensed all-caps headline with tight leading. Returns the y below it. */
function headline(ctx: Ctx, text: string, x: number, y: number, w: number, size: number, opts: { family?: string; color?: string; weight?: number; caps?: boolean; lh?: number } = {}) {
  ctx.fillStyle = opts.color ?? C.ink;
  font(ctx, opts.family ?? F.banner, size, opts.weight ?? 400);
  const lh = size * (opts.lh ?? 0.98);
  let yy = y + size * 0.86;
  for (const l of wrap(ctx, opts.caps === false ? text : text.toUpperCase(), w)) {
    ctx.fillText(l, x, yy);
    yy += lh;
  }
  return yy - lh + size * 0.22;
}

/** Largest size (up to max) at which text fits w in at most maxLines lines. */
function fit(ctx: Ctx, text: string, family: string, weight: number, w: number, maxLines: number, max: number, min: number) {
  for (let size = max; size > min; size -= 2) {
    font(ctx, family, size, weight);
    if (wrap(ctx, text.toUpperCase(), w).length <= maxLines) return size;
  }
  return min;
}

/** Fitted headline; returns the y below it. */
function fitted(ctx: Ctx, text: string, x: number, y: number, w: number, maxLines: number, max: number, min: number, opts: { family?: string; weight?: number; color?: string; lh?: number } = {}) {
  const family = opts.family ?? F.banner;
  const weight = opts.weight ?? 400;
  const size = fit(ctx, text, family, weight, w, maxLines, max, min);
  return headline(ctx, text, x, y, w, size, { ...opts, family, weight });
}

function rule(ctx: Ctx, x: number, y: number, w: number, weight = 3, color = C.ink) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, weight);
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
}

/** A simple painted "photo": sky, ground and a few figures, so colour photos read as photos. */
function photo(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, scene: 'street' | 'pitch' | 'portrait' = 'street') {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = `blur(${Math.max(2, Math.round(w / 140))}px)`;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);

  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  if (scene === 'pitch') {
    sky.addColorStop(0, '#9fc3e0');
    sky.addColorStop(0.35, '#c9d9df');
    sky.addColorStop(0.36, '#3f8f3a');
    sky.addColorStop(1, '#2d6e2b');
  } else if (scene === 'portrait') {
    sky.addColorStop(0, '#5d6f86');
    sky.addColorStop(1, '#2f3a48');
  } else {
    sky.addColorStop(0, '#e9c98a');
    sky.addColorStop(0.55, '#d79a5a');
    sky.addColorStop(0.56, '#7a6a58');
    sky.addColorStop(1, '#4a3f35');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  if (scene === 'street') {
    // stalls and a yellow bus in the distance
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#8a3b2a', '#2e5e8a', '#a8842f', '#5b7a3a'][i % 4];
      const bx = x + rnd() * w;
      ctx.fillRect(bx, y + h * 0.38, 80 + rnd() * 120, h * 0.18);
    }
    ctx.fillStyle = C.yellow;
    ctx.fillRect(x + w * 0.55, y + h * 0.42, w * 0.32, h * 0.16);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + w * 0.57, y + h * 0.45, w * 0.08, h * 0.05);
    ctx.fillRect(x + w * 0.67, y + h * 0.45, w * 0.08, h * 0.05);
  }

  const people = scene === 'portrait' ? 1 : 7;
  for (let i = 0; i < people; i++) {
    const px = scene === 'portrait' ? x + w / 2 : x + (0.08 + rnd() * 0.84) * w;
    const scale = scene === 'portrait' ? h * 0.42 : h * (0.18 + rnd() * 0.2);
    const py = scene === 'portrait' ? y + h * 0.95 : y + h * (0.7 + rnd() * 0.25);
    ctx.fillStyle = ['#c0392b', '#f1c40f', '#ecf0f1', '#2980b9', '#16a085', '#8e44ad', '#e67e22'][Math.floor(rnd() * 7)];
    ctx.beginPath();
    ctx.roundRect(px - scale * 0.2, py - scale * 0.95, scale * 0.4, scale, scale * 0.12);
    ctx.fill();
    ctx.fillStyle = '#4a2c1d';
    ctx.beginPath();
    ctx.arc(px, py - scale * 1.07, scale * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (scene === 'pitch') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.62, y + h * 0.6, h * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  // newsprint: washed out a little, with a coarse dot screen
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(239, 232, 214, 0.22)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(20, 15, 10, 0.16)';
  for (let yy = y + 3; yy < y + h; yy += 7) {
    for (let xx = x + ((yy / 7) % 2) * 3.5; xx < x + w; xx += 7) ctx.fillRect(xx, yy, 2, 2);
  }
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function caption(ctx: Ctx, text: string, x: number, y: number, w: number) {
  ctx.fillStyle = C.inkSoft;
  font(ctx, F.body, 18, 400, true);
  let yy = y + 18;
  for (const l of wrap(ctx, text, w)) {
    ctx.fillText(l, x, yy);
    yy += 22;
  }
  return yy;
}

function notice(ctx: Ctx, x: number, y: number, w: number, h: number, title: string, text: string, fill = C.paper) {
  box(ctx, x, y, w, h, fill, C.ink);
  ctx.fillStyle = C.ink;
  font(ctx, F.head, 26, 700);
  ctx.textAlign = 'center';
  ctx.fillText(title.toUpperCase(), x + w / 2, y + 38);
  ctx.textAlign = 'left';
  rule(ctx, x + 16, y + 50, w - 32, 2);
  font(ctx, F.body, 18, 400);
  let yy = y + 78;
  for (const l of wrap(ctx, text, w - 32)) {
    if (yy > y + h - 12) break;
    ctx.fillText(l, x + 16, yy);
    yy += 23;
  }
}

function specimenBand(ctx: Ctx) {
  box(ctx, 0, DH - 40, DW, 40, C.ink);
  ctx.fillStyle = C.paper;
  font(ctx, F.head, 20, 500);
  ctx.textAlign = 'center';
  ctx.fillText('SPECIMEN PAGE FOR THE PAPERSTAND PAPER LAB  •  NOT REAL NEWS', DW / 2, DH - 13);
  ctx.textAlign = 'left';
}

/** Spot colour printed with a 2px misregistration against the black plate (spec 5.3). */
function misregistered(ctx: Ctx, draw: (dx: number, dy: number, color: string) => void, color: string) {
  ctx.globalAlpha = 0.25;
  draw(-2, 1, C.ink);
  ctx.globalAlpha = 1;
  draw(0, 0, color);
}

function newsprint(ctx: Ctx) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, DW, DH);
  // faint ink density variation
  let s = 7;
  for (let i = 0; i < 260; i++) {
    s = (s * 16807) % 2147483647;
    const x = (s % 1536);
    s = (s * 16807) % 2147483647;
    const y = (s % 2227);
    ctx.fillStyle = `rgba(90, 70, 40, ${0.012 + (s % 100) / 9000})`;
    ctx.beginPath();
    ctx.arc(x, y, 60 + (s % 140), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFront(ctx: Ctx) {
  newsprint(ctx);
  const M = 56;
  const CW = DW - M * 2;
  const BOTTOM = DH - 40 - 14; // above the specimen band

  // Teaser strap across the very top
  box(ctx, M, 28, CW, 54, C.blue);
  ctx.fillStyle = '#fff';
  font(ctx, F.head, 26, 600);
  ctx.fillText('INSIDE:  VENDORS RATE THE NEW STONES  •  WHY CORNERS CURL  •  SPORTS: LAB UNITED WIN', M + 20, 64);

  // Masthead block: ears either side of a blackletter title fitted between them
  const mt = 96;
  const earW = 220;
  box(ctx, M, mt, earW, 170, C.yellow, C.ink);
  ctx.fillStyle = C.ink;
  font(ctx, F.head, 22, 700);
  ctx.fillText('LAGOS WEATHER', M + 16, mt + 36);
  font(ctx, F.banner, 72);
  ctx.fillText('29°C', M + 16, mt + 116);
  font(ctx, F.body, 17, 400, true);
  ctx.fillText('Breeze from the lagoon', M + 16, mt + 150);

  const rx0 = DW - M - earW;
  box(ctx, rx0, mt, earW, 170, C.paper, C.ink);
  ctx.fillStyle = C.ink;
  font(ctx, F.head, 22, 700);
  ctx.fillText('No. 4,127', rx0 + 16, mt + 36);
  font(ctx, F.banner, 66);
  ctx.fillStyle = C.red;
  ctx.fillText('N50', rx0 + 16, mt + 112);
  ctx.fillStyle = C.ink;
  font(ctx, F.body, 17, 400, true);
  ctx.fillText('Lab specimen edition', rx0 + 16, mt + 150);

  const titleW = CW - earW * 2 - 60;
  let titleSize = 160;
  font(ctx, F.black, titleSize);
  titleSize = Math.floor(titleSize * Math.min(1, titleW / ctx.measureText('The Daily Lantern').width));
  ctx.textAlign = 'center';
  misregistered(
    ctx,
    (dx, dy, color) => {
      ctx.fillStyle = color;
      font(ctx, F.black, titleSize);
      ctx.fillText('The Daily Lantern', DW / 2 + dx, mt + 112 + dy);
    },
    C.red,
  );
  ctx.fillStyle = C.ink;
  font(ctx, F.body, 22, 600, true);
  ctx.fillText('Light for the nation since 1994', DW / 2, mt + 158);
  ctx.textAlign = 'left';

  // Dateline between rules
  const dl = mt + 186;
  rule(ctx, M, dl, CW, 5);
  font(ctx, F.head, 22, 500);
  ctx.fillStyle = C.ink;
  ctx.fillText('SATURDAY, OCTOBER 3, 2026', M, dl + 33);
  ctx.textAlign = 'center';
  ctx.fillText('VOL. 32  NO. 4,127', DW / 2, dl + 33);
  ctx.textAlign = 'right';
  ctx.fillText('www.paperstand.lab', DW - M, dl + 33);
  ctx.textAlign = 'left';
  rule(ctx, M, dl + 45, CW, 2);

  // Kicker + banner, fitted to two full-width lines
  const bk = dl + 62;
  box(ctx, M, bk, 260, 44, C.red);
  ctx.fillStyle = '#fff';
  font(ctx, F.head, 30, 700);
  ctx.fillText('EXCLUSIVE', M + 16, bk + 34);
  const bannerEnd = fitted(ctx, 'Breeze: vendors demand heavier stones', M, bk + 52, CW, 2, 176, 90, { lh: 0.9 });

  // Budget the rest of the page from the bottom up
  const adH = 130;
  const noticeH = 196;
  const tierH = 330;
  const adTop = BOTTOM - adH;
  const noticeTop = adTop - 16 - noticeH;
  const tierTop = noticeTop - 26 - tierH;
  const leadTop = bannerEnd + 18;
  const leadH = tierTop - 26 - leadTop;

  // Lead: colour photo with the lead story beside it, teaser rail on the right
  const railW = 340;
  const leadW = CW - railW - 28;
  const photoW = Math.round(leadW * 0.6);
  const photoH = Math.round(leadH * 0.6);
  photo(ctx, M, leadTop, photoW, photoH, 3, 'street');
  const capEnd = caption(ctx, 'Vendors arrange copies under the umbrella at dawn. Photo: Paperstand lab', M, leadTop + photoH + 4, photoW);

  const sx = M + photoW + 24;
  const sw = leadW - photoW - 24;
  const sh = fitted(ctx, 'Fold must never close fully, says vendor', sx, leadTop - 4, sw, 4, 48, 32, { family: F.head, weight: 700, lh: 1.02 });
  font(ctx, F.head, 19, 500);
  ctx.fillStyle = C.red;
  ctx.fillText('BY OUR LAB CORRESPONDENT', sx, sh + 22);
  body(ctx, sx, sh + 32, sw, capEnd - (sh + 32), 0, 2);

  const bt = capEnd + 14;
  rule(ctx, M, bt - 6, leadW, 2);
  columns(ctx, M, bt, leadW, leadTop + leadH - bt, 3, 1, 5);

  // Teaser rail fills the lead's height
  const rx = M + leadW + 28;
  ctx.fillStyle = C.inkSoft;
  ctx.fillRect(rx - 14, leadTop, 1.5, leadH);
  const teasers: [string, string, string][] = [
    ['METRO', 'Free readers crowd stand before 7am', C.yellow],
    ['POLITICS', 'Committee to study corner curl', C.salmon],
    ['SPORTS', 'Lab United edge Breeze FC', '#bfe0c8'],
  ];
  const th = (leadH - 2 * 14) / 3;
  teasers.forEach(([kicker, text, fill], i) => {
    const ty = leadTop + i * (th + 14);
    box(ctx, rx, ty, railW, th, fill, C.ink);
    const ph = Math.round(th * 0.4);
    photo(ctx, rx + 12, ty + 12, railW - 24, ph, 10 + i, i === 2 ? 'pitch' : 'portrait');
    font(ctx, F.head, 19, 700);
    ctx.fillStyle = C.red;
    ctx.fillText(kicker, rx + 14, ty + ph + 40);
    // Fit within the box: as many lines as the remaining height allows at the chosen size.
    const room = ty + th - 12 - (ty + ph + 46);
    const lines = Math.max(1, Math.min(3, Math.floor(room / 34)));
    fitted(ctx, text, rx + 14, ty + ph + 46, railW - 28, lines, Math.min(36, room / lines), 22, { family: F.head, weight: 700, lh: 1.0 });
  });

  // Second tier: two stories
  rule(ctx, M, tierTop - 12, CW, 4);
  const halfW = (CW - 30) / 2;
  const h1 = fitted(ctx, 'Sag between two hands measured at last', M, tierTop, halfW, 2, 50, 34, { family: F.head, weight: 700 });
  const thumb = tierTop + tierH - (h1 + 10);
  photo(ctx, M, h1 + 10, 200, thumb, 21, 'portrait');
  columns(ctx, M + 216, h1 + 10, halfW - 216, thumb, 2, 3, 7);
  const x2 = M + halfW + 30;
  ctx.fillStyle = C.inkSoft;
  ctx.fillRect(x2 - 15, tierTop, 1.5, tierH);
  const h2 = fitted(ctx, 'Corners curl first when the stone is missing', x2, tierTop, halfW, 2, 50, 34, { family: F.head, weight: 700 });
  columns(ctx, x2, h2 + 10, halfW, tierTop + tierH - (h2 + 10), 3, 2, 9);

  // Classifieds and notices
  rule(ctx, M, noticeTop - 12, CW, 6);
  const nW = (CW - 3 * 16) / 4;
  notice(ctx, M, noticeTop, nW, noticeH, 'Change of Name', 'I, formerly known as Miss Bisola Specimen, now wish to be known as Mrs Bisola Labtest. General public please note.');
  notice(ctx, M + (nW + 16), noticeTop, nW, noticeH, 'Loss of Document', 'The public is notified of the loss of a specimen receipt at Oshodi. Finder, please return to the paper lab.');
  notice(ctx, M + (nW + 16) * 2, noticeTop, nW, noticeH, 'Thanksgiving', 'The family of Mr Tunde Fictional invites well-wishers to a thanksgiving service for a successful fold test.', '#f6efe0');
  notice(ctx, M + (nW + 16) * 3, noticeTop, nW, noticeH, 'Vacancy', 'Wanted: experienced newspaper vendor with own umbrella. Must know where to place stones.');

  // Colour ad for a fictional product
  box(ctx, M, adTop, CW, adH, C.red);
  box(ctx, M + 10, adTop + 10, CW - 20, adH - 20, C.yellow);
  ctx.fillStyle = C.red;
  font(ctx, F.banner, 84);
  ctx.fillText('OYIN NOODLES', M + 36, adTop + 96);
  ctx.fillStyle = C.ink;
  font(ctx, F.head, 30, 600);
  ctx.fillText('Ready in 3 minutes. Sweet like honey.', M + 640, adTop + 62);
  font(ctx, F.body, 19, 400, true);
  ctx.fillText('A fictional brand for the paper lab', M + 640, adTop + 96);

  specimenBand(ctx);
}

function drawBack(ctx: Ctx) {
  newsprint(ctx);
  const M = 56;
  const CW = DW - M * 2;
  const BOTTOM = DH - 40 - 14;

  // Section flag
  box(ctx, M, 28, CW, 140, C.green);
  ctx.fillStyle = '#fff';
  font(ctx, F.banner, 120);
  ctx.fillText('SPORTS', M + 26, 148);
  font(ctx, F.head, 26, 600);
  ctx.textAlign = 'right';
  ctx.fillText('THE DAILY LANTERN  •  BACK PAGE', DW - M - 24, 82);
  font(ctx, F.head, 22, 400);
  ctx.fillText('Saturday, October 3, 2026', DW - M - 24, 118);
  ctx.textAlign = 'left';

  const be = fitted(ctx, 'Lab United 2, Breeze FC 1: stones hold firm', M, 190, CW, 2, 176, 90, { lh: 0.9 });

  const stripH = 300;
  const stripTop = BOTTOM - stripH;
  const midH = 440;
  const midTop = stripTop - 28 - midH;
  const photoTop = be + 18;
  const photoH = midTop - 26 - 30 - photoTop;
  photo(ctx, M, photoTop, CW, photoH, 7, 'pitch');
  caption(ctx, 'Lab United captain celebrates the late winner. Photo: Paperstand lab', M, photoTop + photoH + 4, CW);

  // Story + league table
  rule(ctx, M, midTop - 10, CW, 4);
  const boxW = 430;
  const storyW = CW - boxW - 30;
  const sh = fitted(ctx, 'Coach praises flap in the second half', M, midTop, storyW, 1, 56, 36, { family: F.head, weight: 700 });
  columns(ctx, M, sh + 12, storyW, midTop + midH - (sh + 12), 3, 2, 39);

  const bx = M + storyW + 30;
  box(ctx, bx, midTop, boxW, midH, '#fff7d6', C.ink);
  box(ctx, bx, midTop, boxW, 56, C.ink);
  ctx.fillStyle = '#fff';
  font(ctx, F.head, 28, 700);
  ctx.fillText('VENDOR LEAGUE TABLE', bx + 18, midTop + 39);
  const rows: [string, number, number][] = [
    ['Lab United', 9, 22],
    ['Junction Stars', 9, 19],
    ['Umbrella FC', 9, 17],
    ['Breeze FC', 9, 14],
    ['Stone Rovers', 9, 11],
    ['Free Readers XI', 9, 6],
  ];
  font(ctx, F.head, 21, 600);
  ctx.fillStyle = C.ink;
  ctx.fillText('CLUB', bx + 18, midTop + 90);
  ctx.textAlign = 'right';
  ctx.fillText('P', bx + boxW - 90, midTop + 90);
  ctx.fillText('PTS', bx + boxW - 18, midTop + 90);
  ctx.textAlign = 'left';
  rows.forEach(([club, p, pts], i) => {
    const y = midTop + 136 + i * 50;
    if (i % 2 === 0) box(ctx, bx + 2, y - 33, boxW - 4, 50, 'rgba(0,0,0,0.05)');
    font(ctx, F.head, 25, 500);
    ctx.fillStyle = C.ink;
    ctx.fillText(`${i + 1}. ${club}`, bx + 18, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(p), bx + boxW - 90, y);
    font(ctx, F.head, 25, 700);
    ctx.fillText(String(pts), bx + boxW - 18, y);
    ctx.textAlign = 'left';
  });

  // Bottom strip: two short stories and fixtures
  rule(ctx, M, stripTop - 12, CW, 6);
  const w3 = (CW - 60) / 3;
  const heads = ['Junction Stars sign new keeper', 'Breeze FC appeal against stones', 'Fixtures this weekend'];
  heads.forEach((h, i) => {
    const x = M + i * (w3 + 30);
    const hy = fitted(ctx, h, x, stripTop, w3, 2, 42, 30, { family: F.head, weight: 700 });
    const rest = BOTTOM - (hy + 8);
    if (i === 2) {
      box(ctx, x, hy + 8, w3, rest, C.salmon, C.ink);
      ctx.fillStyle = C.ink;
      ['Lab United v Junction Stars', 'Umbrella FC v Stone Rovers', 'Breeze FC v Free Readers XI'].forEach((f, j) => {
        font(ctx, F.head, 22, j === 0 ? 700 : 500);
        ctx.fillText(f, x + 16, hy + 50 + j * 46);
      });
      font(ctx, F.body, 18, 400, true);
      ctx.fillText('All matches kick off at 4pm', x + 16, hy + 50 + 3 * 46);
    } else {
      body(ctx, x, hy + 8, w3, rest, 3 + i, 38);
    }
  });

  specimenBand(ctx);
}

function draw(width: number, painter: (ctx: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((width * DH) / DW);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(width / DW, width / DW);
  painter(ctx);
  return canvas;
}

function toTexture(canvas: HTMLCanvasElement, anisotropy: number) {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = anisotropy;
  return tex;
}

export type MockPages = {
  front: Texture;
  back: Texture;
  canvases: { front: HTMLCanvasElement; back: HTMLCanvasElement };
};

export async function createMockPages(width: number, anisotropy: number): Promise<MockPages> {
  await loadFonts();
  const front = draw(width, drawFront);
  const back = draw(width, drawBack);
  return { front: toTexture(front, anisotropy), back: toTexture(back, anisotropy), canvases: { front, back } };
}

export function disposePages(pages: MockPages) {
  pages.front.dispose();
  pages.back.dispose();
}

/** Tileable 256px value-noise grain (spec 6.4). */
export function createGrainTexture(size = 256) {
  const grid = 32;
  const rnd = new Float32Array(grid * grid);
  let s = 1337;
  for (let i = 0; i < rnd.length; i++) {
    s = (s * 16807) % 2147483647;
    rnd[i] = s / 2147483647;
  }
  const data = new Uint8Array(size * size);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * grid;
      const gy = (y / size) * grid;
      const x0 = Math.floor(gx) % grid;
      const y0 = Math.floor(gy) % grid;
      const x1 = (x0 + 1) % grid;
      const y1 = (y0 + 1) % grid;
      const fx = smooth(gx - Math.floor(gx));
      const fy = smooth(gy - Math.floor(gy));
      const a = rnd[y0 * grid + x0] + (rnd[y0 * grid + x1] - rnd[y0 * grid + x0]) * fx;
      const b = rnd[y1 * grid + x0] + (rnd[y1 * grid + x1] - rnd[y1 * grid + x0]) * fx;
      // Low-frequency fibre blotches plus per-pixel tooth.
      s = (s * 16807) % 2147483647;
      const fine = s / 2147483647;
      data[y * size + x] = Math.round((0.7 * (a + (b - a) * fy) + 0.3 * fine) * 255);
    }
  }
  const tex = new DataTexture(data, size, size, RedFormat);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}
