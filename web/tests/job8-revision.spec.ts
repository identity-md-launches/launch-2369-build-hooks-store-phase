import { expectFinding, expectReflow } from './v2-assertions';
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import site from '../../public/site-config.json' with { type: 'json' };
import { newDraft, entry, IMD_TREASURY, type Draft } from '../../src/lib/compose';
import { emptyIntake, injectedOwner } from './chain-fixture';

const payer = '0x1111111111111111111111111111111111111111';
const relay = site.relayUrl!;
const output = '../tests/results/job8/revision';
function draft(mode: 'prompt' | 'custom' | 'blocks'): Draft {
  const d = newDraft(); d.type = 'B'; d.mode = mode === 'custom' ? 'blocks' : mode; d.seeded = true;
  d.settings = { ...d.settings, chain: 4663, hname: 'PondHook', owner: payer, token: '0x2222222222222222222222222222222222222222' };
  if (mode === 'custom') d.blocks.push({ id: 'custom', p: { text: 'Observe swaps. No owner functions.' } });
  else d.prompt = 'Observe swaps. No owner functions.';
  return d;
}
async function open(page: Page, d: Draft) {
  await emptyIntake(page); await injectedOwner(page, payer);
  await page.route('**/site-config.json', r => r.fulfill({ json: site }));
  await page.route('https://api.imd.fun/swarm', r => r.fulfill({ status: 503 }));
  await page.route('https://raw.githubusercontent.com/**', r => r.abort());
  await page.route(`${relay}/**`, r => r.fulfill({ json: { entries: [] } }));
  const checked: any[] = [];
  await page.route(`${relay}/check`, r => {
    checked.push(r.request().postDataJSON());
    return r.fulfill({ json: { facts: [], plan: [], blockers: [], suggestions: [] } });
  });
  await page.addInitScript(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), d);
  await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await page.locator('#connect').click(); await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await expect(page.locator('#connect')).toHaveClass(/address/);
  return checked;
}
const check = (page: Page) => page.getByRole('button', { name: 'Check with the swarm (free)', exact: true });
const next = (page: Page) => page.getByRole('button', { name: 'Continue to launch', exact: true });
async function fits(page: Page, width: number) { await expectReflow(page, width); }

