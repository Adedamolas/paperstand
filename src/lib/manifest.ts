import { z } from 'zod';

// Edition manifest (spec 5.2), shared by the pipeline (validates before upload) and the client
// (validates after fetch; on failure it keeps the last good manifest or falls back to /lite).

export const RectSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]);
export type Rect = z.infer<typeof RectSchema>;

const countWords = (s: string) => s.split(/\s+/).filter((w) => w && w !== '...').length;

export const StorySchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1).max(400),
  // Hard rule 4.6.1: 40 words or fewer, enforced at the schema too.
  excerpt: z.string().max(600).refine((s) => countWords(s) <= 40, 'excerpt over 40 words'),
  source: z.string().min(1),
  url: z.url(),
  publishedAt: z.iso.datetime(),
  rect: RectSchema,
  imageCredit: z.string().optional(),
});
export type Story = z.infer<typeof StorySchema>;

export const PageSchema = z.object({
  kind: z.enum(['front', 'back']),
  lo: z.url(),
  hi: z.url(),
  hiLow: z.url(),
  og: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  stories: z.array(StorySchema),
});
export type Page = z.infer<typeof PageSchema>;

export const PaperSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  priceLabel: z.string(),
  pages: z.array(PageSchema).length(2),
});
export type Paper = z.infer<typeof PaperSchema>;

export const EditionManifestSchema = z.object({
  editionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  revision: z.number().int().positive(),
  generatedAt: z.iso.datetime(),
  late: z.boolean(),
  weather: z.object({ tempC: z.number(), label: z.string() }).optional(),
  papers: z.array(PaperSchema).min(1),
});
export type EditionManifest = z.infer<typeof EditionManifestSchema>;

export function parseManifest(data: unknown): EditionManifest | null {
  const r = EditionManifestSchema.safeParse(data);
  return r.success ? r.data : null;
}
