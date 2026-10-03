# PAPERSTAND: Build Spec

**Purpose of this document:** this is the complete brief for building Paperstand (working title), a web recreation of the Nigerian roadside newspaper stand. You browse today's real Nigerian news as physical newsprint, pick a paper off the vendor's table, hold it, and feel it flop and flap like real paper. This file is written for Claude Code to execute milestone by milestone. Section 0 explains how. Section 15 lists the decisions only James can make.

Owner: James (Adedamola), DarkDev. Second project in the Nigerian nostalgia series after crown caps.

---

## 0. Execution protocol (Claude Code, read this first)

1. Read this entire document before writing any code.
2. In the repo root, create:
   - `CLAUDE.md`: a short summary of the conventions here, with a pointer to this spec as the source of truth.
   - `PROGRESS.md`: a checklist built from Section 12, with one checkbox per acceptance criterion.
   - `DECISIONS.md`: a log of every judgment call you make where this spec is silent or ambiguous. For each, record the date, the decision, the reason, and any alternatives.
3. Work **one milestone at a time, in order**. Use one branch per milestone (`m1-paper-lab`, etc.) and merge to `main` when its acceptance criteria pass.
4. At every **HUMAN GATE**, stop. Write a gate report at the bottom of `PROGRESS.md` covering what was built, the preview URL, exactly what James should test on his phone, and any known issues. Do not start the next milestone until James approves.
5. Before every commit, run `pnpm typecheck && pnpm lint && pnpm build`. Use small commits with conventional messages (`feat:`, `fix:`, `perf:`, `chore:`).
6. Use only the dependencies listed in Section 10. Adding anything else requires a `DECISIONS.md` entry that includes its gzipped size cost.
7. Never commit secrets. Keep `.env.example` up to date.
8. When the spec is silent, choose by this priority order: (1) the paper feels real, (2) it runs well on a low-end Android, (3) it is the simplest option. Log the choice and keep going. Only stop for items listed in Section 15.
9. Record bundle size and the perf HUD numbers (Section 8) in the gate report for every milestone.
10. Avoid em dashes in all user-facing copy.

---

## 1. Vision

Growing up in Nigeria, the newspaper stand was a fixture: a big umbrella, a table under it, and every paper laid face-up, folded in half, held down by stones against the breeze. You scanned all the front pages at once, picked one, paid, and read. A crowd of "free readers" stood around reading headlines without buying.

Paperstand recreates that moment with **today's real news**.

**The one moment that must be perfect:** picking a paper up and holding it. The edges slump, the free corners curl, and when you move, the sheet lags and flaps like thin newsprint. If this moment feels fake, nothing else matters. That is why it is built first (M1).

**Why newspapers and not magazines (for v1):** live news gives people a reason to come back every morning. Crown caps was a visit-once experience. Magazines go on the v2 list.

### Non-goals for v1
- No user accounts, payments, or comments.
- No full article text. We link out to the publisher (see Section 4.6).
- No AI rewriting or summarising of news.
- No free-roam first-person movement.
- No inside pages. Each paper has a front page and a back page only.

---

## 2. Experience spec

### 2.1 States

```
LOADING -> STAND -> PICK -> HELD <-> READ
                      ^        |
                      |        v
                    PUTBACK <- (back / swipe down)
HELD -> TURNOVER -> HELD (back page, and back again)
```

Implement this as an explicit state machine in `src/state/store.ts` using zustand. Each transition has exactly one owner animation, and inputs are ignored mid-transition except for "back".

### 2.2 STAND
- The camera is fixed, looking down at the table at roughly 50 to 55 degrees, as if you are the customer standing at the stand. The edge of the umbrella canopy and its shadow are visible at the top of the frame.
- Six papers sit folded in half (top half showing) in two rows of three. They overlap slightly and are misaligned the way a human would lay them. Use a random seed from the edition date so the layout is stable all day but changes daily.
- A few stones rest on some papers. The corners of papers *without* stones lift and flutter in an idle breeze. Papers *with* stones stay pinned near the stone.
- On wider screens (desktop, landscape), show more of the table. On portrait phones, the table can be wider than the screen, so a horizontal swipe pans the camera along the table, clamped to the edges.
- Tapping a paper starts PICK. While the pointer is held down on a paper, it lifts about 3% as feedback.
- Show a small edition stamp in DOM, for example "Saturday 3 October 2026, Morning Edition". After 14:00 WAT, revisions are labelled "Late City Edition".

### 2.3 PICK (about 700ms total)
The paper lifts in an arc toward the camera, unfolds (the fold angle animates from fully folded to flat with a soft crease), rotates to face the camera, and scales so it fills about 92% of the viewport width in portrait or 92% of the height in landscape. Swap in the hi-res texture once it has loaded. Until then, the lo-res texture stays in place.

