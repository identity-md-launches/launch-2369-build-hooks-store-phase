import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { encodeAbiParameters, encodeEventTopics, erc20Abi, getAddress, keccak256, parseAbiParameters, stringToHex, toFunctionSelector, toHex } from 'viem';
import site from '../../public/site-config.json' with { type: 'json' };
import checked from '../../evidence/check-A-default-blocks.response.json' with { type: 'json' };
import recorded from '../../tests/fixtures/chain/1-intake.json' with { type: 'json' };
import { newDraft, type Draft } from '../../src/lib/compose';
import { launchBody } from '../src/chain/launch';
import { cacheKey, COMPLETE_TOPIC, REQUEST_TOPIC } from '../src/chain/store';
import { head, hook, injectedOwner, interceptChains, jsonResult, owner, requestId, route, storeLogs } from './chain-fixture';

const relay = 'https://hooks-store-relay.hooks-store.workers.dev';
const output = '../tests/results/job6';
const validDraft = (): Draft => {
  const d = newDraft(); d.mode = 'prompt'; d.prompt = 'Observe swaps without fees or owner powers.';
  d.settings = { ...d.settings, chain: 1, pool: 50, rem: owner, owner }; return d;
};
async function setup(page: Page, draft = validDraft()) {
  await interceptChains(page);
  await page.route('**/site-config.json', r => r.fulfill({ json: { ...site, chains: site.chains.map(c => ({ ...c, intakeFromBlock: head - 20 })) } }));
  await page.addInitScript(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), draft);
  await page.route(`${relay}/**`, r => r.fulfill({ json: r.request().url().includes('/launches?') ? { launches: [] } : { entries: [] } }));
  await page.route(`${relay}/check`, r => r.fulfill({ json: checked }));
}
async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.locator('button, input, select, textarea').evaluateAll(els => els.filter(el => {
    const r = el.getBoundingClientRect(); return r.width && r.height && !el.closest('#shelf') && (r.left < -1 || r.right > innerWidth + 1);
  }).map(el => el.outerHTML.slice(0, 120)))).toEqual([]);
}

