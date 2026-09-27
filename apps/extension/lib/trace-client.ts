/**
 * useTraceSession — the side panel's live connection.
 *
 * The UI is a pure projection of the normalized event stream: the background
 * broadcasts TraceEvents, this hook replays them through a local
 * RequestCorrelator and re-derives requests / navigations / stats. Same code
 * path the tests exercise — what you see is what the engine understood.
 */

import {
  emptyStats,
  RequestCorrelator,
  type NavigationRecord,
  type RequestRecord,
  type SessionStats,
  type TraceEvent,
} from '@webtrace/core';
import { browser } from '#imports';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendToBackground,
  WATCH_PORT,
  type ActiveTabInfo,
  type PortClientMessage,
  type PortServerMessage,
} from './messages';

export interface TraceSessionState {
  status: 'connecting' | 'live' | 'unavailable';
  tabId: number;
  requests: RequestRecord[];
  navigations: NavigationRecord[];
  stats: SessionStats;
  clear: () => void;
}

const FLUSH_MS = 120;

export function useTraceSession(): TraceSessionState {
  const [tabId, setTabId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const correlatorRef = useRef<RequestCorrelator | null>(null);
  const flushTimer = useRef<number | undefined>(undefined);

  // 1 — resolve which tab to trace (explicit ?tab= param wins; side panels
  // opened by the browser usually provide their tab via the background).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const param = new URLSearchParams(window.location.search).get('tab');
      const parsed = param !== null ? Number(param) : Number.NaN;
      if (Number.isFinite(parsed) && parsed >= 0) {
        if (!cancelled) setTabId(parsed);
        return;
      }
      const active = await sendToBackground<ActiveTabInfo>({
        type: 'webtrace:getActiveTab',
      });
      const activeId = active?.id;
      const activeIsExtensionPage =
        activeId === undefined || (active?.url ?? '').startsWith('chrome-extension://');
      if (!activeIsExtensionPage && activeId !== undefined) {
        if (!cancelled) setTabId(activeId);
        return;
      }
      const latest = await sendToBackground<{ tabId?: number }>({
        type: 'webtrace:getLatestActiveSession',
      });
      if (!cancelled) setTabId(latest?.tabId ?? -1);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2 — attach and stream.
  useEffect(() => {
    if (tabId === null || tabId < 0) return;
    const correlator = new RequestCorrelator();
    correlatorRef.current = correlator;

    let port: ReturnType<typeof browser.runtime.connect>;
    try {
      port = browser.runtime.connect({ name: WATCH_PORT });
    } catch {
      return;
    }

    const flush = () => {
      if (flushTimer.current !== undefined) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = undefined;
      }
      setVersion((v) => v + 1);
    };
    const scheduleFlush = () => {
      if (flushTimer.current === undefined) {
        flushTimer.current = window.setTimeout(flush, FLUSH_MS);
      }
    };

    port.onMessage.addListener((raw: PortServerMessage) => {
      if (raw.tabId !== tabId) return;
      if (raw.type === 'webtrace:snapshot') {
        correlator.reset();
        for (const event of raw.events) correlator.push(event);
        flush();
      } else if (raw.type === 'webtrace:event') {
        correlator.push(raw.event);
        scheduleFlush();
      } else if (raw.type === 'webtrace:reset') {
        correlator.reset();
        flush();
      }
    });

    try {
      port.postMessage({ type: 'webtrace:attach', tabId } satisfies PortClientMessage);
    } catch {
      /* background restarting; snapshot will re-attach on next connect */
    }

    return () => {
      try {
        port.disconnect();
      } catch {
        /* already gone */
      }
      if (flushTimer.current !== undefined) window.clearTimeout(flushTimer.current);
    };
  }, [tabId]);

  // 3 — derive the renderable model on every flush.
  const derived = useMemo(() => {
    const correlator = correlatorRef.current;
    if (!correlator) {
      return { requests: [] as RequestRecord[], navigations: [] as NavigationRecord[], stats: emptyStats() };
    }
    return {
      requests: correlator.getRequests(),
      navigations: correlator.getNavigations(),
      stats: correlator.getStats(),
    };
    // version is the change signal; correlatorRef is stable per session
  }, [version]);

  const clear = useCallback(() => {
    if (tabId !== null && tabId >= 0) {
      void sendToBackground({ type: 'webtrace:clearSession', tabId });
    }
  }, [tabId]);

  const status: TraceSessionState['status'] =
    tabId === null ? 'connecting' : tabId < 0 ? 'unavailable' : 'live';

  return { status, tabId: tabId ?? -1, clear, ...derived };
}

export type { TraceEvent };