### 2.4 HELD (the core moment)
The user's hands are implied, never shown. The paper is gripped at its left and right edges, slightly above vertical centre, like someone reading a broadsheet.
- **Drag** (one finger or mouse) moves the grip points. The paper follows through springs, so the body lags and the free edges lag even more.
- **Flick up** turns the paper over (TURNOVER) to the back page, which is sports, as in Nigerian papers. Flick up again to return to the front.
- **Tap a story** on the page opens READ for that story (hit-testing in Section 6.6).
- **Swipe down, the Android hardware back button, or browser back** puts the paper back (PUTBACK runs the reverse of PICK, including refolding).
- **Tilt (gyro)** is an opt-in chip, "Tilt to move the paper", default off. iOS requires `DeviceOrientationEvent.requestPermission()` from a tap.
- An idle breeze adds very low-amplitude flutter to the free edges.

### 2.5 READ
A DOM sheet slides up from the bottom, styled like a newsprint clipping (off-white, serif, a slight torn top edge as an SVG mask). It contains:
- headline
- source name and published time
- the excerpt (40 words maximum, Section 4.6)
- a primary button, "Read full story on {Source}", which opens the original URL in a new tab
- a secondary button, "Share this front page"

The 3D paper dims behind the sheet. Back or a downward swipe closes it and returns to HELD.

### 2.6 Share
- The share URL is `/p/{paper}/{date}`. Its OG image is the pre-rendered front page crop (Section 5).
- Use the Web Share API with the front page image as a file where `navigator.canShare({ files })` is true. This is the WhatsApp Status path, which is the main growth channel. Otherwise share the link, and as a last fallback, download the image.
- A shared image carries a small footer watermark with the site domain.

### 2.7 Routing and the back button
- `/`: the stand.
- `/p/[paper]`: opens the stand with that paper already HELD.
- `/p/[paper]/[date]`: an archived edition (read-only, same experience).
- `/lite`: the 2D fallback (Section 9.1).
- `/about`: sources, credits, the takedown contact, and "Built by James (DarkDev)".
- `/lab/*`: development tools, `noindex`, blocked in production unless `?key=` matches an env var.

Every state change into HELD or READ pushes a history entry, so Android back closes READ, then puts the paper down, and only then leaves the site. **This matters a lot on Nigerian Android phones.**

### 2.8 Sound
- SFX: a rustle on pick, a soft rustle on hard flaps (rate-limited), a rustle on putback, and a thump when a stone settles.
- Ambience: a 20-second Lagos street loop. It is **off by default**, with a toggle in the corner.
- SFX are enabled after the first user gesture, with a mute toggle.
- Format is Opus with an AAC fallback. Keep each SFX at or under 30KB and the ambience at or under 150KB. Lazy-load all audio after the stand is interactive.
- Ideally James records the rustles himself on his phone with real newspaper. That gives authentic sound with no licensing questions. Otherwise use CC0 sounds only, and log the source in `DECISIONS.md`.

### 2.9 Time of day
Pick a lighting preset from the current hour in WAT (Africa/Lagos): morning (low warm sun), midday (hard overhead light, strong umbrella shadow), evening (amber), night (one warm bulb hanging from the umbrella). Cross-fade if the hour changes during a session. This costs almost nothing and makes the scene feel alive.

---

## 3. Content concept: the papers

Use **fictional mastheads only**. Never use real paper names, logos, or masthead styles, because of trademark risk. Every story on a page is still real, credited, and linked to its real source.

Six papers for v1. The names are placeholders that James can rename. Claude Code must web-search each final name together with "Nigeria newspaper" and confirm there is no collision with a real Nigerian title. Log the result.

| Slug | Title (placeholder) | Character | Story mix |
|---|---|---|---|
| `lantern` | The Daily Lantern | Serious national broadsheet with a blackletter masthead | Top stories across all categories |
| `chronicle` | The Federal Chronicle | Politics-heavy, dense columns | Politics, national |
| `marketday` | Market Day | Business daily printed on salmon-tinted stock | Business, economy, fuel, naira |
| `goalmouth` | Goalmouth | Loud sports tabloid with huge condensed headlines | Sports (front and back) |
| `gbedu` | Gbedu Weekly | Colourful entertainment and gist tabloid | Entertainment, celebrity |
| `metro` | Lagos Metro Express | Local and metro tabloid | Metro, Lagos, general |

Each paper has a **price tag sticker** on the stand (a playful nostalgic price, decorative only).

### 3.1 Page furniture (this is where the nostalgia lives)
Each front page combines real stories with **generated period furniture**:
- **Ears**: boxes beside the masthead with real Lagos weather from Open-Meteo (free, no key) and the edition number.
- **Index strip**: "Inside: Politics 4, Business 12, Sports 40" (decorative page numbers).
- **"Cont'd on page X"** lines under excerpts, which is authentic and avoids filler text.
- **Classifieds and notices** on the back and front lower areas, generated from templates with **clearly fictional names** drawn from name pools:
  - "Change of Name" notices (the most iconic Nigerian newspaper item)
  - "Loss of Document" notices
  - "Thanksgiving Service" notices
  - "Vacancy" boxes
  - Fictional product ads (generic: a fictional noodle brand, a fictional pure water brand, a fictional generator dealer). Never real brands and never health or medical claims.
