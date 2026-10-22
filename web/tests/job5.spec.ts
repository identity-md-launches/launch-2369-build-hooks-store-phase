import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import site from '../../public/site-config.json' with { type: 'json' };
import checked from '../../evidence/check-A-default-blocks.response.json' with { type: 'json' };
import { newDraft, body, type Draft } from '../../src/lib/compose';
import { interceptChains, route, requestId, head, jsonResult, hook, owner, injectedOwner } from './chain-fixture';

const relay = 'https://relay.hooks.test';
const validDraft = (): Draft => {
  const d = newDraft(); d.mode = 'prompt'; d.prompt = 'Observe swaps without fees or owner powers.';
  d.settings = { ...d.settings, chain: 1, pool: 50, rem: owner, owner }; return d;
};
async function setup(page: Page, options: { relay?: boolean; draft?: Draft; noLogs?: boolean; inProgress?: boolean; result?: unknown } = {}) {
  await interceptChains(page, { noLogs: options.noLogs, result: options.result });
  await page.route('**/site-config.json', r => r.fulfill({ json: { ...site, inProgress: options.inProgress ?? true, relayUrl: options.relay === false ? null : relay, chains: site.chains.map(c => ({ ...c, intakeFromBlock: head - 20 })) } }));
  if (options.draft) await page.addInitScript(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), options.draft);
  await page.route(`${relay}/**`, r => r.fulfill({ status: 503, json: { error: 'Unavailable fixture endpoint' } }));
}
async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const clipped = await page.locator('button, input, select, textarea').evaluateAll(els => els.filter(el => {
    const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && !el.closest('#shelf') && (rect.left < -1 || rect.right > innerWidth + 1);
  }).map(el => el.outerHTML.slice(0, 160)));
  expect(clipped).toEqual([]);
}

