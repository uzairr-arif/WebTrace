import { describe, expect, it } from 'vitest';
import { applyFilter, parseQuery } from './query';
import type { RequestRecord } from '../models/types';

function record(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'r#0',
    requestId: 'r',
    hopIndex: 0,
    url: 'https://api.example.com/products?page=2',
    host: 'api.example.com',
    path: '/products?page=2',
    method: 'GET',
    status: 200,
    resourceType: 'xmlhttprequest',
    category: 'xhr',
    tabId: 1,
    thirdParty: false,
    ...overrides,
  };
}

describe('parseQuery', () => {
  it('parses status, type, method and free text', () => {
    const f = parseQuery('status:500 type:fetch /api/ method:POST');
    expect(f.status).toBe(500);
    expect(f.type).toBe('xhr');
    expect(f.method).toBe('POST');
    expect(f.text).toContain('/api/');
  });

  it('parses status classes like 4xx', () => {
    const f = parseQuery('status:4xx');
    expect(f.statusClass).toBe(4);
  });

  it('parses boolean flags', () => {
    expect(parseQuery('third-party:true').thirdParty).toBe(true);
    expect(parseQuery('error:true').error).toBe(true);
    expect(parseQuery('cached:false').cached).toBe(false);
  });

  it('treats unknown keys as free text', () => {
    const f = parseQuery('weird:token');
    expect(f.text).toContain('weird:token');
  });
});

describe('matchesFilter', () => {
  it('matches status classes and categories', () => {
    const r = record({ status: 404, category: 'xhr' });
    expect(applyFilter([r], 'status:4xx')).toHaveLength(1);
    expect(applyFilter([r], 'status:200')).toHaveLength(0);
    expect(applyFilter([r], 'type:api')).toHaveLength(1);
    expect(applyFilter([record()], 'error:true')).toHaveLength(0);
    expect(applyFilter([record({ status: 500 })], 'error:true')).toHaveLength(1);
    expect(applyFilter([record({ thirdParty: true })], 'third-party:true')).toHaveLength(1);
    expect(applyFilter([record()], '/products')).toHaveLength(1);
    expect(applyFilter([record()], '/missing')).toHaveLength(0);
    expect(applyFilter([record()], 'domain:api.example')).toHaveLength(1);
    expect(applyFilter([record()], 'method:POST')).toHaveLength(0);
  });
});
