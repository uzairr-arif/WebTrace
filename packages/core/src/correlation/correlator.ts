/**
 * RequestCorrelator — WebTrace's most important component.
 *
 * It folds the flat stream of lifecycle events into structured understanding:
 *
 *   request events  ─┐
 *   responses        ├─► RequestRecords (one per redirect hop, linked into
 *   redirects        │     chains), navigation records, preflight pairing,
 *   errors          ─┘     third-party classification and session stats.
 *
 * Pure TypeScript: it knows nothing about browser APIs, which makes the whole
 * correlation layer unit-testable with synthetic event streams.
 */

import type { TraceEvent } from '../events/types';
import { uid } from '../id';
import { REQUEST_CATEGORIES, categorize } from '../models/categories';
import { hostOf, pathOf, sameSite } from '../models/hosts';
import type {
  NavigationRecord,
  RequestCategory,
  RequestRecord,
  SessionStats,
} from '../models/types';

const MAX_RECORDS = 2000;
const PREFLIGHT_WINDOW_MS = 10_000;
const MAX_PENDING_PREFLIGHTS = 50;

interface DocumentHostEntry {
  at: number;
  host: string;
}

export function emptyStats(): SessionStats {
  const byCategory = {} as Record<RequestCategory, number>;
  for (const c of REQUEST_CATEGORIES) byCategory[c] = 0;
  return { total: 0, byCategory, errors: 0, cached: 0, thirdPartyHosts: [] };
}

export class RequestCorrelator {
  private records = new Map<string, RequestRecord>();
  /** requestId → id of the record currently collecting lifecycle events. */
  private openByRequestId = new Map<string, string>();
  private hopCounts = new Map<string, number>();
  private navigations = new Map<string, NavigationRecord>();
  /** Per-tab history of top-document hosts, for third-party resolution. */
  private documentHosts = new Map<number, DocumentHostEntry[]>();
  private pendingPreflights: RequestRecord[] = [];

  push(event: TraceEvent): void {
    switch (event.kind) {
      case 'navigation':
        this.onNavigation(event);
        break;
      case 'request':
        this.onRequest(event);
        break;
      case 'request-sent':
        this.onRequestSent(event);
        break;
      case 'response':
        this.onResponse(event);
        break;
      case 'completed':
        this.onCompleted(event);
        break;
      case 'redirect':
        this.onRedirect(event);
        break;
      case 'error':
        this.onError(event);
        break;
    }
  }

  getRequests(): RequestRecord[] {
    const sorted = [...this.records.values()].sort(
      (a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0),
    );
    for (const r of sorted) this.resolveThirdParty(r);
    return sorted;
  }

  getNavigations(): NavigationRecord[] {
    return [...this.navigations.values()].sort(
      (a, b) =>
        (a.committedAt ?? a.startedAt ?? 0) - (b.committedAt ?? b.startedAt ?? 0),
    );
  }

  getStats(): SessionStats {
    const stats = emptyStats();
    for (const r of this.records.values()) {
      this.resolveThirdParty(r);
      stats.total += 1;
      stats.byCategory[r.category] += 1;
      if (!r.isPreflight) {
        const failed = r.error !== undefined || (r.status !== undefined && r.status >= 400);
        if (failed) stats.errors += 1;
        if (r.fromCache) stats.cached += 1;
      }
      if (r.thirdParty && r.host && !stats.thirdPartyHosts.includes(r.host)) {
        stats.thirdPartyHosts.push(r.host);
      }
    }
    return stats;
  }

  reset(): void {
    this.records.clear();
    this.openByRequestId.clear();
    this.hopCounts.clear();
    this.navigations.clear();
    this.documentHosts.clear();
    this.pendingPreflights = [];
  }

  /* ------------------------------ event handlers ----------------------------- */

