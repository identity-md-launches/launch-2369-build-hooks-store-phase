// Builder v2 (SPEC 3.2, decision 34): every step, the card, the findings box, the sheet, the own-code toggle, the shelf on phones.
import { emptyIntake, injectedOwner } from './chain-fixture';
import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({ page }) => { await emptyIntake(page); await injectedOwner(page); });

const SPEC_URL = 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/blocks-verified.json';
async function open(page: Page, draft?: object, connect = true) {
  await page.route('https://api.imd.fun/swarm', route => route.fulfill({ status: 503, body: '' }));
  await page.route(SPEC_URL, route => route.abort());
  await page.goto('#store');
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); if (d) localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)); }, draft ?? null);
  await page.goto('#builder'); await page.reload();
  await expect(page.getByRole('heading', { name: /What are you launching\?/ })).toBeVisible();
  if (connect) {
    await page.locator('#connect').click();
    await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
    await expect(page.locator('#connect')).toHaveClass(/address/);
  }
}
async function noOverflow(page: Page) {
  const w = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(w.document).toBeLessThanOrEqual(w.viewport);
}
const stackIds = (page: Page) => page.locator('#stack .rule[data-block]:not(.token)').evaluateAll(els => els.map(el => el.getAttribute('data-block')));
const tileIds = (page: Page) => page.locator('#tiles .tile[data-block]').evaluateAll(els => els.map(el => el.getAttribute('data-block')));
const exact = (page: Page) => page.locator('#composed').textContent();
const rule = (page: Page, id: string) => page.locator(`#stack .rule[data-block="${id}"]`);

