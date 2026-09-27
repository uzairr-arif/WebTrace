/**
 * Product screenshots — loads the extension, drives the fixture site, and
 * captures the Live Flow and the Explain drawer into docs/screenshots/.
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
const outDir = join(here, '..', '..', 'docs', 'screenshots');
mkdirSync(outDir, { recursive: true });

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
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 20_000 });
const extensionId = new URL(sw.url()).host;

const page = await context.newPage();
await page.goto('http://localhost:46001/');
await page.waitForFunction(() => document.title.includes('fixture loaded'), null, {
  timeout: 20_000,
});
await page.waitForTimeout(1200);

const panel = await context.newPage();
await panel.setViewportSize({ width: 460, height: 800 });
await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
await panel.getByText('/api/products').first().waitFor({ timeout: 20_000 });
await panel.waitForTimeout(800);
writeFileSync(
  join(outDir, 'live-flow.png'),
  await panel.screenshot({ fullPage: false }),
);
console.log('✓ docs/screenshots/live-flow.png');

// Open the explain drawer for the API request.
await panel.getByText('/api/products').first().click();
await panel.getByText('Why did this happen?').waitFor({ timeout: 10_000 });
await panel.waitForTimeout(400);
writeFileSync(
  join(outDir, 'explain.png'),
  await panel.screenshot({ fullPage: false }),
);
console.log('✓ docs/screenshots/explain.png');

// Timeline view.
await panel.keyboard.press('Escape');
await panel.getByRole('button', { name: 'Close details' }).click();
await panel.getByRole('button', { name: 'Timeline' }).click();
await panel.waitForTimeout(500);
writeFileSync(
  join(outDir, 'timeline.png'),
  await panel.screenshot({ fullPage: false }),
);
console.log('✓ docs/screenshots/timeline.png');

// ---- Full dashboard ----
const dash = await context.newPage();
await dash.setViewportSize({ width: 1180, height: 760 });
await dash.goto(`chrome-extension://${extensionId}/dashboard.html`);
await dash.getByText('Requests over time').waitFor({ timeout: 20_000 });
await dash.waitForTimeout(900);
writeFileSync(join(outDir, 'dashboard.png'), await dash.screenshot());
console.log('✓ docs/screenshots/dashboard.png');

await dash.getByRole('button', { name: 'Third-Party Map' }).click();
await dash.waitForTimeout(500);
writeFileSync(join(outDir, 'third-party.png'), await dash.screenshot());
console.log('✓ docs/screenshots/third-party.png');

await dash.getByRole('button', { name: 'Learn', exact: true }).click();
await dash.getByText('The life of a page load').waitFor({ timeout: 10_000 });
await dash.waitForTimeout(400);
writeFileSync(join(outDir, 'learn.png'), await dash.screenshot());
console.log('✓ docs/screenshots/learn.png');

await context.close();
server.kill();
process.exit(0);
