import { emptyIntake, injectedOwner, owner } from './chain-fixture';
import { getAddress } from 'viem';
import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({page}) => { await emptyIntake(page); await injectedOwner(page); });
import catalog from '../../src/blocks/catalog.json' with { type: 'json' };

const SPEC_URL = 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/blocks-verified.json';
const HEADS_UP = 'Heads up: this block is easy to work around or needs care.';
type Verified = { block: string; passed: boolean }[] | 'fail';
async function open(page: Page, verified: Verified = 'fail', draft?: object) {
  await page.route('https://api.imd.fun/swarm', route => route.fulfill({ status: 503, body: '' }));
  await page.route(SPEC_URL, route => verified === 'fail' ? route.abort() : route.fulfill({ json: verified }));
  await page.goto('#store');
  await page.evaluate(d => { localStorage.clear(); if (d) localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)); }, draft ?? null);
  await page.goto('#builder'); await page.reload();
  await expect(page.getByRole('heading', { name: '1. What are you launching?' })).toBeVisible();
  await page.locator('#connect').click();
  await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await expect(page.locator('#connect')).toHaveClass(/address/);
}
async function noOverflow(page: Page) {
  const w = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(w.document).toBeLessThanOrEqual(w.viewport);
}
const stackIds = (page: Page) => page.locator('#stack .blk[data-block]:not(.token)').evaluateAll(els => els.map(el => el.getAttribute('data-block')));
const exact = (page: Page) => page.locator('#composed').textContent();
const continueButton = (page: Page) => page.getByRole('button', { name: 'Continue to launch' });