test('steps come in order: type, how, blocks, settings; first visit has no chooser and starts on Stack blocks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page);
  const titles = await page.locator('.step h2').allTextContents();
  expect(titles.map(t => t.replace(/^Step \d: /, ''))).toEqual(['What are you launching?', 'How do you want to build it?', 'Stack your blocks', 'Settings']);
  await expect(page.locator('.chooser, details.advanced')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stack blocks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await stackIds(page)).toEqual(['swap-fee', 'anti-sniper', 'jar']);
  await expect(page.locator('.progress a')).toHaveText(['1 Type', '2 How', '3 Blocks', '4 Settings', '5 Check & launch']);
  // Step 1: the chosen type is named beside the title.
  await page.getByRole('button', { name: /^B: Hook only/ }).click();
  await expect(page.locator('#step-1 .state')).toHaveText('Hook only');
  await expect(page.getByRole('tab', { name: /Token/ })).toHaveCount(0);
  await expect(page.locator('#stack .rule.token')).toHaveCount(0);
  await expect(page.locator('#s-hname')).toBeVisible();
  await page.getByRole('button', { name: /^A: Hook \+ new token/ }).click();
  await expect(page.locator('#stack .rule').first()).toHaveClass(/token/);
  await expect(page.locator('#stack .rule.token .n')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('step 2: own code fields exist only while chosen, and the composed text for own code is unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.locator('#s-repo')).toHaveCount(0);
  await page.getByRole('button', { name: /^From my own code/ }).click();
  await expect(page.getByText('The request pins this exact commit. Your blocks and words become the changes the swarm makes to it.')).toBeVisible();
  await page.locator('#s-repo').fill('https://github.com/example/pond-hook');
  await page.locator('#s-commit').fill('a'.repeat(40));
  // Own code composes exactly as before: the pinned-source line, then the rules.
  expect(await exact(page)).toContain(`Start from the creator’s own source at https://github.com/example/pond-hook commit ${'a'.repeat(40)}`);
  await page.getByRole('button', { name: /^From scratch/ }).click();
  await expect(page.locator('#s-repo')).toHaveCount(0);
  expect(await exact(page)).not.toContain('Start from the creator');
  // Switching back restores what was typed.
  await page.getByRole('button', { name: /^From my own code/ }).click();
  await expect(page.locator('#s-repo')).toHaveValue('https://github.com/example/pond-hook');
});

test('step 2: describe mode keeps the words, the saved stack and the warning inside the step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  const words = 'Observe swaps without changing their accounting.';
  await page.locator('#step-2').getByRole('textbox', { name: /What should it do/ }).fill(words);
  await expect(page.locator('#step-2 .written-rules')).toBeVisible();
  await expect(page.locator('#step-2 .added .chip')).toHaveCount(3);
  expect(await exact(page)).toContain(words);
  expect(await exact(page)).toContain('Hook fee rate: 0%.');
  await page.getByRole('tab', { name: /^Protection/ }).click();
  await expect(page.locator('.bcard[data-block="swap-fee"]')).toHaveCount(0);
  await expect(page.locator('.bcard[data-block="anti-sniper"] .pill.state')).toHaveText('SAVED IN STACK');
  await page.getByRole('button', { name: 'Add Cooldown' }).click();
  await expect(page.getByRole('button', { name: 'Stack blocks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await stackIds(page)).toEqual(['swap-fee', 'anti-sniper', 'jar', 'cooldown']);
});

test('step 3: shelf tabs with counts, add opens the rule, reorder, remove, edit, open all / close all', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.getByRole('tab', { name: /^Fees/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /^Fees/ }).locator('.c')).toHaveText('1/7');
  await expect(page.locator('.bcard[data-block="swap-fee"] .pill.state')).toHaveText('ADDED');
  await expect(page.locator('.bcard[data-block="lp-fee"] .pill.state')).toHaveText('OWN POOLS ONLY');
  await page.getByRole('tab', { name: /^Protection/ }).click();
  await page.getByRole('button', { name: 'Add Cooldown' }).click();
  await expect(page.getByRole('tab', { name: /^Protection/ }).locator('.c')).toHaveText(/^2\//);
  // A newly added block opens to its fields, with its who-uses-it chip.
  await expect(rule(page, 'cooldown')).toHaveClass(/open/);
  await expect(rule(page, 'cooldown').locator('.chip')).toHaveText('RUNS ITSELF');
  await expect(rule(page, 'jar').locator('.chip')).toHaveText('ANYONE PRESSES');
  await rule(page, 'cooldown').getByLabel(/Wait|seconds/i).first().fill('45');
  await expect(rule(page, 'cooldown').locator('.txt > span').first()).toHaveText('45s between swaps per wallet');
  await expect(page.locator('#tiles .tile[data-block="cooldown"]')).toContainText('45s between swaps per wallet');
  await page.getByRole('button', { name: 'Move Cooldown up' }).click();
  expect(await stackIds(page)).toEqual(['swap-fee', 'anti-sniper', 'cooldown', 'jar']);
  expect(await tileIds(page)).toEqual(['swap-fee', 'anti-sniper', 'cooldown', 'jar']);
  await page.getByRole('button', { name: 'Remove Cooldown' }).click();
  expect(await stackIds(page)).toEqual(['swap-fee', 'anti-sniper', 'jar']);
  await page.getByRole('tab', { name: /^Timing/ }).click();
  await page.getByRole('button', { name: 'Add Pause switch' }).click();
  await expect(rule(page, 'pause').locator('.chip')).toHaveText('OWNER');
  await page.getByRole('button', { name: 'Open all' }).click();
  await expect(page.locator('#stack .rule.open')).toHaveCount(5);
  await page.getByRole('button', { name: 'Close all' }).click();
  await expect(page.locator('#stack .rule.open')).toHaveCount(0);
  await rule(page, 'swap-fee').getByRole('button', { name: /Edit/ }).click();
  await rule(page, 'swap-fee').getByLabel('Rate (%)').fill('1.5');
  await expect(rule(page, 'swap-fee').locator('.txt > span').first()).toHaveText(/^1\.5% on every buy and sell → /);
  expect(await exact(page)).toContain('Take 1.5% of the IMD side of every buy and sell');
  // Token row 0: standard or my own.
  await rule(page, 'token').getByRole('button', { name: /Edit/ }).click();
  await page.getByRole('button', { name: 'My own', exact: true }).click();
  await expect(page.locator('#stack .rule.token .chip')).toHaveText('MY OWN');
  // Six-block notice.
  for (const [tab, title] of [['Protection', 'Cooldown'], ['Protection', 'Anti-sandwich'], ['Protection', 'Circuit breaker']]) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
    await page.getByRole('button', { name: `Add ${title}` }).click();
  }
  await expect(page.locator('.block-count')).toContainText('Keep the stack to six blocks when possible.');
  await page.reload();
  expect(await stackIds(page)).toEqual(['swap-fee', 'anti-sniper', 'jar', 'pause', 'cooldown', 'anti-sandwich', 'breaker']);
});

test('the card: name, pills, tiles, where the money goes, readiness with fill it in, cost, buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const card = page.locator('.hookcard');
  await expect(card.locator('.eyebrow')).toHaveText('Your hook, as it stands');
  await expect(card.locator('.hc-pills .pill')).toHaveText(['Hook + token + pool', 'No chain yet', 'Paired with IMD']);
  await expect(card.locator('.tile.base')).toContainText('Token');
  expect(await tileIds(page)).toEqual(['swap-fee', 'anti-sniper', 'jar']);
  await expect(card.locator('.flow')).toContainText('Where the money goes');
  await expect(card.locator('.flow')).toContainText('pool fee 1.25%');
  await expect(card.locator('.flow')).toContainText('Fees are taken on the IMD side and settled in IMD.');
  await expect(card.locator('.cost')).toContainText('0.5 IMD');
  await expect(card.locator('.cost')).toContainText('2 tx');
  await expect(card.locator('.launch-wait')).toContainText('Typically 1 to 3 hours');
  await expect(card.getByRole('button', { name: 'Check with the swarm (free)' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  // fill it in focuses the field.
  await card.locator('.ready li.todo', { hasText: 'deploy chain' }).getByRole('button', { name: 'fill it in' }).click();
  await expect(page.locator('#s-chain')).toBeFocused();
  await page.locator('#s-chain').selectOption('4663');
  await expect(card.locator('.hc-pills .pill').nth(1)).toHaveText('Robinhood Chain');
  await card.locator('.ready li.todo', { hasText: 'pool share' }).getByRole('button', { name: 'fill it in' }).click();
  await expect(page.locator('#s-pool')).toBeFocused();
  await page.locator('#s-pool').fill('50');
  await expect(page.locator('#step-4 .state')).toHaveText('All set');
  await expect(card.locator('.ready li.todo')).toHaveCount(0);
  await expect(page.locator('.findings')).toHaveClass(/ok/);
  await expect(page.locator('.findings')).toContainText('Nothing to fix. The request is consistent.');
  await expect(card.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
  // A block field issue opens the rule and focuses its field.
  await rule(page, 'swap-fee').getByRole('button', { name: /Edit/ }).click();
  await rule(page, 'swap-fee').getByLabel('Rate (%)').fill('');
  await rule(page, 'swap-fee').getByRole('button', { name: /Close/ }).click();
  await expect(rule(page, 'swap-fee')).not.toHaveClass(/open/);
  await card.locator('.ready li.todo', { hasText: 'Rate' }).getByRole('button', { name: 'fill it in' }).click();
  await expect(rule(page, 'swap-fee')).toHaveClass(/open/);
  await expect(rule(page, 'swap-fee').getByLabel('Rate (%)')).toBeFocused();
});

test('findings box: one line each, short quote, jump; the sheet opens with COPY and CLOSE and highlights the words', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, undefined, false);
  const box = page.locator('.findings');
  await expect(box.locator('h3')).toContainText('Fix before paying');
  const rows = box.locator('.finding');
  expect(await rows.count()).toBeGreaterThan(0);
  for (const em of await box.locator('.finding em q').allTextContents()) expect(em.length).toBeLessThanOrEqual(60);
  // The list scrolls inside itself at about a third of the screen.
  const max = await box.locator('.list').evaluate(el => parseFloat(getComputedStyle(el).maxHeight));
  expect(max).toBeGreaterThan(900 * 0.3); expect(max).toBeLessThan(900 * 0.4);
  const chain = rows.filter({ hasText: 'Choose a deploy chain' });
  await expect(chain.locator('q').first()).toHaveText('(choose a chain)');
  await chain.getByRole('button', { name: /Jump to it/ }).click();
  await expect(page.locator('#s-chain')).toBeFocused();
  // Without a wallet the recipient is a placeholder: the text finding opens the sheet at the highlighted words.
  const text = rows.filter({ has: page.locator('q', { hasText: /wallet/ }) }).first();
  await text.getByRole('button', { name: /Jump to it/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Exact text the swarm receives' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('mark').first()).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Copy' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: 'Show exact text' }).click();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('phones: card first, shelf scrolls sideways, rule tools wrap under the text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const card = await page.locator('.hookcard').boundingBox(), first = await page.locator('#step-1').boundingBox();
  expect(card!.y).toBeLessThan(first!.y);
  const shelf = page.locator('#shelf');
  expect(await shelf.evaluate(el => getComputedStyle(el).overflowX)).toBe('auto');
  expect(await shelf.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await shelf.evaluate(el => el.scrollBy(400, 0));
  await page.getByRole('button', { name: 'Add Whale fee' }).click();
  await expect(rule(page, 'fee-size')).toBeVisible();
  const txt = await rule(page, 'swap-fee').locator('.txt').boundingBox(), tools = await rule(page, 'swap-fee').locator('.tools').boundingBox();
  expect(tools!.y).toBeGreaterThan(txt!.y + txt!.height - 1);
  await noOverflow(page);
});

for (const width of [320, 390, 768, 1100, 1440, 2560]) {
  test(`Builder at ${width}px: layout, no horizontal overflow, card within the viewport, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await page.getByRole('button', { name: 'Open all' }).click();
    await noOverflow(page);
    const main = await page.locator('.builder-page').boundingBox();
    expect(main!.width).toBeLessThanOrEqual(1240.5);
    if (width >= 1240) expect(Math.abs(main!.x - (width - main!.width) / 2)).toBeLessThan(2);
    const col = await page.locator('.hookcol').boundingBox(), steps = await page.locator('.steps').boundingBox();
    if (width >= 1100) {
      expect(Math.round(col!.width)).toBe(420);
      expect(col!.x).toBeGreaterThan(steps!.x + steps!.width);
      expect(col!.height).toBeLessThanOrEqual(900);
      expect(await page.locator('.hookcol').evaluate(el => getComputedStyle(el).position)).toBe('sticky');
    } else expect(col!.y).toBeLessThan(steps!.y);
    // Type sizes are fixed, never viewport-scaled.
    expect(await page.locator('.step h2').first().evaluate(el => getComputedStyle(el).fontSize)).toBe('13px');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `../artifacts/builder-${width}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Show exact text' }).click();
    await noOverflow(page);
    const sheet = await page.getByRole('dialog').boundingBox();
    expect(sheet!.width).toBeLessThanOrEqual(width);
    expect(sheet!.height).toBeLessThanOrEqual(900);
  });
}
