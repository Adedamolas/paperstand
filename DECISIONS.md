# Decisions

Judgment calls where the spec is silent or ambiguous. Newest last.

## 2026-10-03: GitHub repo is public
- **Decision:** `Adedamolas/paperstand` is public.
- **Why:** spec 4.1 runs the edition pipeline hourly (~19 runs/day) in GitHub Actions. Public
  repos get unlimited Actions minutes, so the budget concern disappears. Matches `crown-caps`
  (part 1 of the series), which is public. No secrets live in the repo.
- **Alternatives:** private repo plus a minutes budget check.

## 2026-10-03: Next.js 16 with Turbopack, Node 24, ESLint 9 flat config
- **Decision:** current stable `create-next-app` output (Next 16.3.8, React 19.2), without Tailwind
  because the spec requires CSS Modules. Import alias `@/*` maps to the repo root.
- **Why:** spec says "current stable". Root alias keeps `app/`, `src/`, `pipeline/`, `db/`
  importable the same way.

## 2026-10-03: Design system adaptation
- **Decision:** DOM chrome uses the house motion tokens (easing, 140 to 280ms durations,
  transform/opacity only, reduced-motion clamp). The palette is newsprint (off-white stock, ink,
  wood, spot red) instead of the house indigo app palette. Dev HUD reuses the house dark-menu
  colours.
- **Why:** the spec's aesthetic is late-90s Nigerian newsprint. An app UI palette would break the
  illusion. The motion discipline still applies.

## 2026-10-03: Tier names and per-tier config
- **Decision:** tiers are `none | low | mid | high`. `none` is spec "Tier 0" (redirects to `/lite`
  in M6). Mid tier (not specified in the budget table) gets DPR [1, 1.75], antialias on,
  anisotropy 2, 28x40 segments, 45fps target.
- **Signals:** detect-gpu tier (0 to 3) mapped directly; `deviceMemory` of 2GB or less caps at
  low, 4GB or less caps at mid; `effectiveType` 2g caps at low; Save-Data or no WebGL gives `none`.
  `?tier=` overrides everything.
- **Note:** detect-gpu fetches its benchmark data from unpkg at runtime by default. Before launch,
  self-host the benchmark JSON under `public/` (`benchmarksURL`) to drop the third-party request.

## 2026-10-03: detect-gpu is dynamically imported
- **Why:** keeps it out of the initial JS for `/`. It loads in parallel with three.js.

## 2026-10-03: Canvas mounts only after tier detection
- **Why:** `antialias` and the DPR clamp are fixed when the WebGL context is created. The CSS table
  skeleton covers the gap. An FPS-probe verdict of `none` does not unmount the canvas; M6 handles
  the `/lite` redirect.

## 2026-10-03: HUD texture memory is an estimate
- **Decision:** the HUD shows `gl.info.memory.textures` (count) plus an estimate in MB summed from
  textures referenced by scene materials (RGBA8, with 4/3 for mip chains).
- **Why:** WebGL exposes no real GPU memory query. The estimate is enough to spot leaks across
  pick/putback cycles (M4 acceptance).

## 2026-10-03: M0 canvas renders continuously
- **Decision:** M0 uses `frameloop="always"` with a placeholder sheet so the HUD and FPS probe have
  real numbers. The stand switches to `frameloop="demand"` in M4 (spec Section 8).

## 2026-10-03: James's Section 15 answers
- **Photos at launch: ON.** `ENABLE_PHOTOS=true`. The spec 4.6 rules still apply: lead stories
  only, grayscale halftone, "Photo: {Source}" credit, suppressed on violence/tragedy keywords.
- **Source list:** James asked Claude to find sources. Candidate list and probe results are in
  `docs/SOURCES.md`, pending his approval of the final mix.
- **NewsData.io fallback: wanted.** James asked to see the terms first. Findings are in
  `docs/SOURCES.md`. The pipeline stays fully functional without `NEWSDATA_API_KEY`.
- **3D assets:** no commission. Use free CC0 models (Poly Haven) plus procedural geometry where
  nothing suitable exists (umbrella). Candidates in `docs/ASSETS.md`.
- **Sound:** CC0 sounds from the internet (Freesound CC0 via Openverse). Candidates in
  `docs/ASSETS.md`; each chosen file gets logged with its source URL.
