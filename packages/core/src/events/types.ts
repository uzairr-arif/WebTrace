/**
 * The normalized event model — the single vocabulary every other WebTrace
 * layer speaks. Browser-specific listeners (webRequest, webNavigation, later
 * CDP and @webtrace/node) all translate their raw payloads into TraceEvent
 * before anything else sees the data.
 *
 * Every event carries a `source` label. WebTrace never hides how it knows
 * what it knows:
 *  - observed    — the browser itself reported this
 *  - derived     — WebTrace inferred it from observed events
 *  - instrumented— optional developer instrumentation (future @webtrace/node)
 */

export type TraceEventSource = 'observed' | 'derived' | 'instrumented';

export type TraceEventKind =
  /** A page/frame navigation lifecycle step. */
  | 'navigation'
  /** A network request started. */
  | 'request'
  /** Request headers are about to be sent. */
  | 'request-sent'
  /** Response headers received (start of response). */
  | 'response'
  /** The request finished (success path). */
  | 'completed'
  /** The request was redirected; the event URL is the redirect target. */
  | 'redirect'
  /** The request failed at the network level. */
  | 'error';

export type NavigationPhase =
  | 'before'
  | 'committed'
  | 'dom-content-loaded'
  | 'completed'
  | 'history';

export interface RequestInitiator {
  type: 'script' | 'parser' | 'redirect' | 'preflight' | 'other' | 'unknown';
  /** Best-known initiator location. With plain webRequest this is an origin,
   *  not a script URL — script-level attribution needs CDP (planned v0.6). */
  url?: string;
  line?: number;
  column?: number;
}

export interface TraceEvent {
  id: string;
  /** Epoch milliseconds. */
  timestamp: number;
  tabId: number;
  frameId?: number;
  parentFrameId?: number;
  /** Stable id of the document owning this event (Chromium). */
  documentId?: string;

  kind: TraceEventKind;

  requestId?: string;
  url?: string;
  method?: string;
  status?: number;
  /** Raw browser resource type, e.g. "main_frame", "xmlhttprequest". */
  resourceType?: string;
  initiator?: RequestInitiator;

  /** Header objects are already redacted before they reach this model. */
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;

  error?: string;
  fromCache?: boolean;
  ip?: string;

  navigationPhase?: NavigationPhase;
  transitionType?: string;
  isHistoryNavigation?: boolean;

  source: TraceEventSource;
}
