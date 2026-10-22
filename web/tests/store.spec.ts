import { emptyIntake } from './chain-fixture';
import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({page}) => emptyIntake(page));
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const config = JSON.parse(readFileSync(resolve('../public/site-config.json'), 'utf8'));
const swarm = { health: { reachable: true, agentsOnline: 1044, jobsDoneLastDay: 144 }, counts: { launchesLive: 738 } }; // Saved public response fields, never production fallback.
async function ready(page: Page, hash = '#store') {
  await page.route('https://api.imd.fun/swarm', route => route.fulfill({ json: swarm }));
  await page.route('https://raw.githubusercontent.com/**', route => route.abort());
  await page.goto(hash);
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function noOverflow(page: Page) {
  const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport); expect(width.body).toBeLessThanOrEqual(width.viewport);
}
for (const width of [320, 390, 1440]) {
  test(`Store and Learn fit ${width}px; product and describe action visible`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:4173') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await ready(page); await noOverflow(page);
    await expect(page.locator('.grid .card')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Nothing on the pond yet' })).toBeVisible();
    await expect(page.locator('.result-count')).toHaveText('0 hooks');
    await expect(page.locator('.eyebrow')).toHaveText('Uniswap v4 hooks · built by the IMD swarm');
    await expect(page.locator('.eyebrow')).toHaveCSS('font-family', /Press Start 2P/); await expect(page.locator('.eyebrow')).toHaveCSS('text-transform', 'uppercase');
    await expect(page.locator('.eyebrow')).toHaveCSS('color', 'rgb(30, 90, 58)');
    await expect(page.locator('.lede')).toHaveText('Describe the hook you want, or stack reviewed blocks. The swarm writes it, tests it, audits it and launches it. You pay 0.5 IMD and gas.');
    const button = await page.getByRole('button', { name: 'Describe it', exact: true }).boundingBox();
    expect(button!.y + button!.height).toBeLessThan(844);
    await expect(page.getByRole('heading', { name: 'Stack blocks. Cast a hook.' })).toBeVisible();
    await page.screenshot({ path: `../artifacts/store-${width}.png` });
    await page.getByRole('link', { name: 'Learn', exact: true }).click();
    await expect(page.locator('.learn details')).toHaveCount(7);
    await noOverflow(page);
    for (const summary of await page.locator('.learn summary').all()) {
      if (!(await summary.evaluate(el => el.parentElement!.hasAttribute('open')))) await summary.click();
    }
    await noOverflow(page);
    const callbacks = (await page.locator('.permissions th').allTextContents()).flatMap(text => text.split(' / '));
    expect(callbacks).toHaveLength(14); expect(new Set(callbacks).size).toBe(14);
    await page.locator('.permissions').scrollIntoViewIfNeeded(); await noOverflow(page);
    await page.screenshot({ path: `../artifacts/learn-permissions-${width}.png` });
    expect(errors).toEqual([]);
  });
}
for (const width of [821, 1024, 1440]) {
  test(`Desktop bar remains one row at ${width}px, search >=120 and connected width unchanged`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await ready(page);
    const initial = await page.locator('#connect').boundingBox();
    // Geometry stress only. Wallet behavior is covered by the EIP-6963 test below.
    await page.locator('#connect').evaluate(button => { button.textContent = '0x5a7e0…f00d'; button.classList.add('address'); });
    const boxes = await page.locator('.top-in').evaluate(el => Array.from(el.children).filter(child => child.tagName !== 'DIALOG').map(child => ({ tag: child.className, top: child.getBoundingClientRect().top, bottom: child.getBoundingClientRect().bottom, right: child.getBoundingClientRect().right, width: child.getBoundingClientRect().width })));
    const connect = await page.locator('#connect').boundingBox();
    expect(connect!.width).toBe(168); expect(connect!.width).toBe(initial!.width);
    expect((await page.locator('#searchform').boundingBox())!.width).toBeGreaterThanOrEqual(120);
    expect(Math.max(...boxes.map(b => b.top))).toBeLessThan(Math.min(...boxes.map(b => b.bottom)));
    expect(Math.max(...boxes.map(b => b.right))).toBeLessThanOrEqual(width);
    await expect(page.locator('.chainpill')).toHaveCount(0);
    expect(await page.locator('#searchform').evaluate(el => el.nextElementSibling?.id)).toBe('connect');
    await expect(page.locator('.wordmark')).toBeVisible();
    expect((await page.locator('.wordmark').boundingBox())!.width).toBeGreaterThan(100);
    if (width >= 1141) {
      await expect(page.locator('.brand svg.hook')).toHaveAttribute('viewBox', '0 0 12 16'); await expect(page.locator('.brand svg.hook')).toHaveAttribute('width', '24');
      await expect(page.locator('.brand')).toHaveCSS('gap', '10px'); await expect(page.locator('.wordmark')).toHaveCSS('font-size', '12px');
      await expect(page.locator('.nav a').first()).toHaveCSS('padding', '12px 10px'); await expect(page.locator('.wordmark')).toBeVisible();
    }
    await noOverflow(page);
  });
}
test('search shows the no-match state over the empty pond; Enter scrolls to Results', async ({ page }) => {
  await ready(page); await expect(page.getByRole('heading', { name: 'Nothing on the pond yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Describe a hook' })).toHaveAttribute('href', '#builder');
  const search = page.getByRole('searchbox');
  await search.fill('hamster remainder');
  await expect(page.getByText('No hooks match.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nothing on the pond yet' })).toHaveCount(0);
  await search.press('Enter'); await expect(page).toHaveURL(/#catalog$/);
  await expect(page.getByRole('heading', { name: 'Results for “hamster remainder”' })).toBeInViewport();
  await expect(page.locator('.result-count')).toHaveText('0 hooks');
});
test('a filter shows the no-match state, and reset restores the empty pond, status, search and all groups/chains', async ({ page }) => {
  await ready(page, '#catalog'); await expect(page.locator('.empty-pond')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Ethereum', exact: true }).uncheck();
  await expect(page.getByText('No hooks match.', { exact: false })).toBeVisible();
  await page.getByRole('radio', { name: 'Live only', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Own source', exact: true }).uncheck();
  await page.getByRole('searchbox').fill('no-such-hook');
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(page.getByRole('radio', { name: 'All', exact: true })).toBeChecked();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: 'Ethereum', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Own source', exact: true })).toBeChecked();
  await expect(page.locator('.empty-pond')).toBeVisible(); await expect(page.locator('.card')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(r => /\/launches\.json$/.test(new URL(r.name).pathname)))).toBe(false);
});
test('describe saves required draft key, preserves other fields and opens the describe editor', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => localStorage.setItem('hooks-store:draft:v2', JSON.stringify({ type: 'B', blocks: [{ id: 'pause' }], settings: { chain: 4663 } })));
  const prompt = 'Send 1% of every buy to a prize pot';
  await page.getByRole('textbox', { name: 'Describe your hook' }).fill(prompt);
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await expect(page).toHaveURL(/#builder$/);
  await expect(page.getByRole('textbox', { name: /What should it do/ })).toHaveValue(prompt);
  await expect(page.getByRole('button', { name: /Hook only/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.added .chip')).toHaveText(['owner can pause✕']);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hooks-store:draft:v2')!));
  expect(saved).toMatchObject({ type: 'B', mode: 'prompt', prompt, settings: { chain: 4663 } });
  expect(saved.blocks.map((b: { id: string }) => b.id)).toEqual(['token', 'pause']);
});
test('only open-slot ads, marquee pauses on hover/focus, terms are 24 hours in Store and Learn', async ({ page }) => {
  await ready(page); await expect(page.locator('.adcard:not([aria-hidden])').first()).toContainText('Open slot');
  expect(await page.locator('.adcard').count()).toBe(1);
  await expect(page.locator('.marquee-track')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.ads')).toContainText('24 hours');
  await page.locator('.marquee').hover(); await expect(page.locator('.marquee-track')).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(0, 0); await page.locator('.adcard').first().focus(); await expect(page.locator('.marquee-track')).toHaveCSS('animation-play-state', 'paused');
  await page.getByRole('link', { name: 'Learn', exact: true }).click(); await page.getByText('WHAT DOES IT COST?', { exact: true }).click();
  await expect(page.locator('details').filter({ hasText: 'WHAT DOES IT COST?' })).toContainText('0.1 IMD for 24 hours');
  const links = await page.locator('.sources a').evaluateAll(els => els.map(el => (el as HTMLAnchorElement).href));
  expect(links).toHaveLength(8); expect(links[0]).toBe('https://imd.fun/docs/');
});
test('swarm failure hides all metrics; successful response uses actual fields with honest labels', async ({ page }) => {
  await page.route('https://api.imd.fun/swarm', route => route.fulfill({ status: 503, body: 'Unavailable' })); await page.goto('#store');
  await expect(page.locator('.stats')).toHaveCount(0);
  await page.unroute('https://api.imd.fun/swarm'); await ready(page); await page.reload();
  await expect(page.locator('.stats dd')).toHaveText(['1,044', '738', '144']);
  await expect(page.locator('.stats')).toContainText('Launches live'); await expect(page.locator('.stats')).toContainText('Jobs done · 24h');
});
test('public config flag removes the in-progress banner', async ({ page }) => {
  await page.route('**/site-config.json', route => route.fulfill({ json: { ...config, inProgress: false } }));
  await ready(page); await expect(page.locator('.progress-banner')).toHaveCount(0);
});
test('keyboard focus reaches main action; wallet dialog traps focus, closes on Escape and restores trigger', async ({ page }) => {
  await ready(page); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await page.getByRole('textbox', { name: 'Describe your hook' }).focus(); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Describe it', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Connect', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.querySelector('dialog')!.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeFocused();
});
test('export works offline at a gateway subpath with local fonts and a single beige theme', async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/') ? route.continue() : route.abort());
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('#store');
  await expect(page.locator('.empty-pond')).toBeVisible(); await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => ['Press Start 2P', 'Atkinson Hyperlegible', 'JetBrains Mono'].every(f => document.fonts.check(`16px "${f}"`)))).toBe(true);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(233, 223, 195)'); await expect(page.locator('.stats')).toHaveCount(0);
  const assets = await page.locator('script[src],link[rel=stylesheet]').evaluateAll(els => els.map(el => el.getAttribute('src') ?? el.getAttribute('href')));
  expect(assets.every(url => url?.startsWith('./'))).toBe(true);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://the-hooks-store.sites.imd.fun/og.png');
  await page.getByRole('textbox', { name: 'Describe your hook' }).fill('A hook with a pause switch');
  await page.getByRole('button', { name: 'Describe it', exact: true }).click(); await expect(page).toHaveURL(/#builder$/);
});
test('empty or blocked storage never silently loses a description', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Describe your hook' })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('Describe what your hook should do.');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); }; });
  await page.getByRole('textbox', { name: 'Describe your hook' }).fill('Keep this description');
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await expect(page).toHaveURL(/#store$/); await expect(page.getByRole('textbox', { name: 'Describe your hook' })).toHaveValue('Keep this description');
  await expect(page.getByRole('alert')).toContainText('Allow site storage and try again.');
});
test('catalog navigation does not restore a stale Learn scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await ready(page, '#learn');
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>('.learn details').forEach(detail => { detail.open = true; });
    document.querySelector('.permissions')!.scrollIntoView({ block: 'start' });
  });
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(2000);
  await page.goto('#catalog'); await expect(page.locator('.empty-pond')).toBeVisible();
  const top = await page.locator('#catalog').evaluate(el => el.getBoundingClientRect().top);
  const headerBottom = await page.locator('.top').evaluate(el => el.getBoundingClientRect().bottom);
  expect(top).toBeGreaterThanOrEqual(headerBottom);
  await expect(page.getByRole('heading', { name: 'On the pond', exact: true })).toBeInViewport();
});