- **Archive retention:** 90 days.
- **Analytics:** Vercel Web Analytics.
- **Name and domain:** pending (James says picked; waiting on the actual name and domain).

## 2026-10-03: Shaders live in `.glsl.ts` string modules
- **Decision:** `paper.deform.glsl.ts`, `paper.vert.glsl.ts`, `paper.frag.glsl.ts` export their GLSL
  as strings. `material.ts` concatenates the deformation chunk in front of the vertex shader and
  exports `paperVertexShader` for reuse by a future depth material.
- **Why:** Turbopack's built-in `type: 'raw'` rule compiled `import x from './a.glsl'` to `undefined`
  in Next 16.3.8, and `raw-loader` would be a non-spec dependency. String modules need no bundler
  config and work in vitest too. Still one shared deformation chunk, as spec 6.2 asks.

## 2026-10-03: Paper deformation as an integrated bend angle
- **Decision:** droop, the fold crease and the TURNOVER curl are one bend-angle function theta(t)
  integrated along the sheet from the grip line (midpoint rule, 6 to 8 steps per segment). Sag,
  curl, flap, air drag and breeze push along the resulting strip normal.
- **Why:** integrating the angle keeps the sheet inextensible, so a big droop or the fold never
  stretches the printed page. The crease is the same curve with a step of alpha spread over the
  arc length of the crease radius, so it is a true small-radius cylinder, not a hinge.
- **Fold closure:** 0.97 of pi, so the fold never closes perfectly and keeps a slight bulge.

## 2026-10-03: TURNOVER rotates about the centre, in two halves
- **Decision:** a turn rotates the sheet about its horizontal centre line. The held shape (sag,
  droop, curl, flap, grip offset) fades to flat as the sheet goes edge-on, then the second half runs
  in the mirrored frame (material y reversed) and the held shape rebuilds facing the viewer. The
  sheet curves into a C mid-turn so the free halves trail.
- **Why:** a rigid rotation about the grip line left the back page bowing toward the viewer,
  shifted up and visually bigger. This way the back page ends in exactly the front page's pose.
- **Back page orientation:** a flip about the horizontal axis would show the back page upside
  down, so the back texture is sampled with v reversed. Show-through samples the same physical
  point, so it stays physically consistent.

## 2026-10-03: Extra mesh rows around the fold line
- **Decision:** the paper mesh is a PlaneGeometry-style grid plus 8 extra rows packed within 2.4%
  of H around y = 0.
- **Why:** the crease radius (0.4% of H) is far smaller than a grid cell at any tier, so without
  extra rows the fold renders as one long hinge band with smeared normals. Cost: 8 rows of
  segX + 1 vertices.

## 2026-10-03: Flap impulse from grip acceleration
- **Decision:** the flap spring gets an impulse from the change in grip velocity each frame, not
  the velocity itself. Air drag (leading edges pushed back) handles steady motion.
- **Why:** a velocity impulse every frame pumps energy in during steady drags and the flap
  saturates. Acceleration makes starts, stops and shakes flap, which is what real paper does.

## 2026-10-03: leva is loaded only by /lab/paper
- **Decision:** leva is a devDependency imported only from the lab chunk (`next/dynamic`), so it is
  never in `/` or any user-facing route. It does ship in the key-gated production `/lab/paper` so
  James can tune on his phone against production.
- **Cost:** about 70KB gzip, lab route only.

## 2026-10-03: /lab gating
- **Decision:** `proxy.ts` returns 404 for `/lab/*` when `VERCEL_ENV=production` unless `?key=`
  matches `LAB_KEY`; a match sets an httpOnly cookie scoped to `/lab` for 30 days. Local dev and
  preview deploys are open (previews already sit behind Vercel login). `X-Robots-Tag: noindex`
  plus `robots` metadata on the lab layout.

## 2026-10-03: Lab conveniences
- `?fold=0..1&turn=0..2` jumps straight to a pose; `?reduced=1` forces reduced motion; keyboard
  Space or ArrowUp turns over, F folds. In the lab, "put back" folds the paper and lays it back
  along an arc as a preview of PICK/PUTBACK (the real transition belongs to the M4 stand).
- Reduced motion in the lab: a 250ms fold with a slight scale pulse instead of the full arc.

