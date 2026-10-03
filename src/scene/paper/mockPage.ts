import {
  CanvasTexture,
  DataTexture,
  LinearMipmapLinearFilter,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

// Placeholder pages for /lab/paper (spec M1: "a mock front page generated with any quick
// method"). Clearly labelled specimen copy, never real news and never lorem ipsum. The real
// pages come from the M3 compositor.

const DW = 1536; // design space (spec 5.1)
const DH = 2227;

const INK = '#1c1712';
const PAPER = '#efe9da';
const RED = '#b3261e';

const COPY = [
  'This is a specimen page printed for the Paperstand paper lab, where the fold, the flap and the slump of real newsprint are tuned before any news is laid on the table.',
  'Vendors at the junction say the morning breeze lifts any paper without a stone on it, and that the corners curl first. The lab has taken note.',
  'Readers are reminded that this page carries no real news. Every story on the finished stand will be credited to its publisher and linked to the original report.',
  'The fold should never close perfectly, the vendor explained, holding a copy up to the light so the back page showed through faintly.',
  'Engineers measured the sag between two hands and the lag of the free edges when the paper is moved quickly, then wrote it all down in a config file.',
];

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
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

function column(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  ctx.fillStyle = INK;
  ctx.font = '400 21px Georgia, "Times New Roman", serif';
  const lh = 27;
  let yy = y + lh;
  let i = seed;
  while (yy < y + h) {
    for (const l of wrap(ctx, COPY[i % COPY.length], w)) {
      if (yy > y + h) break;
      ctx.fillText(l, x, yy);
      yy += lh;
    }
    yy += 6;
    i++;
  }
}

function headline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, size: number) {
  ctx.fillStyle = INK;
  ctx.font = `900 ${size}px Impact, "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  let yy = y + size * 0.9;
  for (const l of wrap(ctx, text, w)) {
    ctx.fillText(l, x, yy);
    yy += size * 0.95;
  }
  return yy;
}

function photo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#cfc7b6';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3a332b';
  for (let yy = y + 6; yy < y + h; yy += 12) {
    for (let xx = x + 6; xx < x + w; xx += 12) {
      const v = 0.5 + 0.5 * Math.sin(xx * 0.013 + yy * 0.021) * Math.cos(yy * 0.009);
      ctx.beginPath();
      ctx.arc(xx, yy, 1 + v * 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, weight = 3) {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, weight);
}

function notice(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, body: string) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = INK;
  ctx.font = '900 26px Impact, "Arial Narrow", Arial, sans-serif';
  ctx.fillText(title, x + 14, y + 36);
  ctx.font = '400 19px Georgia, serif';
  let yy = y + 66;
  for (const l of wrap(ctx, body, w - 28)) {
    if (yy > y + h - 10) break;
    ctx.fillText(l, x + 14, yy);
    yy += 24;
  }
}

function base(width: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((width * DH) / DW);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(width / DW, width / DW);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, DW, DH);
  return { canvas, ctx };
}

function specimenBand(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, DH - 46, DW, 46);
  ctx.fillStyle = PAPER;
  ctx.font = '700 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPECIMEN PAGE FOR THE PAPER LAB. NOT REAL NEWS.', DW / 2, DH - 16);
  ctx.textAlign = 'left';
}

function drawFront(width: number) {
  const { canvas, ctx } = base(width);
  const M = 70;
  const CW = DW - M * 2;

  // Ears
  notice(ctx, M, 50, 250, 150, 'LAGOS', 'Weather: 29C, scattered clouds. Breeze from the lagoon.');
  notice(ctx, DW - M - 250, 50, 250, 150, 'No. 4,127', 'Saturday. Lab edition. Price: N50.');

  // Masthead with a slightly misregistered red layer (spec 5.3).
  ctx.textAlign = 'center';
  ctx.font = '700 150px "UnifrakturMaguntia", "Old English Text MT", "Times New Roman", serif';
  ctx.fillStyle = RED;
  ctx.globalAlpha = 0.9;
  ctx.fillText('The Daily Lantern', DW / 2 + 2, 175);
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.font = 'italic 400 24px Georgia, serif';
  ctx.fillText('Light for the nation. Lab specimen edition.', DW / 2, 225);
  ctx.textAlign = 'left';
  rule(ctx, M, 250, CW, 6);
  ctx.font = '700 20px Arial, sans-serif';
  ctx.fillText('INSIDE: Politics 4  |  Business 12  |  Metro 18  |  Sports 40', M, 282);
  rule(ctx, M, 296, CW, 2);

  // Banner
  const by = headline(ctx, 'PAPER LAB OPENS: VENDORS SAY BREEZE TOO STRONG FOR STONES', M, 310, CW, 118);
  rule(ctx, M, by - 40, CW, 2);

  // Lead: photo + columns
  const top = by - 20;
  photo(ctx, M, top, 860, 560);
  ctx.font = 'italic 400 19px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText('A specimen copy held up to the light. Photo: Paperstand lab', M, top + 590);
  const colW = (CW - 860 - 40) / 1;
  headline(ctx, 'Fold must never close fully, says vendor', M + 900, top, colW, 52);
  column(ctx, M + 900, top + 180, colW, 560, 0);
  ctx.font = 'italic 700 19px Georgia, serif';
  ctx.fillText("Cont'd on page 2", M + 900, top + 770);

  // Three columns of secondary stories
  const sy = top + 640;
  rule(ctx, M, sy, CW, 3);
  const w3 = (CW - 60) / 3;
  const heads = [
    'Corners curl first when the stone is missing',
    'Free readers crowd stand before 7am',
    'Sag between two hands measured at last',
  ];
  heads.forEach((h, i) => {
    const x = M + i * (w3 + 30);
    const hy = headline(ctx, h, x, sy + 20, w3, 46);
    column(ctx, x, hy - 20, w3, 420, i + 1);
    ctx.font = 'italic 700 19px Georgia, serif';
    ctx.fillText(`Cont'd on page ${6 + i * 3}`, x, sy + 540);
  });

  // Notices strip
  const ny = sy + 580;
  rule(ctx, M, ny, CW, 6);
  const w4 = (CW - 60) / 4;
  notice(ctx, M, ny + 20, w4, 360, 'CHANGE OF NAME', 'I, formerly known and addressed as Miss Bisola Specimen, now wish to be known as Mrs Bisola Labtest. All former documents remain valid.');
  notice(ctx, M + (w4 + 20), ny + 20, w4, 360, 'LOSS OF DOCUMENT', 'The general public is hereby notified of the loss of a specimen receipt at Oshodi. Finder should return it to the lab.');
  notice(ctx, M + (w4 + 20) * 2, ny + 20, w4, 360, 'THANKSGIVING', 'The family of Mr Tunde Fictional invites friends to a thanksgiving service for a successful fold test.');
  notice(ctx, M + (w4 + 20) * 3, ny + 20, w4, 360, 'VACANCY', 'Wanted: experienced newspaper vendor with own umbrella. Must know how to place stones. Apply at the lab.');

  specimenBand(ctx);
  return canvas;
}

