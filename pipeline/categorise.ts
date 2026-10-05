import type { Category } from './sources';

// Categorise (spec 4.4): category feed first, then RSS <category> tags through a table, then a
// keyword fallback on the title. No AI.

// Section-style tags only, matched as whole words. Feeds also tag stories with people and
// places ("Chief Festus Keyamo", "Igbokoda"), which must not decide the section.
const TAG_MAP: [RegExp, Category][] = [
  [/^(sports?|football|soccer|super eagles|super falcons|npfl|afcon|premier league|athletics|boxing|basketball|tennis)$/i, 'sports'],
  [/^(politics|political|elections?|2027 elections?|senate|governance)$/i, 'politics'],
  [/^(business|economy|finance|financial|markets?|money|energy|oil and gas|banking|tech|technology|telecoms?|companies)$/i, 'business'],
  [/^(entertainment|celebrity|celebrities|music|nollywood|movies?|film|bbnaija|big brother naija|fashion|lifestyle|gist|showbiz|arts)$/i, 'entertainment'],
  [/^(metro|metro plus|metroplus|crime|city|lagos|abuja)$/i, 'metro'],
  [/^(world|international|africa|foreign|foreign news|global)$/i, 'world'],
];
const SECTION_TAG_MAX_WORDS = 3;

const KEYWORDS: [RegExp, Category][] = [
  [/\b(super eagles|falcons|eagles|npfl|afcon|fifa|caf|goal|striker|coach|match|league|cup|win over|draw|boxer|athletes?|osimhen|lookman|arsenal|chelsea|manchester|liverpool|barcelona|madrid)\b/i, 'sports'],
  [/\b(naira|cbn|inflation|forex|dollar|fuel price|petrol|nnpc|dangote refinery|stock|ngx|gdp|budget|revenue|tax|firs|banks?|loan|investors?|economy|tariff|telecoms?|mtn|airtel)\b/i, 'business'],
  [/\b(tinubu|shettima|senate|senator|reps|governor|inec|apc|pdp|adc|labour party|atiku|obi|election|minister|lawmakers?|assembly|impeach|defect)\b/i, 'politics'],
  [/\b(nollywood|singer|actor|actress|rapper|album|bbnaija|celebrity|wedding|davido|wizkid|burna|tiwa|music|movie|afrobeats|influencer|skit)\b/i, 'entertainment'],
  [/\b(police|court|arrest|robbers?|kidnap|fire|accident|lagos|abuja|ikeja|lekki|demolition|flood|lasema|frsc|lastma)\b/i, 'metro'],
  [/\b(us|usa|uk|trump|china|russia|ukraine|gaza|israel|iran|ghana|kenya|south africa|un\b|united nations|ecowas|au\b)\b/i, 'world'],
];

/** How a category was decided; lower wins when the same story arrives from several feeds. */
export type CategoryBasis = 0 | 1 | 2 | 3;

export function categoriseWithBasis(feedCategory: Category | undefined, tags: string[], title: string): [Category, CategoryBasis] {
  if (feedCategory) return [feedCategory, 0];
  const fromTags = categoriseTags(tags);
  if (fromTags) return [fromTags, 1];
  for (const [re, cat] of KEYWORDS) if (re.test(title)) return [cat, 2];
  return ['national', 3];
}

function categoriseTags(tags: string[]): Category | null {
  for (const raw of tags) {
    const tag = raw.trim();
    if (tag.split(/\s+/).length > SECTION_TAG_MAX_WORDS) continue;
    for (const [re, cat] of TAG_MAP) if (re.test(tag)) return cat;
  }
  return null;
}

export function categorise(feedCategory: Category | undefined, tags: string[], title: string): Category {
  if (feedCategory) return feedCategory;
  for (const raw of tags) {
    const tag = raw.trim();
    if (tag.split(/\s+/).length > SECTION_TAG_MAX_WORDS) continue;
    for (const [re, cat] of TAG_MAP) if (re.test(tag)) return cat;
  }
  for (const [re, cat] of KEYWORDS) if (re.test(title)) return cat;
  return 'national';
}
