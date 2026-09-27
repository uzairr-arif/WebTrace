/**
 * SessionManager — one live session per tab.
 *
 * Owns the raw event buffer and a RequestCorrelator per session, batches
 * writes to IndexedDB, and notifies a broadcaster (ports.ts) of every event.
 * Designed around MV3 reality: the service worker can be killed at any time,
 * so sessions restore lazily from IndexedDB when a UI re-attaches.
 */

import { RequestCorrelator, uid, type SessionStats, type TraceEvent } from '@webtrace/core';
import {
  latestSessionForTab,
  putSession,
  type StoredSession,
} from './persistence';

const MAX_EVENTS_PER_SESSION = 4000;
const PERSIST_DEBOUNCE_MS = 800;

export interface SessionState {
  id: string;
  tabId: number;
  startedAt: number;
  updatedAt: number;
  url?: string;
  title?: string;
  events: TraceEvent[];
  correlator: RequestCorrelator;
}

type Broadcaster = (message: { type: 'event' | 'reset'; tabId: number; event?: TraceEvent }) => void;

export class SessionManager {
  private sessions = new Map<number, SessionState>();
  private persistTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private broadcaster: Broadcaster = () => {};

  setBroadcaster(fn: Broadcaster): void {
    this.broadcaster = fn;
  }

  /** Memory-first session access for synchronous listener paths. */
  get(tabId: number): SessionState | undefined {
    return this.sessions.get(tabId);
  }

  getOrCreate(tabId: number): SessionState {
    let session = this.sessions.get(tabId);
    if (!session) {
      session = {
        id: uid('session'),
        tabId,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        events: [],
        correlator: new RequestCorrelator(),
      };
      this.sessions.set(tabId, session);
    }
    return session;
  }

  /**
   * Async variant used when a UI attaches: restores the most recent stored
   * session for the tab if the service worker lost it (MV3 restart).
   */
  async ensure(tabId: number): Promise<SessionState> {
    const existing = this.sessions.get(tabId);
    if (existing) return existing;

    const stored = await latestSessionForTab(tabId);
    if (!stored || stored.events.length === 0) return this.getOrCreate(tabId);

    const session: SessionState = {
      id: stored.id,
      tabId,
      startedAt: stored.startedAt,
      updatedAt: stored.updatedAt,
      url: stored.url,
      title: stored.title,
      events: [],
      correlator: new RequestCorrelator(),
    };
    for (const event of stored.events) {
      session.events.push(event);
      session.correlator.push(event);
    }
    this.sessions.set(tabId, session);
    return session;
  }

  push(tabId: number, event: TraceEvent): void {
    if (tabId < 0) return;
    const session = this.getOrCreate(tabId);
    session.events.push(event);
    if (session.events.length > MAX_EVENTS_PER_SESSION) {
      session.events = session.events.slice(-MAX_EVENTS_PER_SESSION);
    }
    session.correlator.push(event);
    session.updatedAt = Date.now();
    this.broadcaster({ type: 'event', tabId, event });
    this.schedulePersist(session);
  }

  clear(tabId: number): void {
    const fresh = this.getOrCreate(tabId);
    fresh.id = uid('session');
    fresh.startedAt = Date.now();
    fresh.updatedAt = Date.now();
    fresh.url = undefined;
    fresh.title = undefined;
    fresh.events = [];
    fresh.correlator = new RequestCorrelator();
    this.broadcaster({ type: 'reset', tabId });
    this.schedulePersist(fresh);
  }

  async removeTab(tabId: number): Promise<void> {
    const session = this.sessions.get(tabId);
    if (session) {
      await this.persist(session);
      this.sessions.delete(tabId);
    }
    const timer = this.persistTimers.get(tabId);
    if (timer) clearTimeout(timer);
    this.persistTimers.delete(tabId);
  }

  stats(tabId: number): SessionStats {
    return this.get(tabId)?.correlator.getStats() ?? new RequestCorrelator().getStats();
  }

  /** Most recent session that actually saw activity — UI fallback target. */
  mostRecentActive(): SessionState | undefined {
    let best: SessionState | undefined;
    for (const session of this.sessions.values()) {
      if (session.events.length === 0) continue;
      if (!best || session.updatedAt > best.updatedAt) best = session;
    }
    return best;
  }

  async flushAll(): Promise<void> {
    for (const session of this.sessions.values()) await this.persist(session);
  }

  private schedulePersist(session: SessionState): void {
    const existing = this.persistTimers.get(session.tabId);
    if (existing) clearTimeout(existing);
    this.persistTimers.set(
      session.tabId,
      setTimeout(() => {
        this.persistTimers.delete(session.tabId);
        void this.persist(session);
      }, PERSIST_DEBOUNCE_MS),
    );
  }

  private async persist(session: SessionState): Promise<void> {
    const snapshot: StoredSession = {
      id: session.id,
      tabId: session.tabId,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      url: session.url,
      title: session.title,
      events: session.events,
    };
    await putSession(snapshot);
  }
}
