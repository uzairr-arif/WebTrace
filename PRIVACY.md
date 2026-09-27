# Privacy

**Your browsing data stays on your device. By default and by design.**

## What WebTrace collects

WebTrace observes the same network lifecycle any browser DevTools panel can
see, for the tabs you browse, using the `webRequest` and `webNavigation`
extension APIs:

- URLs (with credential-looking query parameters redacted)
- HTTP methods, status codes, resource types
- Timing of lifecycle milestones (start / sent / response / completed)
- Request and response **header names and non-sensitive values**
- Initiator origin, redirect chains, cache indicators
- Page navigation milestones (committed, DOMContentLoaded, …)

## What WebTrace never does

- **No cloud.** There is no server, no account, no sync, no telemetry. The
  extension makes exactly zero network requests of its own (requests to
  `chrome-extension://` pages are explicitly excluded from capture).
- **No request or response bodies.** The capture pipeline never reads them;
  the option does not exist.
- **No JavaScript evaluation on pages.** WebTrace ships no content scripts.
- **No cross-tab profiles, no scoring, no "insights" computed over history.**

## Sensitive data handling

Redaction runs at ingestion — before storage, before the UI, before anything:

| Data | Treatment |
| --- | --- |
| `Authorization`, `Proxy-Authorization` | value masked (`••••••••`) |
| `Cookie`, `Set-Cookie` | value masked |
| `X-API-Key` and similar key headers | value masked |
| Query params like `token`, `access_token`, `password`, `secret`, `session_id`… | value masked, key kept |
| Request/response bodies | never captured |
| Header names | kept (they carry the teaching value) |

## Storage & lifetime

- Traces live in your browser profile's **IndexedDB** (`webtrace` database).
- Sessions are capped (events per session and number of sessions) so storage
  stays bounded.
- **Clear all data** in the options page deletes every stored session
  immediately. Pausing capture stops all recording.

## Permissions rationale

| Permission | Why |
| --- | --- |
| `webRequest` + `webNavigation` + `<all_urls>` | observing network activity is the product; the host pattern must cover the pages you visit |
| `storage` | local settings + IndexedDB traces |
| `tabs` | attribute requests to the tab you're inspecting, show the current page in the popup |
| `sidePanel` | hosts the main WebTrace UI |

## Advanced modes (future)

Planned deep-instrumentation modes (Chrome DevTools Protocol, optional
`@webtrace/node` backend tracing) will remain **opt-in, explicit and local**,
and this document will be updated before they ship.