for (const width of [320, 390, 1440]) {
  test(`Builder at ${width}px: type, mode, switching without loss, add, reorder, remove, reload`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await open(page);
    // 1. launch type cards come first; the chooser shows on a first visit.
    const first = await page.locator('.types').boundingBox(), palette = await page.locator('.palette').boundingBox();
    if (width < 821) expect(first!.y).toBeLessThan(palette!.y);
    await expect(page.locator('.chooser .choice')).toHaveCount(2);
    await page.getByRole('button', { name: /^B: Hook only/ }).click();
    await expect(page.getByRole('button', { name: /^B: Hook only/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pal-item[data-block="async"] .pill.state')).toHaveText('not in this version');
    await expect(page.locator('.pal-item[data-block="async"] button')).toHaveCount(0);
    await page.getByRole('button', { name: /^A: Hook \+ new token/ }).click();
    await expect(page.locator('.pal-item[data-block="async"] .pill.state')).toHaveText('not in this version');
    await expect(page.locator('.pal-item[data-block="lp-fee"] .pill.state')).toHaveText('OWN POOLS ONLY');
    // 2. Describe mode: a palette addition reveals the editable stack.
    await page.getByRole('button', { name: 'Describe it in words' }).click();
    await expect(page.locator('.chooser')).toHaveCount(0);
    const words = 'Observe swaps without changing their accounting.';
    await page.getByRole('textbox', { name: /What should it do/ }).fill(words);
    await page.getByRole('button', { name: 'Add Cooldown' }).click();
    await expect(page.getByRole('button', { name: 'Stack blocks', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#stack .blk[data-block="cooldown"]')).toBeVisible();
    await expect(page.locator('#stack .blk[data-block="cooldown"]')).toContainText('30s between swaps per wallet');
    // The words stay, and adding a block does not force the default stack on top of it.
    expect(await stackIds(page)).toEqual(['cooldown']);
    await page.getByRole('button', { name: 'Add Swap fee' }).click();
    await page.getByRole('button', { name: 'Add Anti-sandwich' }).click();
    expect(await stackIds(page)).toEqual(['cooldown', 'swap-fee', 'anti-sandwich']);
    await page.getByRole('button', { name: 'Move Anti-sandwich up' }).click();
    expect(await stackIds(page)).toEqual(['cooldown', 'anti-sandwich', 'swap-fee']);
    await page.getByRole('button', { name: 'Move Cooldown down' }).click();
    expect(await stackIds(page)).toEqual(['anti-sandwich', 'cooldown', 'swap-fee']);
    await page.locator('.blk[data-block="cooldown"]').getByRole('button', { name: 'Remove Cooldown' }).click();
    expect(await stackIds(page)).toEqual(['anti-sandwich', 'swap-fee']);
    await expect(page.locator('.blk[data-block="swap-fee"] .manage-note')).toContainText('Who uses it: Runs itself; fees reach the recipient automatically. On the hook page: Anyone can: send collected fees to the recipient.');
    await page.locator('.blk[data-block="swap-fee"]').getByLabel('Rate (%)').fill('1.5');
    await expect(page.locator('.blk[data-block="swap-fee"] .sentence')).toHaveText('1.5% on every buy and sell → my wallet');
    const text = await exact(page);
    expect(text).toContain(`<description>${words}</description>`);
    expect(text).toContain('If the description and a numbered rule disagree, the numbered rule wins.');
    expect(text).toContain('2. Take 1.5% of the IMD side of every buy and sell');
    // Back to Describe: saved rules remain editable but are omitted from the request.
    await page.getByRole('button', { name: 'Describe it', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /What should it do/ })).toHaveValue(words);
    await expect(page.locator('.added .chip')).toHaveCount(2);
    await expect(page.locator('.rule-line')).toHaveText('Describe it sends only your words and token choice. Switch to Stack blocks to include and edit these saved rules.');
    expect(await exact(page)).not.toContain('Take 1.5%');
    expect(await exact(page)).not.toContain('Within one block');
    expect(await exact(page)).toContain('Hook fee rate: 0%.');
    await expect(page.locator('.sum')).toContainText('no block rules are included');
    await page.getByRole('button', { name: 'Remove Anti-sandwich' }).click();
    await expect(page.locator('.added .chip')).toHaveCount(1);
    await page.locator('#s-pool').fill('45');
    await expect(page.locator('.sum')).toContainText('45% of total supply in the pool; 10% swarm; 45% remainder');
    await noOverflow(page);
    await page.screenshot({ path: `../artifacts/builder-${width}.png`, fullPage: false });
    // Reload: the draft reopens exactly.
    await page.reload();
    await expect(page.getByRole('textbox', { name: /What should it do/ })).toHaveValue(words);
    await expect(page.locator('.added .chip')).toHaveCount(1);
    await expect(page.locator('#s-pool')).toHaveValue('45');
    await expect(page.getByRole('button', { name: 'Describe it', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Stack blocks', exact: true }).click();
    await expect(page.locator('.blk[data-block="swap-fee"]').getByLabel('Rate (%)')).toHaveValue('1.5');
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}

test('first visit to the stack starts from the default stack; preview, cost box and disabled check', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Stack blocks', exact: true }).first().click();
  expect(await stackIds(page)).toEqual(['swap-fee', 'anti-sniper', 'jar']);
  await expect(page.locator('.blk.token')).toContainText('Pondside ($POND), standard token');
  await expect(page.locator('.cost strong').first()).toHaveCSS('font-family', /VT323/);
  await expect(page.locator('.cost')).toContainText('0.5 IMD');
  await expect(page.getByRole('button', { name: 'Check with the swarm (free)' })).toBeDisabled();
  await expect(page.locator('#check-note')).toContainText('needs the relay');
  await expect(page.locator('details.exact')).not.toHaveAttribute('open', '');
  await page.getByText('Exact text the swarm receives').click();
  await expect(page.locator('#composed')).toBeVisible();
  for (const label of ['Type', 'Token', 'Chain', 'Words', 'Rules', 'Owner', 'Pool']) await expect(page.locator('.sum > li > b', { hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  await page.getByRole('button', { name: 'Bring my own' }).click();
  await expect(page.locator('.blk.token')).toContainText('your own token');
  await page.getByRole('button', { name: 'Use standard token' }).click();
  await expect(page.locator('.blk.token')).toContainText('standard token');
});

test('pool share is of total supply with no default; Continue stays disabled until 10 to 90 in steps of 5', async ({ page }) => {
  await open(page, 'fail', { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'swap-fee' }] });
  await expect(page.locator('#s-chain')).toHaveValue('');
  await expect(page.locator('#s-chain option')).toHaveText(['Choose a chain', 'Robinhood Chain', 'Ethereum']);
  await expect(page.locator('#s-pool')).toHaveValue('');
  await page.locator('#s-chain').selectOption('4663');
  await expect(continueButton(page)).toBeDisabled();
  await expect(page.locator('.sum')).toContainText('Not chosen yet');
  expect(await exact(page)).not.toContain('Pool:');
  for (const bad of ['5', '12', '95']) {
    await page.locator('#s-pool').fill(bad);
    await expect(continueButton(page)).toBeDisabled();
    await expect(page.locator('.settings .field-error')).toContainText('10 to 90, in steps of 5');
  }
  await page.locator('#s-pool').fill('50');
  await expect(continueButton(page)).toBeEnabled();
  expect(await exact(page)).toContain(`Pool: 50% of the total supply seeds the pool; 10% goes to the swarm; the remaining 40% goes to ${getAddress(owner)}.`);
  await continueButton(page).click(); await expect(page).toHaveURL(/#launch$/);
});

test('4.10 rules in the interface: 5% cap, swap-fee dependencies, buy/sell exclusion, own-pools-only blocks', async ({ page }) => {
  await open(page, 'fail', { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'swap-fee' }, { id: 'jar' }], settings: { chain: 4663, pool: 50 } });
  await expect(continueButton(page)).toBeEnabled();
  await page.locator('.palette summary', { hasText: 'Games and lotteries' }).click();
  await page.getByRole('button', { name: 'Add Prize pot' }).click();
  await page.locator('.blk[data-block="swap-fee"]').getByLabel('Rate (%)').fill('2.5');
  await expect(page.locator('#rule-notice')).toContainText('Fees total 5.5%');
  await expect(page.locator('#rule-notice')).toHaveCSS('border-left-color', 'rgb(163, 56, 43)');
  await expect(continueButton(page)).toBeDisabled();
  await page.locator('.blk[data-block="swap-fee"]').getByLabel('Rate (%)').fill('1');
  await expect(page.locator('#rule-notice')).toHaveCount(0);
  await expect(page.locator('.pal-item[data-block="fee-dir"] .pill.state')).toHaveText('REMOVE SWAP FEE FIRST');
  await page.getByRole('button', { name: 'Add Fee that fades' }).click();
  await page.getByRole('button', { name: 'Add Split the fee' }).click();
  await expect(page.locator('.blk[data-block="fee-split"] .field-error')).toContainText('full 0x address');
  await expect(continueButton(page)).toBeDisabled();
  await page.locator('.blk[data-block="swap-fee"]').getByRole('button', { name: 'Remove Swap fee' }).click();
  expect(await stackIds(page)).toEqual(['jar', 'pot']);
  await expect(page.getByRole('status').filter({ hasText: 'Also removed' })).toContainText('Fee that fades, Split the fee');
  for (const id of ['fee-fade', 'fee-split', 'lp-share']) await expect(page.locator(`.pal-item[data-block="${id}"] .pill.state`)).toHaveText('NEEDS SWAP FEE');
  await page.getByRole('button', { name: 'Add Different buy and sell fees' }).click();
  await expect(page.locator('.pal-item[data-block="swap-fee"] .pill.state')).toHaveText('REMOVE DIFFERENT BUY AND SELL FEES FIRST');
  // Batch auctions and Yield stay unavailable; an eligible B-only block is
  // preserved but left out of the request when changing to type A.
  await page.getByRole('button', { name: /^B: Hook only/ }).click();
  await page.locator('.palette summary', { hasText: 'Advanced' }).click();
  await expect(page.locator('.pal-item[data-block="async"] .pill.state')).toHaveText('not in this version');
  await expect(page.locator('.pal-item[data-block="yield"] .pill.state')).toHaveText('no verified deployment');
  await expect(page.getByRole('button', { name: 'Add Batch auctions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add Yield on idle liquidity' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Pool rules' }).click();
  await expect(page.locator('.blk[data-block="pool-rules"]')).toBeVisible();
  expect(await exact(page)).toContain('fee tier is 0.3%');
  await page.getByRole('button', { name: /^A: Hook \+ new token/ }).click();
  await expect(page.locator('.blk[data-block="pool-rules"]')).toHaveClass(/off/);
  await expect(page.locator('.blk[data-block="pool-rules"] .pill.state')).toHaveText('Not for this launch type');
  expect(await exact(page)).not.toContain('fee tier is 0.3%');
  expect(await exact(page)).not.toContain('BaseAsyncSwap');
  // State pills stay within 96 px and never squeeze the palette text column.
  for (const box of await page.locator('.pal-item .pill.state').evaluateAll(els => els.map(el => el.getBoundingClientRect().width))) expect(box).toBeLessThanOrEqual(96);
  const text = await page.locator('.pal-item[data-block="swap-fee"] .pal-text').boundingBox();
  expect(text!.width).toBeGreaterThan(100);
});

for (const width of [320, 390, 1440]) {
test(`risk tooltips at ${width}px: every sign stays readable on hover and keyboard focus`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const risky = catalog.blocks.filter(b => 'risk' in b && b.risk);
  expect(risky.map(b => b.id).sort()).toEqual(['anti-sniper', 'breaker', 'cooldown', 'custom', 'max-buy', 'max-swap', 'pot']);
  await open(page, 'fail', { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, ...risky.map(b => ({ id: b.id, ...(b.id === 'custom' ? { p: { text: 'Observe swaps without changing them.' } } : {}) }))], settings: { chain: 4663, pool: 50 } });
  await expect(page.locator('details', { hasText: 'Games and lotteries' }).locator('.pal-item[data-block="pot"]')).toHaveCount(1);
  for (const b of risky) {
    const tip = `${HEADS_UP} ${(b as { risk: string }).risk} not yet proven in a live launch`;
    for (const where of [`.pal-item[data-block="${b.id}"]`, `.blk[data-block="${b.id}"]`, `.sum li[data-block="${b.id}"]`]) {
      const sign = page.locator(`${where} .warn`);
      await expect(sign).toHaveCount(1);
      await expect(sign).toHaveAttribute('data-tip', tip);
      await expect(sign).toHaveAttribute('aria-label', tip);
      await expect(sign).toHaveCSS('background-color', 'rgb(201, 162, 39)');
      await sign.evaluate(el => el.scrollIntoView({ block: 'center' }));
      for (const trigger of ['hover', 'focus'] as const) {
        await page.mouse.move(0, 0);
        await page.locator('.warn:focus').evaluateAll(els => els.forEach(el => (el as HTMLElement).blur()));
        if (trigger === 'hover') await sign.hover();
        else {
          await sign.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          await expect(sign).toBeFocused();
          await expect(sign).toHaveCSS('outline-style', 'solid');
        }
        const box = await sign.evaluate(el => {
          const tip = getComputedStyle(el, '::after');
          // The tooltip's containing block is the palette row, card header or summary rule.
          const row = el.closest('.pal-item, .blk-head, .sum ol li')!;
          const rect = row.getBoundingClientRect(), rowStyle = getComputedStyle(row);
          const left = rect.left + parseFloat(rowStyle.borderLeftWidth) + parseFloat(tip.left);
          return { display: tip.display, left, right: left + parseFloat(tip.width), viewport: innerWidth, document: document.documentElement.scrollWidth, content: tip.content };
        });
        expect(box.display, `${b.id}, ${where}, ${trigger}`).toBe('block');
        expect(box.content).toContain(tip);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(box.viewport);
        expect(box.document).toBeLessThanOrEqual(box.viewport);
      }
    }
  }
  const sign = page.locator('.blk[data-block="breaker"] .warn');
  expect(await sign.evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('0');
  await sign.focus();
  await expect.poll(() => sign.evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('1');
  await page.locator('.pal-item[data-block="pot"] .warn').hover();
  await expect.poll(() => page.locator('.pal-item[data-block="pot"] .warn').evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('1');
  expect(await page.locator('.warn').count()).toBe(risky.length * 3);
  // No red labels: the signs are yellow and nothing on the cards is coloured "bad".
  expect(await page.locator('.blk .pill').evaluateAll(els => els.filter(el => getComputedStyle(el).backgroundColor === 'rgb(163, 56, 43)').length)).toBe(0);
});
}

test('untested block names expose the status to assistive technology without a risk sign', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page, [{ block: 'jar', passed: true }], { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'jar' }, { id: 'swap-fee' }] });
  for (const where of ['.pal-item', '.blk']) {
    const untested = page.locator(`${where}[data-block="swap-fee"] .block-name`);
    await expect(untested).toHaveAttribute('title', 'not yet proven in a live launch');
    await expect(untested.locator('.sr')).toHaveText(', not yet proven in a live launch');
    // ariaSnapshot checks the accessible text rather than only the native hover title.
    expect(await untested.ariaSnapshot()).toContain('not yet proven in a live launch');
    await expect(page.locator(`${where}[data-block="jar"] .block-name .sr`)).toHaveCount(0);
  }
});

test('dependent-removal status describes the removed block and clears after the next draft edit', async ({ page }) => {
  const edits: [string, () => Promise<unknown>][] = [
    ['add', () => page.getByRole('button', { name: 'Add Swap fee', exact: true }).click()],
    ['mode', () => page.getByRole('button', { name: 'Describe it', exact: true }).click()],
    ['type', () => page.getByRole('button', { name: /^B: Hook only/ }).click()],
    ['setting', () => page.locator('#s-pool').fill('45')],
    ['block field', () => page.locator('.blk[data-block="jar"]').getByLabel('Jar rate (% of IMD side)').fill('1.5')],
    ['reorder', () => page.getByRole('button', { name: 'Move Buyback jar up' }).click()],
    ['remove', () => page.getByRole('button', { name: 'Remove Buyback jar' }).click()],
  ];
  for (const [name, edit] of edits) await test.step(name, async () => {
    await open(page, 'fail', { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'swap-fee' }, { id: 'jar' }, { id: 'fee-fade' }, { id: 'fee-split' }] });
    await page.getByRole('button', { name: 'Remove Swap fee', exact: true }).click();
    expect(await stackIds(page)).toEqual(['jar']);
    const note = page.getByRole('status').filter({ hasText: 'Also removed' });
    await expect(note).toHaveText('Also removed, because they need Swap fee: Fee that fades, Split the fee.');
    await edit();
    await expect(note).toHaveCount(0);
  });
});

test('tested marks: a passing entry shows the tick, others say not yet tested', async ({ page }) => {
  await open(page, [{ block: 'swap-fee', passed: true }, { block: 'cooldown', passed: false }], { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'swap-fee' }, { id: 'cooldown' }] });
  await expect(page.locator('.blk[data-block="swap-fee"] .tested')).toHaveText('✓ proven in a live launch');
  await expect(page.locator('.blk[data-block="cooldown"] .tested')).toHaveCount(0);
  await expect(page.locator('.blk[data-block="cooldown"] .warn')).toHaveAttribute('data-tip', /not yet proven in a live launch$/);
  await expect(page.locator('.blk[data-block="cooldown"] .block-name')).toHaveAttribute('title', 'not yet proven in a live launch');
  await expect(page.locator('.blk[data-block="swap-fee"] .block-name')).toHaveAttribute('title', 'proven in a live launch');
});

test('tested marks fall back to the bundled copy when the spec repository cannot be read', async ({ page }) => {
  await page.route('**/blocks-verified.json', route => route.request().url().startsWith('http://127.0.0.1') ? route.fulfill({ json: [{ block: 'jar', passed: true }] }) : route.abort());
  await open(page, 'fail', { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'jar' }, { id: 'swap-fee' }] });
  await expect(page.locator('.blk[data-block="jar"] .tested')).toHaveText('✓ proven in a live launch');
  await expect(page.locator('.blk[data-block="swap-fee"] .tested')).toHaveCount(0);
});

test('the shipped bundled copy is empty, so nothing shows a tick offline', async ({ page }) => {
  await open(page, 'fail', { type: 'A', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'jar' }] });
  await expect(page.locator('.blk[data-block="jar"] .block-name')).toHaveAttribute('title', 'not yet proven in a live launch');
  await expect(page.locator('.tested')).toHaveCount(0);
});

