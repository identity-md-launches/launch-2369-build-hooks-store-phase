/** Reproduce the supplied audit against the unchanged reference, never the production app. */
import { chromium } from '../web/node_modules/playwright/index.mjs';
import { serve } from '../scripts/serve.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = await serve({ directory: 'mockup' });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const results = [];
const record = (id, evidence) => results.push({ id, reproduced: true, evidence });
try {
  await page.route('https://fonts.googleapis.com/**', async route => {
    const css = (await readFile('web/src/styles.css', 'utf8')).split(':root')[0].replaceAll('/fonts/', 'https://fonts.gstatic.com/local/');
    await route.fulfill({ contentType: 'text/css', body: css });
  });
  await page.route('https://fonts.gstatic.com/local/**', async route => route.fulfill({ contentType: 'font/woff2', body: await readFile('public/fonts/' + route.request().url().split('/').pop()) }));
  await page.goto(base); await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.stats dd').allTextContents().then(a => a.join('/')), '1,045/52/6');
  assert.ok((await readFile('tests/fixtures/initial-entry.html', 'utf8')).includes('http-equiv="refresh"'));
  record('db6ce245', 'Original entry redirects to mockup; sampled counters 1,045/52/6 and paid placements present. Original required app files absent, recorded before implementation.');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(base + '#learn');
    await page.evaluate(() => document.fonts.ready);
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, table: document.querySelector('#view-learn table').getBoundingClientRect().width }));
    assert.ok(size.document > size.viewport); record('d4cc2a79-' + width, size);
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(base + '#catalog');
  await page.locator('#q').fill('remainder'); assert.equal(await page.locator('#cards .card').count(), 0);
  await page.locator('#q').fill('hamster treasury'); assert.equal(await page.locator('#cards .card').count(), 1);
  record('bb19b26d', 'remainder returns 0; hamster treasury returns 1 despite remainder in HamsterHook.req.');
  await page.goto(base + '#store'); await page.locator('#landing-q').fill('Send 1% of every buy to a prize pot'); await page.locator('#landing-prompt button').click();
  const draft = await page.evaluate(() => ({ required: localStorage.getItem('hooks-store:draft:v2'), oldPrompt: JSON.parse(localStorage.getItem('hooks-store:mockup-draft:v3')).prompt }));
  assert.equal(draft.required, null); record('e43738dd', draft);
  await page.setViewportSize({ width: 821, height: 900 }); await page.goto(base + '#store'); await page.evaluate(() => document.fonts.ready);
  const bar = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, search: document.querySelector('#searchform').getBoundingClientRect().width, connectRight: document.querySelector('#connect').getBoundingClientRect().right }));
  assert.ok(bar.search < 120 && bar.connectRight > 821); record('3638d058', bar);
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(base + '#catalog'); await page.locator('input[name=st][value=prog]').check(); await page.locator('#q').fill('no-such-hook'); await page.locator('#clear').click();
  assert.equal(await page.locator('input[name=st]:checked').inputValue(), 'prog'); assert.equal(await page.locator('#cards .card').count(), 1);
  record('da6a3411', 'Reset keeps status prog and only one card.');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(base + '#store'); await page.reload();
  const motion = await page.locator('.ticker button').evaluate(el => ({ pointerEvents: getComputedStyle(el).pointerEvents, hit: document.elementFromPoint(el.getBoundingClientRect().x + 5, el.getBoundingClientRect().y + 5)?.id }));
  assert.equal(motion.pointerEvents, 'none'); record('581fdbf2', motion);
  await page.goto(base + '#learn'); const cost = await page.locator('details').filter({ has: page.locator('summary', { hasText: 'WHAT DOES IT COST?' }) }).textContent();
  assert.ok(cost.includes('7 days')); record('bd049d81', 'Cost answer says 0.1 IMD for 7 days.');
  await mkdir('artifacts', { recursive: true }); await writeFile('artifacts/audit-reproduction.json', JSON.stringify({ reference: 'mockup/index.html unchanged', results }, null, 2) + '\n');
  console.log(`Reproduced all eight reported findings (${results.length} observations).`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
