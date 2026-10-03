@AGENTS.md

# Paperstand

A web recreation of the Nigerian roadside newspaper stand: today's real Nigerian news as
physical newsprint you pick up, hold, and flap.

**Source of truth: [`docs/PAPERSTAND_SPEC.md`](docs/PAPERSTAND_SPEC.md).** Read it before working.
Progress lives in `PROGRESS.md`, judgment calls in `DECISIONS.md`.

## Protocol (spec Section 0)
- One milestone at a time, in order. One branch per milestone (`m1-paper-lab`, ...), merged to
  `main` when its acceptance criteria pass.
- Stop at every HUMAN GATE: write a gate report at the bottom of `PROGRESS.md` (what was built,
  preview URL, what James should test on his phone, known issues, bundle size, HUD numbers).
- Before every commit: `pnpm check` (typecheck + lint + build) and `pnpm test`.
  Conventional, small commits (`feat:`, `fix:`, `perf:`, `chore:`).
- Only Section 10 dependencies. Anything else needs a `DECISIONS.md` entry with gzipped cost.
- When the spec is silent: (1) the paper feels real, (2) it runs well on a low-end Android,
  (3) simplest. Log it and keep going. Only stop for Section 15 decisions.
- No em dashes in user-facing copy. Never commit secrets; keep `.env.example` current.

## Hard rules (spec 4.6)
- Store/display only headline, excerpt of 40 words or fewer, source name, timestamp, link.
- Every story carries its source. No AI rewriting or summarising of news.
- Fictional mastheads only. `ENABLE_PHOTOS` defaults to false.
- Sanitise all feed text; never `dangerouslySetInnerHTML`.

## Conventions
- Next.js 16 App Router, TypeScript strict, pnpm, CSS Modules (no Tailwind). Import alias
  `@/` is the repo root, so source imports look like `@/src/lib/tier`.
- All dates/hours are WAT (`Africa/Lagos`); use `src/lib/time.ts`.
- 3D: import drei components individually. No `Environment`, HDRIs, or postprocessing.
- Tier config (`src/lib/tier.ts`) decides DPR, antialias, anisotropy and mesh segments.
  Paper tuning constants live in `src/scene/paper/paper.config.ts`.
- Dev HUD: append `?hud=1`. Force a tier: `?tier=low|mid|high|none`.
- UI chrome follows the house motion tokens in `app/globals.css` (ease-out, durations
  140 to 280ms, transform/opacity only). The page aesthetic is newsprint, not app UI.
