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
  await expect(card.locator('.launch-wait')).toContainText('Usually 30 to 90 minutes, sometimes up to 3 hours');
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
  // Missing owner/recipient is one cause and jumps to its setting. The exact
  // request remains available with its unresolved chain words highlighted.
  const owner = rows.filter({ hasText: 'Connect the paying wallet or enter a full owner address' }).first();
  await owner.getByRole('button', { name: /Jump to it/ }).click();
  await expect(page.locator('#s-owner')).toBeFocused();
  await page.getByRole('button', { name: 'Show exact text' }).click();
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

// Revision findings (job 11 review): each test reproduces the reported steps.
const OWNER = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';

test('hidden scroll labels do not extend the desktop hook column past its panels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('https://api.imd.fun/swarm', r => r.fulfill({ status: 503 }));
  await page.route('https://raw.githubusercontent.com/**', r => r.abort());
  await page.goto('#builder');
  await expect(page.locator('.findings .list')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const column = page.locator('.hookcol');
  await column.evaluate(el => { el.scrollTop = el.scrollHeight; });
  const geometry = await column.evaluate(el => ({
    height: el.scrollHeight,
    expected: Math.max(el.clientHeight, Math.ceil(Math.max(...Array.from(el.children, child => child.getBoundingClientRect().bottom - el.getBoundingClientRect().top + el.scrollTop)) + parseFloat(getComputedStyle(el).paddingBottom))),
  }));
  expect(geometry.height).toBeLessThanOrEqual(geometry.expected + 2);
  // The scroll regions retain their names and keyboard focusability.
  await expect(page.getByRole('region', { name: 'Rules, money and readiness' })).toHaveAttribute('tabindex', '0');
});

test('the card details preserve the mobile floor and desktop viewport fit', async ({ page }) => {
  for (const [width, height] of [[390, 844], [320, 900], [768, 900], [1100, 800], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    await open(page, undefined, false);
    await page.evaluate(() => window.scrollTo(0, 0));
    const card = (await page.locator('.hookcard').boundingBox())!;
    if (width >= 720) expect(card.height, `card height at ${width}x${height}`).toBeLessThanOrEqual(height);
    else expect(await page.locator('.hc-scroll').evaluate(el => Math.min(el.scrollHeight, innerHeight * .4) - el.clientHeight)).toBeLessThanOrEqual(1);
    // The details scroll inside the card; the actions are not inside the scrolling part.
    expect(await page.locator('.hc-scroll').evaluate(el => getComputedStyle(el).overflowY)).toBe('auto');
    await expect(page.locator('.hc-scroll .hc-actions')).toHaveCount(0);
    const primary = (await page.getByRole('button', { name: 'Continue to launch' }).boundingBox())!;
    if (width >= 1100) { await page.locator('.hookcard').scrollIntoViewIfNeeded(); const inside = (await page.locator('.hookcard').boundingBox())!; expect(inside.y + inside.height).toBeLessThanOrEqual(height + 1); }
    else { await page.getByRole('button', { name: 'Continue to launch' }).scrollIntoViewIfNeeded(); await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeInViewport(); }
    // The readiness links are reachable by scrolling the card's own details.
    const link = page.locator('.ready li.todo button').first();
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport();
  }
});

test('own code with empty source fields blocks the launch and points at the missing fields', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, undefined, false);
  await page.getByRole('button', { name: /^B: Hook only/ }).click();
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await page.getByRole('button', { name: 'Price reading' }).click();
  await page.locator('#s-hname').fill('ObserveHook');
  await page.locator('#s-chain').selectOption('1');
  await page.locator('#s-owner').fill(OWNER);
  await expect(page.locator('.findings')).toContainText('Nothing to fix');
  const go = page.getByRole('button', { name: 'Continue to launch' });
  await expect(go).toBeEnabled();
  await page.getByRole('button', { name: /^From my own code/ }).click();
  await expect(page.locator('#s-repo')).toHaveValue('');
  await expect(go).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Check with the swarm (free)' })).toBeDisabled();
  await expect(page.locator('.findings')).toContainText('Repository: enter the public');
  await expect(page.locator('.findings')).toContainText('Commit: enter the full 40-character commit id.');
  await expect(page.locator('.progress a').nth(1)).toHaveClass(/now/);
  await expect(page.locator('.progress a').nth(4)).not.toHaveClass(/done/);
  await page.locator('.ready li.todo', { hasText: 'Repository' }).getByRole('button', { name: 'fill it in' }).click();
  await expect(page.locator('#s-repo')).toBeFocused();
  await page.locator('.finding', { hasText: 'Commit' }).getByRole('button', { name: /Jump to it/ }).click();
  await expect(page.locator('#s-commit')).toBeFocused();
  // Back to scratch: the starting point is ready again.
  await page.getByRole('button', { name: /^From scratch/ }).click();
  await expect(go).toBeEnabled();
});

