# Paperstand

The Nigerian roadside newspaper stand, on the web. Today's real Nigerian news laid out as
physical newsprint: pick a paper off the vendor's table, hold it, feel it flop and flap.

Part 2 of the Nigerian nostalgia series, after [crown caps](https://github.com/Adedamolas/crown-caps).
Built by James (DarkDev).

## Develop

```bash
pnpm install
pnpm dev            # http://localhost:3000  (add ?hud=1 for the perf HUD, ?tier=low to force a tier)
pnpm test           # vitest
pnpm check          # typecheck + lint + build
```

Copy `.env.example` to `.env.local` as needed. The client reads only the edition manifest and
images from the CDN; only the pipeline touches the database.

## Docs
- [`docs/PAPERSTAND_SPEC.md`](docs/PAPERSTAND_SPEC.md): the build spec (source of truth)
- [`PROGRESS.md`](PROGRESS.md): milestone checklist and gate reports
- [`DECISIONS.md`](DECISIONS.md): judgment calls

All stories are credited and linked to their publishers. Paperstand is not affiliated with any
publisher, and its mastheads are fictional.