## 2026-10-03: Side grips wrap a vertical-axis cylinder (James's feedback)
- **Feedback:** the first tune read as a sheet held at its top and bottom.
- **References:** Wikimedia Commons photos of people reading newspapers (cafe, train, bench,
  Nigerian vendors). Common pattern: hands on the left and right edges a little above centre; the
  sheet curves around a vertical axis so the middle bows away and the vertical edges stay
  straight; the top corners flop over; the bottom hangs.
- **Decision:** grip sag is now an inextensible arc around the vertical axis (bow depth `sag` at
  the centre, hands draw closer as it deepens) instead of the spec's parabolic z offset; droop
  around the horizontal axis is cut to a light slump (0.14 rad) with the bottom hanging straight;
  corner curl favours the top corners (`curlBottom` 0.25). Key light moved to the upper left with
  less wrap so the bow shades across the width.
- **Why:** curvature in one direction stiffens a sheet against bending in the other, which is
  why a side-held broadsheet stays upright. The spec's formula is kept in spirit (sag bows the span
  between the hands away from the viewer).

## 2026-10-03: Specimen page redesign and OFL fonts
- **Feedback:** the layout and type did not look like a Nigerian paper.
- **Decision:** the lab specimen pages now follow the late-90s/2000s Nigerian daily look: colour
  teaser strap, ears with weather and price, misregistered blackletter masthead, red kicker,
  full-width Anton banner fitted to two lines, colour lead photo, coloured teaser rail, crowded
  notices, a colour ad for a fictional brand, and a green sports back page with a league table.
  Every block has a fixed vertical budget, so nothing overflows.
- **Fonts:** Anton, Oswald, UnifrakturMaguntia, Source Serif 4 (all OFL, licences committed) live
  in `public/fonts/` so the browser lab can load them; the M3 pipeline will read the same files
  rather than keeping a second copy in `pipeline/fonts/`.
- **FontFace family names** are plain identifiers (`PaperstandBody` etc.): Firefox parses the
  family as CSS and threw a SyntaxError on "Source Serif 4". Fonts that fail to load now fall back
  to system fonts instead of breaking the page.

## 2026-10-05: Upgrade direction (James, after reviewing the lab with references)
- James added `references/` (Nigerian kiosks with papers pegged on strings, fanned table stacks,
  a side-held open paper, PM News 2001, New Nigerian 1970, The Guardian 2016) and asked for real,
  up-to-date news, a real stand, the unstack-lift-unfold pick ritual, and a side grip that reads.
- **Order of work:** real news first (M2 + M3 pulled forward), then the hold, then the stand
  (M4). People around the stand come later as flat cut-out figures.
- **Held paper:** front and back only, as the spec's v1 (James).

## 2026-10-05: Vercel Blob instead of Cloudflare R2 + Neon (James)
- **Decision:** one public Vercel Blob store, `paperstand-editions` (lhr1, closest to Lagos).
  Page images are content-hashed (`pages/{sha256-16}.webp`, `max-age=31536000, immutable`);
  manifests at `editions/latest.json` and `editions/{date}.json` (`max-age=60`).
- **No database:** the pipeline keeps its state (feed ETags, failure counts, robots.txt, a 48-hour
  article window, revisions, edition file lists) as `state/pipeline.json` in the same store.
  Clustering only needs 36 hours, so a 48-hour window replaces the spec's 14-day article table.
- **Why:** James chose to ship real news today rather than wait on new accounts. R2 stays the
  plan if bandwidth at viral scale makes Blob expensive.
- **Dependency cost:** `@vercel/blob` runs only in the pipeline; the client fetches plain URLs.

## 2026-10-05: Pages drawn with @napi-rs/canvas, not Satori + resvg
- **Decision:** the compositor draws pages directly with `@napi-rs/canvas` (already in the spec's
  pipeline deps for measuring) and converts with sharp. `satori` and `@resvg/resvg-js` are not used.
- **Why:** the spec measures text with canvas because Satori cannot; Satori then wraps text by its
  own rules, so measurement and render can disagree. Drawing with the measuring canvas makes them
  identical, supports justified columns and halftone dots directly, and is simpler.

## 2026-10-05: Photos on, halftoned (James's Section 15 answer)
- Lead photos only, fetched from the feed's media tags, grayscale, 45 degree halftone screen,
  "Photo: {Source}" credit. Suppressed for violence or tragedy keywords in headline or excerpt.
  Publisher logos posing as item images are filtered out.

