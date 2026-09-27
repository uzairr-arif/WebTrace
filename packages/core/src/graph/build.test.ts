import { describe, expect, it } from 'vitest';
import { eventFromBeforeRequest, eventFromHeadersReceived } from '../events/normalize';
import { RequestCorrelator } from '../correlation/correlator';
import { buildFlowGraph } from './build';

let clock = 0;
function req(
  requestId: string,
  url: string,
  type: string,
  method = 'GET',
): ReturnType<typeof eventFromBeforeRequest> {
  clock += 10;
  return eventFromBeforeRequest({
    requestId,
    url,
    method,
    frameId: type === 'main_frame' ? 0 : 0,
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

describe('buildFlowGraph', () => {
  it('roots subresources at the navigation node', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('j', 'https://example.com/app.js', 'script'));
    c.push(resp('j', 'https://example.com/app.js', 'script'));
    c.push(req('a', 'https://example.com/api/products', 'xmlhttprequest'));
    c.push(resp('a', 'https://example.com/api/products', 'xmlhttprequest'));

    const graph = buildFlowGraph(c.getNavigations(), c.getRequests());
    const navNode = graph.nodes.find((n) => n.data.kind === 'navigation');
    expect(navNode).toBeDefined();

    const jsNode = graph.nodes.find((n) => n.data.url === 'https://example.com/app.js');
    const apiNode = graph.nodes.find((n) => n.data.url === 'https://example.com/api/products');
    expect(jsNode).toBeDefined();
    expect(apiNode).toBeDefined();

    const jsEdge = graph.edges.find((e) => e.target === jsNode!.id);
    const apiEdge = graph.edges.find((e) => e.target === apiNode!.id);
    expect(jsEdge?.source).toBe(navNode!.id);
    expect(jsEdge?.relation).toBe('resource-of');
    expect(apiEdge?.relation).toBe('initiated-by-script');
    expect(apiEdge?.label).toBe('JavaScript');
    expect(apiEdge?.evidence).toBe('derived');
  });

  it('wires redirect chains as request→request edges', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('r', 'https://example.com/old', 'xmlhttprequest'));
    c.push(resp('r', 'https://example.com/old', 'xmlhttprequest', 301));
    c.push({ ...req('r', 'https://example.com/new', 'xmlhttprequest'), kind: 'redirect' as const });
    c.push(req('r', 'https://example.com/new', 'xmlhttprequest'));
    c.push(resp('r', 'https://example.com/new', 'xmlhttprequest'));

    const graph = buildFlowGraph(c.getNavigations(), c.getRequests());
    const hop2 = graph.nodes.find((n) => n.data.url === 'https://example.com/new');
    const hop1 = graph.nodes.find((n) => n.data.url === 'https://example.com/old');
    const edge = graph.edges.find((e) => e.target === hop2!.id);
    expect(edge?.source).toBe(hop1!.id);
    expect(edge?.relation).toBe('redirect');
    expect(edge?.evidence).toBe('observed');
    expect(hop2!.x).toBeGreaterThan(hop1!.x);
  });

  it('layers nodes left-to-right by depth', () => {
    const c = new RequestCorrelator();
    c.push(req('d', 'https://example.com/', 'main_frame'));
    c.push(resp('d', 'https://example.com/', 'main_frame'));
    c.push(req('css', 'https://example.com/s.css', 'stylesheet'));
    c.push(resp('css', 'https://example.com/s.css', 'stylesheet'));
    const graph = buildFlowGraph(c.getNavigations(), c.getRequests());
    const navNode = graph.nodes.find((n) => n.data.kind === 'navigation')!;
    const css = graph.nodes.find((n) => n.data.url === 'https://example.com/s.css')!;
    expect(navNode.x).toBeLessThan(css.x);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });
});
