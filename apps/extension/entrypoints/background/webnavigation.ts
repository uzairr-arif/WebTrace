/**
 * webNavigation capture — page-level anchors for the flow.
 * Navigations are the roots of the flow graph; DOMContentLoaded/Completed
 * milestones enrich the timeline. History pushState navigations are tagged.
 *
 * Extension pages (side panel, popup, options) are ignored — WebTrace does
 * not trace itself, and a self-session would shadow real tabs in the
 * "most recent active session" fallback.
 */

import {
  eventFromNavigation,
  type TraceEvent,
} from '@webtrace/core';
import { browser } from '#imports';
import type { SessionManager } from './sessions';

function shouldIgnore(url: string | undefined): boolean {
  const u = url ?? '';
  return (
    u.startsWith('chrome-extension://') ||
    u.startsWith('moz-extension://') ||
    u.startsWith('devtools://') ||
    u.startsWith('about:') ||
    u === ''
  );
}

export function attachNavigationListeners(
  mgr: SessionManager,
  isEnabled: () => boolean,
): void {
  const handle = (event: TraceEvent) => mgr.push(event.tabId, event);
  const api = browser.webNavigation;

  api.onBeforeNavigate.addListener((details) => {
    if (isEnabled() && details.tabId >= 0 && !shouldIgnore(details.url)) {
      handle(eventFromNavigation(details, 'before'));
    }
  });

  api.onCommitted.addListener((details) => {
    if (isEnabled() && details.tabId >= 0 && !shouldIgnore(details.url)) {
      handle(eventFromNavigation(details, 'committed'));
    }
  });

  api.onDOMContentLoaded.addListener((details) => {
    if (isEnabled() && details.tabId >= 0 && !shouldIgnore(details.url)) {
      handle(eventFromNavigation(details, 'dom-content-loaded'));
    }
  });

  api.onCompleted.addListener((details) => {
    if (isEnabled() && details.tabId >= 0 && !shouldIgnore(details.url)) {
      handle(eventFromNavigation(details, 'completed'));
    }
  });

  api.onHistoryStateUpdated.addListener((details) => {
    if (isEnabled() && details.tabId >= 0 && !shouldIgnore(details.url)) {
      handle(eventFromNavigation(details, 'history', { isHistory: true }));
    }
  });
}
