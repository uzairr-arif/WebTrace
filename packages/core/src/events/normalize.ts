/**
 * Browser-event → TraceEvent translation for Chromium's webRequest and
 * webNavigation APIs. The input shapes are structural (no browser types in
 * core); the extension passes raw listener details straight in.
 *
 * Redaction happens here, at the boundary: nothing downstream ever sees an
 * unredacted header value or credential-looking query string.
 */

import { uid } from '../id';
import { redactHeaders, redactUrl } from '../redaction/redactor';
import type { HttpHeader } from '../redaction/header';
import type {
  NavigationPhase,
  RequestInitiator,
  TraceEvent,
  TraceEventKind,
} from './types';

export interface WebRequestDetailsBase {
  requestId: string;
  url: string;
  method: string;
  frameId: number;
  parentFrameId: number;
  documentId?: string;
  tabId: number;
  type: string;
  timeStamp: number;
  /** Chromium: initiator origin string. Firefox: originUrl. */
  initiator?: string;
  originUrl?: string;
}

export interface WebRequestHeadersDetails extends WebRequestDetailsBase {
  requestHeaders?: HttpHeader[];
}

export interface WebRequestResponseDetails extends WebRequestDetailsBase {
  statusCode?: number;
  responseHeaders?: HttpHeader[];
  fromCache?: boolean;
  ip?: string;
}

export interface WebRequestRedirectDetails extends WebRequestResponseDetails {
  redirectUrl: string;
}

export interface WebRequestErrorDetails extends WebRequestDetailsBase {
  error: string;
  statusCode?: number;
  fromCache?: boolean;
}

export interface WebNavigationDetails {
  tabId: number;
  frameId: number;
  parentFrameId?: number;
  url: string;
  timeStamp: number;
  documentId?: string;
  transitionType?: string;
  transitionQualifiers?: string[];
}

function initiatorFrom(d: WebRequestDetailsBase): RequestInitiator | undefined {
  const origin = d.initiator ?? d.originUrl;
  if (!origin || origin === 'null' || origin === 'about:') return undefined;
  // webRequest exposes only the initiator *origin*, not the executing script.
  // Script-file + line attribution requires the CDP/debugger mode (v0.6).
  return { type: 'other', url: origin };
}

function baseEvent(
  d: WebRequestDetailsBase,
  kind: TraceEventKind,
  overrides: Partial<TraceEvent> = {},
): TraceEvent {
  return {
    id: uid('ev'),
    timestamp: d.timeStamp,
    tabId: d.tabId,
    frameId: d.frameId,
    parentFrameId: d.parentFrameId,
    documentId: d.documentId,
    kind,
    requestId: d.requestId,
    url: redactUrl(d.url),
    method: d.method.toUpperCase(),
    resourceType: d.type,
    initiator: initiatorFrom(d),
    source: 'observed',
    ...overrides,
  };
}

export function eventFromBeforeRequest(d: WebRequestDetailsBase): TraceEvent {
  return baseEvent(d, 'request');
}

export function eventFromSendHeaders(d: WebRequestHeadersDetails): TraceEvent {
  return baseEvent(d, 'request-sent', {
    requestHeaders: redactHeaders(d.requestHeaders),
  });
}

export function eventFromHeadersReceived(d: WebRequestResponseDetails): TraceEvent {
  return baseEvent(d, 'response', {
    status: d.statusCode,
    responseHeaders: redactHeaders(d.responseHeaders),
  });
}

export function eventFromCompleted(d: WebRequestResponseDetails): TraceEvent {
  return baseEvent(d, 'completed', {
    status: d.statusCode,
    responseHeaders: redactHeaders(d.responseHeaders),
    fromCache: d.fromCache,
    ip: d.ip,
  });
}

/** The event URL is the redirect TARGET (where the browser goes next). */
export function eventFromBeforeRedirect(d: WebRequestRedirectDetails): TraceEvent {
  return baseEvent(d, 'redirect', {
    url: redactUrl(d.redirectUrl),
    status: d.statusCode,
    responseHeaders: redactHeaders(d.responseHeaders),
    fromCache: d.fromCache,
  });
}

export function eventFromError(d: WebRequestErrorDetails): TraceEvent {
  return baseEvent(d, 'error', {
    error: d.error,
    status: d.statusCode,
    fromCache: d.fromCache,
  });
}

export function eventFromNavigation(
  d: WebNavigationDetails,
  phase: NavigationPhase,
  opts: { isHistory?: boolean } = {},
): TraceEvent {
  return {
    id: uid('ev'),
    timestamp: d.timeStamp,
    tabId: d.tabId,
    frameId: d.frameId,
    parentFrameId: d.parentFrameId,
    documentId: d.documentId,
    kind: 'navigation',
    url: redactUrl(d.url),
    navigationPhase: phase,
    transitionType: d.transitionType,
    isHistoryNavigation: opts.isHistory ?? false,
    source: 'observed',
  };
}
