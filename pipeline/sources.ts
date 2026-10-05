// Feed list from the 2026-10-03 probe (docs/SOURCES.md). Category feeds give clean categories
// for free; the main feed's items are categorised from tags and keywords.

export type Category = 'politics' | 'national' | 'metro' | 'business' | 'sports' | 'entertainment' | 'world';

export type Feed = {
  source: string;
  homepage: string;
  url: string;
  /** Set for category feeds; main feeds leave it undefined. */
  category?: Category;
};

export const FEEDS: Feed[] = [
  { source: 'Punch', homepage: 'https://punchng.com', url: 'https://punchng.com/feed/' },
  { source: 'Punch', homepage: 'https://punchng.com', url: 'https://punchng.com/topics/politics/feed/', category: 'politics' },
  { source: 'Punch', homepage: 'https://punchng.com', url: 'https://punchng.com/topics/business/feed/', category: 'business' },
  { source: 'Punch', homepage: 'https://punchng.com', url: 'https://punchng.com/topics/sports/feed/', category: 'sports' },
  { source: 'Punch', homepage: 'https://punchng.com', url: 'https://punchng.com/topics/metro-plus/feed/', category: 'metro' },
  { source: 'Punch', homepage: 'https://punchng.com', url: 'https://punchng.com/topics/entertainment/feed/', category: 'entertainment' },
  { source: 'Vanguard', homepage: 'https://www.vanguardngr.com', url: 'https://www.vanguardngr.com/feed/' },
  { source: 'Vanguard', homepage: 'https://www.vanguardngr.com', url: 'https://www.vanguardngr.com/category/politics/feed/', category: 'politics' },
  { source: 'Vanguard', homepage: 'https://www.vanguardngr.com', url: 'https://www.vanguardngr.com/category/sports/feed/', category: 'sports' },
  { source: 'Vanguard', homepage: 'https://www.vanguardngr.com', url: 'https://www.vanguardngr.com/category/metro/feed/', category: 'metro' },
  { source: 'Vanguard', homepage: 'https://www.vanguardngr.com', url: 'https://www.vanguardngr.com/category/entertainment/feed/', category: 'entertainment' },
  { source: 'Premium Times', homepage: 'https://www.premiumtimesng.com', url: 'https://www.premiumtimesng.com/feed' },
  { source: 'Premium Times', homepage: 'https://www.premiumtimesng.com', url: 'https://www.premiumtimesng.com/category/sports/feed', category: 'sports' },
  { source: 'Daily Trust', homepage: 'https://dailytrust.com', url: 'https://dailytrust.com/feed/' },
  { source: 'Leadership', homepage: 'https://leadership.ng', url: 'https://leadership.ng/feed/' },
  { source: 'Nigerian Tribune', homepage: 'https://tribuneonlineng.com', url: 'https://tribuneonlineng.com/feed/' },
  { source: 'The Sun', homepage: 'https://sunnewsonline.com', url: 'https://sunnewsonline.com/feed/' },
  { source: 'Channels TV', homepage: 'https://www.channelstv.com', url: 'https://www.channelstv.com/feed/' },
  { source: 'BusinessDay', homepage: 'https://businessday.ng', url: 'https://businessday.ng/feed/', category: 'business' },
  { source: 'Nairametrics', homepage: 'https://nairametrics.com', url: 'https://nairametrics.com/feed/', category: 'business' },
  { source: 'Daily Post', homepage: 'https://dailypost.ng', url: 'https://dailypost.ng/feed/' },
  { source: 'Daily Post', homepage: 'https://dailypost.ng', url: 'https://dailypost.ng/politics/feed/', category: 'politics' },
  { source: 'Daily Post', homepage: 'https://dailypost.ng', url: 'https://dailypost.ng/sport-news/feed/', category: 'sports' },
  { source: 'Peoples Gazette', homepage: 'https://gazettengr.com', url: 'https://gazettengr.com/feed/' },
  { source: 'BellaNaija', homepage: 'https://www.bellanaija.com', url: 'https://www.bellanaija.com/feed/', category: 'entertainment' },
  { source: 'Complete Sports', homepage: 'https://www.completesports.com', url: 'https://www.completesports.com/feed/', category: 'sports' },
];

export const USER_AGENT = 'Paperstand/1.0 (+https://paperstand.vercel.app/about)';
