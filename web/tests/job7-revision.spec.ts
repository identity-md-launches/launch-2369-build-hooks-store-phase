import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import site from '../../public/site-config.json' with { type: 'json' };
import recorded from '../../evidence/check-A-default-blocks.response.json' with { type: 'json' };
import { newDraft, entry, IMD_TREASURY, type Draft } from '../../src/lib/compose';
import { head, interceptChains, owner } from './chain-fixture';

const relay = 'https://hooks-store-relay.hooks-store.workers.dev';
const output = '../tests/results/job8/regression-job7';
function draft(): Draft {
  const d = newDraft(); d.mode = 'blocks';
  d.settings = { ...d.settings, chain: 1, pool: 50, rem: IMD_TREASURY, owner };
  return d;
}
async function setup(page: Page, d: Draft, facts: unknown[] = []) {
  await interceptChains(page);
  await page.route('**/site-config.json', r => r.fulfill({ json: { ...site, chains: site.chains.map(c => ({ ...c, intakeFromBlock: head - 20 })) } }));
  await page.addInitScript(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), d);
  await page.route(`${relay}/**`, r => r.fulfill({ json: { entries: [] } }));
  let checks = 0;
  await page.route(`${relay}/check`, r => { checks++; return r.fulfill({ json: { facts, plan: [], blockers: [], suggestions: [] } }); });
  return () => checks;
}
async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}
async function locked(page: Page, quoted: string) {
  await expect(page.locator('.safety-notice')).toContainText(quoted);
  await expect(page.getByRole('button', { name: 'Check with the swarm (free)', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.goto('#launch');
  await expect(page.locator('.safety-notice')).toContainText(quoted);
  await expect(page.getByRole('button', { name: 'Check with the swarm (free)', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
}

for (const width of [320, 390, 1440]) {
  for (const [ids, quotes] of [
    [['lp-lock', 'hours'], ['removing it earlier reverts', 'Liquidity changes are always allowed.']],
    [['max-buy', 'max-swap'], ['Sells are never blocked.', 'in either direction.']],
  ]) test(`revision: ${ids.join('+')} locks both routes at ${width}px and removing a rule repairs it`, async ({ page }) => {
    const d = draft(); d.blocks.push(...ids.map(entry));
    const calls = await setup(page, d); await page.setViewportSize({ width, height: 844 });
    await page.goto('#builder');
    for (const quote of quotes) await expect(page.locator('.safety-notice')).toContainText(quote);
    await fits(page, width);
    if (width === 390 && ids[0] === 'lp-lock') {
      await page.locator('.safety-notice').scrollIntoViewIfNeeded();
      fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: `${output}/revision-pair-conflict-390.jpg`, type: 'jpeg', quality: 55 });
    }
    await locked(page, quotes[0]); expect(calls()).toBe(0);
    await page.getByRole('link', { name: 'Edit in Builder' }).first().click();
    await page.getByRole('button', { name: `Remove ${ids[1] === 'hours' ? 'Trading hours' : 'Max swap size'}`, exact: true }).click();
    await expect(page.locator('.safety-notice')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
  });

  for (const text of [
    'Every swap fee must be paid in ETH.',
    `Use Chainlink VRF to draw the pot and pay the winner at ${IMD_TREASURY}.`,
    'Use the USDC/ETH pool for pricing.',
    'Send swap fees to Bob.',
    'Swap fees go to Bob.',
  ]) test(`revision: custom rule ${text} locks Check and Launch at ${width}px`, async ({ page }) => {
    const d = draft(); d.blocks.push({ id: 'custom', p: { text } });
    const calls = await setup(page, d); await page.setViewportSize({ width, height: 844 }); await page.goto('#builder');
    await locked(page, text); await fits(page, width); expect(calls()).toBe(0);
    await page.getByRole('link', { name: 'Edit in Builder' }).first().click();
    await page.locator('.blk[data-block="custom"] textarea').fill('Observe swaps without changing them.');
    await expect(page.locator('.safety-notice')).toHaveCount(0);
    await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
    await expect(page.locator('.swarm-panel')).toContainText('No blockers reported'); expect(calls()).toBe(1);
  });

  test(`revision: recorded token_split locks 65% allocation through reload until an explicit opt-out is rechecked at ${width}px`, async ({ page }) => {
    const d = draft(); d.mode = 'prompt'; d.prompt = 'Observe swaps.'; d.settings.pair = 'eth'; d.settings.pool = 65;
    const fact = recorded.facts.find(f => f.id === 'token_split')!;
    const calls = await setup(page, d, [fact]); await page.setViewportSize({ width, height: 844 }); await page.goto('#builder');
    await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
    await expect(page.locator('.swarm-panel [role="alert"]')).toContainText(fact.label);
    await expect(page.locator('.swarm-panel [role="alert"]')).toContainText('Pool: 65%');
    await expect(page.locator('.swarm-panel')).not.toContainText('No blockers reported for this exact request.');
    await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled(); await fits(page, width);
    if (width === 390) {
      await page.locator('.swarm-panel').scrollIntoViewIfNeeded();
      fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: `${output}/revision-fixed-conflict-390.jpg`, type: 'jpeg', quality: 55 });
    }
    await page.goto('#launch'); await page.reload();
    await expect(page.locator('.swarm-panel [role="alert"]')).toContainText('Pool: 65%');
    await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
    await page.getByRole('link', { name: 'Edit in Builder' }).first().click();
    await page.locator('#p-text').fill('Observe swaps. Opt out of fixed fact token_split.');
    await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
    await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
    await expect(page.locator('.swarm-panel [role="alert"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled(); expect(calls()).toBe(2);
  });
  test(`revision: supplied Observe swaps example remains usable at ${width}px`, async ({ page }) => {
    const d = draft(); d.mode = 'prompt'; d.settings.pair = 'eth';
    await setup(page, d); await page.setViewportSize({ width, height: 844 }); await page.goto('#builder');
    await page.getByRole('button', { name: 'Observe swaps', exact: true }).click();
    await expect(page.locator('#composed')).toContainText('Observe swaps without changing them. No owner functions.');
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
    await expect(page.locator('.safety-notice')).toHaveCount(0);
    await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled(); await fits(page, width);
  });
}

test('revision: ETH pairing rejects an IMD payment sentence and an addressed fixed remainder conflicts', async ({ page }) => {
  const d = draft(); d.settings.pair = 'eth'; d.mode = 'prompt'; d.prompt = 'Every swap fee must be paid in IMD.';
  const fact = { id: 'token_split', state: 'fixed', label: `Split: 10% to the swarm, the other 90% is yours: 50% into the pool, the rest to ${owner}` };
  await setup(page, d, [fact]); await page.goto('#builder'); await locked(page, d.prompt);
  await page.getByRole('link', { name: 'Edit in Builder' }).first().click();
  await page.locator('#p-text').fill('Observe swaps.');
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-panel [role="alert"]')).toContainText(owner);
  await expect(page.locator('.swarm-panel [role="alert"]')).toContainText(IMD_TREASURY);
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
});