  private onNavigation(event: TraceEvent): void {
    const phase = event.navigationPhase ?? 'committed';
    const navId = event.documentId ?? `nav:${event.tabId}:${event.frameId}:${event.timestamp}`;
    let nav = this.navigations.get(navId);
    if (!nav) {
      nav = {
        id: navId,
        tabId: event.tabId,
        frameId: event.frameId ?? 0,
        url: event.url ?? '',
        host: hostOf(event.url),
        path: pathOf(event.url),
      };
      this.navigations.set(navId, nav);
    }
    if (phase === 'before' || phase === 'history') {
      nav.startedAt = event.timestamp;
      nav.isHistory = phase === 'history' || event.isHistoryNavigation === true;
    }
    if (phase === 'committed') {
      nav.committedAt = event.timestamp;
      nav.transitionType = event.transitionType;
      nav.isHistory = event.isHistoryNavigation === true;
    }
    if (phase === 'dom-content-loaded') nav.domContentLoadedAt = event.timestamp;
    if (phase === 'completed') nav.completedAt = event.timestamp;
    if (event.url) {
      nav.url = event.url;
      nav.host = hostOf(event.url);
      nav.path = pathOf(event.url);
    }

    // Backfill: requests that carry this documentId belong to this navigation.
    if (event.documentId) {
      for (const r of this.records.values()) {
        if (r.documentId === event.documentId && !r.navigationId) {
          r.navigationId = navId;
        }
      }
    }

    // Track top-document hosts (used for third-party classification).
    if (event.frameId === 0 && phase === 'committed' && !nav.isHistory) {
      const host = hostOf(event.url);
      if (host) this.pushDocumentHost(event.tabId, event.timestamp, host);
    }
  }

  private onRequest(event: TraceEvent): void {
    if (!event.requestId || !event.url) return;
    const currentId = this.openByRequestId.get(event.requestId);
    const current = currentId ? this.records.get(currentId) : undefined;

    if (current && current.url === event.url) {
      // Re-emitted start for the same hop — enrich, don't duplicate.
      current.initiator ??= event.initiator;
      current.documentId ??= event.documentId;
      return;
    }

    const hopIndex = this.hopCounts.get(event.requestId) ?? 0;
    this.hopCounts.set(event.requestId, hopIndex + 1);
    const record: RequestRecord = {
      id: `${event.requestId}#${hopIndex}`,
      requestId: event.requestId,
      hopIndex,
      url: event.url,
      host: hostOf(event.url),
      path: pathOf(event.url),
      method: event.method ?? 'GET',
      resourceType: event.resourceType ?? 'other',
      category: categorize(event.resourceType, event.url),
      tabId: event.tabId,
      frameId: event.frameId,
      documentId: event.documentId,
      initiator: event.initiator,
      startedAt: event.timestamp,
      redirectOfId: current?.id,
    };
    if (event.documentId) {
      record.navigationId = this.navigations.has(event.documentId)
        ? event.documentId
        : undefined;
    }
    this.records.set(record.id, record);
    this.openByRequestId.set(event.requestId, record.id);
    this.enforceCap();
    this.trackDocument(record);
    // Preflight identity is known at request time — pairing (below) only
    // needs the OPTIONS record to exist before the real request starts.
    if (
      record.method === 'OPTIONS' &&
      record.category !== 'document'
    ) {
      record.isPreflight = true;
      this.pendingPreflights.push(record);
      if (this.pendingPreflights.length > MAX_PENDING_PREFLIGHTS) {
        this.pendingPreflights = this.pendingPreflights.slice(-MAX_PENDING_PREFLIGHTS);
      }
    } else {
      this.pairPreflight(record);
    }
  }

  private onRequestSent(event: TraceEvent): void {
    const record = this.openRecord(event.requestId);
    if (!record) return;
    record.sentAt = event.timestamp;
    record.requestHeaders ??= event.requestHeaders;
  }

  private onResponse(event: TraceEvent): void {
    const record = this.openRecord(event.requestId);
    if (!record) return;
    if (event.status !== undefined) record.status = event.status;
    record.responseHeaders ??= event.responseHeaders;
    record.responseStartedAt ??= event.timestamp;
  }

  private onCompleted(event: TraceEvent): void {
    const record = this.openRecord(event.requestId);
    if (!record) return;
    record.completedAt = event.timestamp;
    if (event.status !== undefined) record.status = event.status;
    record.fromCache = event.fromCache;
    if (event.ip) record.ip = event.ip;
    this.finish(record);
  }

  private onRedirect(event: TraceEvent): void {
    const record = this.openRecord(event.requestId);
    if (!record) return;
    if (event.status !== undefined) record.status = event.status;
    record.responseHeaders ??= event.responseHeaders;
    record.fromCache = event.fromCache;
    record.completedAt = event.timestamp;
    this.finish(record);
    // The next hop will arrive as a new 'request' event with the same
    // requestId and the redirect target URL.
  }

