/**
 * Message protocol shared by every extension surface (popup, side panel,
 * options, background). One vocabulary, no stringly-typed drift.
 */

import type { SessionStats, TraceEvent } from '@webtrace/core';
import { browser } from '#imports';

/* ------------------------------- settings -------------------------------- */

export type ThemeMode = 'system' | 'dark' | 'light';
export type SettingKey = 'captureEnabled' | 'themeMode' | 'accentColor' | 'learningMode';

export interface Settings {
  captureEnabled: boolean;
  themeMode: ThemeMode;
  accentColor: string;
  learningMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  captureEnabled: true,
  themeMode: 'system',
  accentColor: '#22d3ee',
  learningMode: false,
};

/* --------------------------- request / response --------------------------- */

export interface TabOverview {
  tabId: number;
  stats: SessionStats;
  captureEnabled: boolean;
  sessionStartedAt?: number;
  pageUrl?: string;
  pageTitle?: string;
}

export interface ActiveTabInfo {
  id?: number;
  url?: string;
  title?: string;
}

export interface SessionMeta {
  id: string;
  tabId: number;
  startedAt: number;
  updatedAt: number;
  url?: string;
  title?: string;
  eventCount: number;
}

export interface StoredSessionFull {
  meta: SessionMeta;
  events: TraceEvent[];
}

export type BackgroundMessage =
  | { type: 'webtrace:getTabOverview'; tabId?: number }
  | { type: 'webtrace:clearSession'; tabId?: number }
  | { type: 'webtrace:clearAllData' }
  | { type: 'webtrace:setCapture'; enabled: boolean }
  | { type: 'webtrace:getSettings' }
  | { type: 'webtrace:setSetting'; key: SettingKey; value: unknown }
  | { type: 'webtrace:getActiveTab' }
  | { type: 'webtrace:getLatestActiveSession' }
  | { type: 'webtrace:openDashboard' }
  | { type: 'webtrace:listSessions' }
  | { type: 'webtrace:getSession'; id: string }
  | { type: 'webtrace:deleteSession'; id: string }
  | { type: 'webtrace:openSidePanel'; tabId?: number };

/* --------------------------- live streaming port --------------------------- */

export type PortClientMessage = { type: 'webtrace:attach'; tabId: number };

export type PortServerMessage =
  | { type: 'webtrace:snapshot'; tabId: number; events: TraceEvent[] }
  | { type: 'webtrace:event'; tabId: number; event: TraceEvent }
  | { type: 'webtrace:reset'; tabId: number };

export const WATCH_PORT = 'webtrace:watch';

/** Fire-and-forget helper that never rejects (UI must not crash when the
 *  service worker restarts mid-send). */
export function sendToBackground<T = unknown>(message: BackgroundMessage): Promise<T> {
  return (async () => {
    try {
      const response = (await browser.runtime.sendMessage(message)) as T | undefined;
      return response ?? (undefined as T);
    } catch {
      return undefined as T;
    }
  })();
}
