# Start Here — your personal map of WebTrace

*This doc is written for you (the project owner), not for GitHub. It explains
what this project is, how to think about it, and how to work on it without
re-deriving everything every time.*

## The one-sentence version

WebTrace sits between "raw network log" and "human understanding": the browser
tells it what happened on the wire, and WebTrace turns that into a flow graph
and honest step-by-step explanations.

## The three big ideas (never lose these)

1. **DevTools asks "what happened?" — WebTrace asks "why, and what next?"**
   Everything in the product serves that question: the flow graph, the "Why
   did this happen?" stories, Learning Mode.

2. **Observed vs Derived — the honesty doctrine.** A browser extension cannot
   see DNS packets, TLS handshakes, or which line of JavaScript called
   `fetch()`. WebTrace labels every fact and every graph edge:
   - `OBSERVED` — the browser itself reported it
   - `DERIVED` — WebTrace inferred it (and says so)
   - `INSTRUMENTED` — (future) came from optional local instrumentation
   This is not a limitation to hide; it's a feature. It builds trust and it
   *teaches* what tools can and cannot know.

3. **The brain is separate from the body.** All logic lives in
   `packages/core` (pure TypeScript, no browser APIs, fully unit tested).
   `apps/extension` is just "pipes and paint": listeners that feed events in,
   React that renders the result. Because of this, everything downstream
   (docs site, CLI, backend tracer) can reuse the same brain.

## The 30-second architecture

```
Chrome webRequest ─┐
                   ├─► normalizers (redact!) ─► TraceEvent stream
Chrome webNavigation ┘                              │
                                                    ▼
                                     SessionManager (per tab, background)
                                     · in-memory buffer
                                     · RequestCorrelator → records
                                     · batched IndexedDB writes
                                     · broadcasts over a runtime Port
                                                    │
                                                    ▼
                                     Side panel (React)
                                     · replays events through its own
                                       RequestCorrelator
                                     · renders Flow / Requests / Timeline
                                     · explain engine → "Why?" stories
```

## How to run / verify everything

| What | Command |
| --- | --- |
| Dev mode (hot reload) | `pnpm dev` → load `.output/chrome-mv3` from `chrome://extensions` |
| Production build | `pnpm build` |
| Core unit tests | `pnpm test` |
| Typecheck everything | `pnpm typecheck` |
| Full E2E (real browser!) | `pnpm e2e` (needs `pnpm --filter webtrace-e2e browsers` once) |
| Demo traffic site | `node tests/fixtures/demo-site/server.mjs` → http://localhost:4173 |
| Regenerate icons | `pnpm icons` |

## Where to read next

- [01-ARCHITECTURE.md](01-ARCHITECTURE.md) — the layers in detail, with the
  data model and the pipeline diagram.
- [02-CODE-TOUR.md](02-CODE-TOUR.md) — every file, what it does, why it exists.
- [03-HOW-THE-TRICKS-WORK.md](03-HOW-THE-TRICKS-WORK.md) — redirect chains,
  preflight pairing, third-party classification, timing approximations, and
  what webRequest genuinely cannot see.
- [04-ROADMAP.md](04-ROADMAP.md) — where this is going (v0.1 → v1.0).
- [05-COMMIT-PLAN.md](05-COMMIT-PLAN.md) — the commit history we executed
  (verify with `git log --oneline`).
- [06-LOADING-AND-DEBUGGING.md](06-LOADING-AND-DEBUGGING.md) — practical
  loading, reloading, and debugging recipes.

## The two UIs

- **Side panel** (`sidepanel.html`) — compact, lives next to the page.
  Flow / Requests / Timeline + details drawer.
- **Dashboard** (`dashboard.html`, opened from the popup or the ↗ button) —
  the full experience: Overview charts, the same three views on a big canvas,
  the Third-Party Map, the Learn curriculum, and Sessions (replay any stored
  capture). Both UIs render the *same* shared view components — they are two
  windows onto one engine.
