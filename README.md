# WebTrace — Web Request Flow Explorer

> **See how the web actually works.**

WebTrace is an open-source browser extension that turns network activity into
an interactive, explainable story. DevTools tells you *what happened* — a
request, a status, a duration. WebTrace tells you *what happened → why → who
initiated it → what came next* — in a compact side panel or a full dashboard.

```
PAGE LOAD
   │
   ├──► styles.css
   ├──► app.js
   │        │
   │        ▼
   │   fetch("/api/products") ──► 200 OK ──► JSON ──► UI updated
   │
   └──► logo.svg
```

Every node is clickable. Every explanation is tagged **OBSERVED** (the browser
reported it) or **DERIVED** (WebTrace inferred it) — WebTrace never pretends to
see more than it can.

## Features

- **Live Flow** — an interactive graph that builds itself as a page loads:
  documents, scripts, styles, fonts, API calls, redirects and CORS preflights,
  connected by honest edges.
- **Full dashboard** — a complete page with Overview charts (requests over
  time, categories, status mix, top hosts), the flow, request explorer,
  timeline, a **Third-Party Map**, stored **Sessions** you can replay, and the
  **Learn** tab.
- **Request Explorer** — every request with status, initiator context, timing
  breakdown and redacted headers, searchable with a mini query language
  (`status:500`, `type:api`, `third-party:true`).
- **Timeline** — a waterfall with queued / waiting / download phases plus
  replay at 1×, 2×, 4×.
- **Explain** — "Why did this happen?" stories for redirects, CORS preflights,
  401s, 404s, network failures, cache revalidation and more.
- **Learning Mode** — glossary tooltips (CORS, TLS, DNS, 304…) over real
  traffic, plus an 8-lesson curriculum with quizzes and progress tracking.
- **Privacy-first** — 100% local. No account, no cloud, no request/response
  bodies ever captured, sensitive headers masked at ingestion.

## Quick start

```bash
pnpm install
pnpm --filter webtrace-extension exec wxt prepare   # already run by install
pnpm build          # builds core + extension into apps/extension/.output/chrome-mv3
```

Then in Chrome / Edge:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select `apps/extension/.output/chrome-mv3`
4. Browse any site → click the WebTrace icon → **Open Live Flow**

For development with hot reload:

```bash
pnpm dev            # wxt dev — reloads the extension as you edit
```

## Development

```bash
pnpm test           # Vitest suites in packages/core (correlation, redaction, explain…)
pnpm typecheck      # tsc --noEmit across the workspace
pnpm e2e            # Playwright: loads the extension, drives tests/fixtures/demo-site
node scripts/build-icons.mjs   # regenerate extension icons
```

## Repository layout

```
webtrace/
├── apps/extension/        # the MV3 extension (WXT + React + Tailwind v4)
│   └── entrypoints/       # background · popup · sidepanel · dashboard · options
├── apps/website/          # the project landing page (static, deploy anywhere)
├── packages/core/         # the brain — pure TypeScript, zero browser APIs
│   └── src/               # events · correlation · graph · timeline · explain · learning · filters · redaction
├── tests/
│   ├── fixtures/demo-site # local site that fires "interesting" traffic
│   └── e2e/               # Playwright end-to-end + product screenshots
├── docs/                  # architecture, code tour, roadmap, commit plan
└── .github/               # CI, issue/PR templates
```

Screenshots from the running product live in
[docs/screenshots/](docs/screenshots) and on the
[website](apps/website/index.html).

## Roadmap

| Version | Theme | Status |
| --- | --- | --- |
| v0.1 | Network Observer + Flow + Explain (this release) | ✅ |
| v0.2 | Richer correlation (CDP mode for initiator stacks & precise timing) | planned |
| v0.3 | WebSocket & SSE views | planned |
| v0.4 | Learning Mode curriculum: lessons, challenges, quizzes | planned |
| v0.5 | Export (`.webtrace.json`, HTML report), compare & regression detection | planned |
| v0.6 | `@webtrace/node` — optional local backend tracing (browser → API → DB) | planned |
| v1.0 | Public release — Chrome Web Store, Edge Add-ons | planned |

See [docs/04-ROADMAP.md](docs/04-ROADMAP.md) for the full story.

## Privacy

**Your browsing data stays on your device. By default and by design.**

- No cloud, no account, no telemetry.
- Request/response bodies are never captured.
- `Authorization`, `Cookie`, `Set-Cookie`, API-key headers and
  credential-looking query parameters are masked **before** anything is stored.
- Everything lives in your browser's IndexedDB and can be wiped from the
  options page in one click.

Details in [PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE)
