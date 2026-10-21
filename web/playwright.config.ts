import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 35_000,
  expect: { timeout: 6000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: '../artifacts/playwright-results.json' }]],
  outputDir: '../test/scratch/playwright',
  use: { baseURL: 'http://127.0.0.1:4173/preview/', headless: true, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'node ../scripts/serve.mjs --port 4173', url: 'http://127.0.0.1:4173/preview/', reuseExistingServer: true, timeout: 15_000 },
});
