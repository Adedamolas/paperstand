import type { PaperSlug } from '../assign';
import { DW, FONT, box, fitText, drawLines, font, misregistered, rule, type Ctx } from './kit';

// The six fictional papers (spec 3). Mastheads are original designs: never a real paper's
// name, logo, or masthead style.

export type PaperStyle = {
  slug: PaperSlug;
  title: string;
  motto: string;
  priceLabel: string;
  founded: number;
  stock: string;
  ink: string;
  spot: string;
  spot2: string;
  /** Tabloids get bigger, louder banners. */
  tabloid: boolean;
  backFlag: string;
  masthead: (ctx: Ctx, x: number, y: number, w: number, h: number, s: PaperStyle) => void;
};

const INK = '#17130e';

function centredTitle(ctx: Ctx, text: string, family: string, weight: number, x: number, y: number, w: number, h: number, color: string, ink: string, misreg = true) {
  const { size } = fitText(ctx, text, w, 1, h, 40, { family, weight });
  const draw = (dx: number, dy: number, c: string) => {
    ctx.fillStyle = c;
    font(ctx, family, size, weight);
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2 + dx, y + h * 0.5 + size * 0.36 + dy);
    ctx.textAlign = 'left';
  };
  if (misreg) misregistered(ctx, draw, color, ink);
  else draw(0, 0, color);
}

export const PAPERS: Record<PaperSlug, PaperStyle> = {
  lantern: {
    slug: 'lantern',
    title: 'The Daily Lantern',
    motto: 'Light for the nation since 1994',
    priceLabel: 'N20',
    founded: 1994,
    stock: '#ece4d0',
    ink: INK,
    spot: '#b8211b',
    spot2: '#1d3f8a',
    tabloid: false,
    backFlag: 'SPORTS',
    masthead(ctx, x, y, w, h, s) {
      centredTitle(ctx, s.title, FONT.black, 400, x, y, w, h * 0.82, INK, INK, false);
      rule(ctx, x + w * 0.22, y + h * 0.86, w * 0.56, 3, s.spot);
    },
  },
  chronicle: {
    slug: 'chronicle',
    title: 'The Federal Chronicle',
    motto: 'Without fear, without favour',
    priceLabel: 'N15',
    founded: 1979,
    stock: '#e9e2cf',
    ink: INK,
    spot: '#1d3f8a',
    spot2: '#b8211b',
    tabloid: false,
    backFlag: 'SPORTS',
    masthead(ctx, x, y, w, h, s) {
      centredTitle(ctx, s.title.toUpperCase(), FONT.body, 700, x, y, w, h * 0.8, s.spot, INK);
      rule(ctx, x, y + h * 0.9, w, 4, s.spot);
    },
  },
  marketday: {
    slug: 'marketday',
    title: 'Market Day',
    motto: 'Business. Economy. Your money.',
    priceLabel: 'N25',
    founded: 1988,
    stock: '#f1d6c3',
    ink: INK,
    spot: '#7a1d14',
    spot2: '#1f6b45',
    tabloid: false,
    backFlag: 'SPORTS',
    masthead(ctx, x, y, w, h, s) {
      centredTitle(ctx, s.title.toUpperCase(), FONT.head, 700, x, y, w, h * 0.86, INK, INK, false);
      // a little up-arrow ticker under the title
      ctx.fillStyle = s.spot2;
      const cx = x + w / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 90, y + h * 0.95);
      ctx.lineTo(cx - 30, y + h * 0.88);
      ctx.lineTo(cx + 10, y + h * 0.92);
      ctx.lineTo(cx + 90, y + h * 0.82);
      ctx.lineWidth = 5;
      ctx.strokeStyle = s.spot2;
      ctx.stroke();
    },
  },
  goalmouth: {
    slug: 'goalmouth',
    title: 'Goalmouth',
    motto: 'The number one sports paper',
    priceLabel: 'N10',
    founded: 1990,
    stock: '#ebe5d3',
    ink: INK,
    spot: '#c4161c',
    spot2: '#f2c230',
    tabloid: true,
    backFlag: 'MORE SPORTS',
    masthead(ctx, x, y, w, h, s) {
      box(ctx, x, y, w, h, s.spot);
      box(ctx, x, y + h - 14, w, 14, s.spot2);
      centredTitle(ctx, s.title.toUpperCase(), FONT.banner, 400, x + 20, y + 4, w - 40, h - 26, '#ffffff', '#000000', false);
    },
  },
  gbedu: {
    slug: 'gbedu',
    title: 'Gbedu Weekly',
    motto: 'All the gist, none of the wahala',
    priceLabel: 'N10',
    founded: 2002,
    stock: '#f0e7d2',
    ink: INK,
    spot: '#c2187a',
    spot2: '#f2d01e',
    tabloid: true,
    backFlag: 'MORE GIST',
    masthead(ctx, x, y, w, h, s) {
      box(ctx, x, y, w, h, s.spot);
      const { size } = fitText(ctx, 'GBEDU', w * 0.66, 1, h * 0.95, 60, { family: FONT.banner });
      font(ctx, FONT.banner, size);
      const tw = ctx.measureText('GBEDU').width;
      const tx = x + 30;
      misregistered(
        ctx,
        (dx, dy, c) => {
          ctx.fillStyle = c;
          font(ctx, FONT.banner, size);
          ctx.fillText('GBEDU', tx + dx, y + h * 0.5 + size * 0.36 + dy);
        },
        s.spot2,
        '#00a6c8',
      );
      box(ctx, tx + tw + 30, y + h * 0.3, w - (tx + tw + 30 - x) - 30, h * 0.4, '#00a6c8');
      const ww = w - (tx + tw + 30 - x) - 30;
      const f = fitText(ctx, 'WEEKLY', ww - 20, 1, h * 0.36, 20, { family: FONT.banner });
      drawLines(ctx, f.lines, tx + tw + 30, y + h * 0.3 + (h * 0.4 - f.size) / 2, f.size, { family: FONT.banner, color: '#ffffff', lh: 1 }, { align: 'center', width: ww });
    },
  },
  metro: {
    slug: 'metro',
    title: 'Lagos Metro Express',
    motto: 'Your city, every morning',
    priceLabel: 'N10',
    founded: 1997,
    stock: '#ece6d4',
    ink: INK,
    spot: '#1d4fa0',
    spot2: '#d32f1e',
    tabloid: true,
    backFlag: 'SPORTS',
    masthead(ctx, x, y, w, h, s) {
      const split = w * 0.64;
      box(ctx, x, y, split, h, s.spot);
      centredTitle(ctx, 'METRO', FONT.banner, 400, x + 16, y, split - 32, h, '#ffffff', '#000', false);
      box(ctx, x + split, y, w - split, h, s.spot2);
      const sub = fitText(ctx, 'LAGOS', w - split - 40, 1, h * 0.4, 20, { family: FONT.banner });
      drawLines(ctx, sub.lines, x + split, y + h * 0.1, sub.size, { family: FONT.banner, color: '#fff', lh: 1 }, { align: 'center', width: w - split });
      const sub2 = fitText(ctx, 'EXPRESS', w - split - 40, 1, h * 0.4, 20, { family: FONT.banner });
      drawLines(ctx, sub2.lines, x + split, y + h * 0.52, sub2.size, { family: FONT.banner, color: '#fff', lh: 1 }, { align: 'center', width: w - split });
    },
  },
};

export function editionNumber(style: PaperStyle, date: Date) {
  const start = Date.UTC(style.founded, 0, 1);
  return Math.floor((date.getTime() - start) / 86400e3) % 100000;
}

export const PAGE_W = DW;