- No obituaries, missing persons, or anything that could resemble a real person's tragedy.
- **Never** use lorem ipsum anywhere a user can zoom in.

---

## 4. News pipeline

### 4.1 Where it runs
The pipeline runs as a **Node script in GitHub Actions**, not on Vercel. The Vercel Hobby plan only allows cron jobs once per day, with up to an hour of scheduling imprecision, so it cannot drive hourly editions. Running in Actions also avoids function timeouts for image rendering.

`.github/workflows/edition.yml`:
- Schedule: `0 4-22 * * *` UTC, which is hourly from 05:00 to 23:00 WAT (WAT is UTC+1). Add a manual trigger with `workflow_dispatch`.
- Steps: install, then `pnpm pipeline:run` (ingest, cluster, rank, compose, upload, manifest), then call the revalidate webhook.
- Keep run time to 2 minutes or less. If the repo is private, check the Actions minutes budget: about 19 runs a day must stay well inside the free monthly allowance. Log the measured run time in the M2 gate report.
- A failed run emails James through GitHub's default notifications. If one run fails, the site keeps serving the last good edition.

Hourly is enough. Real papers came out once a day.

### 4.2 Sources
The primary source is **publisher RSS feeds**. Most Nigerian outlets run WordPress, so `/feed/` and `/category/{name}/feed/` usually work, **but none of the URLs below are verified**. M2 starts with a probe script (`pipeline/probe.ts`) that fetches each candidate and checks for valid XML, item count, recency (newest item under 6 hours old), and whether items include images. It writes a report to `pipeline/probe-report.md`.

Candidate list (aim for regional and editorial balance, Section 15):

| Source | Candidate feed |
|---|---|
| Punch | `https://punchng.com/feed/` |
| Vanguard | `https://www.vanguardngr.com/feed/` |
| Premium Times | `https://www.premiumtimesng.com/feed` |
| TheCable | `https://www.thecable.ng/feed` |
| The Guardian Nigeria | `https://guardian.ng/feed/` |
| Daily Trust | `https://dailytrust.com/feed/` |
| Nigerian Tribune | `https://tribuneonlineng.com/feed/` |
| The Nation | `https://thenationonlineng.net/feed/` |
| Leadership | `https://leadership.ng/feed/` |
| BusinessDay | `https://businessday.ng/feed/` |
| Channels TV | `https://www.channelstv.com/feed/` |
| Complete Sports (sports) | `https://www.completesports.com/feed/` |
| BellaNaija (entertainment) | `https://www.bellanaija.com/feed/` |

Also probe category feeds (sports, business, politics, entertainment) for each source, since they give clean categories for free.

**Fallback:** NewsData.io `/api/1/latest?country=ng`. The free tier gives a daily credit allowance (about 200 credits a day, 10 results per request, with delayed results). Use it only when fewer than 5 RSS sources are healthy. **Before enabling it in production, James must check the current NewsData.io terms for public display use** (Section 15). Put the key in `NEWSDATA_API_KEY`. The pipeline must work fully without it.

### 4.3 Fetching etiquette
- User-Agent: `Paperstand/1.0 (+https://{domain}/about)`.
- Use conditional GETs (`If-None-Match` / `If-Modified-Since`) and store ETag and Last-Modified per source.
- Use a 10-second timeout per feed and fetch at most 4 feeds at once.
- Check robots.txt once per source per day. If a feed path is disallowed, skip that source.
- After 5 consecutive failures, mark the source `degraded` and retry once a day.

### 4.4 Normalise, dedupe, cluster, rank
- **Normalise:** strip HTML, decode entities, collapse whitespace, canonicalise the URL (strip `utm_*`, fragments, and trailing slashes), and parse the date in UTC.
- **Excerpt:** take the first sentences of the RSS description, then truncate to **40 words maximum** at a sentence or word boundary and add an ellipsis. Never store the full article body.
- **Dedupe:** exact canonical URL.
- **Cluster:** group the same story across outlets. Normalise titles (lowercase, strip punctuation and a stopword list including common Nigerian news filler such as "breaking", "just in", "video"). Two titles belong to the same cluster when token-set Jaccard similarity is at least 0.5 and they are within 36 hours of each other. Use union-find.
- **Categorise:** first from the category feed it came from, then from RSS `<category>` tags mapped through a table, then from a keyword rules fallback. Categories: `politics`, `national`, `metro`, `business`, `sports`, `entertainment`, `world`. No AI in v1.
- **Rank:** `score = (clusterSize ^ 0.8) * categoryWeight * 0.5^(ageHours / 6) * (1 + 0.1 * distinctSources)`. Cross-outlet coverage is the best importance signal available.
- **Lead stories:** a dominant story (cluster of 5 or more sources) may lead up to 3 papers, as happens in real life. Otherwise each paper's lead is its own top story by its category mix.

### 4.5 Data model (Drizzle and Postgres on Neon, free tier)

