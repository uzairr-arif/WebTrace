/**
 * Explanation Engine v0 — the "Why did this happen?" stories.
 *
 * Rules, not AI: every step is derived from recorded evidence, and every step
 * is tagged OBSERVED (the browser reported it) or DERIVED (WebTrace inferred
 * it). When WebTrace doesn't know, it says so.
 */

import type { TraceEventSource } from '../events/types';
import { hostOf, sameSite, shortUrl } from '../models/hosts';
import { CATEGORY_META } from '../models/categories';
import type {
  Explanation,
  ExplanationStep,
  NavigationRecord,
  RequestRecord,
} from '../models/types';
import { NET_ERROR_NOTES, NET_ERROR_TERMS } from './net-errors';

export function explainRequest(
  record: RequestRecord,
  navigations: NavigationRecord[],
  requests: RequestRecord[],
): Explanation {
  const steps: ExplanationStep[] = [];
  const title = `${record.method} ${shortUrl(record.url, 64)}`;
  const hops = redirectChain(record, requests);
  const final = hops[hops.length - 1] ?? record;

  /* 1 — the page this belongs to */
  const nav = pickNavigation(navigations, record);
  if (nav) {
    steps.push({
      text: `You loaded ${shortUrl(nav.url, 80)} — this activity belongs to that page.`,
      source: 'observed',
      terms: ['navigation'],
    });
  } else {
    steps.push({
      text: 'This request was issued outside a page navigation — for example by a service worker or the browser itself.',
      source: 'observed',
    });
  }

  /* 2 — who issued it */
  if (record.preflightOfId) {
    const pre = requests.find((r) => r.id === record.preflightOfId);
    steps.push({
      text: `The browser first sent a CORS preflight (OPTIONS${
        pre?.status !== undefined ? ` → ${pre.status}` : ''
      }) to ask the server for permission before sending the real request.`,
      source: 'observed',
      terms: ['CORS', 'preflight'],
    });
  }

  if (record.category === 'xhr') {
    const initOrigin = record.initiator?.url ? hostOf(record.initiator.url) : '';
    const crossOrigin = initOrigin !== '' && !sameSite(initOrigin, record.host);
    steps.push({
      text: crossOrigin
        ? `The request was initiated from ${shortUrl(record.initiator?.url, 60)} — JavaScript issued it from a different origin.`
        : `The page’s JavaScript issued this request. WebTrace infers this from the request type; naming the exact script and line requires advanced instrumentation.`,
      source: crossOrigin ? 'observed' : 'derived',
      terms: ['initiator', 'Fetch / XHR'],
    });
  } else if (record.category === 'document' && record.frameId === 0) {
    steps.push({
      text: 'The browser requested the page itself — the HTML document that starts everything else.',
      source: 'observed',
      terms: ['document'],
    });
  } else if (record.category === 'document') {
    steps.push({
      text: 'A frame inside the page (for example an iframe) requested its own document.',
      source: 'observed',
      terms: ['document'],
    });
  } else {
    steps.push({
      text: `The page needed this ${CATEGORY_META[record.category].label.toLowerCase()} while loading.`,
      source: 'observed',
    });
  }

  if (record.thirdParty) {
    steps.push({
      text: `This request went to a third party — ${record.host} — different from the page’s own site.`,
      source: 'derived',
      terms: ['third-party'],
    });
  }

  /* 3 — the request itself */
  steps.push({
    text: `The browser sent ${record.method} ${record.path || '/'} to ${record.host}.`,
    source: 'observed',
  });

  /* 4 — redirect hops along the way */
  for (let i = 0; i < hops.length - 1; i++) {
    const hop = hops[i];
    const next = hops[i + 1];
    steps.push({
      text: `The server answered HTTP ${hop.status ?? '3xx'} and redirected the browser to ${shortUrl(next.url, 80)}.`,
      source: 'observed',
      terms: ['redirect'],
    });
  }

  /* 5 — outcome */
  if (final.error) {
    const note = NET_ERROR_NOTES[final.error];
    steps.push({
      text: note
        ? `The request never got a response. ${note}`
        : `The request failed at the network level. The browser reported: ${final.error}.`,
      source: 'observed',
      terms: NET_ERROR_TERMS[final.error] ?? ['blocked request'],
    });
  } else if (final.status !== undefined) {
    steps.push({
      text: `The server responded with HTTP ${final.status} — ${statusPhrase(final.status)}.`,
      source: 'observed',
      terms: statusTerms(final.status),
    });
    const note = statusNote(final, hops.length > 1);
    if (note) steps.push(note);
  } else {
    steps.push({
      text: 'No response was recorded before WebTrace last saw this request.',
      source: 'observed',
    });
  }

  if (final.fromCache && final.status !== 304) {
    steps.push({
      text: 'The response came from the browser’s local cache — no copy was downloaded from the network.',
      source: 'observed',
      terms: ['cache'],
    });
  }

  if (!final.error && final.completedAt !== undefined) {
    steps.push({
      text: 'The response was handed back to the page and the browser moved on.',
      source: 'derived',
    });
  }

  return { requestId: final.id, title, steps };
}

