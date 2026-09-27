# Roadmap — v0.1 → v1.0

*Each version is shippable on its own. Nothing below is speculative scaffolding;
it's the order in which the product becomes more true, more deep, more useful.*

## v0.1 — Network Observer + Flow + Explain ✅ (this codebase)

See requests correctly → correlate them → show a clean flow graph → click a
request → understand what happened.

- [x] MV3 extension: `webRequest` + `webNavigation` capture
- [x] Normalized event model + redaction at ingestion
- [x] Correlation: redirect chains, preflight pairing, navigation grouping,
      third-party classification
- [x] Live Flow graph (React Flow), Requests table, Timeline waterfall +
      replay
- [x] Explain engine ("Why did this happen?") with observed/derived labels
- [x] Learning Mode glossary tooltips
- [x] Popup mini-dashboard, options (theme/accent/learning/capture/clear)
- [x] Local-only IndexedDB persistence, bounded storage
- [x] Unit tests (core) + Playwright E2E (real browser)

## v0.2 — Deep instrumentation (CDP mode)

Opt-in "Advanced tracing" toggle → `chrome.debugger` attach:

- [ ] Real initiator stacks: script URL + line for fetch/XHR (edges become
      `observed`, dashes disappear)
- [ ] Precise timing: DNS / connect / TLS / waiting phases from CDP
- [ ] WebSocket handshake + frames view (opt-in payload capture with warnings)
- [ ] SSE event streams

The observed/derived machinery already exists — this release mostly *changes
labels and fills gaps*.

## v0.3 — Learning curriculum

- [ ] Guided lessons that run against live traffic (HTTP, TLS, DNS, caching,
      redirects, CORS)
- [ ] Interactive challenges ("Why was this blocked?") driven by recorded
      fixture flows
- [ ] Progress tracking (local), glossary expansion

## v0.4 — Developer toolkit

- [ ] Export: `.webtrace.json`, standalone HTML report
- [ ] Compare mode: record before/after, diff requests, third parties, sizes
- [ ] Regression detection ("API calls went 8 → 19", "new third-party host")
- [ ] Saved sessions + annotations

## v0.5 — Full-stack tracing (`@webtrace/node`)

- [ ] `npm install @webtrace/node` → Express middleware emitting local
      server-trace events (middleware → controller → service → DB)
- [ ] `X-WebTrace-ID` correlation between browser request and backend trace
- [ ] Local-only bridge (extension ↔ localhost), no cloud
- [ ] The full-stack flow view: Browser → API → Controller → DB → response

## v1.0 — Public release

- [ ] Chrome Web Store + Edge Add-ons listings (privacy review ready — the
      permission rationale in PRIVACY.md is the basis)
- [ ] Docs site (reuses `packages/core` explainers)
- [ ] Firefox port (browser-adapter abstraction is already in place via the
      unified `browser` API)
- [ ] Performance hardening for very heavy pages (event caps tuned, node
      aggregation)

## Deliberately NOT planned

Packet capture, cloud sync, team collaboration, AI-explanation dependency,
anything that would move user data off the device.
