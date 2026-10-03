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
