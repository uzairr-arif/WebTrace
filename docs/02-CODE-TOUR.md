# Code tour — every file, what it does, why it exists

## `packages/core/` — the brain (pure TS, zero browser APIs)

| File | What it does |
| --- | --- |
| `src/events/types.ts` | The `TraceEvent` model — the single vocabulary of the whole system. Includes the observed/derived/instrumented doctrine. |
| `src/events/normalize.ts` | Translates raw `webRequest` / `webNavigation` callback payloads into TraceEvents. **Redaction happens here** — the boundary nothing sensitive crosses. |
| `src/redaction/redactor.ts` | `SensitiveDataRedactor`: header deny-list + credential-looking query param masking. The privacy gate. |
| `src/correlation/correlator.ts` | **The most important file in the project.** Folds the flat event stream into `RequestRecord`s (one per redirect hop, linked), navigation records, preflight pairing, third-party classification, and session stats. |
| `src/graph/build.ts` | Turns records into the flow graph: parent resolution (redirect → preflight → document), layered layout, evidence-labeled edges. Top-frame documents are represented by their navigation node (no duplicates). |
| `src/timeline/waterfall.ts` | Queued/wait/download phases from lifecycle timestamps, flagged `approx` when boundaries were inferred. |
| `src/explain/engine.ts` | The "Why did this happen?" stories. Rules, not AI. Every step is evidence-tagged. |
| `src/explain/net-errors.ts` | Plain-language notes for `net::ERR_*` codes. |
| `src/explain/glossary.ts` | Learning Mode terms (CORS, TLS, 304, preflight…). |
| `src/filters/query.ts` | The mini query language: `status:500`, `type:api`, `third-party:true`, free text. |
| `src/models/*` | Derived types, category mapping (with friendly aliases), host/site helpers. |
| `src/*.test.ts` | Vitest suites — synthetic event streams exercise the exact production path. |

## `apps/extension/` — pipes and paint

| File | What it does |
| --- | --- |
| `wxt.config.ts` | Manifest (permissions, side panel, icons), Tailwind v4 Vite plugin. |
| `theme/theme.css` | Design tokens: dark + light themes via `[data-theme]`, accent injected at runtime, Tailwind utilities mapped through `@theme inline`. |
| `lib/messages.ts` | The message protocol — every surface speaks the same typed vocabulary. |
| `lib/settings.ts` | Settings load/save + theme application (applies `data-theme` + accent CSS var). |
| `lib/browser-types.ts` | Tiny structural types (PortLike, SenderLike) that keep app code independent of browser-typing flavors. |
| `lib/trace-client.ts` | `useTraceSession()` — the side panel's live connection: attach → snapshot → event stream → local correlator → derived state (with 120 ms coalescing). |
| `components/ThemeProvider.tsx` | Settings context; keeps theme/accent/learning-mode in sync across all surfaces via `storage.onChanged`. |
| `components/Badges.tsx` | Status pill, category dot, and the **OBSERVED/DERIVED** evidence badge. |
| `components/Term.tsx` | Learning-Mode glossary tooltip (renders plain text when learning mode is off). |

### `entrypoints/background/` (the service worker)

| File | What it does |
| --- | --- |
| `index.ts` | Wires everything; tracks tab url/title; prunes old sessions. |
| `webrequest.ts` | The six `webRequest` lifecycle listeners → normalizers. Ignores other extensions' service workers and `chrome-extension://` pages (WebTrace does not trace itself). |
| `webnavigation.ts` | Navigation milestones (before/committed/DCL/completed/history) → navigation events. |
| `sessions.ts` | `SessionManager`: per-tab buffers, debounced IndexedDB persistence, restore-on-attach for MV3 worker restarts, clear/remove. |
| `persistence.ts` | IndexedDB wrapper (promise-based, fault-tolerant) + pruning. |
| `ports.ts` | Port hub: UIs attach by tabId, get a snapshot, then a live stream. |
| `messaging.ts` | Request/response API: overview stats, clear session/all data, settings, active tab, open side panel. |

### `entrypoints/sidepanel/` (the main UI)

| File | What it does |
| --- | --- |
| `App.tsx` | Shell: header (LIVE, learning toggle, options), view tabs, filter state, details drawer. |
| `FlowView.tsx` | React Flow graph: custom nodes, smoothstep edges, dashed = derived, legend, node click → details. |
| `FlowNodeCard.tsx` | The node card: category dot, path, status pill, duration, third-party/JS markers. |
| `RequestsView.tsx` | The request table (status, method, path, duration; error rows tinted). |
| `TimelineView.tsx` | Waterfall with phase-colored segments, replay (▶ 1×/2×/4×), phase legend. |
| `DetailsDrawer.tsx` | Everything about one request: meta grid, timing, **Why story** with evidence badges, redacted headers. |
| `FilterBar.tsx` | Search box (mini query language) + category/error/third-party chips. |

### `entrypoints/dashboard/` (the full-page dashboard)

| File | What it does |
| --- | --- |
| `App.tsx` | Sidebar shell (Overview / Flow / Requests / Timeline / Third-Party Map / Learn / Sessions), live↔replay source switching, filter state, details drawer. |
| `OverviewView.tsx` | Stat cards, requests-over-time buckets, category bars, status mix, top hosts, recent pages. |
| `ThirdPartyView.tsx` | Hosts grouped first-party vs third-party with counts, category dots, errors, first-seen offsets. |
| `LearnView.tsx` | The lessons library: progress bar, lesson cards, lesson reader with always-on glossary tooltips, quizzes with instant explanations, local progress storage. |
| `SessionsView.tsx` | Stored sessions from IndexedDB: open as replay, delete. |

### `packages/core/src/learning/`

| File | What it does |
| --- | --- |
| `lessons.ts` | The 8-lesson curriculum (sections + quizzes + glossary links) and progress helpers. Integrity is unit-tested: unique ids, valid answer indexes, real glossary terms. |

### Shared views (`components/views/`)

`FlowView`, `FlowNodeCard`, `RequestsView`, `TimelineView`, `FilterBar`,
`DetailsDrawer`, `shared.ts` (isFailed/chips helpers) — used by both the side
panel and the dashboard, so the two surfaces can never drift apart.

### `entrypoints/popup/` and `entrypoints/options/`

| File | What it does |
| --- | --- |
| `popup/App.tsx` | Mini dashboard: current page, request/API/error/third-party counts, third-party host chips, Open Live Flow, pause, clear. |
| `options/App.tsx` | Theme (system/dark/light), accent presets + custom color, Learning Mode, capture toggle, clear-all-data, privacy summary. |

## `tests/`

| Path | What it does |
| --- | --- |
| `fixtures/demo-site/server.mjs` | Zero-dep local site: CSS ETag/304, JSON APIs, XHR, 404/500, 301→302 chain, cross-origin preflighted POST. Your manual testing playground. |
| `e2e/extension.spec.ts` | Loads the built extension in Chromium, drives the fixture, asserts flow nodes render and the Why story shows evidence badges. |
