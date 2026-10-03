# News sources

Quick probe run 2026-10-03 ~19:30 WAT with `curl` (User-Agent `Paperstand/1.0`). The real
`pipeline/probe.ts` in M2 re-checks these with robots.txt, conditional GETs, and recency rules.

## Main feeds

| Source | Feed | Status | Items | Newest | Images in feed | Leaning / region note |
|---|---|---|---|---|---|---|
| Punch | punchng.com/feed/ | ok | 30 | <1h | yes | Lagos, independent |
| Vanguard | vanguardngr.com/feed/ | ok | 20 | <1h | yes | Lagos / South-South |
| Premium Times | premiumtimesng.com/feed | ok | 15 | 1h | yes | Abuja, investigative |
| Daily Trust | dailytrust.com/feed/ | ok | 14 | 1h | no | Abuja / North |
| Leadership | leadership.ng/feed/ | ok | 10 | <1h | no | Abuja / North |
| Nigerian Tribune | tribuneonlineng.com/feed/ | ok | 20 | <1h | no | Ibadan / South-West |
| The Sun | sunnewsonline.com/feed/ | ok | 10 | <1h | no | Lagos / South-East readership |
| Channels TV | channelstv.com/feed/ | ok | 10 | <1h | yes | broadcaster, national |
| BusinessDay | businessday.ng/feed/ | ok | 5 | <1h | yes | business |
| Nairametrics | nairametrics.com/feed/ | ok | 20 | <1h | no | business, markets |
| ThisDay | thisdaylive.com/index.php/feed/ | ok | 25 | 4h | no | Lagos / Abuja |
| Daily Post | dailypost.ng/feed/ | ok | 20 | <1h | yes | national, fast |
| Blueprint | blueprint.ng/feed/ | ok | 20 | <1h | no | Abuja / North |
| Peoples Gazette | gazettengr.com/feed/ | ok | 10 | <1h | no | Abuja, investigative |
| Ripples Nigeria | ripplesnigeria.com/feed/ | ok | 50 | 1h | some | national |
| Legit.ng | legit.ng/rss/all.rss | ok | 30 | <1h | yes | national, popular |
| BellaNaija | bellanaija.com/feed/ | ok | 50 | <1h | yes | entertainment |
| Complete Sports | completesports.com/feed/ | ok (slow, ~15s) | 20 | <1h | ? | sports |
| The Guardian NG | guardian.ng/feed/ | **403** (bot block) | | | | |
| TheCable | thecable.ng/feed | **403** | | | | |
| The Nation | thenationonlineng.net/feed/ | **403** | | | | |
| Daily Independent | independent.ng/feed/ | **403** | | | | |
| Sahara Reporters | saharareporters.com/feeds/latest/feed | 404 | | | | |
| Pulse NG | pulse.ng/rss | 404 | | | | |
| HumAngle | humanglemedia.com/feed/ | 429 (rate limit) | | | | conflict reporting, North-East |

## Category feeds (clean categories for free)

| Category | Working feeds |
|---|---|
| Sports | Punch `/topics/sports/feed/`, Vanguard `/category/sports/feed/`, Daily Post `/sport-news/feed/`, Premium Times `/category/sports/feed`, Complete Sports |
| Politics | Punch `/topics/politics/feed/`, Vanguard `/category/politics/feed/`, Daily Post `/politics/feed/`, Premium Times top news |
| Business | Punch `/topics/business/feed/`, BusinessDay, Nairametrics (Vanguard business is stale, 36h) |
| Entertainment | BellaNaija, Punch `/topics/entertainment/feed/`, Vanguard `/category/entertainment/feed/`, Legit `/rss/entertainment.rss` |
| Metro | Punch `/topics/metro-plus/feed/`, Vanguard `/category/metro/feed/` |

## Proposed v1 list (for James to approve)

Balanced across Lagos, Abuja/North, South-West and South-East readerships, and across
independent, investigative, and mainstream outlets:

**Punch, Vanguard, Premium Times, Daily Trust, Leadership, Nigerian Tribune, The Sun,
Channels TV, BusinessDay, Nairametrics, Daily Post, Peoples Gazette, BellaNaija,
Complete Sports**, plus the category feeds above. 14 sources; the spec needs at least 6 healthy.

Not proposed: Legit.ng and Ripples (high volume, more aggregator-like); ThisDay (4h lag,
keep as reserve); Blueprint (reserve for more Northern balance if needed).

## NewsData.io fallback: what the terms say

From NewsData.io's own pages (their main pricing and terms pages render client-side; these points
come from their official blog and free-plan page, October 2026):
- Free plan: **200 credits a day**, about 10 articles per request.
- **Free plan articles are delayed about 12 hours.** No full text.
- **Commercial use is not allowed on the free plan.** Their own comparison table marks the free
  tier "No" for commercial use; the cheapest commercial plan is about **$199.99/month**.

What that means for Paperstand:
- A 12-hour delay makes it a poor "backup" for a site about today's papers. It would only ever
  fill gaps with half-day-old stories.
- Paperstand has no ads or payments, but it is a studio showcase that aims for work inquiries.
  Whether that counts as "commercial" is a grey area only NewsData can answer.
- With 14 healthy RSS sources, the fallback (only used when fewer than 5 RSS sources are healthy)
  would almost never run.

Recommendation: build the fallback code path (spec requires it), leave `NEWSDATA_API_KEY` unset
in production, and email NewsData to confirm a non-commercial portfolio site is allowed before
turning it on.
