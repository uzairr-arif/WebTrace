/**
 * E2E — the whole pipeline in one pass:
 *
 *   fixture page fires requests
 *     → extension background observes (webRequest + webNavigation)
 *     → normalized events correlate into records
 *     → side panel renders the live flow
 *     → details drawer explains a request with evidence badges
 */

import { expect, test, type BrowserContext } from '@playwright/test';
import { chromium } from 'playwright';
import { join } from 'node:path';

const PATH_TO_EXTENSION = join(__dirname, '..', '..', 'apps', 'extension', '.output', 'chrome-mv3');

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${PATH_TO_EXTENSION}`,
      `--load-extension=${PATH_TO_EXTENSION}`,
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('captures a page load as an explainable live flow', async () => {
  // Extension identity via its service worker.
  let [sw] = context.serviceWorkers();
  if (!sw) {
    sw = await context.waitForEvent('serviceworker', { timeout: 20_000 });
  }
  const extensionId = new URL(sw.url()).host;
  expect(extensionId).toBeTruthy();

  // Drive the fixture site: HTML + CSS + JS + APIs + redirect chain + CORS.
  const page = await context.newPage();
  await page.goto('http://localhost:46001/');
  // The fixture sets its title only after every fetch finished (including the
  // cross-origin preflighted POST) — a reliable "traffic is done" signal.
  await expect(page).toHaveTitle(/fixture loaded/, { timeout: 20_000 });

  // Open the side panel UI as a tab; it falls back to the most recently
  // active session, which is the fixture tab.
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  // Flow nodes render for captured requests.
  await expect(panel.getByText('/api/products').first()).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText('/api/missing').first()).toBeVisible();

  // Click a node → details drawer with the honest Why story.
  await panel.getByText('/api/products').first().click();
  await expect(panel.getByText('Why did this happen?')).toBeVisible();
  await expect(panel.getByText('OBSERVED').first()).toBeVisible();
  await expect(panel.getByText('DERIVED').first()).toBeVisible();

  // The Requests view works too.
  await panel.getByRole('button', { name: /Requests/ }).click();
  await expect(panel.getByText('/api/user')).toBeVisible();
});
