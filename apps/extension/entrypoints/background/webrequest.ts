/**
 * webRequest capture — the OBSERVED layer.
 *
 * Listens to the full HTTP lifecycle and normalizes every callback into a
 * TraceEvent (redaction happens inside the normalizers, before anything is
 * stored or broadcast). Requests without a tab (service workers, other
 * extensions) and requests to extension/devtools pages are ignored — WebTrace
 * traces pages, not itself.
 */

import type { TraceEvent } from '@webtrace/core';
import {
  eventFromBeforeRedirect,
  eventFromBeforeRequest,
  eventFromCompleted,
  eventFromError,
  eventFromHeadersReceived,
  eventFromSendHeaders,
} from '@webtrace/core';
import { browser } from '#imports';
import type { SessionManager } from './sessions';

const URL_FILTER = { urls: ['<all_urls>'] };

function shouldIgnore(details: { tabId: number; url: string }): boolean {
  if (details.tabId < 0) return true;
  const url = details.url ?? '';
  return (
    url.startsWith('chrome-extension://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('devtools://') ||
    url.startsWith('about:')
  );
}

export function attachWebRequestListeners(
  mgr: SessionManager,
  isEnabled: () => boolean,
): void {
  const handle = (event: TraceEvent) => mgr.push(event.tabId, event);
  // Non-blocking listeners: the typings still model a BlockingResponse return,
  // so every handler explicitly returns undefined.
  const noop = undefined;

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (isEnabled() && !shouldIgnore(details)) handle(eventFromBeforeRequest(details));
      return noop;
    },
    URL_FILTER,
  );

  browser.webRequest.onSendHeaders.addListener(
    (details) => {
      if (isEnabled() && !shouldIgnore(details)) handle(eventFromSendHeaders(details));
      return noop;
    },
    URL_FILTER,
    ['requestHeaders', 'extraHeaders'],
  );

  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (isEnabled() && !shouldIgnore(details)) handle(eventFromHeadersReceived(details));
      return noop;
    },
    URL_FILTER,
    ['responseHeaders', 'extraHeaders'],
  );

  browser.webRequest.onBeforeRedirect.addListener(
    (details) => {
      if (isEnabled() && !shouldIgnore(details)) handle(eventFromBeforeRedirect(details));
      return noop;
    },
    URL_FILTER,
    ['responseHeaders', 'extraHeaders'],
  );

  browser.webRequest.onCompleted.addListener(
    (details) => {
      if (isEnabled() && !shouldIgnore(details)) handle(eventFromCompleted(details));
      return noop;
    },
    URL_FILTER,
    ['responseHeaders'],
  );

  browser.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (isEnabled() && !shouldIgnore(details)) handle(eventFromError(details));
      return noop;
    },
    URL_FILTER,
  );
}
