import { describe, expect, it } from 'vitest';
import { computeWaterfall } from './waterfall';
import type { RequestRecord } from '../models/types';

function record(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'r#0',
    requestId: 'r',
    hopIndex: 0,
    url: 'https://example.com/a.js',
    host: 'example.com',
    path: '/a.js',
    method: 'GET',
    resourceType: 'script',
    category: 'script',
    tabId: 1,
    startedAt: 1000,
    sentAt: 1012,
    responseStartedAt: 1044,
    completedAt: 1060,
    durationMs: 60,
    ...overrides,
  };
}

describe('computeWaterfall', () => {
  it('splits queued / wait / download phases', () => {
    const wf = computeWaterfall(record());
    expect(wf.approx).toBe(false);
    expect(wf.totalMs).toBe(60);
    expect(wf.phases).toEqual([
      { kind: 'queued', startMs: 0, endMs: 12 },
      { kind: 'wait', startMs: 12, endMs: 44 },
      { kind: 'download', startMs: 44, endMs: 60 },
    ]);
    expect(wf.dominant).toBe('wait');
  });

  it('flags approximated phases when lifecycle events are missing', () => {
    const wf = computeWaterfall(record({ sentAt: undefined, responseStartedAt: undefined }));
    expect(wf.approx).toBe(true);
    expect(wf.totalMs).toBe(60);
  });

  it('handles failed requests', () => {
    const wf = computeWaterfall(
      record({ failedAt: 1050, completedAt: undefined, responseStartedAt: undefined, sentAt: undefined }),
    );
    expect(wf.totalMs).toBe(50);
    expect(wf.dominant).toBe('queued');
  });
});