test('token readiness links open row 0 and focus the missing field', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  for (const [label, field] of [['Token name', 'name'], ['Symbol', 'symbol']]) {
    await page.locator('#rule-token-row').getByRole('button', { name: /Edit/ }).click();
    await page.locator(`#p-0-${field}`).fill('');
    await page.locator('#rule-token-row').getByRole('button', { name: /Close/ }).click();
    await expect(page.locator('#p-0-name')).toHaveCount(0);
    await page.locator('.ready li.todo', { hasText: label }).first().getByRole('button', { name: 'fill it in' }).click();
    await expect(page.locator('#rule-token-row')).toHaveClass(/open/);
    await expect(page.locator(`#p-0-${field}`)).toBeFocused();
    await page.locator('#rule-token-row').getByRole('button', { name: /Close/ }).click();
    await page.locator('.finding', { hasText: label }).first().getByRole('button', { name: /Jump to it/ }).click();
    await expect(page.locator(`#p-0-${field}`)).toBeFocused();
    await page.locator(`#p-0-${field}`).fill(field === 'name' ? 'Pondside' : 'POND');
    await page.locator('#rule-token-row').getByRole('button', { name: /Close/ }).click();
  }
});

async function pairedWithImd(page: Page) {
  await page.locator('#s-chain').selectOption('1');
  await page.locator('#s-pair').selectOption('imd');
  await page.locator('#s-pool').fill('50');
  await page.locator('#s-owner').fill(OWNER);
  await page.locator('#s-rem').fill(OWNER);
}

test('a text finding opens the sheet at its own highlighted words', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, undefined, false);
  await pairedWithImd(page);
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  const words = `Take 1% of the ETH side of every buy, settled in IMD; send it to ${OWNER}.\n${'Observe swaps without changing their accounting.\n'.repeat(40)}Settle the fee in ETH.`;
  await page.locator('#p-text').fill(words);
  const row = page.locator('.finding', { hasText: 'The fee side must be IMD' });
  await expect(row.locator('q')).toHaveText('ETH side');
  await row.getByRole('button', { name: /Jump to it/ }).click();
  const pre = page.locator('#composed');
  await expect(pre).toBeVisible();
  const view = (await pre.boundingBox())!;
  const mark = pre.locator('mark', { hasText: 'ETH side' }).first();
  const box = (await mark.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(view.y);
  expect(box.y + box.height).toBeLessThanOrEqual(view.y + view.height);
  // Every finding's identity matches its mark: the settlement finding scrolls to its own words.
  await page.keyboard.press('Escape');
  const settle = page.locator('.finding', { hasText: 'Settle the fee in IMD' }).first();
  const quote = await settle.locator('q').textContent();
  expect(quote).not.toBe('Settle the fee in ETH.');
  await settle.getByRole('button', { name: /Jump to it/ }).click();
  const second = (await pre.locator('mark', { hasText: quote! }).last().boundingBox())!;
  const view2 = (await pre.boundingBox())!;
  expect(second.y).toBeGreaterThanOrEqual(view2.y);
  expect(second.y + second.height).toBeLessThanOrEqual(view2.y + view2.height);
});

