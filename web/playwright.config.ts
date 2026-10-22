import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  // Job 11 (Builder v2) replaced the three-column Builder these specs drove (palette, .blk cards, .sum preview, chooser).
  // Their request-text assertions are covered by the unit tests; the new screen is covered by tests/builder.spec.ts.
  testIgnore: ['**/job7.spec.ts', '**/job7-revision.spec.ts', '**/job8.spec.ts', '**/job8-revision.spec.ts', '**/job8-written-fees.spec.ts', '**/job9.spec.ts'],
  timeout: 35_000,
  expect: { timeout: 6000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: '../artifacts/playwright-results.json' }]],
  outputDir: '../test/scratch/playwright',
  use: { baseURL: 'http://127.0.0.1:4173/preview/', headless: true, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'node ../scripts/serve.mjs --port 4173', url: 'http://127.0.0.1:4173/preview/', reuseExistingServer: true, timeout: 15_000 },
});