/** Walk the redirect chain backwards and return hops oldest → newest. */
export function redirectChain(
  record: RequestRecord,
  requests: RequestRecord[],
): RequestRecord[] {
  const byId = new Map(requests.map((r) => [r.id, r]));
  const chain: RequestRecord[] = [];
  let current: RequestRecord | undefined = record;
  let guard = 0;
  while (current && guard < 32) {
    chain.unshift(current);
    current = current.redirectOfId ? byId.get(current.redirectOfId) : undefined;
    guard += 1;
  }
  return chain;
}

function pickNavigation(
  navigations: NavigationRecord[],
  record: RequestRecord,
): NavigationRecord | undefined {
  if (record.navigationId) {
    const exact = navigations.find((n) => n.id === record.navigationId);
    if (exact) return exact;
  }
  const startedAt = record.startedAt ?? Number.MAX_SAFE_INTEGER;
  const candidates = navigations.filter(
    (n) => n.frameId === 0 && (n.committedAt ?? 0) <= startedAt,
  );
  return candidates[candidates.length - 1];
}

function statusPhrase(status: number): string {
  const known: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    418: "I'm a teapot",
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  if (known[status]) return known[status];
  if (status < 200) return 'informational response';
  if (status < 300) return 'success';
  if (status < 400) return 'redirect';
  if (status < 500) return 'client error';
  return 'server error';
}

function statusTerms(status: number): string[] {
  if (status === 304) return ['304', 'cache'];
  if (status === 401) return ['401'];
  if (status === 403) return ['403'];
  if (status === 404) return ['404'];
  if (status === 429) return ['429'];
  if (status >= 500) return ['500'];
  if (status >= 300 && status < 400) return ['redirect'];
  return [];
}

/** The interpretation layer — always DERIVED, always honest. */
function statusNote(record: RequestRecord, wasRedirected: boolean): ExplanationStep | undefined {
  const status = record.status;
  if (status === undefined) return undefined;

  if (status === 304) {
    return {
      text: 'The browser already had a cached copy, asked the server whether it was still fresh, and the server confirmed — so the cached copy was reused and no body was downloaded.',
      source: 'derived',
      terms: ['cache', '304'],
    };
  }
  if (status >= 300 && status < 400) {
    return {
      text: wasRedirected
        ? 'The browser followed the redirect automatically.'
        : 'This redirect was left unfollowed — the browser or the caller chose not to follow it.',
      source: 'derived',
      terms: ['redirect'],
    };
  }
  if (status === 401) {
    return {
      text: 'The server does not recognize the caller. The page will typically show a login flow or retry with credentials.',
      source: 'derived',
      terms: ['401'],
    };
  }
  if (status === 403) {
    return {
      text: 'The server identified the caller but refused the action — a permissions issue rather than a login issue.',
      source: 'derived',
      terms: ['403'],
    };
  }
  if (status === 404) {
    return {
      text: 'Nothing exists at this URL right now: a wrong route, a removed resource, or a missing file in the deployment.',
      source: 'derived',
      terms: ['404'],
    };
  }
  if (status === 429) {
    return {
      text: 'The client sent too many requests in a window and was rate-limited.',
      source: 'derived',
      terms: ['429'],
    };
  }
  if (status >= 500) {
    return {
      text: 'The server failed while handling the request. The browser did its part; the problem lives server-side.',
      source: 'derived',
      terms: ['500'],
    };
  }
  if (status >= 200 && status < 300) {
    const contentType = lowerHeader(record.responseHeaders, 'content-type');
    if (contentType.includes('application/json')) {
      return {
        text: 'The response is JSON — data the page’s JavaScript will turn into state and UI, not something shown directly.',
        source: 'derived',
        terms: ['JSON'],
      };
    }
    if (record.category === 'xhr') {
      return {
        text: 'The request succeeded and the page’s JavaScript received the data.',
        source: 'derived',
      };
    }
    return {
      text: `The browser will use it as part of loading or rendering the page (${CATEGORY_META[record.category].label.toLowerCase()}).`,
      source: 'derived',
    };
  }
  return undefined;
}

function lowerHeader(
  headers: Record<string, string> | undefined,
  name: string,
): string {
  if (!headers) return '';
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) return value.toLowerCase();
  }
  return '';
}

export type { TraceEventSource };
