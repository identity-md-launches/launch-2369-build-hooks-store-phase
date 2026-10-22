import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { addBlock, newDraft, type Draft } from '../../src/lib/compose';
import { emptyIntake, injectedOwner, owner } from './chain-fixture';

const output = '../tests/results/job8';
const warning = 'Written rules are riskier than blocks. If the builder has to stop and ask a question after you pay, the 0.5 IMD is spent. Blocks are checked sentences; words are yours.';
const validDraft = (mode: 'prompt' | 'blocks' = 'blocks') => {
  let draft = newDraft(); draft.mode = mode; draft.seeded = true;
  draft.settings = { ...draft.settings, chain: 1, pool: 50, owner };
  for (const id of ['swap-fee', 'anti-sniper', 'jar']) draft = addBlock(draft, id);
  if (mode === 'prompt') draft.prompt = 'Only the owner may pause and unpause swaps through pause() and unpause(). No other owner functions.';
  return draft;
};
async function open(page: Page, draft: Draft) {
  await emptyIntake(page); await injectedOwner(page);
  await page.route('https://api.imd.fun/swarm', route => route.fulfill({ status: 503 }));
  await page.route('https://raw.githubusercontent.com/**', route => route.abort());
  await page.addInitScript(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), draft);
  await page.goto('#builder');
  await page.locator('#connect').click();
  await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await expect(page.locator('#connect')).toHaveClass(/address/);
}
async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth), 'document width').toBeLessThanOrEqual(width);
  const overflow = await page.locator('.builder input, .builder textarea, .builder select, .builder button').evaluateAll(elements => elements.filter(element => {
    const rect = element.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1);
  }).map(element => element.outerHTML.slice(0, 160)));
  expect(overflow).toEqual([]);
}
async function exact(page: Page) {
  const details = page.locator('details.exact');
  if (!await details.getAttribute('open').then(value => value !== null)) await details.locator('summary').click();
  return page.locator('#composed').textContent();
}

for (const width of [320, 390, 1440]) for (const mode of ['prompt', 'blocks'] as const) {
  test(`job8 Builder ${mode} interactions and reflow at ${width}px`, async ({ page }) => {
    fs.mkdirSync(output, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await open(page, validDraft(mode));
    await expect(page.getByRole('heading', { name: 'Builder', exact: true })).toBeVisible();
    const type = await page.getByRole('button', { name: /^A: Hook \+ new token/ }).boundingBox();
    expect(type!.y).toBeLessThan(900);
    if (mode === 'blocks') {
      await expect(page.locator('#stack .blk[data-block="swap-fee"]')).toBeVisible();
      await page.locator('#stack .blk[data-block="swap-fee"]').getByLabel('Rate (%)').fill('1.5');
      await expect(page.locator('.sum li[data-block="swap-fee"]')).toContainText('1.5%');
      expect(await exact(page)).toContain('Take 1.5% of the IMD side');
      await page.getByRole('button', { name: 'Describe it', exact: true }).click();
      await expect(page.locator('.written-rules')).toContainText(warning);
      await expect(page.locator('.added-h')).toHaveText('Saved stack, not included');
      await page.locator('#p-text').fill('Observe swaps without changing them. No owner functions.');
      expect(await exact(page)).toContain('Hook fee rate: 0%.');
      expect(await exact(page)).not.toContain('Take 1.5%');
      await expect(page.locator('.sum')).toContainText('no block rules are included');
      await page.getByRole('button', { name: 'Use saved stack' }).click();
      await expect(page.locator('#stack .blk[data-block="swap-fee"]').getByLabel('Rate (%)')).toHaveValue('1.5');
    } else {
      await expect(page.locator('.written-rules')).toContainText(warning);
      await expect(page.locator('.written-rules')).toContainText('Name every address, currency, amount and time.');
      await expect(page.locator('.sum')).toContainText('Only the owner may pause and unpause');
      const text = await exact(page);
      expect(text).toContain('Permit only the owner functions expressly granted');
      expect(text).not.toContain('No owner functions, no backend signer');
      expect(text).toContain('Hook fee rate: 0%.');
      expect(text).not.toContain('Take 1.0%');
      await page.getByRole('button', { name: 'Bring my own' }).click();
      await expect(page.getByRole('button', { name: 'Describe it', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.blk.token')).toContainText('1,000,000,000,000');
      await page.getByRole('button', { name: 'Use standard token' }).click();
    }
    await fits(page, width);
    await page.getByRole('button', { name: mode === 'prompt' ? 'Describe it' : 'Stack blocks', exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${output}/builder-${mode}-${width}.png`, type: 'png' });
    expect(errors).toEqual([]);
  });
}

test('job8 Custom rule warning, disabled catalog entries, visible palette switch, size notice and split destination', async ({ page }) => {
  let draft = validDraft('blocks');
  for (const id of ['cooldown', 'max-swap', 'pause', 'oracle']) draft = addBlock(draft, id);
  await open(page, draft);
  await expect(page.locator('.block-count')).toContainText('Every extra rule is more for the audit panel to refuse');
  await expect(page.locator('.block-count')).toContainText('24 KB');
  const advanced = page.locator('.palette details').filter({ has: page.locator('[data-block="async"]') });
  if (!await advanced.getAttribute('open').then(value => value !== null)) await advanced.locator('summary').click();
  await expect(page.locator('.pal-item[data-block="async"]')).toContainText('not in this version');
  await expect(page.locator('.pal-item[data-block="yield"]')).toContainText('no verified deployment');
  const custom = page.locator('.palette details').filter({ has: page.locator('[data-block="custom"]') });
  await custom.locator('summary').click();
  await page.getByRole('button', { name: 'Add Custom rule', exact: true }).click();
  await expect(page.locator('.blk[data-block="custom"] .written-rules')).toContainText(warning);
  await page.locator('.blk[data-block="custom"] textarea').fill('Observe swaps without changing them.');
  await expect(page.locator('.sum li[data-block="custom"]')).toContainText('Observe swaps without changing them.');
  await page.getByRole('button', { name: 'Add Split the fee', exact: true }).click();
  await page.locator('.blk[data-block="fee-split"]').getByLabel('Second address').fill(owner);
  await expect(page.locator('.blk[data-block="swap-fee"]').getByLabel('Send to')).toBeDisabled();
  await expect(page.locator('.blk[data-block="swap-fee"]')).toContainText('Split the fee replaces this destination');
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await page.getByRole('button', { name: 'Add Different buy and sell fees', exact: true }).count().then(count => expect(count).toBe(0));
  // A fresh palette addition exposes its full editable stack immediately.
  const timing = page.locator('.palette details').filter({ has: page.locator('[data-block="sunset"]') });
  if (!await timing.getAttribute('open').then(value => value !== null)) await timing.locator('summary').click();
  await page.getByRole('button', { name: 'Add Sunset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stack blocks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stack .blk[data-block="sunset"]')).toBeVisible();
});
