# Development

## Setup

```bash
git clone https://github.com/uzairr-arif/WebTrace.git
cd WebTrace
pnpm install
pnpm build          # builds core + extension into apps/extension/.output/chrome-mv3
```

Load it in any Chromium browser:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select `apps/extension/.output/chrome-mv3`

Hot-reload development:

```bash
pnpm dev            # wxt dev — rebuilds and reloads the extension as you edit
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Extension dev mode with reload |
| `pnpm build` | Production build (core + extension) |
| `pnpm test` | Vitest suites in `packages/core` |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm e2e` | Playwright: loads the extension, drives the fixture site |
| `pnpm icons` | Regenerate extension icons from `scripts/build-icons.mjs` |
| `node tests/e2e/screenshot.mjs` | Capture themed README/website screenshots |

Playwright browsers are installed with `pnpm --filter webtrace-e2e browsers`
(one time). The E2E launches a headed Chromium; on CI it runs under `xvfb-run`
(see `.github/workflows/ci.yml`).

## Project layout

```
webtrace/
├── apps/extension/            # the MV3 extension (WXT + React + Tailwind v4)
│   ├── entrypoints/
│   │   ├── background/        # capture: webRequest + webNavigation, sessions,
│   │   │                      #   IndexedDB persistence, ports, messaging
│   │   ├── sidepanel/         # compact UI (Flow / Requests / Timeline)
│   │   ├── dashboard/         # full-page UI (Overview / Flow / Requests /
│   │   │                      #   Timeline / Third-Party Map / Learn / Sessions)
│   │   ├── popup/             # mini dashboard + quick actions
│   │   └── options/           # theme, accent, learning mode, data controls
│   ├── components/            # shared UI (theme provider, badges, terms,
│   │   └── views/             #   Flow/Requests/Timeline/FilterBar/DetailsDrawer)
│   ├── lib/                   # message protocol, settings, trace client hook
│   └── theme/                 # design tokens (dark/light/accent)
├── apps/website/              # static landing page (no build step)
├── packages/core/             # the brain — pure TypeScript, zero browser APIs
│   └── src/
│       ├── events/            # TraceEvent model + browser-event translators
│       ├── redaction/         # ingestion-time privacy gate
│       ├── correlation/       # events → RequestRecords, navigations, stats
│       ├── graph/             # records → flow graph + layered layout
│       ├── timeline/          # records → waterfall phases
│       ├── explain/           # "Why?" stories, glossary, net-error notes
│       ├── learning/          # lessons + quizzes
│       └── filters/           # mini query language
├── tests/
│   ├── fixtures/demo-site/    # local site firing "interesting" traffic
│   └── e2e/                   # Playwright + screenshot tooling
└── docs/                      # architecture, development, privacy
```

## The demo fixture

```bash
node tests/fixtures/demo-site/server.mjs
# → http://localhost:46001   (the "site")
# → http://localhost:46002   (cross-origin API, for the CORS preflight)
```

The page deliberately fires everything WebTrace explains: HTML → CSS (ETag
revalidation → 304 on reload) → JS → JSON APIs → XHR → a 404 → a 500 → a
301→302 redirect chain → a preflighted cross-origin POST. Point WebTrace at
it and every view has something honest to show.

## Debugging recipes

| What | Where |
| --- | --- |
| Background service worker | `chrome://extensions` → WebTrace → **service worker** |
| Side panel / dashboard | Right-click inside the page → **Inspect** |
| Popup | Right-click the toolbar icon → **Inspect popup** |
| Stored traces | DevTools → Application → IndexedDB → `webtrace` → `sessions` |
| Settings | DevTools → Application → Storage → `chrome.storage.local` |

Common issues:

- **"NO TAB" in the side panel** — browse a page and reopen the panel; it
  falls back to the most recently active session.
- **Requests missing** — check the search box and filter chips;
  `chrome-extension://` pages are intentionally never traced.
- **Service worker killed mid-session** — expected MV3 behavior; sessions
  restore from IndexedDB when a UI re-attaches.
- **WXT build fails after dependency changes** — run `pnpm install` and
  `pnpm --filter webtrace-extension exec wxt prepare`.

## Ground rules

1. **The honesty doctrine is not negotiable.** Anything the UI claims is
   labeled `observed` or `derived` correctly. When unsure, say derived.
2. **Privacy is architecture, not a policy.** Redaction happens at ingestion
   (`packages/core/src/redaction`); bodies are never captured; nothing leaves
   the device.
3. **Core stays pure.** `packages/core` must not import browser APIs — it is
   unit-tested with synthetic event streams only.
4. **Explain before you add.** Features should teach something, not just
   display more metadata.

More on the inference rules and their limits:
[architecture.md](architecture.md).
