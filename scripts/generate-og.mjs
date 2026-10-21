#!/usr/bin/env node
/** Re-render the share card from the actual pond, not a separate illustration. Build first. */
import { chromium } from '../web/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const server = await serve();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce' });
  await page.route('https://api.imd.fun/swarm', route => route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/preview/#store`);
  await page.locator('canvas').waitFor(); await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: `
    .top,.progress-banner,.ticker,.prompt,.alt,.stats,.ads,.store,.skip-link { display:none !important; }
    .landing { height:630px; min-height:630px; }
    .landing-copy { padding:142px 16px 80px; width:680px; }
    .landing-copy h1 { font-size:26px; }
    .eyebrow { font-family:var(--display); font-size:13px; margin-bottom:26px; text-transform:uppercase; }
  ` });
  await page.locator('.eyebrow').evaluate(el => { el.textContent = 'The Hooks Store'; });
  await page.locator('canvas').screenshot({ path: 'test/scratch/og-scene.png' }); // Wait for resize/paint.
  await page.screenshot({ path: 'public/og.png' });
  console.log('Generated public/og.png (1200 × 630) from the production pond.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
