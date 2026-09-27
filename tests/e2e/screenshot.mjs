/**
 * Product screenshots — loads the extension, drives the fixture site, and
 * captures themed screenshots for the README/website:
 *
 *   docs/screenshots/dark/   popup · details · dashboard · third-party
 *   docs/screenshots/light/  flow · timeline · dashboard
 *
 *   node screenshot.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ext = join(here, '..', '..', 'apps', 'extension', '.output', 'chrome-mv3');
const outRoot = join(here, '..', '..', 'docs', 'screenshots');

const server = spawn('node', [join(here, '..', 'fixtures', 'demo-site', 'server.mjs')], {
  stdio: 'pipe',
});
await new Promise((resolve, reject) => {
  const tick = async () => {
    try {
      await fetch('http://localhost:46001/');
      resolve();
    } catch {
      setTimeout(tick, 200);
    }
  };
  setTimeout(tick, 300);
  setTimeout(() => reject(new Error('fixture did not start')), 10_000);
});

/** Launch an extension context pinned to a color scheme. */
async function launch(colorScheme) {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    colorScheme,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 20_000 });
  return { context, extensionId: new URL(sw.url()).host };
}

async function driveFixture(context) {
  const page = await context.newPage();
  await page.goto('http://localhost:46001/');
  await page.waitForFunction(() => document.title.includes('fixture loaded'), null, {
    timeout: 20_000,
  });
  await page.waitForTimeout(1200);
  return page;
}

async function openSidePanel(context, extensionId) {
  const panel = await context.newPage();
  await panel.setViewportSize({ width: 460, height: 800 });
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.getByText('/api/products').first().waitFor({ timeout: 20_000 });
  await panel.waitForTimeout(600);
  return panel;
}

/* ------------------------------- DARK SET -------------------------------- */

mkdirSync(join(outRoot, 'dark'), { recursive: true });

{
  const { context, extensionId } = await launch('dark');
  await driveFixture(context);

  // side panel with the details drawer open (explain story) — also gives us
  // the fixture tab id for the popup deep link.
  const panel = await openSidePanel(context, extensionId);
  const fixtureTabId = await panel.evaluate(() =>
    chrome.runtime.sendMessage({ type: 'webtrace:getLatestActiveSession' }),
  );

  await panel.getByText('/api/products').first().click();
  await panel.getByText('Why did this happen?').waitFor({ timeout: 10_000 });
  await panel.waitForTimeout(400);
  writeFileSync(join(outRoot, 'dark', 'details.png'), await panel.screenshot());
  console.log('✓ dark/details.png');

  // popup at true popup size, pointed at the fixture tab
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 300, height: 620 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${fixtureTabId?.tabId}`);
  await popup.getByText('Requests').first().waitFor({ timeout: 15_000 });
  await popup.waitForTimeout(1300);
  writeFileSync(join(outRoot, 'dark', 'popup.png'), await popup.screenshot());
  console.log('✓ dark/popup.png');

  // dashboard overview
  const dash = await context.newPage();
  await dash.setViewportSize({ width: 1180, height: 760 });
  await dash.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await dash.getByText('Requests over time').waitFor({ timeout: 20_000 });
  await dash.waitForTimeout(900);
  writeFileSync(join(outRoot, 'dark', 'dashboard.png'), await dash.screenshot());
  console.log('✓ dark/dashboard.png');

  // third-party map
  await dash.getByRole('button', { name: 'Third-Party Map' }).click();
  await dash.waitForTimeout(500);
  writeFileSync(join(outRoot, 'dark', 'third-party.png'), await dash.screenshot());
  console.log('✓ dark/third-party.png');

  await context.close();
}

/* ------------------------------- LIGHT SET ------------------------------- */

mkdirSync(join(outRoot, 'light'), { recursive: true });

{
  const { context, extensionId } = await launch('light');
  await driveFixture(context);

  const panel = await openSidePanel(context, extensionId);
  writeFileSync(join(outRoot, 'light', 'flow.png'), await panel.screenshot());
  console.log('✓ light/flow.png');

  await panel.getByRole('button', { name: 'Timeline' }).click();
  await panel.waitForTimeout(500);
  writeFileSync(join(outRoot, 'light', 'timeline.png'), await panel.screenshot());
  console.log('✓ light/timeline.png');

  const dash = await context.newPage();
  await dash.setViewportSize({ width: 1180, height: 760 });
  await dash.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await dash.getByText('Requests over time').waitFor({ timeout: 20_000 });
  await dash.waitForTimeout(900);
  writeFileSync(join(outRoot, 'light', 'dashboard.png'), await dash.screenshot());
  console.log('✓ light/dashboard.png');

  await context.close();
}

server.kill();
process.exit(0);
