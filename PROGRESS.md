# Progress

Checklist from spec Section 12. One box per acceptance criterion. Gate reports at the bottom.

## M0: Foundation
- [x] Repo, tooling (Next 16, TS strict, pnpm, ESLint, vitest)
- [x] `CLAUDE.md`, `PROGRESS.md`, `DECISIONS.md`
- [x] CI workflow (typecheck, lint, test, build)
- [ ] Vercel preview deploy
- [x] Empty R3F canvas
- [x] Perf HUD (`?hud=1`)
- [x] Tier detection skeleton
- [ ] **Accept:** preview URL loads on a phone
- [ ] **Accept:** HUD shows numbers
- [ ] **Accept:** CI is green

## M1: Paper Lab
- [ ] `/lab/paper` with a placeholder newspaper texture
- [ ] Deformation layers: fold, grip sag, droop, corner curl, flap, breeze, turn
- [ ] Finite-difference normals; shared `paper.deform.glsl`
- [ ] Springs (grip, body, flap, sag/droop)
- [ ] Material: wrap Lambert, show-through, grain, `gl_FrontFacing`, mipmaps, anisotropy
- [ ] Fold and unfold, TURNOVER, idle breeze
- [ ] Gyro opt-in chip (iOS permission from a tap)
- [ ] Reduced motion
- [ ] leva controls (dev only) and "Copy config"
- [ ] Tier presets, tested with `?tier=low`
- [ ] `/lab/*` gated by `LAB_KEY` in production, `noindex`
- [ ] **Accept:** held FPS meets targets on reference devices (55 high, 30 low)
- [ ] **Accept:** no tearing or normal artifacts at the crease
- [ ] **Accept:** turnover is clean
- [ ] **HUMAN GATE 1:** James signs off "feels like real paper"; tuned values committed

## M2: News pipeline
- [ ] `pipeline/probe.ts` and `pipeline/probe-report.md`
- [ ] Ingest with etiquette (UA, conditional GET, timeout, concurrency 4, robots.txt, degraded)
- [ ] Normalise, excerpt (40 words max), dedupe, cluster, categorise, rank
- [ ] DB schema and migrations (Drizzle, Neon)
- [ ] `edition.yml` workflow (dry run without composing), prune
- [ ] Tests: 40-word excerpt limit
- [ ] Tests: URL canonicalisation
- [ ] Tests: clustering fixture of near-duplicate headlines
- [ ] Tests: ranking order
- [ ] Tests: categorisation fallbacks
- [ ] Tests: HTML sanitising
- [ ] **Accept:** at least 6 healthy sources
- [ ] **Accept:** 24 hours of scheduled runs without failure
- [ ] **Accept:** `/lab/edition` (text mode) shows sensible clusters and leads
- [ ] **Accept:** run time logged

## M3: Front page compositor
- [ ] Six templates (front and back), OFL fonts committed
- [ ] Text fitting with `@napi-rs/canvas`
- [ ] Classifieds and notices generator
- [ ] Weather ear (Open-Meteo)
- [ ] Halftone behind `ENABLE_PHOTOS`
- [ ] R2 upload with content-hashed names
- [ ] Manifest with zod validation
- [ ] `/lab/edition` image mode
- [ ] Masthead name collision check logged
- [ ] **Accept:** every paper renders for 24 consecutive hourly runs with no overflow or clipping
- [ ] **Accept:** images meet size targets (lo 60KB or less, hi 250KB or less)
- [ ] **Accept:** manifest validation passes
- [ ] **HUMAN GATE 2:** James reviews pages (look, readability on phone, classifieds)

## M4: The Stand
- [ ] Table, umbrella, stones, backdrop (placeholders, swappable)
- [ ] Lighting presets by WAT hour, cross-fade
- [ ] Seeded layout from edition date
- [ ] Progressive texture loading (papers drop in)
- [ ] State machine: STAND, PICK, HELD, TURNOVER, PUTBACK
- [ ] Pan on narrow screens
- [ ] History and back-button sync
- [ ] On-demand rendering (breeze ticks at 15fps)
- [ ] M1 paper integrated unchanged
- [ ] **Accept:** perf budget table met
- [ ] **Accept:** back button behaves as in spec 2.7
- [ ] **Accept:** no texture memory leak over 20 pick/putback cycles
- [ ] **HUMAN GATE 3:** James tests the full flow on his devices

## M5: Read and share
- [ ] Hit-testing against undeformed plane
- [ ] READ sheet with outbound link
- [ ] Web Share API with files, link and download fallbacks
- [ ] OG images
- [ ] Deep links `/p/[paper]` and `/p/[paper]/[date]`
- [ ] `/about`
- [ ] **Accept:** sharing a front page to WhatsApp from Android shows the image
- [ ] **Accept:** deep links open straight into HELD

## M6: Hardening
- [ ] `/lite`
- [ ] A11y parallel DOM
- [ ] Reduced motion (full app)
- [ ] Context-loss handling
- [ ] Runtime tier step-down
- [ ] Sound and toggles
- [ ] Analytics events
- [ ] SEO and sitemap
- [ ] Empty and error states (stale pipeline shows last edition with timestamp)
- [ ] Playwright smoke test (load, pick, open story, back, back)
- [ ] **Accept:** Lighthouse `/lite` Performance 90 or above
- [ ] **Accept:** Lighthouse `/lite` Accessibility 95 or above
- [ ] **Accept:** device matrix tested and recorded

## M7: Launch prep
- [ ] Name and domain wired up
- [ ] Recordings with HUD hidden
- [ ] Soft launch fixes

---

# Gate reports
