import { describe, expect, it } from 'vitest';
import { eventFromBeforeRequest, eventFromHeadersReceived } from '../events/normalize';
import { RequestCorrelator } from './correlator';
import type { TraceEvent } from '../events/types';

let clock = 1000;
function ts(): number {
  clock += 10;
  return clock;
}

function req(overrides: Partial<Parameters<typeof eventFromBeforeRequest>[0]> = {}) {
  return eventFromBeforeRequest({
    requestId: 'r1',
    url: 'https://example.com/app.js',
    method: 'GET',
    frameId: 0,
    parentFrameId: -1,
    tabId: 1,
    type: 'script',
    timeStamp: ts(),
    ...overrides,
  });
}

function resp(requestId: string, url: string, status = 200, type = 'script') {
  return eventFromHeadersReceived({
    requestId,
    url,
    method: 'GET',
    frameId: 0,
    parentFrameId: -1,
    tabId: 1,
    type,
    timeStamp: ts(),
    statusCode: status,
  });
}

function push(correlator: RequestCorrelator, events: TraceEvent[]): void {
  for (const e of events) correlator.push(e);
}

describe('RequestCorrelator', () => {
  beforeEachReset: it('correlates a simple request lifecycle', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({ requestId: 'r1', url: 'https://example.com/app.js', type: 'script' }),
      resp('r1', 'https://example.com/app.js'),
    ]);
    const requests = c.getRequests();
    expect(requests).toHaveLength(1);
    const r = requests[0];
    expect(r.requestId).toBe('r1');
    expect(r.category).toBe('script');
    expect(r.status).toBe(200);
    expect(r.responseStartedAt).toBeDefined();
    expect(r.redirectOfId).toBeUndefined();
  });

  it('chains redirect hops into linked records', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({ requestId: 'r2', url: 'https://example.com/a', type: 'xmlhttprequest' }),
      resp('r2', 'https://example.com/a', 301, 'xmlhttprequest'),
      // redirect event: URL is the redirect target
      { ...req({ requestId: 'r2', url: 'https://example.com/b', type: 'xmlhttprequest' }), kind: 'redirect' as const },
      req({ requestId: 'r2', url: 'https://example.com/b', type: 'xmlhttprequest' }),
      resp('r2', 'https://example.com/b', 200, 'xmlhttprequest'),
    ]);
    const requests = c.getRequests();
    expect(requests).toHaveLength(2);
    const [hop1, hop2] = requests;
    expect(hop2.redirectOfId).toBe(hop1.id);
    expect(hop2.url).toBe('https://example.com/b');
    expect(hop1.status).toBe(301);
    expect(hop2.status).toBe(200);
    expect(hop2.hopIndex).toBe(1);
  });

  it('pairs CORS preflight with the real request', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({
        requestId: 'p1',
        url: 'https://api.example.com/checkout',
        method: 'OPTIONS',
        type: 'xmlhttprequest',
      }),
      resp('p1', 'https://api.example.com/checkout', 204, 'xmlhttprequest'),
      req({ requestId: 'p2', url: 'https://api.example.com/checkout', method: 'POST', type: 'xmlhttprequest' }),
      resp('p2', 'https://api.example.com/checkout', 200, 'xmlhttprequest'),
    ]);
    const requests = c.getRequests();
    const preflight = requests.find((r) => r.method === 'OPTIONS');
    const real = requests.find((r) => r.method === 'POST');
    expect(preflight?.isPreflight).toBe(true);
    expect(real?.preflightOfId).toBe(preflight?.id);
    expect(preflight?.preflightForId).toBe(real?.id);
  });

  it('classifies third-party requests against the top-document timeline', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({ requestId: 'd1', url: 'https://example.com/', type: 'main_frame' }),
      resp('d1', 'https://example.com/', 200, 'main_frame'),
      req({ requestId: 'f1', url: 'https://fonts.googleapis.com/css', type: 'stylesheet' }),
      resp('f1', 'https://fonts.googleapis.com/css', 200, 'stylesheet'),
      req({ requestId: 'f2', url: 'https://cdn.example.com/lib.js', type: 'script' }),
      resp('f2', 'https://cdn.example.com/lib.js', 200, 'script'),
    ]);
    const [doc, fonts, cdn] = c.getRequests();
    expect(doc.thirdParty).toBe(false);
    expect(fonts.thirdParty).toBe(true);
    // cdn.example.com shares the approximated registrable domain with example.com
    expect(cdn.thirdParty).toBe(false);
    expect(fonts.documentHost).toBe('example.com');
  });

  it('records network errors', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({ requestId: 'e1', url: 'https://missing.example/x', type: 'xmlhttprequest' }),
      {
        ...req({ requestId: 'e1', url: 'https://missing.example/x', type: 'xmlhttprequest' }),
        kind: 'error' as const,
        error: 'ERR_NAME_NOT_RESOLVED',
      },
    ]);
    const requests = c.getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].error).toBe('ERR_NAME_NOT_RESOLVED');
    expect(requests[0].status).toBeUndefined();
    const stats = c.getStats();
    expect(stats.errors).toBe(1);
  });

  it('computes session stats', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({ requestId: 'd1', url: 'https://example.com/', type: 'main_frame' }),
      resp('d1', 'https://example.com/', 200, 'main_frame'),
      req({ requestId: 'j1', url: 'https://example.com/app.js', type: 'script' }),
      resp('j1', 'https://example.com/app.js', 200, 'script'),
      req({ requestId: 'a1', url: 'https://api.example.com/x', type: 'xmlhttprequest' }),
      resp('a1', 'https://api.example.com/x', 500, 'xmlhttprequest'),
    ]);
    const stats = c.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byCategory.document).toBe(1);
    expect(stats.byCategory.script).toBe(1);
    expect(stats.byCategory.xhr).toBe(1);
    expect(stats.errors).toBe(1);
  });

  it('marks cached responses', () => {
    const c = new RequestCorrelator();
    push(c, [
      req({ requestId: 'cc', url: 'https://example.com/logo.png', type: 'image' }),
      {
        ...resp('cc', 'https://example.com/logo.png', 200, 'image'),
        fromCache: true,
        kind: 'completed' as const,
      },
    ]);
    const stats = c.getStats();
    expect(stats.cached).toBe(1);
    expect(c.getRequests()[0].fromCache).toBe(true);
  });
});
