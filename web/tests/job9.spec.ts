import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { encodeAbiParameters, parseAbiParameters, stringToHex, toHex, getAddress, zeroAddress } from 'viem';
import site from '../../public/site-config.json' with { type: 'json' };
import { newDraft, addBlock, body, type Draft } from '../../src/lib/compose';
import { PROVEN_LAUNCHES_URL, LAUNCH_WAIT, provenLine, type ProvenLaunch } from '../../src/lib/proven';
import { emptyIntake, injectedOwner, storeLogs, head, requestId, owner, hook } from './chain-fixture';
import { REQUEST_TOPIC } from '../src/chain/store';

const out = '../tests/results/job9';
const proven: ProvenLaunch = { launchId: '9f778988-4553-4ff6-99fb-706824bb9e31', launchNumber: 2424, chainId: 4663, type: 'B', blocks: ['swap-fee', 'anti-sniper', 'jar', 'pause'], repoUrl: 'https://github.com/identity-md-launches/launch-2424-deploy-one-contract-pondsideguard', commit: '5a9f6a36d659084e084a8abc08a55213c9516f07', name: 'PondsideGuard', verifiedAt: '2026-10-22' };
function draft(): Draft {
  let d = { ...newDraft(), type: 'B' as const, mode: 'blocks' as const, seeded: true };
  d.settings = { ...d.settings, chain: 4663, hname: 'PondHook', owner };
  for (const id of proven.blocks) d = addBlock(d, id) as typeof d;
  return d;
}
async function setup(page: Page, d: Draft, mode: 'success' | 'failed-import' | 'no-relay' | 'index-failed' | 'wrong-pin' = 'success') {
  await emptyIntake(page); await injectedOwner(page, getAddress(owner));
  await page.route('**/site-config.json', r => r.fulfill({ json: { ...site, relayUrl: mode === 'no-relay' ? null : site.relayUrl } }));
  await page.route('https://api.imd.fun/swarm', r => r.fulfill({ status: 503 }));
  await page.route('https://raw.githubusercontent.com/**', r => r.abort());
  let indexReads = 0;
  await page.route(PROVEN_LAUNCHES_URL, r => { indexReads++; return mode === 'index-failed' ? r.abort() : r.fulfill({ json: { version: 1, launches: [proven] } }); });
  const imports: any[] = [], checked: any[] = [];
  await page.route(`${site.relayUrl}/**`, r => r.fulfill({ json: { entries: [] } }));
  await page.route(`${site.relayUrl}/import`, r => {
    imports.push(r.request().postDataJSON());
    return mode === 'failed-import' ? r.fulfill({ status: 502, body: '<html>proxy</html>' }) : r.fulfill({ json: { ok: true, source: { repoUrl: imports.at(-1).url, baseCommit: mode === 'wrong-pin' ? 'main' : imports.at(-1).ref } } });
  });
  await page.route(`${site.relayUrl}/check`, r => { checked.push(r.request().postDataJSON()); return r.fulfill({ json: { facts: [], plan: [], blockers: [], suggestions: [] } }); });
  await page.addInitScript(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), d);
  await page.goto('#builder');
  await page.locator('#connect').click(); await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  return { imports, checked, indexReads: () => indexReads };
}
async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.locator('button, input, select, textarea').evaluateAll(nodes => nodes.filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).map(n => n.outerHTML.slice(0, 120)))).toEqual([]);
}
for (const width of [320, 390, 1440]) {
  test(`job9 automatic proven summary and exact request at ${width}`, async ({ page }) => {
    fs.mkdirSync(out, { recursive: true }); await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [], failures: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) failures.push(r.url()); });
    const d = draft(); d.prompt = 'Observe swaps.'; d.blocks.find(b => b.id === 'swap-fee')!.p.rate = 0.5;
    const calls = await setup(page, d);
    await expect(page.locator('.preview .proven-line')).toHaveText(provenLine(proven));
    await expect(page.locator('.preview')).toContainText(LAUNCH_WAIT);
    await expect(page.locator('#composed')).toContainText(`Start from the audited source at ${proven.repoUrl} commit ${proven.commit}`);
    await expect(page.locator('.safety-notice')).toHaveCount(0);
    expect(calls.imports).toEqual([{ url: proven.repoUrl, ref: proven.commit, kind: 'contracts' }]); expect(calls.indexReads()).toBe(1);
    await page.locator('.proven-line').scrollIntoViewIfNeeded(); await fits(page, width);
    await page.screenshot({ path: `${out}/summary-proven-${width}.jpg`, type: 'jpeg', quality: 72 });
    await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
    await expect(page.locator('.swarm-panel')).toContainText('No blockers reported'); expect(calls.checked[0].input.repoUrl).toBe(proven.repoUrl); expect(calls.checked[0].input.baseCommit).toBe(proven.commit);
    await page.getByRole('button', { name: 'Continue to launch', exact: true }).click();
    await expect(page.locator('.launch-review .proven-line')).toHaveText(provenLine(proven)); await expect(page.locator('.launch-review')).toContainText(LAUNCH_WAIT);
    const launchInput = JSON.parse(await page.getByTestId('launch-json').textContent() ?? '{}');
    await expect(page.getByRole('row').filter({ hasText: 'Description length' })).toContainText(`${launchInput.objective.length} / 7,500 characters`);
    // Connecting a checksummed account is the real regression trigger; the body stays lowercase.
    const exact = page.getByTestId('launch-json'); await expect(exact).toContainText('"owner":"' + owner + '"');
    await expect(page.locator('.safety-notice')).toHaveCount(0); await fits(page, width);
    expect(errors).toEqual([]); expect(failures).toEqual([]);
  });
  for (const mode of ['failed-import', 'no-relay', 'index-failed', 'wrong-pin'] as const) test(`job9 silent ${mode} fallback at ${width}`, async ({ page }) => {
    fs.mkdirSync(out, { recursive: true }); await page.setViewportSize({ width, height: 844 });
    const calls = await setup(page, draft(), mode);
    await expect(page.getByRole('button', { name: 'Continue to launch', exact: true })).toBeEnabled();
    await expect(page.locator('.proven-line')).toHaveCount(0); await expect(page.locator('#composed')).not.toContainText('Start from the audited source');
    await expect(page.locator('.preview')).toContainText(LAUNCH_WAIT); await expect(page.locator('[role="alert"]')).toHaveCount(0);
    expect(calls.imports.length).toBe(['failed-import', 'wrong-pin'].includes(mode) ? 1 : 0);
    await page.locator('.preview h2').scrollIntoViewIfNeeded(); await fits(page, width);
    if (mode === 'failed-import') await page.screenshot({ path: `${out}/summary-fallback-${width}.jpg`, type: 'jpeg', quality: 72 });
    await page.getByRole('button', { name: 'Continue to launch', exact: true }).click();
    const exact = JSON.parse(await page.getByTestId('launch-json').textContent() ?? '{}');
    expect(exact.repoUrl).toBeUndefined(); expect(exact.baseCommit).toBeUndefined(); expect(exact.objective).toContain('Composed with The Hooks Store');
    await expect(page.locator('.launch-review')).toContainText(LAUNCH_WAIT); await fits(page, width);
  });
  test(`job9 contracts-only live, deployer reading, Copy link and one notification at ${width}`, async ({ page, context }) => {
    fs.mkdirSync(out, { recursive: true }); await page.setViewportSize({ width, height: 844 }); await page.clock.install();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setup(page, draft());
    const logs = storeLogs();
    const requested = { ...logs.requested, data: encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'), [stringToHex(JSON.stringify(body({ ...draft(), proven }, owner))), owner, '0x00000000', site.chains[0].imdAddress as `0x${string}`, 500000000000000000n]) };
    let live = false, returnedHook: string = zeroAddress;
    const record = () => ({ id: proven.launchId, chainId: 4663, status: live ? 'live' : 'deploying', launchNumber: 2424, artifacts: [{ role: 'other', address: owner }], attestation: { contracts: [{ name: 'PondsideGuard' }, { name: 'PondsideGuardDeployer' }], manifest: { contracts: [{ contract: 'PondsideGuardDeployer' }] } } });
    await page.route('https://ipfs.imd.fun/**', r => r.fulfill({ json: { complete: true, jobId: 'a21b246a-6a18-4fb7-92e3-c7f81e8dadac', launch: { id: proven.launchId, chainId: 4663 } } }));
    await page.route(`${site.relayUrl}/launches/${proven.launchId}`, r => r.fulfill({ json: record() }));
    await page.route(`${site.relayUrl}/jobs/**`, r => r.fulfill({ json: { id: 'a21b246a-6a18-4fb7-92e3-c7f81e8dadac', state: 'completed', nodes: [], launch: record() } }));
    const rpc = async (r: any) => {
      const payload = r.request().postDataJSON(); const chain = r.request().url().includes('robinhood') ? 4663 : 1;
      const answer = (req: any) => {
        let result: unknown;
        if (req.method === 'eth_chainId') result = toHex(chain);
        else if (req.method === 'eth_blockNumber') result = toHex(head);
        else if (req.method === 'eth_getBlockByNumber') result = { number: req.params[0], hash: requested.blockHash, timestamp: '0x6a500000', transactions: [] };
        else if (req.method === 'eth_getLogs') { const q = req.params[0]; result = chain === 1 ? (q.topics[0] === REQUEST_TOPIC ? [requested] : [logs.completed]).filter(l => BigInt(l.blockNumber) >= BigInt(q.fromBlock) && BigInt(l.blockNumber) <= BigInt(q.toBlock)) : []; }
        else if (req.method === 'eth_call' && chain === 4663) result = encodeAbiParameters(parseAbiParameters('address'), [returnedHook as `0x${string}`]);
        else if (req.method === 'eth_getCode') result = '0x';
        else return { jsonrpc: '2.0', id: req.id, error: { code: 3, message: 'Fixture read unavailable' } };
        return { jsonrpc: '2.0', id: req.id, result };
      };
      await r.fulfill({ json: Array.isArray(payload) ? payload.map(answer) : answer(payload) });
    };
    await page.route('https://rpc.mevblocker.io', rpc); await page.route('https://rpc.mainnet.chain.robinhood.com', rpc);
    await page.route('**/site-config.json', r => r.fulfill({ json: { ...site, chains: site.chains.map(c => ({ ...c, intakeFromBlock: head - 20 })) } }));
    await page.addInitScript(() => {
      const state = { asked: 0, delivered: [] as string[], permission: 'default' };
      (window as any).notificationTest = state;
      (window as any).Notification = class {
        static get permission() { return state.permission; }
        static async requestPermission() { state.asked++; state.permission = 'granted'; return 'granted'; }
        constructor(title: string) { state.delivered.push(title); } close() {}
      };
    });
    await page.reload(); await page.goto(`#hook/1/${requestId}`);
    await expect(page.locator('.hook-page .proven-line')).toHaveText(provenLine(proven));
    await expect(page.locator('.addresses')).toContainText('Deployer'); await expect(page.locator('.addresses')).toContainText('hook not deployed yet');
    await expect(page.locator('.timeline li').last()).not.toHaveClass(/confirmed/);
    await page.getByRole('button', { name: 'Copy link', exact: true }).click(); await expect(page.locator('.hook-link')).toContainText('Link copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`#hook/1/${requestId}`);
    await page.getByRole('button', { name: 'Enable notification', exact: true }).click();
    expect(await page.evaluate(() => (window as any).notificationTest.asked)).toBe(1);
    live = true; await page.clock.fastForward(21000);
    await expect(page.locator('.timeline li').last()).toHaveClass(/confirmed/); await expect(page.locator('.detail-pills')).toContainText('Live');
    await expect(page.locator('.addresses')).toContainText('hook not deployed yet');
    await expect.poll(() => page.evaluate(() => (window as any).notificationTest.delivered)).toEqual(['PondHook is live']);
    await page.locator('.addresses').scrollIntoViewIfNeeded(); await fits(page, width);
    await page.screenshot({ path: `${out}/hook-live-zero-${width}.jpg`, type: 'jpeg', quality: 72 });
    returnedHook = hook; await page.clock.fastForward(21000);
    await expect(page.locator('.addresses')).toContainText(getAddress(hook)); await expect(page.locator('.addresses')).toContainText(getAddress(owner)); await expect(page.locator('.addresses')).not.toContainText('hook not deployed yet');
    await page.getByRole('link', { name: 'Learn', exact: true }).click(); await page.goto(`#hook/1/${requestId}`);
    await expect(page.getByRole('button', { name: 'Enable notification', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).notificationTest.delivered.length)).toBe(1);
  });
}

test('job9 changing chain or block set invalidates a match; Advanced own source overrides automatic reuse', async ({ page }) => {
  const calls = await setup(page, draft()); await expect(page.locator('.proven-line')).toHaveCount(1);
  await page.locator('#s-chain').selectOption('1'); await expect(page.locator('.proven-line')).toHaveCount(0); await expect(page.locator('#composed')).not.toContainText('Start from the audited source');
  await page.locator('#s-chain').selectOption('4663'); await expect(page.locator('.proven-line')).toHaveCount(1);
  await page.locator('.palette summary').filter({ hasText: /^Custom/ }).click();
  await page.getByRole('button', { name: 'Add Custom rule', exact: true }).click(); await page.locator('.blk[data-block="custom"] textarea').fill('Observe swaps.'); await expect(page.locator('.proven-line')).toHaveCount(1);
  await page.locator('.palette summary').filter({ hasText: /^Advanced/ }).click();
  await page.getByRole('button', { name: 'Add Price oracle', exact: true }).click(); await expect(page.locator('.proven-line')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Price oracle', exact: true }).click(); await expect(page.locator('.proven-line')).toHaveCount(1);
  await page.getByText('Advanced: start from my own code', { exact: true }).click();
  const repo = 'https://github.com/the-hook-store/hooks-store-spec'; await page.locator('#s-repo').fill(repo); await page.locator('#s-commit').fill(proven.commit);
  await expect(page.locator('.proven-line')).toHaveCount(0); await page.getByRole('button', { name: 'Resolve repository', exact: true }).click();
  await expect(page.locator('#composed')).toContainText(`Start from the creator’s own source at ${repo}`);
  expect(calls.imports.at(-1)).toEqual({ url: repo, ref: proven.commit, kind: 'contracts' });
});
