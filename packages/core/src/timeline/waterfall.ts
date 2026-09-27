/**
 * Waterfall computation. webRequest gives us lifecycle timestamps, not the
 * browser's precise internal timing (that needs CDP), so phases are labeled
 * approximations via `approx: true` — honest about what they are:
 *   queued   — from request start to when headers are sent
 *   wait     — until the first response byte/headers arrive
 *   download — until the request completes
 */

import type { RequestRecord, Waterfall, WaterfallPhase } from '../models/types';

export function computeWaterfall(record: RequestRecord): Waterfall {
  const start = record.startedAt ?? 0;
  const sent = record.sentAt ?? record.responseStartedAt ?? record.completedAt ?? record.failedAt ?? start;
  const respStart = record.responseStartedAt ?? record.completedAt ?? record.failedAt ?? sent;
  const end = record.completedAt ?? record.failedAt ?? respStart;

  const approx =
    record.startedAt === undefined ||
    record.sentAt === undefined ||
    record.responseStartedAt === undefined ||
    (record.completedAt === undefined && record.failedAt === undefined);

  const phases: WaterfallPhase[] = [];
  pushPhase(phases, 'queued', start - start, sent - start);
  pushPhase(phases, 'wait', sent - start, respStart - start);
  pushPhase(phases, 'download', respStart - start, end - start);

  const totalMs = Math.max(0, end - start);
  let dominant: Waterfall['dominant'];
  let best = -1;
  for (const p of phases) {
    const len = p.endMs - p.startMs;
    if (len > best) {
      best = len;
      dominant = p.kind;
    }
  }

  return { phases, totalMs, dominant, approx };
}

function pushPhase(
  phases: WaterfallPhase[],
  kind: WaterfallPhase['kind'],
  startMs: number,
  endMs: number,
): void {
  if (endMs > startMs) phases.push({ kind, startMs, endMs });
}