```ts
sources(id, name, homepage, feedUrl, categoryHint, enabled, status /*ok|degraded*/,
        etag, lastModified, lastFetchedAt, failCount)
articles(id, sourceId, url /*unique canonical*/, title, excerpt, imageUrl,
         publishedAt, fetchedAt, category, titleTokens /*text[]*/, clusterId)
clusters(id, leadArticleId, size, distinctSources, score, category, firstSeen, lastSeen)
editions(id, date /*YYYY-MM-DD WAT*/, revision, generatedAt, late /*bool*/)
pages(id, editionId, paperSlug, kind /*front|back*/, storyIds jsonb,
      loUrl, hiUrl, ogUrl, width, height, layoutHash)
```

Retention: articles 14 days, editions and page images 90 days (Section 15). Run a nightly prune in the 04:00 UTC run.

### 4.6 Rights and safety rules (hard rules, write tests for them)
1. Store and display only the **headline, an excerpt of 40 words or fewer, the source name, the timestamp, and the link**. Never full text.
2. Every story shown, both on the page texture and in READ, carries its source name.
3. Never rewrite, summarise, or generate news text with AI.
4. Never use real newspaper names, logos, or masthead designs.
5. Photos sit behind the `ENABLE_PHOTOS` flag, which defaults to **false** until James decides (Section 15). When enabled: use them only for lead stories, apply grayscale halftone treatment, add a "Photo: {Source}" credit, and suppress the photo when the headline or excerpt matches a violence or tragedy keyword list.
6. The `/about` page lists every source with a link, states that Paperstand is not affiliated with any publisher, and gives a takedown email. Setting `sources.enabled = false` removes a source within one pipeline run.
7. Sanitise all feed text and never use `dangerouslySetInnerHTML`.

---

## 5. Front page compositor

### 5.1 Pipeline
JSX templates go through **Satori** to SVG, then **@resvg/resvg-js** to PNG, then **sharp** to:
- `lo`: 512px wide WebP, quality about 72, target 60KB or less (used on the table)
- `hi`: 1536px wide WebP (1024px for the low tier, Section 8), quality about 80, target 250KB or less (used when held)
- `og`: 1200x630 WebP and PNG crop of the top half (used for share cards)

Page aspect ratio is **1 : 1.45**. All coordinates in templates are in a 1536 x 2227 design space.

