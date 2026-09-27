import { describe, expect, it } from 'vitest';
import { eventFromBeforeRequest, eventFromHeadersReceived } from '../events/normalize';
import { RequestCorrelator } from '../correlation/correlator';
import { explainRequest } from './engine';

let clock = 0;
function req(
  requestId: string,
  url: string,
  type: string,
  method = 'GET',
  frameId = 0,
): ReturnType<typeof eventFromBeforeRequest> {
  clock += 10;
  return eventFromBeforeRequest({
    requestId,
    url,
    method,
    frameId,
    parentFrameId: -1,
    documentId: 'doc1',
    tabId: 1,
    type,
    timeStamp: clock,
  });
}

function resp(requestId: string, url: string, type: string, status = 200) {
  clock += 10;
  return eventFromHeadersReceived({
    requestId,
    url,
    method: 'GET',
    frameId: 0,
    parentFrameId: -1,
    documentId: 'doc1',
    tabId: 1,
    type,
    timeStamp: clock,
    statusCode: status,
  });
}

describe('explainRequest', () => {
  it('tells the story of a page load', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    const explanation = explainRequest(
      c.getRequests()[0],
      c.getNavigations(),
      c.getRequests(),
    );
    const joined = explanation.steps.map((s) => s.text).join(' ');
    expect(joined).toContain('You loaded example.com');
    expect(joined).toContain('HTML document');
    expect(joined).toContain('HTTP 200');
    // every step is tagged
    for (const step of explanation.steps) {
      expect(['observed', 'derived', 'instrumented']).toContain(step.source);
    }
  });

  it('explains a JSON API call and marks inference honestly', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('a', 'https://example.com/api/products', 'xmlhttprequest'));
    c.push({
      ...resp('a', 'https://example.com/api/products', 'xmlhttprequest'),
      responseHeaders: { 'Content-Type': 'application/json' },
    });
    const api = c.getRequests().find((r) => r.category === 'xhr')!;
    const explanation = explainRequest(api, c.getNavigations(), c.getRequests());
    const joined = explanation.steps.map((s) => s.text).join(' ');
    expect(joined).toContain('JavaScript');
    // the script attribution must be DERIVED, not claimed as observed
    const jsStep = explanation.steps.find((s) => s.text.includes('JavaScript'));
    expect(jsStep?.source).toBe('derived');
    expect(joined).toContain('JSON');
  });

  it('narrates redirect chains hop by hop', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('r', 'https://example.com/old', 'xmlhttprequest'));
    c.push(resp('r', 'https://example.com/old', 'xmlhttprequest', 301));
    c.push({ ...req('r', 'https://example.com/new', 'xmlhttprequest'), kind: 'redirect' as const });
    c.push(req('r', 'https://example.com/new', 'xmlhttprequest'));
    c.push(resp('r', 'https://example.com/new', 'xmlhttprequest'));
    const final = c.getRequests().find((r) => r.url === 'https://example.com/new')!;
    const explanation = explainRequest(final, c.getNavigations(), c.getRequests());
    const redirectSteps = explanation.steps.filter((s) => s.terms?.includes('redirect'));
    expect(redirectSteps.length).toBeGreaterThanOrEqual(1);
    expect(explanation.steps.map((s) => s.text).join(' ')).toContain('HTTP 301');
  });

  it('decodes network errors and references the cause', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('e', 'https://nope.example/x', 'xmlhttprequest'));
    c.push({
      ...req('e', 'https://nope.example/x', 'xmlhttprequest'),
      kind: 'error' as const,
      error: 'ERR_NAME_NOT_RESOLVED',
    });
    const failed = c.getRequests().find((r) => r.error)!;
    const explanation = explainRequest(failed, c.getNavigations(), c.getRequests());
    const joined = explanation.steps.map((s) => s.text).join(' ');
    expect(joined).toContain('DNS');
    const errStep = explanation.steps.find((s) => s.text.includes('DNS'));
    expect(errStep?.terms).toContain('DNS');
  });

  it('explains 401s with an interpretation step', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('u', 'https://example.com/api/profile', 'xmlhttprequest'));
    c.push(resp('u', 'https://example.com/api/profile', 'xmlhttprequest', 401));
    const unauth = c.getRequests().find((r) => r.status === 401)!;
    const explanation = explainRequest(unauth, c.getNavigations(), c.getRequests());
    const joined = explanation.steps.map((s) => s.text).join(' ');
    expect(joined).toContain('401');
    expect(joined).toContain('login');
  });
});