test('finding excerpts quote only words that are in the request, never a whole sentence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, undefined, false);
  const check = async () => {
    const text = (await exact(page))!;
    for (const q of await page.locator('.finding em q').allTextContents()) {
      expect(text, `excerpt ${q}`).toContain(q);
      expect(q.length).toBeLessThanOrEqual(60);
      expect(q).not.toMatch(/^\w+: ""/);
    }
  };
  await check();
  const owner = page.locator('.finding', { hasText: 'Connect the paying wallet or enter a full owner address' }).first();
  if (await owner.count()) { await expect(owner.locator('q')).toHaveCount(0); }
  await pairedWithImd(page);
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await page.locator('#p-text').fill('Settle the fee in ETH.');
  await check();
  for (const q of await page.locator('.finding em q').allTextContents()) expect(q).not.toBe('Settle the fee in ETH.');
  // A finding without an exact span jumps to its field instead of quoting.
  const amount = page.locator('.finding', { hasText: 'Name an exact fee amount' }).first();
  await expect(amount.locator('q')).toHaveCount(0);
  await amount.getByRole('button', { name: /Jump to it/ }).click();
  await expect(page.locator('#p-text')).toBeFocused();
});

test('where the money goes applies the LP share before the recipient', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const flow = page.locator('.flow');
  await expect(flow).toContainText('1.0% on every buy and sell → my wallet');
  await page.getByRole('tab', { name: /^Treasury/ }).click();
  await page.getByRole('button', { name: 'Add Share fees with LPs' }).click();
  await rule(page, 'lp-share').getByLabel(/Share to LPs/).fill('100');
  await expect(flow).toContainText('1.0% on every buy and sell → all to in-range LPs, 0% left for my wallet');
  await expect(flow).not.toContainText('→ my wallet ·');
  await expect(flow).toContainText('if no liquidity is in range, the whole fee goes to my wallet');
  expect(await exact(page)).toContain('donate 100%');
  await page.getByRole('tab', { name: /^Fees/ }).click();
  await page.getByRole('button', { name: 'Add Split the fee' }).click();
  await expect(flow).toContainText('0% left for the split (70% me / 30%');
  await rule(page, 'lp-share').getByLabel(/Share to LPs/).fill('40');
  await expect(flow).toContainText('40% to in-range LPs, 60% to the split (70% me / 30%');
  // Jar money stays separate.
  await expect(flow).toContainText('into a jar');
});

for (const width of [320, 390, 768, 1100, 1440, 1920, 2560]) {
  test(`Builder at ${width}px: layout, no horizontal overflow, card within the viewport, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await page.getByRole('button', { name: 'Open all' }).click();
    await noOverflow(page);
    const main = await page.locator('.builder-page').boundingBox();
    expect(main!.width).toBeLessThanOrEqual(1800.5);
    if (width >= 1800) expect(Math.abs(main!.x - (width - main!.width) / 2)).toBeLessThan(2);
    const col = await page.locator('.hookcol').boundingBox(), steps = await page.locator('.steps').boundingBox();
    if (width >= 1100) {
      expect(Math.round(col!.width)).toBe(Math.round(Math.min(520, Math.max(420, width * .28))));
      expect(col!.x).toBeGreaterThan(steps!.x + steps!.width);
      expect(col!.height).toBeLessThanOrEqual(900);
      expect((await page.locator('.hookcard').boundingBox())!.height).toBeLessThanOrEqual(900);
      expect(await page.locator('.hookcol').evaluate(el => getComputedStyle(el).position)).toBe('sticky');
    } else {
      expect(col!.y).toBeLessThan(steps!.y);
      expect((await page.locator('.hookcard').boundingBox())!.height).toBeLessThanOrEqual(900);
    }
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

for (const [width,height] of [[1440,900],[2560,1300],[2560,1440]]) test(`card never collapses after scroll and a keystroke at ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({width,height}); await open(page, undefined, false);
  const load = await page.locator('.hc-scroll').evaluate(el=>el.clientHeight);
  await page.evaluate(()=>scrollTo(0,1000)); await page.getByLabel('Owner address', {exact:true}).fill('0x6cba4751742f6989fa224b2dc5d5d52fcef98a34');
  await expect.poll(()=>page.locator('.hc-scroll').evaluate(el=>el.clientHeight)).toBeGreaterThanOrEqual(Math.max(load,300));
  const rect=(await page.locator('.hookcard').boundingBox())!;expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.y+rect.height).toBeLessThanOrEqual(height+1);
});