## 2026-10-05: Feed handling details
- **Redirected category feeds are not trusted:** Punch redirects its topic feeds to its general
  feed for our user agent, which mislabelled general news as entertainment. A redirected
  category feed is categorised like a main feed.
- **Section tags only:** feed tags include people and places; only short section-style tags
  decide the category. When one story arrives from several feeds, the best-founded category wins.
- **Headline labels:** "BREAKING:", "JUST IN -", "| Watch Trailer" are dropped from headlines.
  The headline's own words are never changed (hard rule 4.6.3).
- **Excerpts:** "Read More: <url>" and "The post ... appeared first on ..." are stripped before the
  40-word cut.

## 2026-10-05: Page design and budgets
- Old Nigerian daily look from the references: yellowed stock, black ink with one spot colour,
  index strip, masthead ears (real Lagos weather from Open-Meteo, price, edition number), a huge
  Anton banner, standfirst in bold serif, justified excerpts with source lines and "Cont'd on
  page X", a briefs row, three fictional notices and a fictional ad. A footer states that the
  paper is fictional and every story links to its publisher.
- Stories flow down columns until full (no fixed slot sizes), so pages stay crowded.
- Image sizes after tuning (WebP q70 hi, q62 lo): fronts 214 to 301KB hi, 49 to 61KB lo; backs
  with a halftone photo 335 to 382KB hi, 63 to 73KB lo. Fronts meet the spec targets; photo backs
  are about 40% over the 250KB hi target because halftone dots compress poorly. Acceptable for
  now since only one hi texture is loaded at a time.
- Run time: 81.5s locally for a full edition (spec budget 120s).
- Fonts are static TTF cuts (Oswald and Source Serif 4 from their upstream repos) because the
  canvas renderer does not reliably select weights from variable fonts.

## 2026-10-05: No hands (James)
- Stylised hands were built and shown, and James asked for them to be removed. The spec's rule
  stands: hands are implied, never shown. The grip is suggested by the side-edge pinch (a thumb
  dent with radiating wrinkles at each grip point, `pinch` in paper.config.ts), the vertical-axis
  bow, and the top corners flopping.

## 2026-10-05: The stand (M4, from James's references)
- **Kiosk instead of an umbrella:** the references show a plank kiosk with a zinc roof and papers
  pegged on a string across its front, so that is the stand. Procedural placeholders (planks,
  zinc, posts, string, pegs) with CC0 Poly Haven textures (`rough_wood`, `corrugated_iron`,
  `wood_table_worn`, 512px WebP, about 80KB together). Swappable for modelled assets later.
- **Two places papers live:** the six papers lie folded in two shingled rows on the table (each
  partly under its right-hand neighbour, the front row over the back row's lower edge, so every
  masthead shows), and four of them hang open on the string. Either can be picked.
- **Pick ritual:** a covered paper first slides left out from under its neighbour (280ms), then
  lifts in an arc toward the buyer while it unfolds and turns to face them (760ms). Put-back
  reverses it, turning back to the front page first if the back is showing.
- **Camera:** 40 degree FOV on the stand, pitched 31 degrees down so the pegged papers and the
  table both show (the spec's 50 to 55 degrees assumed a table-only stand). Portrait phones see
  about a paper and a half and swipe to pan; wide screens see the whole stand.
- **History entry on PICK, not HELD:** pressing back mid-lift otherwise left the site, because no
  entry had been pushed yet. Back now always puts the paper down first.
- **Textures:** each paper's lo front and back load up front (12 small WebPs); hi textures load
  on pointerdown/pick and are disposed when the paper is back on the table (verified in the HUD:
  47MB held, 31.5MB back on the stand).
- **Render on demand:** `frameloop="demand"` on the stand with 15fps breeze ticks; continuous
  frames only while a paper is moving or held.
- **Lint scope:** `react-hooks/immutability` is off for `src/scene/**` only, where three.js
  objects are mutated per frame by design.
- **Server rendering:** `/` and `/p/[paper]` fetch the manifest on the server (revalidate 60s), so
  the edition stamp and every paper's headlines (as links to the publishers) are in the HTML.
- **New dependency:** `server-only` (0KB client cost; build-time guard).
