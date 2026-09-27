# Loading, reloading and debugging WebTrace

## Load the extension (first time)

1. Build it: `pnpm build` (output: `apps/extension/.output/chrome-mv3`)
2. Chrome → `chrome://extensions`
3. Toggle **Developer mode** (top-right)
4. **Load unpacked** → pick `apps/extension/.output/chrome-mv3`
5. Pin WebTrace from the puzzle-piece menu

## Dev loop with hot reload

```bash
pnpm dev
```

WXT watches the source and rebuilds + reloads the extension automatically
(load the same `.output/chrome-mv3` folder once). UI changes hot-swap;
background changes reload the worker.

> If the side panel ever goes blank after a background reload, close and
> reopen it — ports reconnect on attach.

## Where to debug what

| What | Where |
| --- | --- |
| Background service worker | `chrome://extensions` → WebTrace → **service worker** link (console, breakpoints) |
| Side panel UI | Right-click inside the panel → **Inspect** |
| Popup | Right-click the toolbar icon → **Inspect popup** |
| Options page | Right-click in the options page → Inspect |
| Stored traces | DevTools → Application → IndexedDB → `webtrace` → `sessions` |
| Settings | DevTools → Application → Storage → Extension → `chrome.storage.local` |

## The demo fixture (safe traffic to explore)

```bash
node tests/fixtures/demo-site/server.mjs
# → http://localhost:4173        (the "site")
# → http://localhost:4174        (cross-origin API, for the CORS preflight)
```

Open the site, open Live Flow, and you'll see: document → CSS (304 on
reload!) → JS → JSON APIs → a 404 → a 500 → a 301→302 redirect chain → a
CORS preflight feeding a cross-origin POST. Click anything and read its Why
story.

## Common issues

**"NO TAB" in the side panel** — the panel couldn't resolve a tab. Browse a
page and reopen the panel; it falls back to the most recently active session.

**Capture seems dead after Chrome restart** — check the popup; capture is a
global toggle. The background restores sessions lazily on attach, so the
panel may need one reopen after a cold start.

**Requests missing** — you're probably looking at a filtered view: clear the
search box and chips. `chrome-extension://` pages are intentionally never
traced.

**Extension errors on load** — run `pnpm build` fresh; Chrome caches unpacked
builds. Remove and re-add the extension if icons/manifest changed.

**Service worker got killed mid-session** — expected MV3 behavior. Sessions
restore from IndexedDB when you re-attach (open the panel). Live events
continue from wherever the worker wakes.
