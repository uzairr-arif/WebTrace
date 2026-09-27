/**
 * Diagnostic probe — runs the same E2E steps but dumps the background's view:
 * capture settings, active-tab resolution, and per-tab overview stats.
 *
 *   node probe.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ext = join(here, '..', '..', 'apps', 'extension', '.output', 'chrome-mv3');

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

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 20_000 });
sw.on('console', (m) => console.log('[sw-console]', m.type(), m.text()));
sw.on('pageerror', (e) => console.log('[sw-error]', String(e)));

const page = await context.newPage();
page.on('pageerror', (e) => console.log('[page-error]', String(e)));
await page.goto('http://localhost:46001/');
await page.waitForFunction(() => document.title.includes('fixture loaded'), null, {
  timeout: 20_000,
});
console.log('fixture page finished its traffic');
await page.waitForTimeout(1500);

const extensionId = new URL(sw.url()).host;
const probe = await context.newPage();
await probe.goto(`chrome-extension://${extensionId}/sidepanel.html`);
await probe.waitForTimeout(2500);

for (const type of ['webtrace:getActiveTab', 'webtrace:getLatestActiveSession', 'webtrace:getTabOverview']) {
  const res = await probe.evaluate((t) => chrome.runtime.sendMessage({ type: t }), type);
  console.log(`\n${type}:`, JSON.stringify(res, null, 2)?.slice(0, 800));
}

await context.close();
server.kill();
process.exit(0);