Upload to **Cloudflare R2** (served from a custom domain or r2.dev through Cloudflare's CDN) using content-hashed filenames with `Cache-Control: public, max-age=31536000, immutable`. Large textures are served from R2 instead of Vercel to protect Vercel's bandwidth if the site goes viral.

Write the manifest to `editions/latest.json` and `editions/{date}.json` with `Cache-Control: public, max-age=60`.

### 5.2 Manifest schema (`src/lib/manifest.ts`, shared by the pipeline and the client)

```ts
export type Rect = [x: number, y: number, w: number, h: number]; // normalised 0..1, origin top-left
export type Story = {
  id: string; headline: string; excerpt: string; source: string; url: string;
  publishedAt: string; rect: Rect; imageCredit?: string;
};
export type Page = { kind: 'front' | 'back'; lo: string; hi: string; hiLow: string; og: string; stories: Story[] };
export type Paper = { slug: string; title: string; priceLabel: string; pages: Page[] };
export type EditionManifest = {
  editionDate: string; revision: number; generatedAt: string; late: boolean;
  weather?: { tempC: number; label: string };
  papers: Paper[];
};
```

Validate the manifest with zod at the pipeline output and at client fetch. If client validation fails, fall back to the previous good manifest held in memory or to `/lite`.

### 5.3 Templates
- One template file per paper in `pipeline/templates/`, each with its own front and back.
- Templates use **fixed slot geometry**. Each template exports its slot rects, and the same rects go into the manifest for hit-testing. Satori renders slots with absolute positioning that matches these rects exactly.
- **Text fitting:** Satori does not measure text, so measure with `@napi-rs/canvas` using the same font files. Binary-search the headline font size to fit the slot within min and max bounds, and allow a maximum number of lines per slot. If a headline still does not fit at the minimum size, move it to a bigger slot or use the next story.
- Fonts must be OFL-licensed only, with the TTFs committed to `pipeline/fonts/`. Suggested starting set (the designer may change it and log the change):
  - mastheads: a blackletter face (UnifrakturMaguntia) for `lantern`, and condensed display faces for the tabloids
  - banner headlines: Anton or Oswald (heavy condensed, the Nigerian tabloid look)
  - body and excerpts: Source Serif 4
- **Design direction:** these must look like **Nigerian papers from the late 90s and 2000s**, not a generic western broadsheet:
  - heavy condensed all-caps banner headlines with tight leading
  - red or blue spot colour on mastheads, sometimes with slight colour misregistration (offset the spot-colour layer by 1 to 2px)
  - newsprint off-white backgrounds (not pure white) with faint ink density variation
  - busy, crowded layouts packed with notices
  - Gbedu printed in garish colours, Market Day on salmon stock
- The back page of every paper is sports, except Gbedu, whose back page is gist.
- Add `/lab/edition`, which renders all of today's pages side by side at lo and hi resolution with slot outlines toggleable. This is the review tool for HUMAN GATE 2.

---

## 6. Paper simulation

This is the heart of the project. **Fake it in the vertex shader. Do not use a real cloth solver.** A procedural deformation driven by a few spring states is cheap, stable, and fully tunable. Real cloth at good resolution stutters on mid-range Androids.

### 6.1 Mesh
- One `PlaneGeometry` per paper in local XY, centred, with width W and height H = 1.45W.
- Segments by tier: high 40 x 58, mid 28 x 40, low 18 x 26.
- On the stand, the 5 papers that are not held use the low segment count. Only the held paper uses its tier's full count.

### 6.2 Deformation layers (applied in this order)
1. **Fold** (`uFold`, 0 = flat, 1 = folded): the bottom half rotates around the horizontal centre line until it lies behind the top half. Bend it around a small radius (about 0.4% of H) instead of using a hard hinge, so the crease looks like paper. The folded paper should show a slight residual bulge, and the fold never closes perfectly.
2. **Grip sag** (`uSag`): grips are at the left and right edges at height `gy` (about 0.1H above centre). The span between the hands bows away from the viewer by `uSag * (1 - (2x/W)^2)`.
3. **Droop** (`uDroop`): bend angle around the X axis grows with distance from the grip line, `theta(y) = uDroop * smoothstep(0, H/2, |y - gy|)^1.6`. The top region falls back and the bottom hangs. This is the "sides slump" look.
4. **Corner curl** (`uCurl`): free corners curl by an amount weighted by their distance from the nearest grip.
5. **Flap** (`uFlapA`, `uFlapPhase`): a travelling wave on the free regions, `z += uFlapA * w(x,y) * sin(k * d - uFlapPhase)`. Here `d` is the distance from the grip line and `w` ramps from 0 at the grips to 1 at the free edges. Drive it from the spring state in 6.3.
6. **Breeze** (`uBreeze`, `uTime`): very low-amplitude 2D value noise on free edges. On the stand, multiply by a per-vertex **pin mask** so areas near a stone stay pinned.
7. **Turn** (`uTurn`, 0 to 1): a cylinder curl for TURNOVER. Points past a moving line wrap around a cylinder of radius about 0.08W. At `uTurn = 1` the paper has flipped and the back page faces the viewer.

Compute **normals in the vertex shader by finite differences**: evaluate the deformation at `p`, `p + (eps, 0)`, and `p + (0, eps)`, then take the cross product. At these vertex counts the cost is trivial.

Put the deformation function in one GLSL chunk (`paper.deform.glsl`) and include it in both the main shader and a depth shader, so contact shadows match if they are added later.

### 6.3 Springs (CPU, in `useFrame`)
Use semi-implicit Euler with dt clamped to 1/30s:
`v += (-k * (x - target) - c * v) * dt; x += v * dt`

| Spring | Drives | Character |
|---|---|---|
| `grip` (2D) | grip position following the pointer or gyro | stiff, near critical damping |
| `body` | paper centre following the grips | slightly softer, so the body lags |
| `flap` | `uFlapA` | underdamped and wobbly; receives an impulse from grip velocity |
| `sag` / `droop` | small responsive changes, more droop when moving fast | soft |

All constants live in `src/scene/paper/paper.config.ts`, exported per tier. In `/lab/paper`, expose every constant through **leva** (dev only, tree-shaken from production), with a "Copy config" button that prints the TS object to paste back into the file.

### 6.4 Material
- Use a custom `ShaderMaterial` with no `MeshStandardMaterial` overhead. Use Lambert diffuse with soft wrap lighting from the time-of-day preset and a hemisphere ambient.
- **Newsprint show-through:** in the fragment shader, sample the other side's texture mirrored horizontally and blend it at about 6% (more when the light is behind the paper). Real newsprint is thin, and this detail sells it.
- Add a tileable 256px paper grain texture, with multiplied ink and slight yellowing toward the edges.
- Pick the front or back texture with `gl_FrontFacing`.
- Turn on mipmaps. Set **anisotropy to 4 on the high tier**, because papers lying on the table are viewed at an angle and text blurs badly without it.

### 6.5 Camera
- Use a 35 degree FOV to keep distortion low.
- For HELD, compute the distance analytically so the paper fits 92% of the viewport (width in portrait, height in landscape). Recompute on resize and orientation change.

### 6.6 Hit-testing
On a tap in HELD, the paper first eases toward a neutral pose for 150ms. Then raycast against an **undeformed** invisible plane in the paper's local space, convert the hit to normalised UV, and find the containing `story.rect` from the manifest. Taps outside any story do nothing. On the stand, raycast against simple box colliders around each folded paper.

### 6.7 Reduced motion
When `prefers-reduced-motion` is on, set flap, breeze, and curl to 0, keep a static gentle droop, and replace PICK and PUTBACK with a 250ms crossfade and scale.

---

## 7. Scene and assets

- **Table:** an old wooden table, low-poly, with a 512px KTX2 wood texture.
- **Umbrella:** a big generic striped umbrella using vertex colours. **No telecom or brand colour schemes** such as the famous yellow or green branded umbrellas. Only the canopy edge and the pole are visible.
- **Stones:** one rock geometry instanced 3 to 4 times with varied scale and rotation.
- **Shadows:** no realtime shadow maps. Bake an umbrella shadow decal onto the table texture (one variant per lighting preset, or tint a single one). Each paper gets a blob contact shadow that fades and spreads as it lifts during PICK.
- **Backdrop:** a single painted or illustrated street plate (a danfo and stalls, out of focus), WebP of 40KB or less, on a background quad. Optional gentle parallax from gyro on the high tier.
- Keep the total static 3D payload (GLB with meshopt compression plus KTX2 textures) at 400KB or less.
- For M4, Claude Code builds clean procedural and low-poly placeholder versions. James may later commission final models (Section 15). Asset paths and scales must be easy to swap without touching other code.

---

## 8. Performance budget

**Target devices:** the reference low-end phone is a Tecno, Infinix, or itel class Android (720p screen, Mali-G52 or PowerVR GE8320 class GPU, 3 to 4GB RAM). The reference mid-range phone is James's own. Remote debug with `chrome://inspect`.

| Metric | High tier | Low tier |
|---|---|---|
| Initial JS (gzip, `/`) | 320KB or less | same |
| Transfer before the stand is interactive (lo textures in) | 2.5MB or less | 1.2MB or less |
| Stand interactive on Fast 3G throttle | under 6s, with a skeleton by 1.5s | same |
| FPS while held | 55 or more | 30 or more |
| FPS on the idle stand | render on demand (`frameloop="demand"`), invalidated only by breeze ticks at 15fps | same |
| Draw calls | 40 or fewer | 25 or fewer |
| GPU texture memory | 80MB or less | 40MB or less |
| DPR clamp | [1, 2] | [1, 1.5] |
| Antialias | on | off |

### Tiering (`src/lib/tier.ts`)
Combine `detect-gpu`, `navigator.deviceMemory`, `navigator.connection.saveData` / `effectiveType`, and a 2-second FPS probe on first render.
- Tier 0 (no WebGL, Save-Data on, or probe under 20fps) sends the user to `/lite` with a "Try 3D anyway" link.
- If FPS stays under target for 5 seconds during use, step down a tier at runtime (segments, DPR, anisotropy).

### Loading order
1. HTML with the SSR edition stamp and a DOM skeleton of the table drawn in CSS.
2. three.js and the scene code.
3. Table and umbrella.
4. Lo textures, with papers "dropping" onto the table as each one arrives.
5. Hi texture for a paper only when it is picked, plus a prefetch on pointerdown.
6. Audio after the stand is interactive.

Dispose the hi texture on PUTBACK so only one is resident at a time.

### Other rules
- Import drei components individually. No `Environment` or HDRIs. No postprocessing.
- Pause rendering on `visibilitychange` (hidden).
- Handle `webglcontextlost` by switching to `/lite` and keeping the user's state.
- Add a dev-only HUD (`?hud=1`) showing FPS, draw calls, triangles, texture memory, tier, and DPR. Put these numbers in every gate report.

---

## 9. Fallbacks, accessibility, SEO

### 9.1 `/lite`
A pure DOM version that also serves as the no-JS, low-end, and screen-reader experience:
- Front page images laid out on a CSS "table" with a slight perspective tilt.
- Tapping a page opens it full-screen with pinch-zoom and a list of its stories below.
- The same READ sheet and share flow as the 3D version.
- Server-rendered from the manifest.

### 9.2 Accessibility
- The canvas is `aria-hidden`. A parallel visually-hidden DOM list of papers and stories, kept in sync with the state, is fully keyboard navigable.
- Visible focus states throughout.
- Colour contrast meets AA on all DOM UI.
- Every page image has alt text: "{Paper} front page, {date}. Lead story: {headline}".

### 9.3 SEO and social
- `/` is server-rendered with today's lead headlines in the DOM. The OG image is The Daily Lantern's front page.
- `/p/[paper]/[date]` has its own OG image.
- `sitemap.xml` includes the archive dates.
- `/lab` is `noindex` and excluded from the sitemap.

---

## 10. Architecture and stack

- **App:** Next.js (current stable, App Router), TypeScript strict, pnpm, CSS Modules. Deployed on Vercel.
- **3D:** three, @react-three/fiber, @react-three/drei (selective imports), @use-gesture/react, zustand, detect-gpu.
- **Validation:** zod.
- **Dev only:** leva, @next/bundle-analyzer.
- **Pipeline:** tsx, fast-xml-parser, satori, @resvg/resvg-js, sharp, @napi-rs/canvas, drizzle-orm with drizzle-kit and the Neon serverless driver, @aws-sdk/client-s3 (for the R2 S3 API), p-limit.
- **Testing:** vitest for the pipeline, Playwright for the smoke test.
- **Analytics:** Umami (lightweight script) or Vercel Web Analytics. Pick one and log it.

### Repo layout
```
app/                      routes (Section 2.7) + api/revalidate
src/scene/                Stand.tsx, Table.tsx, Umbrella.tsx, Stones.tsx, Backdrop.tsx, CameraRig.tsx, lighting.ts
src/scene/paper/          Paper.tsx, paper.vert.glsl, paper.frag.glsl, paper.deform.glsl, springs.ts, paper.config.ts
src/state/                store.ts (state machine), history.ts (back button sync)
src/ui/                   ReadSheet, EditionStamp, SoundToggle, TiltChip, Hud, LiteView, A11yList
src/lib/                  manifest.ts, tier.ts, share.ts, analytics.ts, time.ts (WAT helpers)
pipeline/                 probe.ts, ingest.ts, normalise.ts, cluster.ts, categorise.ts, rank.ts,
                          compose.ts, templates/, classifieds/, weather.ts, halftone.ts,
                          upload.ts, manifest.ts, prune.ts, run.ts, fonts/
db/                       schema.ts, client.ts, migrations/
.github/workflows/        edition.yml, ci.yml
public/assets/            glb, ktx2, audio, grain
```

### Environment variables (`.env.example`)
`DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `NEXT_PUBLIC_MANIFEST_URL`, `REVALIDATE_SECRET`, `LAB_KEY`, `NEWSDATA_API_KEY` (optional), `ENABLE_PHOTOS`, `NEXT_PUBLIC_ANALYTICS_ID`.

The client never needs the database. It reads the manifest and images from the CDN. Only the pipeline writes.

---

## 11. Analytics events

Track: `stand_ready` (tier, ms), `paper_pick` (slug), `paper_held` (slug, seconds), `turnover`, `story_open` (slug, source), `outbound_click` (source), `share` (method: files, link, or download), `lite_fallback` (reason), `tier_step_down`, `perf_sample` (fps bucket, one per session). No personal data and no cookies beyond what the analytics tool needs.

---

## 12. Milestones

The estimate assumes part-time work alongside Onyi and studio work: about 4 weeks total. **The riskiest thing is built first.**

### M0: Foundation (half a day)
- Repo, tooling, `CLAUDE.md`, `PROGRESS.md`, `DECISIONS.md`, CI workflow (typecheck, lint, build, vitest), Vercel preview deploy, an empty R3F canvas, the perf HUD, and the tier detection skeleton.
- **Accept when:** the preview URL loads on a phone, the HUD shows numbers, and CI is green.

### M1: Paper Lab (3 to 5 days) — the riskiest piece
- `/lab/paper`: one paper with a static placeholder newspaper texture (a mock front page generated with any quick method).
- All deformation layers in 6.2, the springs, the material with show-through, the fold and unfold, TURNOVER, idle breeze, gyro opt-in, reduced motion, leva controls, and the Copy config button.
- Tier presets, tested with `?tier=low` on desktop.
- **Accept when:** held FPS meets the targets on the reference devices, there are no visual tearing or normal artifacts at the crease, and turnover is clean.
- **HUMAN GATE 1:** James tests on his phone and a low-end Android. The question is "Does this feel like real paper?" Iterate until he signs off, then commit the tuned values to `paper.config.ts`.

### M2: News pipeline (2 to 3 days)
- Probe script and report, ingest with etiquette, normalise, excerpt rules, dedupe, cluster, categorise, rank, the DB schema and migrations, the edition workflow (dry run without composing), and prune.
- Vitest coverage for: the 40-word excerpt limit, URL canonicalisation, clustering (fixture of near-duplicate headlines), ranking order, categorisation fallbacks, and HTML sanitising.
- **Accept when:** at least 6 healthy sources, 24 hours of scheduled runs without failure, `/lab/edition` (text mode) shows sensible clusters and leads, and the run time is logged.

### M3: Front page compositor (3 to 4 days)
- Six templates (front and back), fonts, text fitting, classifieds and notices generator, weather ear, halftone (behind the flag), R2 upload, manifest with zod validation, and the image version of `/lab/edition`.
- **Accept when:** every paper renders for 24 consecutive hourly runs with no overflow or clipping, images meet their size targets, and manifest validation passes.
- **HUMAN GATE 2:** James reviews the pages. Do they look like Nigerian papers he remembers? Are headlines readable when held on a phone? Are the classifieds funny and clearly fictional?

### M4: The Stand (3 to 4 days)
- Table, umbrella, stones, backdrop, lighting presets, a seeded layout, progressive texture loading, the full state machine (STAND, PICK, HELD, TURNOVER, PUTBACK), pan on narrow screens, history and back-button sync, and on-demand rendering.
- Integrate the M1 paper unchanged, reading its tuned config.
- **Accept when:** the perf budget table is met, the back button behaves as in 2.7, and there are no texture memory leaks over 20 pick and putback cycles (check the HUD).
- **HUMAN GATE 3:** James tests the full flow on his devices.

### M5: Read and share (2 days)
- Hit-testing, the READ sheet, outbound links, the Web Share API with files, OG images, deep links `/p/[paper]` and `/p/[paper]/[date]`, and `/about`.
- **Accept when:** sharing a front page to WhatsApp from Android shows the image, and deep links open straight into HELD.

### M6: Hardening (2 to 3 days)
- `/lite`, the a11y parallel DOM, reduced motion, context-loss handling, runtime tier step-down, sound and toggles, analytics events, SEO and sitemap, empty and error states (pipeline stale for more than 3 hours shows the last edition with its timestamp, never a blank stand), and a Playwright smoke test (load, pick, open story, back, back).
- Lighthouse on `/lite`: Performance 90 or above and Accessibility 95 or above.
- **Accept when:** everything above passes and the full device matrix (James's phone, a low-end Android, an iPhone if one can be borrowed, desktop Chrome and Safari) has been tested and recorded.

### M7: Launch prep (with James)
Covered in Section 13. Claude Code supports by producing launch-ready recordings with the HUD hidden, a press-kit page if wanted, and fixes from the soft launch.

---

## 13. Launch plan

1. **Name and domain** are decided and wired up before soft launch. Do not launch on a `vercel.app` URL. A memorable domain matters for sharing.
2. **Soft launch** (3 to 5 days): 15 to 25 people, including at least 5 who own low-end Androids. Watch `paper_held` time and `lite_fallback` rates. Fix the top issues.
3. **Assets:** 3 vertical screen recordings filmed on a real phone (not desktop):
   - picking a paper up and letting it flap
   - flicking it over to the back sports page
   - sharing a front page to WhatsApp Status
   
   Turn sound on for the recordings. The rustle sells it.
4. **Timing:** Tuesday to Thursday, **7:30 to 8:30am WAT**, which is when the papers used to come out. That framing is part of the story.
5. **Channels:**
   - an X post from DarkDev with the flap video, framed as part 2 of the Nigerian nostalgia series and quote-linked to the crown caps post
   - a short "how I built the paper physics" thread for dev and design Twitter
   - the same video on TikTok and Instagram Reels
   - WhatsApp, since front-page shares are the built-in loop
6. **Keep it alive:** a daily 7am post of The Daily Lantern's front page (manual at first, automate in v2). Each day's paper gives you new content for free.
7. **Studio tie-in:** a subtle footer and `/about` credit, "Built by James (DarkDev)", linking to adedamola.work. No hard sell.
8. **Success targets for week 1** (directional, adjust after soft launch): 10k unique visitors, a median held time over 20 seconds, 500 or more shares, and at least 2 inbound work inquiries.

---

## 14. v2 backlog (do not build in v1)

- Free readers: live presence ("14 free readers at the stand") using a cheap realtime counter. Show only real numbers, never fake ones.
- Inside pages and full double-page spreads, held in landscape.
- A magazine rack hanging from the stand (glossy, stiffer paper physics).
- An era switch (1995, 2005, today).
- "Buy" a paper to keep it in your own pile.
- A pools fixtures coupon mini-game.
- An original comic strip (commissioned).
- Naira exchange rate ear (needs a trustworthy source).
- Pidgin, Yoruba, Hausa, and Igbo papers.
- An automated daily front-page post.

---

## 15. Decisions for James (Claude Code: do not decide these)

1. **Name and domain.** "Paperstand" and the six mastheads are placeholders.
2. **Photos at launch (`ENABLE_PHOTOS`).** With photos, pages look much richer. Without them, there is less legal exposure from using publishers' images. Credited, linked thumbnails are common aggregator practice but are not risk-free. The default is off.
3. **Source balance.** Approve the final source list. Presenting news to the public means the mix should be balanced across regions and editorial leanings.
4. **NewsData.io fallback.** Read the current free-tier terms for public display before enabling it.
5. **3D assets.** Placeholders by Claude Code, or a commission (Rehoboth or another artist) for the table, umbrella, stones, and street plate. A co-post with an artist also helps the launch.
6. **Sound recordings.** Record your own newspaper rustles (recommended) or approve CC0 sources.
7. **Archive retention.** 90 days is the default.
8. **Analytics tool.** Umami or Vercel Web Analytics.

---

## 16. Risks

| Risk | Mitigation |
|---|---|
| Paper feel is uncanny | It is built first, with a human gate and a tuning lab |
| Feeds block bots or change URLs | Probe report, degraded status, multiple sources, NewsData fallback |
| Low-end performance | Tiering, runtime step-down, `/lite`, budgets checked every gate |
| Publisher complaint | Rights rules in 4.6, attribution, a takedown path within one run |
| Pipeline outage | Serve the last good edition with its timestamp, plus email alerts |
| Scope creep | v2 backlog; nothing outside Sections 2 to 11 gets built in v1 |
| Time pressure from Onyi and studio work | Milestones are independent and shippable; M1 alone is a shareable demo |
