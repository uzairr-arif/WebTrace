import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  webServer: {
    command: 'node ../fixtures/demo-site/server.mjs',
    url: 'http://localhost:46001',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
