import { describe, expect, it } from 'vitest';
import { categorise } from './categorise';
import { cluster, jaccard } from './cluster';
import {
  EXCERPT_MAX_WORDS,
  canonicalUrl,
  cleanText,
  displayTitle,
  excerpt,
  stripBoilerplate,
  titleTokens,
  wordCount,
} from './normalise';
import { score } from './rank';

describe('excerpt (hard rule: 40 words max)', () => {
  const long = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');

  it('never exceeds 40 words', () => {
    expect(wordCount(excerpt(long))).toBeLessThanOrEqual(EXCERPT_MAX_WORDS);
  });

  it('cuts at a sentence boundary when one fits', () => {
    const text = `${'One two three four five six seven eight nine ten. '.repeat(3)}Then a much longer sentence that keeps going and going past the limit for sure.`;
    const e = excerpt(text);
    expect(e.endsWith('.')).toBe(true);
    expect(wordCount(e)).toBeLessThanOrEqual(40);
  });

  it('adds an ellipsis when cut mid-sentence', () => {
    expect(excerpt(long).endsWith('...')).toBe(true);
  });

  it('leaves short text alone', () => {
    expect(excerpt('Short and sweet.')).toBe('Short and sweet.');
  });
});

describe('cleanText (sanitising)', () => {
  it('strips tags, scripts and entities', () => {
    const html = '<p>Hello <b>world</b></p><script>alert(1)</script> &amp; &#8216;friends&#8217;';
    expect(cleanText(html)).toBe('Hello world & \u2018friends\u2019');
  });

  it('strips entity-encoded markup', () => {
    expect(cleanText('&lt;img src=x onerror=alert(1)&gt;Lead text')).toBe('Lead text');
  });

  it('replaces em dashes (house style)', () => {
    expect(cleanText('Naira falls—again')).toBe('Naira falls, again');
  });

  it('removes WordPress boilerplate', () => {
    expect(stripBoilerplate('Body text. The post Something appeared first on Punch Newspapers.')).toBe('Body text.');
  });
});

describe('canonicalUrl', () => {
  it('strips utm params, fragments and trailing slashes', () => {
    expect(canonicalUrl('http://Punchng.com/story-name/?utm_source=x&utm_medium=y#top')).toBe('https://punchng.com/story-name');
  });

  it('keeps meaningful query params', () => {
    expect(canonicalUrl('https://site.ng/news?id=42&utm_campaign=z')).toBe('https://site.ng/news?id=42');
  });

  it('rejects non-http urls', () => {
    expect(canonicalUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalUrl('not a url')).toBeNull();
  });
});

describe('cluster', () => {
  const t = Date.parse('2026-10-05T08:00:00Z');
  const items = [
    { id: 'a', source: 'Punch', publishedAt: t, tokens: titleTokens('Tinubu signs 2027 budget into law') },
    { id: 'b', source: 'Vanguard', publishedAt: t + 3600e3, tokens: titleTokens('BREAKING: Tinubu signs 2027 budget into law') },
    { id: 'c', source: 'Daily Trust', publishedAt: t + 7200e3, tokens: titleTokens("Tinubu signs N54trn 2027 budget into law") },
    { id: 'd', source: 'Punch', publishedAt: t, tokens: titleTokens('Super Eagles beat Ghana in Accra friendly') },
    { id: 'e', source: 'Punch', publishedAt: t - 48 * 3600e3, tokens: titleTokens('Tinubu signs 2027 budget into law') },
  ];

  it('groups near-duplicate headlines across outlets', () => {
    const groups = cluster(items).map((g) => g.map((i) => i.id).sort());
    expect(groups).toContainEqual(['a', 'b', 'c']);
    expect(groups).toContainEqual(['d']);
  });

  it('does not join stories more than 36 hours apart', () => {
    const groups = cluster(items).map((g) => g.map((i) => i.id));
    expect(groups.find((g) => g.includes('e'))).toEqual(['e']);
  });

  it('jaccard ignores filler words', () => {
    expect(jaccard(titleTokens('VIDEO: Fire guts Balogun market'), titleTokens('Fire guts Balogun market'))).toBe(1);
  });
});

describe('rank', () => {
  it('orders by coverage, then freshness', () => {
    const big = score(6, 5, 'national', 2);
    const small = score(1, 1, 'national', 2);
    const stale = score(6, 5, 'national', 30);
    expect(big).toBeGreaterThan(small);
    expect(big).toBeGreaterThan(stale);
  });

  it('halves every 6 hours', () => {
    expect(score(2, 2, 'politics', 6) / score(2, 2, 'politics', 0)).toBeCloseTo(0.5);
  });
});

describe('categorise fallbacks', () => {
  it('prefers the category feed', () => {
    expect(categorise('sports', ['Politics'], 'Senate passes bill')).toBe('sports');
  });

  it('falls back to RSS tags', () => {
    expect(categorise(undefined, ['Business', 'News'], 'Something happened')).toBe('business');
  });

  it('falls back to title keywords', () => {
    expect(categorise(undefined, [], 'Super Eagles name squad for Ghana friendly')).toBe('sports');
    expect(categorise(undefined, [], 'Naira weakens at official market')).toBe('business');
  });

  it('defaults to national', () => {
    expect(categorise(undefined, [], 'Community holds annual meeting')).toBe('national');
  });
});

describe('feed boilerplate', () => {
  it('drops trailing "Read More: <url>"', () => {
    expect(stripBoilerplate('Governor signs bill. Read More: https://punchng.com/x/')).toBe('Governor signs bill.');
  });

  it('ignores person and place tags when categorising', () => {
    expect(categorise(undefined, ['Chief Festus Keyamo', 'Igbokoda'], 'IG meets INTERPOL chief in France')).toBe('national');
  });
});

describe('displayTitle', () => {
  it('drops publisher labels, keeps the headline words', () => {
    expect(displayTitle('Breaking: Temi Nkem wins BBNaija season 11')).toBe('Temi Nkem wins BBNaija season 11');
    expect(displayTitle("Stars in Lagos-set film 'Clarissa' | Watch Trailer")).toBe("Stars in Lagos-set film 'Clarissa'");
    expect(displayTitle('Naira gains at official window')).toBe('Naira gains at official window');
  });
});
