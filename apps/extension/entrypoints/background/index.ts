/**
 * WebTrace background service worker.
 *
 * Pipeline: webRequest + webNavigation → normalize (with redaction) →
 * SessionManager (buffer + correlation) → broadcast to UIs + IndexedDB.
 */

import { browser, defineBackground } from '#imports';
import { attachMessaging } from './messaging';
import { attachPorts } from './ports';
import { SessionManager } from './sessions';
import { attachNavigationListeners } from './webnavigation';
import { attachWebRequestListeners } from './webrequest';
import { pruneSessions } from './persistence';

export default defineBackground(() => {
  const mgr = new SessionManager();

  let captureEnabled = true;
  const isEnabled = () => captureEnabled;

  // Load settings; keep the capture flag hot for synchronous listener paths.
  void browser.storage.local
    .get('captureEnabled')
    .then((stored) => {
      captureEnabled = stored.captureEnabled !== false;
    })
    .catch(() => {});

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.captureEnabled) {
      captureEnabled = changes.captureEnabled.newValue !== false;
    }
  });

  attachWebRequestListeners(mgr, isEnabled);
  attachNavigationListeners(mgr, isEnabled);
  attachPorts(mgr);
  attachMessaging(mgr, isEnabled);

  // Track page url/title per session (for the popup overview).
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!captureEnabled) return;
    const session = mgr.get(tabId);
    if (!session) return;
    if (changeInfo.url) session.url = changeInfo.url;
    if (changeInfo.title) session.title = changeInfo.title;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    void mgr.removeTab(tabId);
  });

  // Startup housekeeping: bound the local storage footprint.
  void pruneSessions().catch(() => {});
});