for (const width of [320, 390, 1440]) for (const [name, hash, heading] of [
  ['Store', '#store', 'Stack blocks.'], ['Catalog', '#catalog', 'Catalog'], ['Builder', '#builder', 'Builder'],
  ['Launch', '#launch', 'Review your launch'], ['Hook', route, 'PondGuard'], ['My hooks', `#mine?address=${owner}`, 'My hooks'], ['Learn', '#learn', 'Learn'],
]) test(`${name} regression at ${width}px: route, controls, resources and reflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const errors: string[] = [], failed: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) failed.push(r.url()); });
  await setup(page, { relay: false, draft: validDraft() }); await page.goto(hash);
  if (name === 'Catalog') await expect(page.locator('#catalog')).toBeVisible();
  else await expect(page.getByRole('heading', { name: heading, exact: name !== 'Store' })).toBeVisible();
  if (name === 'Store') {
    await expect(page.getByRole('button', { name: 'Describe it', exact: true })).toBeInViewport();
    await page.getByLabel('Describe your hook', { exact: true }).fill('A cooldown between swaps');
    await page.getByRole('button', { name: 'Describe it', exact: true }).click();
    await expect(page.locator('#p-text')).toHaveValue('A cooldown between swaps');
  } else if (name === 'Builder') {
    await expect(page.locator('#s-pair option')).toHaveText(['IMD', 'ETH']); await expect(page.locator('#s-pair')).toHaveValue('imd');
    await expect(page.locator('#composed')).toContainText('paired with IMD.');
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
    await expect(page.locator('#composed')).not.toContainText('Fees are always taken from');
    await page.locator('#s-pair').selectOption('eth'); await expect(page.locator('#composed')).toContainText('paired with ETH.');
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
    await expect(page.locator('#composed')).not.toContainText('Fees are always taken from');
    await expect(page.locator('.hookcard')).toContainText('Paired with ETH');
    await page.getByRole('button', { name: 'Continue to launch' }).click(); await expect(page).toHaveURL(/#launch$/);
  } else if (name === 'Catalog') {
    await page.getByRole('searchbox').fill('no matching hook'); await expect(page.getByText(/No hooks match/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear search and filters' }).click(); await expect(page.locator('.grid .card')).toHaveCount(1);
  } else if (name === 'Hook') {
    await expect(page.locator('.timeline li')).toHaveCount(5); await expect(page.locator('[data-function="pause"] button')).toBeDisabled();
  } else if (name === 'Learn') {
    await page.getByText(/^Which chains\?$/i).click(); await expect(page.locator('details[open]')).toHaveCount(2);
  } else if (name === 'Launch') {
    await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
    await page.getByText('Exact request the swarm receives', { exact: true }).click(); await expect(page.getByTestId('launch-json')).toContainText('"pairWith":"imd"');
  } else if (name === 'My hooks') {
    await expect(page.getByRole('link', { name: 'Manage', exact: true })).toHaveAttribute('href', `${route}?manage=1`);
  }
  await fits(page, width); expect(errors).toEqual([]); expect(failed).toEqual([]);
});

test('live free check renders IMD facts and plan, blocks continuation and direct Launch, persists on reload, then clears after a recheck', async ({ page }) => {
  const draft = validDraft(); await setup(page, { draft, inProgress: false });
  let blockers = ['Choose the outside service address.']; const inputs: any[] = [];
  await page.route(`${relay}/check`, r => { inputs.push(r.request().postDataJSON()); return r.fulfill({ json: { ...checked, blockers, suggestions: ['Describe who sets the address.'] } }); });
  await page.goto('#builder'); const check = page.getByRole('button', { name: 'Check with the swarm (free)', exact: true });
  await expect(check).toBeEnabled(); await check.click();
  await expect(page.getByRole('heading', { name: 'What the swarm understood' })).toBeVisible();
  await expect(page.locator('.swarm-facts')).toContainText('stated'); await expect(page.locator('.swarm-facts')).toContainText('fixed');
  await expect(page.locator('.swarm-panel')).toContainText('Build and test the contracts');
  await expect(page.locator('.swarm-panel')).toContainText('Describe who sets the address.');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  expect(inputs[0]).toEqual({ action: 'launch.open', input: body(draft) });
  await page.reload(); await expect(page.locator('.swarm-blockers')).toContainText(blockers[0]);
  await page.goto('#launch'); await expect(page.locator('.launch-check')).toContainText('Resolve the swarm’s blockers');
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
  await page.goto('#builder'); await page.locator('#p-text').fill('No outside service; observe swaps only.');
  await expect(page.locator('#check-note')).toContainText('Your request changed');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  blockers = []; await check.click(); await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
});

test('free check exposes pending, failure and retry without accepting stale or malformed replies', async ({ page }) => {
  await setup(page, { draft: validDraft() }); let release: (() => void) | undefined;
  await page.route(`${relay}/check`, async r => { await new Promise<void>(resolve => { release = resolve; }); await r.fulfill({ status: 503, json: { error: 'Try later' } }); });
  await page.goto('#builder'); await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Checking with the swarm…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await expect.poll(() => !!release).toBe(true); release!();
  await expect(page.getByRole('alert')).toContainText('503'); await expect(page.locator('.swarm-panel')).toHaveCount(0);
  await page.route(`${relay}/check`, r => r.fulfill({ json: { facts: [], plan: [] } }));
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('incomplete');
  await page.route(`${relay}/check`, r => r.fulfill({ json: checked }));
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click(); await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
});

test('own code resolves through /import before composing, checking or reviewing payment; a changed source relocks the flow', async ({ page }) => {
  const draft = validDraft(); draft.settings.repo = 'https://github.com/the-hook-store/hooks-store-spec'; draft.settings.commit = '76254535510fb51581489aed5ffbc5aecb16d7da';
  await setup(page, { draft }); const calls: any[] = []; let okay = false;
  const source = { repoUrl: draft.settings.repo + '.git', baseCommit: draft.settings.commit };
  await page.route(`${relay}/import`, r => { calls.push(r.request().postDataJSON()); return r.fulfill({ json: okay ? { ok: true, source } : { ok: false, problems: [{ detail: 'foundry.toml is missing' }] } }); });
  await page.route(`${relay}/check`, r => { calls.push(r.request().postDataJSON()); return r.fulfill({ json: checked }); });
  await page.goto('#builder'); await expect(page.locator('#composed')).toContainText('Resolve your repository');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.getByRole('button', { name: 'Resolve repository', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('foundry.toml');
  okay = true; await page.getByRole('button', { name: 'Resolve repository', exact: true }).click();
  await expect(page.locator('#composed')).toContainText(`source at ${source.repoUrl} commit ${source.baseCommit}`);
  expect(calls[0]).toEqual({ url: draft.settings.repo, ref: draft.settings.commit, kind: 'contracts' });
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  expect(calls.at(-1).input.repoUrl).toBe(source.repoUrl); expect(calls.at(-1).input.baseCommit).toBe(source.baseCommit);
  await page.getByRole('button', { name: 'Continue to launch' }).click();
  await page.getByText('Exact request the swarm receives', { exact: true }).click();
  await expect(page.getByTestId('launch-json')).toContainText(`"repoUrl":"${source.repoUrl}"`);
  await page.getByRole('link', { name: 'Edit in Builder' }).click(); await page.locator('#s-commit').fill('317dd1aeee7369413497aee884ae875b3512dae8');
  await expect(page.locator('#composed')).toContainText('Resolve your repository'); await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
});

test('relay timeline discovers the current job through matching intake and renders build, audit and deployment progress', async ({ page }) => {
  await page.clock.install(); await setup(page, { result: {} });
  // No Completed result is needed to discover the pending job.
  const intake: any[] = [], jobs: any[] = []; let auditing = false, deploying = false;
  const jobId = 'ba9d232e-9213-459b-963d-811773f73376';
  await page.route(`${relay}/intake/**`, r => { intake.push(r.request().url()); return r.fulfill({ json: { entries: [{ requestId, action: 'launch.open', admission: { result: { jobId } } }] } }); });
  await page.route(`${relay}/jobs/${jobId}`, r => { jobs.push(r.request().url()); return r.fulfill({ json: { id: jobId, nodes: [{ key: 'build_contract_project', state: auditing ? 'accepted' : 'working' }, { key: 'audit_math', role: 'review', state: deploying ? 'accepted' : auditing ? 'working' : 'waiting' }], launch: { status: deploying ? 'deploying' : 'pending' } } }); });
  await page.goto(route); await expect(page.locator('.timeline li').nth(1)).toContainText('In progress');
  expect(intake[0]).toContain('/intake/1/'); expect(jobs.length).toBeGreaterThanOrEqual(1); expect([...new Set(jobs)]).toEqual([`${relay}/jobs/${jobId}`]); // Timeline, notice and launch-record enrichment share the same discovered job.
  auditing = true; await page.clock.fastForward(20001); await expect(page.locator('.timeline li').nth(2)).toContainText('In progress');
  await expect(page.locator('.timeline li').nth(1)).toHaveClass('confirmed');
  deploying = true; await page.clock.fastForward(20001); await expect(page.locator('.timeline li').nth(3)).toContainText('Deployment: deploying');
  await expect(page.locator('.timeline li').nth(4)).not.toHaveClass('confirmed');
});

test('pond ticker names only store-matched API launches, casts only a newly live launch, and updates while reduced motion stays still', async ({ page }) => {
  await page.clock.install(); await page.emulateMedia({ reducedMotion: 'reduce' }); await setup(page);
  let live = false;
  await page.route(`${relay}/launches?limit=100`, r => r.fulfill({ json: { launches: [
    { id: jsonResult.launch.id, chainId: 1, status: live ? 'live' : 'deploying', updatedAt: new Date().toISOString(), artifacts: [{ role: 'token', name: 'API PondGuard' }, { role: 'hook', name: 'Guard', address: hook }] },
    { id: 'unrelated-id', chainId: 1, status: 'live', updatedAt: new Date().toISOString(), artifacts: [{ role: 'hook', name: 'Outside store', address: owner }] },
  ] } }));
  await page.goto('#store'); await expect(page.locator('.grid .card')).toHaveCount(1);
  await expect(page.locator('.ticker')).not.toContainText('Outside store');
  const before = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  live = true; await page.clock.fastForward(20001);
  await expect(page.locator('.ticker')).toContainText('API PondGuard was launched on Ethereum');
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(before);
  await page.clock.fastForward(20001); await expect(page.locator('.ticker')).toContainText('API PondGuard');
});

test('rendered job 5 evidence: Store and checked Builder first screens at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, { draft: validDraft() });
  await page.route(`${relay}/check`, r => r.fulfill({ json: checked }));
  fs.mkdirSync('../tests/results/job5', { recursive: true });
  await page.goto('#store'); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: '../tests/results/job5/store-390.png' });
  await page.goto('#builder'); await page.screenshot({ path: '../tests/results/job5/builder-390.png' });
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What the swarm understood' })).toBeVisible();
  await page.locator('.swarm-panel').scrollIntoViewIfNeeded(); await page.screenshot({ path: '../tests/results/job5/checked-builder-390.png' });
});

for (const width of [320, 390, 1440]) test(`configured relay panels, long names and errors wrap at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, { draft: validDraft() });
  await page.route(`${relay}/check`, r => r.fulfill({ json: { ...checked, blockers: ['Supply a public protocol deployment address before launching this hook.'], suggestions: ['The owner can configure the deployment after launch if the request describes that setting.'] } }));
  await page.route(`${relay}/launches?limit=100`, r => r.fulfill({ json: { launches: [{ id: jsonResult.launch.id, chainId: 1, status: 'live', updatedAt: new Date().toISOString(), artifacts: [{ role: 'token', name: 'A very long actual launch name from IMD' }, { role: 'hook', name: 'Guard', address: hook }] }] } }));
  await page.goto('#store'); await expect(page.locator('.ticker')).toContainText('A very long actual launch name from IMD');
  await fits(page, width);
  expect(await page.locator('.ticker [role=status]').evaluate(e => e.scrollHeight <= e.clientHeight + 1 && e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await page.goto('#builder'); await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-blockers')).toContainText('Supply a public protocol'); await fits(page, width);
  await page.goto('#launch'); await expect(page.locator('.swarm-panel')).toContainText('Supply a public protocol'); await fits(page, width);
  await page.goto(route); await expect(page.getByRole('button', { name: 'Retry stage details' })).toBeVisible(); await fits(page, width);
});
