/**
 * Port hub — live streaming to attached UIs (side panel).
 * A UI connects with port name `webtrace:watch`, sends one attach message,
 * receives a snapshot of the session so far, then a stream of events.
 */

import { browser } from '#imports';
import { WATCH_PORT, type PortServerMessage } from '../../lib/messages';
import type { PortLike } from '../../lib/browser-types';
import type { SessionManager } from './sessions';

const watchers = new Map<PortLike, number>();

export function attachPorts(mgr: SessionManager): void {
  mgr.setBroadcaster(({ type, tabId, event }) => {
    if (type === 'event' && event) {
      sendToTab(tabId, { type: 'webtrace:event', tabId, event });
    } else if (type === 'reset') {
      sendToTab(tabId, { type: 'webtrace:reset', tabId });
    }
  });

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== WATCH_PORT) return;

    port.onMessage.addListener((msg: unknown) => {
      const message = msg as { type?: string; tabId?: number };
      if (message?.type !== 'webtrace:attach' || typeof message.tabId !== 'number') return;
      const tabId = message.tabId;
      watchers.set(port, tabId);
      void mgr.ensure(tabId).then((session) => {
        tryPost(port, { type: 'webtrace:snapshot', tabId, events: session.events });
      });
    });

    port.onDisconnect.addListener(() => {
      watchers.delete(port);
    });
  });
}

function sendToTab(tabId: number, message: PortServerMessage): void {
  for (const [port, attachedTabId] of watchers) {
    if (attachedTabId === tabId) tryPost(port, message);
  }
}

function tryPost(port: PortLike, message: PortServerMessage): void {
  try {
    port.postMessage(message);
  } catch {
    watchers.delete(port);
  }
}

export function broadcastReset(tabId: number): void {
  sendToTab(tabId, { type: 'webtrace:reset', tabId });
}
