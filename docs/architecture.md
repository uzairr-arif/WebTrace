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
     ┌──────────┴──────────────┐
     ▼                         ▼
 Side panel (compact)     Dashboard (full page)
     └──────────┬──────────────┘
                ▼
   shared view components (one rendering of the truth)
   · Flow graph / Requests / Timeline
   · Explanation engine → "Why?" stories
```

**Key decision — the UI is a pure projection of the event stream.** Neither
UI receives "records" from the background; both receive the same raw
`TraceEvent`s and run the same `RequestCorrelator` locally. One code path,
tested in core, powers the stored truth and the visible truth.

## The event model

Everything is expressed as a `TraceEvent` (`packages/core/src/events/types.ts`):

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

## Derived models

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
  explicitly flagged `approx` when boundaries were inferred.
- **`Explanation`** — ordered steps with glossary references, each tagged
  observed/derived.
- **`Lesson`** — the learning curriculum (sections + quizzes), integrity
  unit-tested.

## Redaction boundary

`redactHeaders` / `redactUrl` run inside the normalizers — the first place a
browser event becomes a `TraceEvent`. Nothing downstream (buffer, IndexedDB,
port, UI) can ever see a raw Authorization header or an `access_token` query
string. Request/response bodies are never read at all: no listener opts into
them. See [privacy.md](privacy.md).

## Storage

- **Settings** → `browser.storage.local` (theme, accent, capture toggle,
  learning mode, lesson progress). Synced across surfaces via
  `storage.onChanged`.
- **Traces** → IndexedDB `webtrace` database, `sessions` store: one document
  per session (id, tabId, timestamps, url/title, capped event array). Writes
  are debounced and capped (4000 events/session, 30 sessions). "Clear all
  data" wipes the store.

## MV3 service-worker reality

The background can be killed at any moment. Both consequences are handled:

1. **Restore-on-attach** — when a UI connects, `SessionManager.ensure()`
   reloads the tab's latest stored session from IndexedDB if memory is empty.
2. **Listeners re-register instantly** — all `webRequest`/`webNavigation`
   listeners attach synchronously at the top of the worker (the event-driven
   pattern MV3 requires).

## What a browser extension honestly cannot see

WebTrace's defining constraint — and its honesty doctrine. With plain
`webRequest` there is no:

- DNS / TCP / TLS packet or timing detail (CDP territory)
- exact script + line that called `fetch()` (only the initiator origin)
- request/response bodies (opted out by design)
- WebSocket frames (only the handshake)

Every feature is built on what *is* observable, and every derived claim is
labeled. Concretely:

| Inference | How it works | Label |
| --- | --- | --- |
| Redirect chains | Chromium reuses `requestId` across hops; `onBeforeRedirect` finalizes one record and opens the next, linked by `redirectOfId` | observed |
| CORS preflight pairing | any non-document `OPTIONS` request is parked; when a non-OPTIONS request to the same URL starts within 10 s, the records link | observed link, derived meaning |
| Third-party classification | per-tab top-document host timeline; hosts compared by approximated registrable domain (last two labels + common two-part suffixes) | derived |
| "JavaScript issued this request" | fetch/XHR resource type; the exact script needs CDP | derived (dashed edges) |
| Timing phases | queued = start→send, wait = send→response, download = response→completion from lifecycle timestamps | derived, flagged approx |
| Cache stories | `onCompleted.fromCache` (Chrome) is direct; `304` gets the revalidation narrative | observed |

The upgrade path is *more events of the same shape*: the planned CDP mode
turns inferred initiators into observed ones (labels change, dashes
disappear), and `@webtrace/node` will add `server-trace` events correlated by
`X-WebTrace-ID`. The data model already supports both.

## Why WXT

WXT wraps Vite with extension-native conventions: entrypoint discovery, a
unified `browser` API with TypeScript, MV3 service-worker dev with reload,
and a manifest generated from config. The React plugin is pinned to
`@vitejs/plugin-react@^4` (see `pnpm-workspace.yaml`) because WXT 0.20
targets Vite ≤ 7.
