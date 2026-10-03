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
