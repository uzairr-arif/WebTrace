# Changelog

All notable changes to WebTrace are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-09-28

### Added

- **Live Flow** — an interactive graph that builds itself as pages load:
  documents, scripts, styles, images, fonts, API calls, redirect chains and
  CORS preflights, with observed (solid) vs derived (dashed) edges.
- **Request Explorer** — filterable request table with a mini query language
  (`status:500`, `type:api`, `third-party:true`, free text).
- **Timeline** — waterfall with queued/waiting/download phases and replay at
  1×/2×/4×.
- **Explain engine** — "Why did this happen?" stories for redirects, CORS
  preflights, HTTP error statuses, network failures and cache revalidation;
  every step labeled OBSERVED or DERIVED.
- **Learning Mode** — glossary tooltips (CORS, TLS, DNS, 304, preflight…) and
  an 8-lesson curriculum with quizzes and local progress tracking.
- **Full dashboard** — sidebar navigation with Overview charts (requests over
  time, categories, status mix, top hosts), Third-Party Map, Learn tab and a
  Sessions tab to replay or delete stored captures.
- **Side panel** — compact live view for browsing alongside the page.
- **Popup** — per-tab mini dashboard with pause/clear and quick-open actions.
- **Privacy architecture** — 100% local (IndexedDB), no network egress, no
  request/response body capture, sensitive headers and query parameters
  masked at ingestion; clear-all-data control.
- **Theme system** — dark + light themes, system-follow default, six accent
  presets plus custom accent color.
- **Packaging** — pnpm workspace monorepo (`packages/core` browser-agnostic
  and fully unit-tested; `apps/extension` WXT/React MV3 build), demo fixture
  site, Playwright E2E, CI workflow, project website.

[0.1.0]: https://github.com/webtrace/webtrace/releases/tag/v0.1.0
