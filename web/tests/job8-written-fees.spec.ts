import { expectFinding, expectReflow } from './v2-assertions';
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import site from '../../public/site-config.json' with { type: 'json' };
import { newDraft, entry, IMD_TREASURY, type Draft } from '../../src/lib/compose';
import { emptyIntake, injectedOwner } from './chain-fixture';

const payer = '0x1111111111111111111111111111111111111111';
const out = '../tests/results/job8/revision-2';
const vague = `When the pool price moves by 1 percent over 30 seconds, charge a small hook fee on the ETH side of every buy, settled in ETH and send it to ${IMD_TREASURY}. No owner functions.`;
const payable = `Charge a 1 percent hook fee on the ETH side of every buy, settled in ETH and payable to ${IMD_TREASURY}. No owner functions.`;
function draft(type: 'B' | 'C', mode: 'prompt' | 'custom'): Draft {
  const d = newDraft(); d.type = type; d.mode = mode === 'custom' ? 'blocks' : mode; d.seeded = true;
  d.settings = { ...d.settings, chain: 4663, hname: 'PondHook', owner: payer, token: '0x2222222222222222222222222222222222222222' };
  if (mode === 'custom') d.blocks.push({ id: 'custom', p: { text: 'Observe swaps.' } }); else d.prompt = 'Observe swaps.';
  return d;
}
async function open(page: Page, d: Draft) {
  await emptyIntake(page); await injectedOwner(page, payer);
  await page.route('**/site-config.json', r => r.fulfill({ json: site }));
  await page.route('https://api.imd.fun/swarm', r => r.fulfill({ status: 503 }));
  await page.route('https://raw.githubusercontent.com/**', r => r.abort());
  await page.route(`${site.relayUrl}/**`, r => r.fulfill({ json: { entries: [] } }));
  const checked: any[] = [];
  await page.route(`${site.relayUrl}/check`, r => {
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

for (const width of [320, 390, 1440]) for (const type of ['B', 'C'] as const) for (const mode of ['prompt', 'custom'] as const) {
  test(`job8 written fees ${type}/${mode}/${width}`, async ({ page }) => {
    fs.mkdirSync(out, { recursive: true }); await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [], localFailures: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) localFailures.push(r.url()); });
    const checked = await open(page, draft(type, mode));
    const editor = page.locator(mode === 'prompt' ? '#p-text' : '.rule[data-block="custom"] textarea');
    for (const text of ['1% of every swap goes to the owner.', 'Add a 2% tax on sells for the owner.', 'Skim 1% of every swap for the owner.', 'Keep 1% of each swap for the owner.']) {
      await editor.fill(text);
      await expect(page.locator('#composed')).not.toContainText('Hook fee rate: 0%.');
      await expect(page.locator('#composed')).toContainText('Fees are always taken from the ETH (pair currency) side');
      await expect(page.locator('#composed')).toContainText(`Fee recipient: ${payer}.`);
      await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0);
      await expect(check(page)).toBeEnabled();
      await check(page).click(); await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
      await expect(next(page)).toBeEnabled();
      await editor.fill(text.replace(/\d+%/, '6%'));
      await expectFinding(page, '5%');
      await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
    }
    await editor.fill(payable);
    await expect(page.locator('#composed')).toContainText(`fee recipient ${IMD_TREASURY}, takes no salt argument`);
    await expect(page.locator('#composed')).toContainText(`Fee recipient: ${IMD_TREASURY}.`);
    await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0);
    await check(page).click(); await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
    expect(checked).toHaveLength(5);
    expect(checked[4].input.objective).toContain(`payable to ${IMD_TREASURY}`);
    expect(checked[4].input.objective).toContain(`fee recipient ${IMD_TREASURY}, takes no salt argument`);
    await expect(next(page)).toBeEnabled();
    await editor.fill(vague);
    await expectFinding(page, 'Name an exact fee amount');
    await expect(page.locator('#composed')).not.toContainText('Hook fee rate: 0%.');
    await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
    expect(checked).toHaveLength(5);
    await fits(page, width);
    if (type === 'B') {
      await page.locator('#findings:not(.ok), .safety-notice').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/fee-rate-${mode}-${width}.jpg`, type: 'jpeg', quality: 70 });
    }
    await page.goto('#launch');
    await expectFinding(page, 'Name an exact fee amount');
    await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
    await page.getByRole('link', { name: 'Edit in Builder' }).first().click(); await page.getByRole('button', { name: 'Open all', exact: true }).click();
    await editor.fill(vague.replace('a small hook fee', 'a 0.3 percent hook fee'));
    await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0); await expect(check(page)).toBeEnabled();
    await check(page).click(); await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
    await expect(next(page)).toBeEnabled(); await fits(page, width);
    expect(errors).toEqual([]); expect(localFailures).toEqual([]);
  });
}

test('job8 combined written and block cap locks Check, Continue and direct Launch until corrected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const d = draft('B', 'custom'); d.blocks.push(entry('swap-fee'));
  d.blocks.find(b => b.id === 'swap-fee')!.p.rate = 3;
  d.blocks.find(b => b.id === 'custom')!.p.text = 'Also charge a 4% fee on every swap for the owner.';
  await open(page, d);
  await expect(page.locator('#rule-notice')).toContainText('Fees total 7.0%');
  await expectFinding(page, 'including written charges, total 7%');
  await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
  await page.goto('#launch');
  await expectFinding(page, 'including written charges, total 7%');
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Edit in Builder' }).first().click(); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await page.locator('.rule[data-block="custom"] textarea').fill('Also charge a 2.0001% fee on every swap for the owner.');
  await expectFinding(page, 'including written charges, total 5.0001%');
  await expect(check(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
  await page.locator('.rule[data-block="custom"] textarea').fill('Also charge a 2% fee on every swap for the owner.');
  await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0); await expect(check(page)).toBeEnabled();
  await check(page).click(); await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
  await expect(next(page)).toBeEnabled(); await fits(page, 390);
});
