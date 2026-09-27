# How the tricks work — and what the browser honestly cannot see

This is the doc to read before touching `correlator.ts` or `engine.ts`.
It explains each inference WebTrace makes, why it's allowed to make it, and
where the hard limits of a browser extension are.

## What webRequest actually gives us

Per request, Chromium reports lifecycle callbacks: `onBeforeRequest`,
`onSendHeaders`, `onHeadersReceived`, `onBeforeRedirect`, `onCompleted`,
`onErrorOccurred` — each carrying a stable `requestId`, plus `webNavigation`
page milestones. That's the entire raw material. Specifically it does **not**
give us:

- ❌ DNS / TCP / TLS timings (CDP territory)
- ❌ The exact script + line that called `fetch()` (CDP's initiator stack)
- ❌ Request/response bodies (we opt out anyway — privacy)
- ❌ WebSocket frames (only the handshake is visible; frames need CDP)

Every feature below is built honestly on top of what we *do* get.

## Redirect chains

Chromium reuses one `requestId` across redirect hops and inserts
`onBeforeRedirect` events (whose `redirectUrl` is where the browser goes
next). The correlator finalizes the current hop's record on the redirect
event and opens the next hop when the follow-up `onBeforeRequest` arrives,
linking them with `redirectOfId`. Each hop keeps its own status + response
headers, so the graph draws `hop1 → hop2 → final` and the explain engine can
narrate "The server answered HTTP 301 and redirected the browser to …".

Edge case handled: if the redirect event is missed (worker restart), the
correlator also links hops when a *new URL* arrives under a known
`requestId`.

## CORS preflight pairing

Preflights appear as ordinary `OPTIONS` requests. Two-step detection:

1. **Identity** — any non-document `OPTIONS` request is marked `isPreflight`
   and parked in a pending list.
2. **Pairing** — when a non-OPTIONS request to the *same URL* starts within
   10 seconds on the same tab, the two records are linked
   (`preflightForId` / `preflightOfId`).

That link becomes a graph edge ("preflight") and an explain step ("The
browser first sent a CORS preflight (OPTIONS) to ask the server for
permission…"). Unpaired OPTIONS requests are simply labeled preflight
candidates — the UI still shows them honestly.

## Third-party classification

WebTrace keeps a per-tab timeline of top-document hosts (from navigations and
top-frame document requests). A request is third-party when its host does not
share the *approximated registrable domain* of the document host at or before
its start time. "Approximated" = last two labels plus a small list of common
two-part suffixes (`co.uk`, `com.au`, …). So `cdn.example.com` is first-party
for `example.com`, but `fonts.googleapis.com` is not.

Honesty markers: this is `derived` (we never see a real Public Suffix List
lookup), and the docs say so. Swapping in the real PSL is a clean upgrade.

## "The page's JavaScript issued this request"

For `fetch`/XHR we *cannot* see the calling script with plain webRequest —
Chromium gives us the initiator **origin** only. So:

- The graph draws `document → API` with the label "JavaScript" and edge
  evidence `derived` (the dashed edge style in the UI).
- The explain engine says: "The page's JavaScript issued this request.
  WebTrace infers this from the request type; naming the exact script and
  line requires advanced instrumentation."

The planned CDP mode (v0.2 roadmap) upgrades this to a real script URL + line
via the debugger API — at which point the edge becomes `observed` and the
dashes disappear. The data model already supports this (initiator has
`url`/`line`/`column` fields).

## Timing phases

`queued` = start → send, `wait` = send → response start, `download` =
response start → completion, from our own lifecycle timestamps. When some
milestones are missing (e.g. worker woke mid-request), the waterfall fills
gaps and sets `approx: true` — the UI appends "(approximate)". CDP mode will
replace these with the browser's precise `ResourceTiming`.

## Cache stories

`onCompleted.fromCache` (Chrome) marks cache hits directly — `observed`.
`304 Not Modified` gets the revalidation story ("the browser asked whether
its cached copy was still fresh…"). That's a 200-level teaching moment built
from one status code.

## Why the UI re-runs the correlator

The background broadcasts raw TraceEvents; the side panel feeds them through
its own `RequestCorrelator`. This means: one tested code path, restart-safe
replays (snapshot = event array), and the popup/sidepanel can never disagree
with stored data about *why* something is shown.

## The upgrade path (why the architecture bends, not breaks)

Every future "deeper truth" slots in as *more events of the same shape*:

| Upgrade | New events |
| --- | --- |
| CDP/debugger mode (v0.2) | richer initiators (script+line), precise timing, WS frames |
| `@webtrace/node` (v0.6) | `server-trace` events correlated via `X-WebTrace-ID` |
| PSL | better derived labels, zero model changes |

The observed/derived labels carry the load: when an upgrade promotes an
inference to an observation, the label changes and the UI tells the truth
automatically.