test('type C and B settings, own code and the request shape', async ({ page }) => {
  await open(page, 'fail', { type: 'C', mode: 'blocks', seeded: true, blocks: [{ id: 'token' }, { id: 'swap-fee' }] });
  await expect(continueButton(page)).toBeDisabled();
  await page.getByLabel('Existing token address').fill('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984');
  await page.getByLabel('Its symbol (optional)').fill('UNI');
  await page.getByLabel('Hook name').fill('UniFeeHook');
  await page.locator('#s-chain').selectOption('4663');
  await expect(continueButton(page)).toBeEnabled();
  await expect(page.locator('.palette details', { hasText: /^Token/ })).toHaveCount(0);
  await page.getByText('Advanced: start from my own code').click();
  await page.getByLabel('Repository URL').fill('https://github.com/you/your-hook');
  await expect(page.locator('.settings .field-error')).toContainText('40-character commit id');
  await expect(continueButton(page)).toBeDisabled();
  await page.getByLabel('Commit', { exact: true }).fill('3d4ef5b0000000000000000000000000000000aa');
  await expect(continueButton(page)).toBeEnabled();
  expect(await exact(page)).toContain('Start from the creator’s own source at https://github.com/you/your-hook commit 3d4ef5b0000000000000000000000000000000aa');
  await page.getByLabel(/Owner address/).fill('0x123');
  await expect(page.locator('.settings .field-error')).toContainText('Owner: enter a full 0x address');
});