for (const width of [320, 390, 1440]) for (const mode of ['prompt', 'custom'] as const) {
  test(`job8 revision written fees and PoolId correction in ${mode} at ${width}px`, async ({ page }) => {
    fs.mkdirSync(output, { recursive: true }); await page.setViewportSize({ width, height: 844 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const localFailures: string[] = []; page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) localFailures.push(r.url()); });
    const checked = await open(page, draft(mode));
    const editor = page.locator(mode === 'prompt' ? '#p-text' : '.rule[data-block="custom"] textarea');
    await editor.fill('Take a reasonable hook fee on every swap.');
    await expectFinding(page, 'Name an exact fee amount');
    await expect(page.locator('#composed')).not.toContainText('Hook fee rate: 0%.');
    await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
    await fits(page, width);
    if (width === 390 && mode === 'prompt') {
      await page.locator('#findings:not(.ok), .safety-notice').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/uncertain-fee-390.jpg`, type: 'jpeg', quality: 80 });
      await page.goto('#launch');
      await expectFinding(page, 'Name an exact fee amount');
      await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
      await page.getByRole('link', { name: 'Edit in Builder' }).first().click(); await page.getByRole('button', { name: 'Open all', exact: true }).click();
    }
    for (const amount of ['30 basis points', '1 percent', 'half a percent']) {
      await editor.fill(`Charge a fee of ${amount} on every swap and send it to ${IMD_TREASURY}. No owner functions.`);
      await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0);
      await expect(page.locator('#composed')).not.toContainText('Hook fee rate: 0%.');
      await expect(page.locator('#composed')).toContainText(`fee recipient ${IMD_TREASURY}, takes no salt argument`);
      await expect(page.locator('#composed')).toContainText(`Fee recipient: ${IMD_TREASURY}.`);
      await expect(page.locator('#composed')).toContainText('settled in ETH');
      await expect(check(page)).toBeEnabled();
    }
    await check(page).click();
    await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
    expect(checked).toHaveLength(1);
    expect(checked[0].input.objective).toContain(`fee recipient ${IMD_TREASURY}, takes no salt argument`);
    expect(checked[0].input.objective).not.toContain('Hook fee rate: 0%.');
    await expect(next(page)).toBeEnabled();
    // A C launch uses the same recipient and requires the existing token.
    await page.getByRole('button', { name: /^C: Hook for my existing token/ }).click();
    await expect(page.locator('#composed')).toContainText('only pools of native ETH and 0x2222222222222222222222222222222222222222');
    await expect(page.locator('#composed')).toContainText(`fee recipient ${IMD_TREASURY}, takes no salt argument`);
    await editor.fill('Publish a price through twap(uint32 secondsAgo). No owner functions.');
    await expectFinding(page, 'twap is pool-dependent');
    await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
    await editor.fill('Only the owner may pause swaps through pause() and unpause(); paused() reports the state.');
    await expectFinding(page, 'pause is pool-dependent');
    await fits(page, width);
    if (mode === 'prompt') {
      await page.getByRole('button', { name: 'Owner pause controls', exact: true }).click();
      for (const name of ['pause', 'unpause', 'paused']) await expect(editor).toHaveValue(new RegExp(`${name}\\(PoolId poolId\\)`));
      await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0);
      await page.getByRole('button', { name: 'Price reading', exact: true }).click();
      await expect(editor).toHaveValue(/twap\(PoolId poolId, uint32 secondsAgo\)/);
    } else await editor.fill('Publish a price through twap(PoolId poolId, uint32 secondsAgo). No owner functions.');
    await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0); await expect(check(page)).toBeEnabled();
    await fits(page, width);
    await page.evaluate(() => scrollTo(0, 0)); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/builder-${mode}-${width}.jpg`, type: 'jpeg', quality: 80 });
    expect(errors).toEqual([]); expect(localFailures).toEqual([]);
  });
}

test('job8 revision palette explains conflicting pairs and the peak-fee cap locks until corrected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const d = draft('blocks'); d.prompt = ''; d.blocks = ['swap-fee', 'jar', 'fee-fade', 'fee-vol'].map(entry);
  d.blocks.find(b => b.id === 'swap-fee')!.p.rate = 0.1;
  d.blocks.find(b => b.id === 'jar')!.p.rate = 4.9;
  d.blocks.find(b => b.id === 'fee-fade')!.p.start = 30;
  await open(page, d);
  await expect(page.locator('#rule-notice')).toContainText('Fees total 34.9%');
  await expectFinding(page, 'highest simultaneous ETH-side hook fees total 34.9%');
  await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
  await page.locator('.rule[data-block="fee-fade"]').getByLabel('Start (%)').fill('1');
  await expect(page.locator('#rule-notice')).toContainText('Fees total 7.9%');
  await page.locator('.rule[data-block="jar"]').getByLabel('Jar rate (% of ETH side)').fill('2');
  await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0); await expect(check(page)).toBeEnabled();
  await page.getByRole('tab', { name: /^Protection/ }).click();
  await page.getByRole('button', { name: 'Add Max buy per wallet', exact: true }).click();
  for (const [id,tab] of [['pause','Timing'], ['hours','Timing'], ['breaker','Protection']]) { await page.getByRole('tab', {name: new RegExp('^'+tab)}).click(); await expect(page.locator(`.bcard[data-block="${id}"] .pill.state`)).toHaveText('REMOVE MAX BUY PER WALLET FIRST'); }
  await page.getByRole('button', { name: 'Remove Max buy per wallet', exact: true }).click();
  await page.getByRole('tab', {name:/^Liquidity/}).click();
  await page.getByRole('button', { name: 'Add Liquidity lock', exact: true }).click();
  for (const [id,tab] of [['pause','Timing'], ['hours','Timing'], ['breaker','Protection']]) { await page.getByRole('tab', {name: new RegExp('^'+tab)}).click(); await expect(page.locator(`.bcard[data-block="${id}"] .pill.state`)).toHaveText('REMOVE LIQUIDITY LOCK FIRST'); }
  await fits(page, 390);
});
