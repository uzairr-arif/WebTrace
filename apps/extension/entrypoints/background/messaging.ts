/**
 * Runtime messaging — request/response API for popup, side panel and options.
 */

import { browser } from '#imports';
import { allSessions, clearAllSessions, deleteSession } from './persistence';
import { SessionManager, type SessionState } from './sessions';
import type { SenderLike } from '../../lib/browser-types';
import type {
  ActiveTabInfo,
  BackgroundMessage,
  Settings,
  TabOverview,
} from '../../lib/messages';

export function attachMessaging(
  mgr: SessionManager,
  getCaptureEnabled: () => boolean,
): void {
  browser.runtime.onMessage.addListener((msg: unknown, sender, sendResponse) => {
    void handle(mgr, getCaptureEnabled, msg as BackgroundMessage, sender)
      .then(sendResponse)
      .catch(() => sendResponse(undefined));
    return true; // async response
  });
}

async function handle(
  mgr: SessionManager,
  getCaptureEnabled: () => boolean,
  message: BackgroundMessage,
  sender: SenderLike,
): Promise<unknown> {
  if (!message || typeof message.type !== 'string') return undefined;

  switch (message.type) {
    case 'webtrace:getTabOverview': {
      const tabId = await resolveTabId(message.tabId, sender);
      const session = mgr.get(tabId);
      return {
        tabId,
        stats: mgr.stats(tabId),
        captureEnabled: getCaptureEnabled(),
        sessionStartedAt: session?.startedAt,
        pageUrl: session?.url,
        pageTitle: session?.title,
      } satisfies TabOverview;
    }

    case 'webtrace:clearSession': {
      const tabId = await resolveTabId(message.tabId, sender);
      mgr.clear(tabId);
      return { ok: true };
    }

    case 'webtrace:clearAllData': {
      await clearAllSessions();
      return { ok: true };
    }

    case 'webtrace:setCapture': {
      await browser.storage.local.set({ captureEnabled: message.enabled === true });
      return { ok: true };
    }

    case 'webtrace:getSettings': {
      const stored = (await browser.storage.local.get([
        'captureEnabled',
        'themeMode',
        'accentColor',
        'learningMode',
      ])) as Record<string, unknown>;
      return {
        captureEnabled: stored.captureEnabled !== undefined ? stored.captureEnabled === true : true,
        themeMode: typeof stored.themeMode === 'string' ? (stored.themeMode as Settings['themeMode']) : 'system',
        accentColor: typeof stored.accentColor === 'string' ? stored.accentColor : '#22d3ee',
        learningMode: stored.learningMode === true,
      } satisfies Settings;
    }

    case 'webtrace:setSetting': {
      if (message.key) await browser.storage.local.set({ [message.key]: message.value });
      return { ok: true };
    }

    case 'webtrace:getActiveTab': {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      return {
        id: tab?.id,
        url: tab?.url,
        title: tab?.title,
      } satisfies ActiveTabInfo;
    }

    case 'webtrace:getLatestActiveSession': {
      // Used when the active tab IS an extension page (e.g. the side panel
      // opened as a tab): fall back to the tab that saw the latest activity.
      const latest = mgr.mostRecentActive();
      return { tabId: latest?.tabId };
    }

    case 'webtrace:openDashboard': {
      await browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
      return { ok: true };
    }

    case 'webtrace:listSessions': {
      const stored = await allSessions();
      const sessions = stored
        .map((s) => ({
          id: s.id,
          tabId: s.tabId,
          startedAt: s.startedAt,
          updatedAt: s.updatedAt,
          url: s.url,
          title: s.title,
          eventCount: s.events.length,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return { sessions };
    }

    case 'webtrace:getSession': {
      const stored = await allSessions();
      const found = stored.find((s) => s.id === message.id);
      if (!found) return undefined;
      return {
        meta: {
          id: found.id,
          tabId: found.tabId,
          startedAt: found.startedAt,
          updatedAt: found.updatedAt,
          url: found.url,
          title: found.title,
          eventCount: found.events.length,
        },
        events: found.events,
      };
    }

    case 'webtrace:deleteSession': {
      await deleteSession(message.id);
      return { ok: true };
    }

    case 'webtrace:openSidePanel': {
      const tabId = await resolveTabId(message.tabId, sender);
      if (tabId >= 0) {
        try {
          await browser.sidePanel.open({ tabId });
          return { ok: true };
        } catch {
          return { ok: false };
        }
      }
      return { ok: false };
    }

    default:
      return undefined;
  }
}

async function resolveTabId(
  explicit: number | undefined,
  sender: SenderLike,
): Promise<number> {
  if (typeof explicit === 'number' && explicit >= 0) return explicit;
  if (sender?.tab?.id !== undefined) return sender.tab.id;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? -1;
}

export type { SessionState };