for (const width of [320, 390, 1440]) for (const [name, hash, heading] of [
  ['store', '#store', 'Stack blocks.'], ['catalog', '#catalog', 'Catalog'], ['builder', '#builder', 'Builder'],
  ['launch', '#launch', 'Review your launch'], ['hook', route, 'PondGuard'], ['mine', `#mine?address=${owner}`, 'My hooks'], ['learn', '#learn', 'Learn'],
]) test(`go-live ${name} at ${width}px: route, primary interaction, export resources and reflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [], failed: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) failed.push(r.url()); });
  await setup(page); await page.goto(hash);
  if (name === 'catalog') await expect(page.locator('#catalog')).toBeInViewport();
  else await expect(page.getByRole('heading', { name: heading, exact: name !== 'store' })).toBeVisible();
  await expect(page.locator('.progress-banner')).toHaveCount(0);
  await fits(page, width); await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(output, { recursive: true });
  await page.screenshot({ path: `${output}/${name}-${width}.jpg`, type: 'jpeg', quality: name === 'store' && width === 390 ? 65 : 45 });
  if (name === 'store') {
    await expect(page.getByRole('button', { name: 'Describe it', exact: true })).toBeInViewport();
    await page.getByLabel('Describe your hook', { exact: true }).fill('A cooldown between swaps');
    await page.getByRole('button', { name: 'Describe it', exact: true }).click();
    await expect(page.locator('#p-text')).toHaveValue('A cooldown between swaps');
  } else if (name === 'catalog') {
    await page.getByRole('searchbox').fill('no such hook'); await expect(page.getByText(/No hooks match/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear search and filters' }).click(); await expect(page.locator('.grid .card')).toHaveCount(1);
  } else if (name === 'builder') {
    await expect(page.locator('#composed')).toContainText('paired with IMD.');
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
    await expect(page.locator('#composed')).not.toContainText('Fees are always taken from');
    await page.locator('#s-pair').selectOption('eth'); await expect(page.locator('#composed')).toContainText('paired with ETH.');
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
    await expect(page.locator('#composed')).not.toContainText('Fees are always taken from');
    await page.getByRole('button', { name: 'Continue to launch' }).click(); await expect(page).toHaveURL(/#launch$/);
  } else if (name === 'launch') {
    await expect(page.locator('.launch-check')).toContainText('A refused request still spends the fee.');
    await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
    await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
    await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } else if (name === 'hook') {
    await expect(page.locator('.timeline li')).toHaveCount(5); await expect(page.locator('[data-function="pause"] button')).toBeDisabled();
  } else if (name === 'mine') {
    await expect(page.getByRole('link', { name: 'Manage', exact: true })).toHaveAttribute('href', `${route}?manage=1`);
  } else {
    await page.getByText(/^Which chains\?$/i).click(); await expect(page.locator('details[open]')).toHaveCount(2);
  }
  await fits(page, width); expect(errors).toEqual([]); expect(failed).toEqual([]);
});

test('non-JSON relay failure locks continuation and direct Launch until a successful retry', async ({ page }) => {
  await setup(page);
  await page.route(`${relay}/check`, r => r.fulfill({ status: 503, contentType: 'text/html', body: '<html>Cloudflare error</html>' }));
  await page.goto('#builder'); await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('IMD could not finish this request (503). Try again.');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.goto('#launch'); await expect(page.locator('.launch-check')).toContainText('Retry the free check before continuing.');
  await expect(page.getByRole('button', { name: /Approve/ }).last()).toBeDisabled();
  await page.reload(); await expect(page.locator('.launch-check')).toContainText('Retry the free check before continuing.');
  await page.route(`${relay}/check`, r => r.fulfill({ json: checked }));
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
  await page.getByRole('link', { name: 'Edit in Builder' }).click();
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
  await page.locator('#p-text').fill('Observe liquidity additions without fees.');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.getByRole('link', { name: 'Builder', exact: true }).click();
  await page.goto('#launch'); await expect(page.locator('.launch-check')).toContainText('Your request changed');
  await expect(page.getByRole('button', { name: /Approve/ }).last()).toBeDisabled();
});

test('a pinned own-code import survives Builder to Launch with genuinely full native session storage', async ({ page }) => {
  const d = validDraft(); d.settings.repo = 'https://github.com/identity-md-launches/launch-2335-launch-daemon-daemon-ethereum';
  d.settings.commit = '317dd1aeee7369413497aee884ae875b3512dae8';
  const source = { repoUrl: `${d.settings.repo}.git`, baseCommit: d.settings.commit }; let imports = 0;
  await setup(page, d);
  await page.addInitScript(() => {
    let size = 1024 * 1024, index = 0;
    while (size >= 1) {
      try { sessionStorage.setItem(`quota:${index++}`, 'x'.repeat(size)); }
      catch { size = Math.floor(size / 2); }
    }
  });
  await page.route(`${relay}/import`, r => { imports++; return r.fulfill({ json: { ok: true, source } }); });
  await page.goto('#builder');
  expect(await page.evaluate(() => { try { sessionStorage.setItem('probe', 'x'.repeat(1024)); return false; } catch { return true; } })).toBe(true);
  await page.getByRole('button', { name: 'Resolve repository', exact: true }).click();
  await expect(page.locator('#composed')).toContainText(`source at ${source.repoUrl} commit ${source.baseCommit}`);
  await page.getByRole('button', { name: 'Continue to launch' }).click();
  await page.getByText('Exact request the swarm receives', { exact: true }).click();
  await expect(page.getByTestId('launch-json')).toContainText(`"baseCommit":"${source.baseCommit}"`);
  await expect(page.getByTestId('launch-json')).toContainText(`"repoUrl":"${source.repoUrl}"`); expect(imports).toBe(1);
  await page.getByRole('link', { name: 'Edit in Builder' }).click();
  await page.locator('#s-commit').fill('76254535510fb51581489aed5ffbc5aecb16d7da');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
});

test('the ticker ages identical relay timestamps at least once a minute without moving a reduced-motion pond', async ({ page }) => {
  const at = '2026-10-21T20:00:00Z'; await page.clock.install({ time: new Date(at) });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await setup(page);
  await page.route(`${relay}/launches?limit=100`, r => r.fulfill({ json: { launches: [{ id: jsonResult.launch.id, chainId: 1, status: 'live', updatedAt: at, artifacts: [{ role: 'hook', name: 'PondGuard', address: hook }] }] } }));
  await page.goto('#store'); await expect(page.locator('.ticker')).toContainText('PondGuard was launched on Ethereum · just now');
  const before = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.clock.fastForward(60001); await expect(page.locator('.ticker')).toContainText('1 min ago');
  await page.clock.fastForward(60001); await expect(page.locator('.ticker')).toContainText('2 min ago');
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(before);
});

for (const event of ['request', 'completion']) test(`a reorg removes the ${event} from catalog state and storage after refresh and reload`, async ({ page }) => {
  await page.clock.install(); await setup(page); const logs = storeLogs(); let reorged = false;
  await page.route('https://rpc.mevblocker.io', async r => {
    const req = r.request().postDataJSON();
    if (req.method !== 'eth_getLogs') return r.fallback();
    const q = req.params[0];
    const candidates = q.topics[0] === REQUEST_TOPIC ? reorged && event === 'request' ? [] : [logs.requested]
      : q.topics[0] === COMPLETE_TOPIC ? reorged ? [] : [logs.completed] : [];
    await r.fulfill({ json: { jsonrpc: '2.0', id: req.id, result: candidates.filter(l => BigInt(l.blockNumber) >= BigInt(q.fromBlock) && BigInt(l.blockNumber) <= BigInt(q.toBlock)) } });
  });
  await page.goto('#catalog'); await expect(page.locator('.card [class*="status-"]')).toContainText('Live');
  await page.evaluate(({ id, payer }) => localStorage.setItem('hooks-store:pending', JSON.stringify([{ requestId: id, chainId: 1, payer }])), { id: requestId, payer: owner });
  reorged = true; await page.clock.fastForward(20001);
  if (event === 'request') {
    await expect(page.locator('.grid .card')).toHaveCount(0);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records, cacheKey(1))).toEqual({});
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hooks-store:pending')!))).toEqual([]);
  } else {
    await expect(page.locator('.card [class*="status-"]')).toContainText('Requested');
    const saved = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).records[id], { key: cacheKey(1), id: requestId });
    expect(saved.completed).toBeUndefined(); expect(saved.result).toBeUndefined();
  }
  await page.reload();
  if (event === 'request') await expect(page.locator('.grid .card')).toHaveCount(0);
  else await expect(page.locator('.card [class*="status-"]')).toContainText('Requested');
});

// Local wallet/RPC doubles exercise receipt and nonce-replacement recovery. They never send a real transaction.
async function approvalFixture(page: Page, mode: 'cancelled' | 'replaced' | 'repriced' | 'reverted' | 'unknown' | 'missing', restored = false) {
  await setup(page);
  const hashes = [...new Set(recorded.logs.map(l => l.transactionHash))];
  const [original, replacement, retried] = hashes, blockHash = recorded.logs[0].blockHash;
  const price = 500000000000000000n, imd = site.chains.find(c => c.id === 1)!.imdAddress;
  const approveData = toFunctionSelector('approve(address,uint256)') + encodeAbiParameters(parseAbiParameters('address,uint256'), [site.intake.address as `0x${string}`, price]).slice(2);
  const transaction = (hash: string, cancel = false) => ({ hash, from: owner, to: cancel ? owner : imd, input: cancel ? '0x' : approveData, value: hash === replacement && mode === 'replaced' ? '0x1' : '0x0', nonce: '0x2', gas: '0x20000', gasPrice: '0x1', blockNumber: null, blockHash: null, transactionIndex: null, type: '0x0', v: '0x1b', r: '0x1', s: '0x1' });
  const approval = { address: imd, topics: encodeEventTopics({ abi: erc20Abi, eventName: 'Approval', args: { owner: owner as `0x${string}`, spender: site.intake.address as `0x${string}` } }), data: encodeAbiParameters(parseAbiParameters('uint256'), [price]), blockHash, blockNumber: toHex(head), transactionHash: retried, transactionIndex: '0x0', logIndex: '0x0', removed: false };
  const receipt = (hash: string, status = '0x1', logs: unknown[] = []) => ({ transactionHash: hash, blockHash, blockNumber: toHex(head), transactionIndex: '0x0', from: owner, to: imd, status, logs, gasUsed: '0x10000', cumulativeGasUsed: '0x10000', effectiveGasPrice: '0x1', type: '0x0', contractAddress: null, logsBloom: '0x' + '00'.repeat(256) });
  let sends = 0;
  if (restored) {
    const bytes = launchBody(validDraft(), site, getAddress(owner)).bytes;
    const key = `hooks-store:launch-tx:${keccak256(stringToHex(`${getAddress(owner)}:1:${bytes}`))}`;
    await page.addInitScript(({ key, hash, price }) => localStorage.setItem(key, JSON.stringify({ approval: { hash, price, phase: 'pending' } })), { key, hash: original, price: price.toString() });
  }
  const answer = async (r: any) => {
    const req = r.request().postDataJSON(); let result: unknown = '0x';
    if (req.method === 'eth_sendTransaction') { sends++; result = sends > 1 ? retried : original; }
    else if (req.method === 'eth_chainId') result = '0x1';
    else if (req.method === 'eth_blockNumber') result = toHex(head);
    else if (req.method === 'eth_getLogs') result = [];
    else if (req.method === 'eth_getTransactionByHash') result = transaction(original);
    else if (req.method === 'eth_getTransactionReceipt') {
      const hash = req.params[0];
      result = hash === retried ? receipt(hash, '0x1', [approval]) : hash === replacement ? receipt(hash, '0x1', mode === 'repriced' ? [approval] : [])
        : mode === 'reverted' ? receipt(hash, '0x0') : mode === 'missing' ? receipt(hash) : null;
    } else if (req.method === 'eth_getBlockByNumber') result = { number: toHex(head), hash: blockHash, timestamp: '0x6a500000', transactions: req.params[1] ? [transaction(replacement, mode === 'cancelled')] : [] };
    else if (req.method === 'eth_call') {
      const selector = req.params[0].data.slice(0, 10);
      result = selector === toFunctionSelector('approve(address,uint256)') ? encodeAbiParameters(parseAbiParameters('bool'), [true]) : encodeAbiParameters(parseAbiParameters('uint256'), [selector === toFunctionSelector('balanceOf(address)') ? 10n ** 19n : price]);
    } else if (req.method === 'eth_estimateGas') result = '0x20000';
    else if (req.method === 'eth_gasPrice') result = '0x1';
    await r.fulfill({ json: { jsonrpc: '2.0', id: req.id, result } });
  };
  await page.route('https://rpc.mevblocker.io', answer);
  await page.route('https://wallet.hooks.test', answer);
  await injectedOwner(page, owner, 'https://wallet.hooks.test');
  await page.goto('#launch'); await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await expect(page.locator('#connect')).toHaveClass(/address/);
  return { sends: () => sends, original, replacement };
}
for (const mode of ['cancelled', 'replaced', 'reverted'] as const) test(`a ${mode} approval exits pending and a fresh approval retry succeeds`, async ({ page }) => {
  const fixture = await approvalFixture(page, mode);
  await page.getByRole('button', { name: 'Approve 0.5 IMD', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: mode === 'reverted' ? /reverted/ : /cancelled or replaced/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve 0.5 IMD', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Pay from')).toBeEnabled(); await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
  const saved = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hooks-store:launch-tx:')).map(k => JSON.parse(localStorage.getItem(k)!).approval));
  expect(saved.at(-1).phase).toBe('failed');
  await page.getByRole('button', { name: 'Approve 0.5 IMD', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Approved', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeEnabled(); expect(fixture.sends()).toBe(2);
});
test('a repriced approval verifies the replacement receipt and unlocks Launch without a second approval', async ({ page }) => {
  const fixture = await approvalFixture(page, 'repriced');
  await page.getByRole('button', { name: 'Approve 0.5 IMD', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Approved', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeEnabled(); expect(fixture.sends()).toBe(1);
});
for (const mode of ['missing', 'reverted', 'unknown'] as const) test(`saved approval recovery handles a ${mode} receipt without trapping a confirmed failure`, async ({ page }) => {
  const fixture = await approvalFixture(page, mode, true);
  await page.getByRole('button', { name: 'Check confirmation', exact: true }).click();
  if (mode === 'unknown') {
    await expect(page.getByRole('button', { name: 'Approving…', exact: true })).toBeDisabled(); await expect(page.getByLabel('Pay from')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Check confirmation', exact: true })).toBeEnabled();
  } else {
    await expect(page.getByRole('button', { name: 'Approve 0.5 IMD', exact: true })).toBeEnabled(); await expect(page.getByLabel('Pay from')).toBeEnabled();
  }
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled(); expect(fixture.sends()).toBe(0);
});
