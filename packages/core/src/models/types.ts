/**
 * Derived models — what WebTrace *understands* once raw TraceEvents have been
 * correlated. The UI renders these; the correlation engine produces them.
 */

import type { RequestInitiator, TraceEventSource } from '../events/types';

export type RequestCategory =
  | 'document'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'xhr'
  | 'websocket'
  | 'media'
  | 'other';

export interface RequestRecord {
  /** Unique per redirect hop: `${requestId}#${hopIndex}`. */
  id: string;
  requestId: string;
  hopIndex: number;

  url: string;
  host: string;
  path: string;
  method: string;
  status?: number;
  /** Raw browser resource type. */
  resourceType: string;
  category: RequestCategory;

  tabId: number;
  frameId?: number;
  documentId?: string;
  initiator?: RequestInitiator;

  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;

  startedAt?: number;
  sentAt?: number;
  responseStartedAt?: number;
  completedAt?: number;
  failedAt?: number;
  durationMs?: number;

  fromCache?: boolean;
  ip?: string;
  error?: string;

  /** Previous hop in a redirect chain. */
  redirectOfId?: string;
  /** This record is a CORS preflight FOR the request with this id. */
  preflightForId?: string;
  /** This record had its CORS preflight answered by this record. */
  preflightOfId?: string;
  isPreflight?: boolean;

  /** Resolved against the tab's top-document timeline. */
  thirdParty?: boolean;
  documentHost?: string;
  navigationId?: string;
}

export interface NavigationRecord {
  id: string;
  tabId: number;
  frameId: number;
  url: string;
  host: string;
  path: string;
  transitionType?: string;
  startedAt?: number;
  committedAt?: number;
  domContentLoadedAt?: number;
  completedAt?: number;
  isHistory?: boolean;
}

export interface SessionStats {
  total: number;
  byCategory: Record<RequestCategory, number>;
  errors: number;
  cached: number;
  thirdPartyHosts: string[];
}

/* ------------------------------- flow graph ------------------------------ */

export type FlowRelation =
  | 'resource-of'
  | 'initiated-by-script'
  | 'redirect'
  | 'preflight-for';

export interface FlowNodeData {
  kind: 'navigation' | 'request';
  label: string;
  sublabel?: string;
  url?: string;
  category: RequestCategory | 'navigation';
  status?: number;
  isError?: boolean;
  durationMs?: number;
  thirdParty?: boolean;
  requestId?: string;
  navigationId?: string;
  source: TraceEventSource;
}

export interface FlowNode {
  id: string;
  x: number;
  y: number;
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  relation: FlowRelation;
  /** How WebTrace knows this edge: observed (browser-reported) or derived. */
  evidence: TraceEventSource;
  label?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** True when more requests exist than are rendered. */
  truncated: boolean;
  totalRequests: number;
}

/* ------------------------------- explanation ------------------------------ */

export interface ExplanationStep {
  text: string;
  source: TraceEventSource;
  /** Glossary keys highlighted in Learning Mode. */
  terms?: string[];
}

export interface Explanation {
  requestId: string;
  title: string;
  steps: ExplanationStep[];
}

/* -------------------------------- waterfall ------------------------------- */

export type WaterfallPhaseKind = 'queued' | 'wait' | 'download';

export interface WaterfallPhase {
  kind: WaterfallPhaseKind;
  startMs: number;
  endMs: number;
}

export interface Waterfall {
  phases: WaterfallPhase[];
  totalMs: number;
  dominant?: WaterfallPhaseKind;
  /** True when phase boundaries were inferred (missing lifecycle events). */
  approx: boolean;
}
