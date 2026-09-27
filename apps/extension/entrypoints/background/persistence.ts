/**
 * IndexedDB persistence — local only, per the privacy doctrine.
 * Stores compact session snapshots (normalized events). No request/response
 * bodies exist anywhere in the pipeline, so nothing sensitive can leak here.
 */

import type { TraceEvent } from '@webtrace/core';

const DB_NAME = 'webtrace';
const DB_VERSION = 1;
const STORE = 'sessions';
const MAX_SESSIONS = 30;

export interface StoredSession {
  id: string;
  tabId: number;
  startedAt: number;
  updatedAt: number;
  url?: string;
  title?: string;
  events: TraceEvent[];
}

let dbPromise: Promise<IDBDatabase | undefined> | undefined;

function openDb(): Promise<IDBDatabase | undefined> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('byTab', 'tabId');
          store.createIndex('byUpdated', 'updatedAt');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const tx = db.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const request = fn(store);
          tx.oncomplete = () => resolve(request ? (request as IDBRequest<T>).result : undefined);
          tx.onerror = () => resolve(undefined);
          tx.onabort = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function putSession(session: StoredSession): Promise<void> {
  await withStore('readwrite', (store) => {
    store.put(session);
  });
}

export async function latestSessionForTab(tabId: number): Promise<StoredSession | undefined> {
  const all = await withStore<StoredSession[]>('readonly', (store) =>
    store.index('byTab').getAll(tabId) as IDBRequest<StoredSession[]>,
  );
  if (!all || all.length === 0) return undefined;
  return all.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function allSessions(): Promise<StoredSession[]> {
  return (await withStore<StoredSession[]>('readonly', (store) =>
    store.getAll() as IDBRequest<StoredSession[]>,
  )) ?? [];
}

export async function deleteSession(id: string): Promise<void> {
  await withStore('readwrite', (store) => {
    store.delete(id);
  });
}

export async function clearAllSessions(): Promise<void> {
  await withStore('readwrite', (store) => {
    store.clear();
  });
}

/** Keep storage bounded: drop everything except the N most recent sessions. */
export async function pruneSessions(max = MAX_SESSIONS): Promise<void> {
  const sessions = await allSessions();
  if (sessions.length <= max) return;
  const sorted = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  for (const stale of sorted.slice(max)) await deleteSession(stale.id);
}