function drawBack(width: number) {
  const { canvas, ctx } = base(width);
  const M = 70;
  const CW = DW - M * 2;

  ctx.fillStyle = RED;
  ctx.fillRect(M, 50, CW, 130);
  ctx.fillStyle = PAPER;
  ctx.font = '900 110px Impact, "Arial Narrow", Arial, sans-serif';
  ctx.fillText('SPORTS', M + 30, 155);
  ctx.font = '700 26px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('BACK PAGE  |  LAB EDITION', DW - M - 30, 125);
  ctx.textAlign = 'left';

  const by = headline(ctx, 'LAB UNITED 2, BREEZE FC 1: STONES HOLD FIRM IN LATE DRAMA', M, 210, CW, 132);
  photo(ctx, M, by - 30, CW, 700);
  ctx.font = 'italic 400 19px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText('Specimen action photo. Photo: Paperstand lab', M, by + 700);

  const sy = by + 740;
  rule(ctx, M, sy, CW, 4);
  const w3 = (CW - 60) / 3;
  ['Coach praises flap in second half', 'Vendor league table', 'Fixtures for the week'].forEach((h, i) => {
    const x = M + i * (w3 + 30);
    const hy = headline(ctx, h, x, sy + 20, w3, 44);
    column(ctx, x, hy - 20, w3, DH - (hy + 120), i + 2);
  });

  specimenBand(ctx);
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

export function createMockPages(width: number, anisotropy: number) {
  return { front: toTexture(drawFront(width), anisotropy), back: toTexture(drawBack(width), anisotropy) };
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
