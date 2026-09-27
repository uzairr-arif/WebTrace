# Architecture

## The pipeline

```
             Browser
                │
      ┌─────────┴─────────┐
      │                   │
 webRequest          webNavigation
 (HTTP lifecycle)    (page lifecycle)
      │                   │
      └─────────┬─────────┘
                ▼
        Event Normalizer          ← redaction happens HERE, at the boundary
                │
                ▼
          TraceEvent  (the single normalized vocabulary)
                │
                ▼
         SessionManager  (background, per tab)
         · event buffer (capped)
         · RequestCorrelator → RequestRecords + navigations
         · batched IndexedDB persistence
         · broadcast to attached UIs (runtime Port)
                │
                ▼
         Side panel (React)
         · replays the event stream through its OWN correlator
         · Flow graph / Requests table / Timeline waterfall
         · Explanation engine → "Why?" stories
```

**Key decision — the UI is a pure projection of the event stream.** The side
panel does not receive "records" from the background; it receives the same raw
`TraceEvent`s and runs the same `RequestCorrelator` locally. One code path,
tested in core, powers both the stored truth and the visible truth.

## The event model

Everything is expressed as a `TraceEvent` (see
`packages/core/src/events/types.ts`):

```ts
{
  id, timestamp, tabId, frameId?, documentId?,
  kind: 'navigation' | 'request' | 'request-sent' | 'response'
      | 'completed' | 'redirect' | 'error',
  requestId?, url?, method?, status?, resourceType?,
  initiator?, requestHeaders?, responseHeaders?,   // already redacted
  error?, fromCache?, ip?,
  source: 'observed' | 'derived' | 'instrumented'
}
```

Why a single flat stream instead of structured records over the wire?
- Restart-safe: MV3 service workers die and wake; a stream replays cleanly.
- Simple transport: one port message type, one IndexedDB shape.
- Testable: core tests feed synthetic event arrays through the correlator —
  exactly what production does.

## Derived models (what the UI renders)

- **`RequestRecord`** — one per redirect hop (`requestId#hopIndex`), linked by
  `redirectOfId`; carries lifecycle timestamps, headers, cache/error state,
  preflight links and third-party classification.
- **`NavigationRecord`** — page-level anchors (roots of the flow graph), keyed
  by Chromium's `documentId` when available, synthesized from top-frame
  document requests otherwise.
- **`FlowGraph`** — nodes (navigation + requests) and edges
  (`resource-of`, `initiated-by-script`, `redirect`, `preflight-for`), each
  edge carrying its `evidence` label, plus a layered layout (columns by
  relationship depth, rows by time).
- **`Waterfall`** — queued / wait / download phases from lifecycle timestamps,
  explicitly flagged `approx` because plain webRequest doesn't expose the
  browser's precise internal timing.
- **`Explanation`** — ordered steps with glossary term references, each step
  tagged observed/derived.

## Redaction boundary

`redactHeaders` / `redactUrl` run inside the normalizers — the first place a
browser event becomes a TraceEvent. Nothing downstream (buffer, IndexedDB,
port, UI) can ever see a raw Authorization header or an `access_token` query
string. Request/response bodies are never read at all: no listener opts into
them.

## Storage

- **Settings** → `browser.storage.local` (theme, accent, capture toggle,
  learning mode). Small and hot-reloaded everywhere via `storage.onChanged`.
- **Traces** → IndexedDB `webtrace` database, `sessions` store: one document
  per session (id, tabId, timestamps, url/title, capped event array).
  Writes are debounced (800 ms) and capped (4000 events/session, 30
  sessions). "Clear all data" wipes the store.

## MV3 service-worker reality

The background can be killed at any moment. Two consequences, both handled:

1. **Restore-on-attach** — when a UI connects, `SessionManager.ensure()`
   reloads the tab's latest stored session from IndexedDB if memory is empty,
   so the side panel survives worker restarts.
2. **Listeners re-register instantly** — all `webRequest`/`webNavigation`
   listeners are attached synchronously at the top of the worker (the
   event-driven pattern MV3 requires for reliable capture).

## Why WXT

WXT wraps Vite with extension-native conventions: entrypoint discovery,
unified `browser` API with TypeScript, MV3 service-worker dev with reload,
and a manifest generated from config. It keeps the extension code ordinary
React + TypeScript. The react plugin is pinned to `@vitejs/plugin-react@^4`
(see `pnpm-workspace.yaml`) because WXT 0.20 targets Vite ≤7.