  private onError(event: TraceEvent): void {
    let record = this.openRecord(event.requestId);
    if (!record && event.url) {
      // Errors can arrive without a surviving start (e.g. after a restart).
      record = {
        id: `${event.requestId ?? uid('req')}#0`,
        requestId: event.requestId ?? '',
        hopIndex: 0,
        url: event.url,
        host: hostOf(event.url),
        path: pathOf(event.url),
        method: event.method ?? 'GET',
        resourceType: event.resourceType ?? 'other',
        category: categorize(event.resourceType, event.url),
        tabId: event.tabId,
        frameId: event.frameId,
        documentId: event.documentId,
        startedAt: event.timestamp,
      };
      this.records.set(record.id, record);
      if (event.requestId) this.openByRequestId.set(event.requestId, record.id);
      this.trackDocument(record);
    }
    if (!record) return;
    record.error = event.error ?? 'unknown error';
    record.failedAt = event.timestamp;
    if (event.status !== undefined) record.status = event.status;
    this.finish(record);
  }

  /* ------------------------------- correlation ------------------------------- */

  private openRecord(requestId: string | undefined): RequestRecord | undefined {
    if (!requestId) return undefined;
    const id = this.openByRequestId.get(requestId);
    return id ? this.records.get(id) : undefined;
  }

  private finish(record: RequestRecord): void {
    const end = record.completedAt ?? record.failedAt;
    if (end !== undefined && record.startedAt !== undefined) {
      record.durationMs = Math.max(0, end - record.startedAt);
    }
  }

  /** Pair a just-started request with an earlier matching OPTIONS record. */
  private pairPreflight(record: RequestRecord): void {
    if (record.isPreflight || record.method === 'OPTIONS' || !record.url) return;
    const idx = this.pendingPreflights.findIndex(
      (p) =>
        p.tabId === record.tabId &&
        p.url === record.url &&
        !p.preflightForId &&
        p.startedAt !== undefined &&
        record.startedAt !== undefined &&
        p.startedAt <= record.startedAt &&
        record.startedAt - p.startedAt <= PREFLIGHT_WINDOW_MS,
    );
    if (idx === -1) return;
    const [preflight] = this.pendingPreflights.splice(idx, 1);
    record.preflightOfId = preflight.id;
    preflight.preflightForId = record.id;
  }

  private trackDocument(record: RequestRecord): void {
    if (record.category === 'document' && record.frameId === 0 && record.host) {
      this.pushDocumentHost(record.tabId, record.startedAt ?? 0, record.host);
      // Synthesize a navigation record so downstream layers (graph roots,
      // explain context) have an anchor even without webNavigation events.
      // If real webNavigation events arrive later, they upsert by the same id.
      const navId = record.documentId ?? `nav:${record.tabId}:0:${record.startedAt ?? 0}`;
      if (!this.navigations.has(navId)) {
        this.navigations.set(navId, {
          id: navId,
          tabId: record.tabId,
          frameId: 0,
          url: record.url,
          host: record.host,
          path: record.path,
          committedAt: record.startedAt,
        });
      }
      record.navigationId ??= navId;
    }
  }

  private pushDocumentHost(tabId: number, at: number, host: string): void {
    const timeline = this.documentHosts.get(tabId) ?? [];
    const last = timeline[timeline.length - 1];
    if (last && last.host === host) {
      last.at = Math.max(last.at, at);
      return;
    }
    timeline.push({ at, host });
    this.documentHosts.set(tabId, timeline);
    if (timeline.length > 50) this.documentHosts.set(tabId, timeline.slice(-50));
  }

  /** Resolve documentHost + thirdParty from the tab's top-document timeline. */
  private resolveThirdParty(record: RequestRecord): void {
    if (record.documentHost !== undefined) return;
    const timeline = this.documentHosts.get(record.tabId) ?? [];
    const at = record.startedAt ?? 0;
    let host: string | undefined;
    for (const entry of timeline) {
      if (entry.at <= at) host = entry.host;
      else break;
    }
    record.documentHost = host;
    record.thirdParty =
      host !== undefined && record.host !== '' && !sameSite(host, record.host)
        ? true
        : false;
  }

  private enforceCap(): void {
    if (this.records.size <= MAX_RECORDS) return;
    const oldest = this.getRequests().slice(0, this.records.size - MAX_RECORDS);
    for (const r of oldest) {
      this.records.delete(r.id);
      if (this.openByRequestId.get(r.requestId) === r.id) {
        this.openByRequestId.delete(r.requestId);
      }
    }
  }
}
