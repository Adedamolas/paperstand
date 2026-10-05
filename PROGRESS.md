# Progress

Checklist from spec Section 12. One box per acceptance criterion. Gate reports at the bottom.

## M0: Foundation
- [x] Repo, tooling (Next 16, TS strict, pnpm, ESLint, vitest)
- [x] `CLAUDE.md`, `PROGRESS.md`, `DECISIONS.md`
- [x] CI workflow (typecheck, lint, test, build)
- [x] Vercel preview deploy
- [x] Empty R3F canvas
- [x] Perf HUD (`?hud=1`)
- [x] Tier detection skeleton
- [x] **Accept:** preview URL loads on a phone
- [ ] **Accept:** HUD shows numbers
- [x] **Accept:** CI is green

## M1: Paper Lab
- [x] `/lab/paper` with a placeholder newspaper texture
- [x] Deformation layers: fold, grip sag, droop, corner curl, flap, breeze, turn
- [x] Finite-difference normals; shared `paper.deform.glsl`
- [x] Springs (grip, body, flap, sag/droop)
- [x] Material: wrap Lambert, show-through, grain, `gl_FrontFacing`, mipmaps, anisotropy
- [x] Fold and unfold, TURNOVER, idle breeze
- [x] Gyro opt-in chip (iOS permission from a tap)
- [x] Reduced motion
- [x] leva controls (dev only) and "Copy config"
- [ ] Tier presets, tested with `?tier=low`
- [x] `/lab/*` gated by `LAB_KEY` in production, `noindex`
- [ ] **Accept:** held FPS meets targets on reference devices (55 high, 30 low)
- [ ] **Accept:** no tearing or normal artifacts at the crease
- [ ] **Accept:** turnover is clean
- [ ] **HUMAN GATE 1:** James signs off "feels like real paper"; tuned values committed

## M2: News pipeline
- [x] Feed probe (results in `docs/SOURCES.md`; live health logged every run)
- [x] Ingest with etiquette (UA, conditional GET, timeout, concurrency 4, robots.txt, degraded)
- [x] Normalise, excerpt (40 words max), dedupe, cluster, categorise, rank
- [x] State in Blob instead of a DB (DECISIONS.md 2026-10-05)
- [x] `edition.yml` workflow (dry run without composing), prune
- [x] Tests: 40-word excerpt limit
- [x] Tests: URL canonicalisation
- [x] Tests: clustering fixture of near-duplicate headlines
- [x] Tests: ranking order
- [x] Tests: categorisation fallbacks
- [x] Tests: HTML sanitising
- [x] **Accept:** at least 6 healthy sources
- [ ] **Accept:** 24 hours of scheduled runs without failure
- [ ] **Accept:** `/lab/edition` (text mode) shows sensible clusters and leads
- [x] **Accept:** run time logged

## M3: Front page compositor
- [x] Six templates (front and back), OFL fonts committed
- [x] Text fitting with `@napi-rs/canvas`
- [x] Classifieds and notices generator
- [x] Weather ear (Open-Meteo)
- [x] Halftone behind `ENABLE_PHOTOS`
- [x] Blob upload with content-hashed names (Vercel Blob, see DECISIONS.md)
- [x] Manifest with zod validation
- [ ] `/lab/edition` image mode
- [ ] Masthead name collision check logged
- [ ] **Accept:** every paper renders for 24 consecutive hourly runs with no overflow or clipping
- [ ] **Accept:** images meet size targets (lo 60KB or less, hi 250KB or less)
- [x] **Accept:** manifest validation passes
- [ ] **HUMAN GATE 2:** James reviews pages (look, readability on phone, classifieds)

## M4: The Stand
- [x] Table, kiosk (instead of umbrella), stones, backdrop (placeholders, swappable)
- [x] Lighting presets by WAT hour (cross-fade within a session still to do)
- [x] Seeded layout from edition date
- [ ] Progressive texture loading (papers drop in)
- [x] State machine: STAND, PICK, HELD, TURNOVER, PUTBACK
- [x] Pan on narrow screens
- [x] History and back-button sync
- [x] On-demand rendering (breeze ticks at 15fps)
- [x] M1 paper integrated unchanged
- [ ] **Accept:** perf budget table met
- [x] **Accept:** back button behaves as in spec 2.7
- [ ] **Accept:** no texture memory leak over 20 pick/putback cycles
- [ ] **HUMAN GATE 3:** James tests the full flow on his devices

## M5: Read and share
- [ ] Hit-testing against undeformed plane
- [ ] READ sheet with outbound link
- [ ] Web Share API with files, link and download fallbacks
- [ ] OG images
- [x] Deep link `/p/[paper]` (archive `/p/[paper]/[date]` still to do)
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

## M0 report (2026-10-03)

**Built:** Next 16 app shell; CSS table skeleton plus a server-rendered edition stamp (WAT);
R3F canvas (lazy-loaded) with a placeholder sheet; tier detection (detect-gpu, deviceMemory,
Save-Data, effectiveType, `?tier=` override, 2s FPS probe); dev HUD at `?hud=1`; WAT helpers with
tests; CI (typecheck, lint, test, build); Vercel project connected to GitHub.

**URLs**
- Public: https://paperstand.vercel.app (add `?hud=1`)
- PR preview (Vercel login required): https://paperstand-git-m0-foundation-adedamolas-projects-f4d6018e.vercel.app
- PR: https://github.com/Adedamolas/paperstand/pull/1

**What James should test on his phone**
1. Open https://paperstand.vercel.app/?hud=1. You should see a striped canopy, a wooden table, a
   swaying cream sheet, and the edition stamp bottom right.
2. Check that the HUD shows non-zero fps, calls, tris, the detected tier, and your GPU name. Send
   a screenshot of the HUD; the numbers become the baseline for M1.
3. Repeat with `?hud=1&tier=low`; the tier should read `low*`.

**Numbers**
- Initial JS on `/`: 172KB gzip (budget 320KB). three.js and detect-gpu are not in it.
- HUD (headless SwiftShader, desktop): tier `mid`, DPR 1. Real-device numbers pending James's phone.

**Known issues**
- The placeholder sheet is not yet fitted analytically to the viewport (M1, spec 6.5).
- detect-gpu fetches benchmark data from unpkg; to be self-hosted before launch (DECISIONS.md).
- Vercel functions default to `iad1`. Pages are mostly served from the CDN cache; revisit the
  region when the revalidate webhook lands (M2/M3).
