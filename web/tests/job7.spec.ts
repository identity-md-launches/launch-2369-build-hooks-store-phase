import { expectFinding, expectReflow } from './v2-assertions';
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { encodeAbiParameters, encodeEventTopics, erc20Abi, getAddress, keccak256, parseAbiParameters, stringToHex, toFunctionSelector, toHex } from 'viem';
import site from '../../public/site-config.json' with { type: 'json' };
import checked from '../../evidence/check-A-default-blocks.response.json' with { type: 'json' };
import recorded from '../../tests/fixtures/chain/1-intake.json' with { type: 'json' };
import { newDraft, addBlock, body, compose, fill, context, type BlockDef, type Draft } from '../../src/lib/compose';
import legacyCatalog from '../../src/blocks/legacy-catalog.json' with { type: 'json' };
import { parseObjective } from '../src/chain/decode';
import { launchBody } from '../src/chain/launch';
import { cacheKey, COMPLETE_TOPIC, REQUEST_TOPIC } from '../src/chain/store';
import { head, hook, injectedOwner, interceptChains, jsonResult, owner, requestId, route, storeLogs } from './chain-fixture';

const relay = 'https://hooks-store-relay.hooks-store.workers.dev';
const output = '../tests/results/job8/regression-job7';
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

test('mismatched currency names the sentence and blocks the free check and direct Launch until corrected', async ({ page }) => {
  const d = validDraft(); d.prompt = `Take 1% of the ETH side of every swap as a hook fee, settled in ETH, and send it to ${owner}.`;
  await setup(page, d); let calls = 0;
  await page.route(`${relay}/check`, r => { calls++; return r.fulfill({ json: checked }); });
  await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await expectFinding(page, 'fee side must be IMD');
  await expectFinding(page, d.prompt);
  await expect(page.getByRole('button', { name: 'Check with the swarm (free)', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.goto('#launch'); await expectFinding(page, 'Settle the fee in IMD');
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Edit in Builder' }).first().click(); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await page.locator('#p-text').fill(d.prompt.replaceAll('ETH', 'IMD'));
  await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-panel')).toContainText('No blockers reported'); expect(calls).toBe(1);
});

test('my wallet is resolved from the connected payer and treasury choices use the pinned address', async ({ page }) => {
  let d = validDraft(); d.mode = 'blocks'; d.prompt = ''; d = addBlock(d, 'swap-fee');
  await setup(page, d); await injectedOwner(page); await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await expectFinding(page, 'Connect the paying wallet');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.locator('#connect').click(); await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await expect(page.locator('#composed')).toContainText(`send it to ${owner.toLowerCase()}`);
  await expect(page.locator('#findings:not(.ok), .safety-notice')).toHaveCount(0);
  await page.locator('.rule[data-block="swap-fee"] select').last().selectOption("IMD's treasury");
  await expect(page.locator('#composed')).toContainText('send it to 0x3f252e859a277a86a3967c11d4e054b2f07a1f22');
  await expect(page.locator('#composed')).toContainText('settled in IMD');
  await expect(page.locator('#composed')).toContainText('do not convert the fee to ETH and do not use any other pool');
  await page.locator('#s-pair').selectOption('eth');
  await expect(page.locator('#composed')).toContainText('settled in ETH');
  await expect(page.locator('#composed')).not.toContainText('do not convert the fee to ETH');
});
test('an explicit recipient recovered from an older request stays visible and is not rerouted to my wallet', async ({ page }) => {
  const d = addBlock(validDraft(), 'swap-fee'), recipient = '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0';
  d.mode = 'blocks'; d.prompt = ''; d.blocks.at(-1)!.p.to = recipient;
  await setup(page, d); await page.setViewportSize({ width: 320, height: 844 }); await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await expect(page.locator('.rule[data-block="swap-fee"]')).toContainText(`Recipient from the previous request: ${recipient}`);
  await expect(page.locator('#composed')).toContainText(`send it to ${recipient}`);
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await expect(page.locator('.rule[data-block="swap-fee"] .field-error')).toContainText('choose one of the available options');
  await page.locator('.rule[data-block="swap-fee"]').getByLabel('Send to').selectOption("IMD's treasury");
  await expect(page.locator('#composed')).toContainText('send it to 0x3f252e859a277a86a3967c11d4e054b2f07a1f22');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled(); await fits(page, 320);
});

test('unavailable lending deployments and contradictory rules lock the composed request', async ({ page }) => {
  const d = validDraft(); d.mode = 'blocks'; d.type = 'B'; d.settings.hname = 'SafetyHook'; d.blocks.push({ id: 'yield', p: { proto: 'Aave' } });
  await setup(page, d); await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await expectFinding(page, 'Yield on idle liquidity: no verified deployment.');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  d.blocks = [{ id: 'token', p: { name: 'Pondside', symbol: 'POND' } }, { id: 'lp-fee', p: { lo: .3, hi: 1 } }, { id: 'pool-rules', p: { tier: '0.3' } }];
  await page.goto('#store'); await page.evaluate(d => localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)), d); await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await expectFinding(page, 'Dynamic LP fee cannot be combined with Pool rules');
  await expect(page.getByRole('button', { name: 'Check with the swarm (free)', exact: true })).toBeDisabled();
});

test('fixed fact conflict is visible and persists on Launch until an explicit request opt-out is checked', async ({ page }) => {
  const d = validDraft(); d.mode = 'blocks'; d.prompt = 'Observe swaps.'; d.blocks.push({ id: 'pause', p: {} });
  d.settings.owner = owner;
  await setup(page, d);
  const fact = { id: 'admin', label: 'No owner functions are permitted by default.', state: 'fixed' };
  await page.route(`${relay}/check`, r => r.fulfill({ json: { facts: [fact], plan: [], blockers: [], suggestions: [] } }));
  await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click(); await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-panel')).toContainText('Fixed facts conflict with your request. Launch is locked.');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.goto('#launch'); await expect(page.locator('.swarm-panel')).toContainText(fact.label);
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Edit in Builder' }).click(); await page.getByRole('button', { name: 'Open all', exact: true }).click();
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await page.locator('#p-text').fill('Observe swaps. Opt out of fixed fact admin. The owner may pause swaps.');
  await page.getByRole('button', { name: 'Stack blocks', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeDisabled();
  await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-panel')).not.toContainText('Fixed facts conflict');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
});

test('the IMD fee opt-out resolves the fixed ETH conversion default in the understood panel', async ({ page }) => {
  const d = addBlock(validDraft(), 'swap-fee'); d.mode = 'blocks'; d.blocks.at(-1)!.p.to = "IMD's treasury"; d.prompt = '';
  await setup(page, d);
  await page.route(`${relay}/check`, r => r.fulfill({ json: { facts: [{ id: 'hook_fee', label: 'The IMD-side fee is sold for ETH unless told otherwise.', state: 'fixed' }], plan: [], blockers: [], suggestions: [] } }));
  await page.goto('#builder'); await page.getByRole('button', { name: 'Open all', exact: true }).click(); await page.getByRole('button', { name: 'Check with the swarm (free)', exact: true }).click();
  await expect(page.locator('.swarm-panel')).toContainText('Your request explicitly opts out');
  await expect(page.getByRole('button', { name: 'Continue to launch' })).toBeEnabled();
});

for (const width of [320, 390, 1440]) for (const saved of [true, false]) test(`blocked job at ${width}px shows both IMD question fields and Fix in Builder restores ${saved ? 'the exact submitted draft' : 'an older on-chain request'}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const d = addBlock(validDraft(), 'swap-fee'); d.mode = 'blocks'; d.prompt = 'Observe swaps without changing them.'; d.settings.pool = 65; d.settings.pair = saved ? 'eth' : 'imd';
  let request = compose(d, getAddress(owner));
  if (!saved) {
    const fee = d.blocks.find(b => b.id === 'swap-fee')!;
    const legacyFee = legacyCatalog.blocks.find(block => block.id === 'swap-fee') as unknown as BlockDef;
    request = request.replace(/^1\. .+$/m, `1. ${fill(legacyFee.legacySentences![0], legacyFee, fee.p, context(d, getAddress(owner)))}`)
      .replace('Keep every hook fee in IMD: do not convert the fee to ETH and do not use any other pool.\n', '');
  }
  const parsed = parseObjective(request);
  await setup(page, validDraft());
  await injectedOwner(page);
  const { storeLogs } = await import('./chain-fixture'); const logs = storeLogs();
  const b = body(d, getAddress(owner));
  b.objective = request;
  const { intakeAbi } = await import('../src/chain/decode');
  logs.requested.data = encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'), [stringToHex(JSON.stringify(b)), owner as `0x${string}`, '0x00000000', site.chains.find(c => c.id === 1)!.imdAddress as `0x${string}`, 500000000000000000n]);
  await page.route('https://rpc.mevblocker.io', async r => {
    const req = r.request().postDataJSON(); if (req.method !== 'eth_getLogs') return r.fallback();
    const log = req.params[0].topics[0] === REQUEST_TOPIC ? logs.requested : logs.completed;
    await r.fulfill({ json: { jsonrpc: '2.0', id: req.id, result: [log] } });
  });
  const jobId = 'blocked-launch-2';
  const blockedReason = 'needs_input: Which IMD/ETH conversion pool should be used?';
  const failureReason = 'needs_input: The pool is paired with IMD but the fee sentence says ETH.\nPlease resolve the fee currency.';
  await page.route(`${relay}/jobs/${jobId}`, r => r.fulfill({ json: { id: jobId, state: 'blocked', blockedReason, nodes: [{ key: 'build', role: 'implement', state: 'failed', failureReason }] } }));
  await page.route(`${relay}/intake/**`, r => r.fulfill({ json: { entries: [{ requestId, action: 'launch.open', admission: { result: { jobId } } }] } }));
  await page.route(`${relay}/jobs/${jsonResult.jobId}`, r => r.fulfill({ json: { id: jsonResult.jobId, state: 'blocked', blockedReason, nodes: [{ key: 'build', role: 'implement', state: 'failed', failureReason }] } }));
  if (saved) await page.addInitScript(({ d, request, id }) => localStorage.setItem(`hooks-store:submitted:1:${id.toLowerCase()}`, JSON.stringify({ draft: d, request })), { d, request, id: requestId });
  await page.goto(route);
  await expect(page.locator('.needs-attention')).toContainText(blockedReason);
  await expect(page.locator('.needs-attention')).toContainText(failureReason);
  await fits(page, width);
  if (saved) { fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: `${output}/blocked-hook-${width}.jpg`, type: 'jpeg', quality: 45 }); }
  await page.getByRole('button', { name: 'Fix in Builder', exact: true }).click();
  await expect(page).toHaveURL(/#builder$/); await expect(page.locator('.correction')).toContainText(blockedReason);
  await expect(page.locator('#s-pool')).toHaveValue('65'); await expect(page.locator('#s-pair')).toHaveValue(d.settings.pair);
  await expect(page.locator('#composed')).toContainText(d.prompt);
  await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  await expect(page.locator('#p-text')).toHaveValue(d.prompt);
  await expect(page.locator('.correction pre')).toHaveText(request);
  await page.locator('#connect').click(); await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  if (!saved) {
    await page.getByRole('button', { name: 'Stack blocks', exact: true }).click();
    await expect(page.locator('#composed')).toContainText('settled in IMD'); await expect(page.locator('#composed')).toContainText('do not convert the fee to ETH and do not use any other pool');
    await page.getByRole('button', { name: 'Describe it', exact: true }).click();
  }
  await fits(page, width);
  if (saved) await page.screenshot({ path: `${output}/fix-builder-${width}.jpg`, type: 'jpeg', quality: 45 });
  await page.locator('#p-text').fill('Observe swaps and reject swaps during a 30-second cooldown.');
  await page.getByRole('button', { name: 'Stack blocks', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to launch' }).click();
  await page.getByText('Exact request the swarm receives', { exact: true }).click();
  await expect(page.getByTestId('launch-json')).toContainText('30-second cooldown');
  expect(parsed.type).toBe('A'); expect(intakeAbi.length).toBeGreaterThan(0);
});
async function fits(page: Page, width: number) { await expectReflow(page, width); }

test('a reorg retracts the pond announcement and its age, including after another minute', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-21T20:00:00Z') }); await setup(page);
  let removed = false; const logs = storeLogs();
  await page.route(`${relay}/launches?limit=100`, r => r.fulfill({ json: { launches: [{ id: jsonResult.launch.id, chainId: 1, status: 'live', updatedAt: '2026-10-21T20:00:00Z', artifacts: [{ role: 'hook', name: 'PondGuard', address: hook }] }] } }));
  await page.route('https://rpc.mevblocker.io', async r => {
    const req = r.request().postDataJSON(); if (req.method !== 'eth_getLogs') return r.fallback();
    const log = req.params[0].topics[0] === REQUEST_TOPIC ? logs.requested : logs.completed;
    await r.fulfill({ json: { jsonrpc: '2.0', id: req.id, result: removed ? [] : [log] } });
  });
  await page.goto('#store'); await expect(page.locator('.ticker')).toContainText('PondGuard was launched on Ethereum · just now');
  removed = true; await page.clock.fastForward(20001);
  await expect(page.locator('.ticker')).toContainText('Quiet on the pond. Waiting for the next launch.');
  await page.clock.fastForward(60001); await expect(page.locator('.ticker')).not.toContainText('PondGuard');
  await expect(page.locator('.ticker')).not.toContainText('min ago');
});

// Confirmed replacements consume the original nonce. Local doubles only; no signing or public send.
async function cancelledLaunch(page: Page, mode: 'cancelled' | 'replaced' | 'repriced' | 'replacement-request' | 'unknown') {
  const d = validDraft(); await setup(page, d);
  const { encodeFunctionData } = await import('viem');
  const { intakeAbi } = await import('../src/chain/decode');
  const hashes = [...new Set(recorded.logs.map(l => l.transactionHash))];
  const [original, replacement, retried, approvalHash] = hashes;
  const blockHash = recorded.logs[0].blockHash, price = 500000000000000000n;
  const imd = site.chains.find(c => c.id === 1)!.imdAddress;
  const prepared = launchBody(d, site, getAddress(owner));
  const launchData = encodeFunctionData({ abi: intakeAbi, functionName: 'request', args: [site.intake.launchAction, prepared.bytes, { target: '0x0000000000000000000000000000000000000000', selector: '0x00000000' }, imd, price] });
  const approval = { address: imd, topics: encodeEventTopics({ abi: erc20Abi, eventName: 'Approval', args: { owner: owner as `0x${string}`, spender: site.intake.address as `0x${string}` } }), data: encodeAbiParameters(parseAbiParameters('uint256'), [price]), blockHash, blockNumber: toHex(head), transactionHash: approvalHash, transactionIndex: '0x0', logIndex: '0x0', removed: false };
  const requested = { ...storeLogs().requested, transactionHash: retried, blockNumber: toHex(head), address: site.intake.address, data: encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'), [prepared.bytes, owner as `0x${string}`, '0x00000000', imd as `0x${string}`, price]) };
  const receipt = (hash: string, logs: unknown[]) => ({ transactionHash: hash, blockHash, blockNumber: toHex(head), transactionIndex: '0x0', from: owner, to: site.intake.address, status: '0x1', logs, gasUsed: '0x10000', cumulativeGasUsed: '0x10000', effectiveGasPrice: '0x1', type: '0x0', contractAddress: null, logsBloom: '0x' + '00'.repeat(256) });
  const transaction = (hash: string) => ({ hash, from: owner, to: hash === replacement && mode === 'cancelled' ? owner : site.intake.address, input: hash === replacement && (mode === 'cancelled' || mode === 'replaced') ? '0x' : launchData, value: hash === replacement && mode === 'replacement-request' ? '0x1' : '0x0', nonce: '0x2', gas: '0x20000', gasPrice: '0x1', blockNumber: null, blockHash: null, transactionIndex: null, type: '0x0', v: '0x1b', r: '0x1', s: '0x1' });
  let sends = 0;
  const key = `hooks-store:launch-tx:${keccak256(stringToHex(`${getAddress(owner)}:1:${prepared.bytes}`))}`;
  await page.addInitScript(({ key, hash, price }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ approval: { hash, price, phase: 'pending' } })); }, { key, hash: approvalHash, price: price.toString() });
  const answer = async (r: any) => {
    const req = r.request().postDataJSON(); let result: unknown = '0x';
    if (req.method === 'eth_sendTransaction') { sends++; result = sends > 1 ? retried : original; }
    else if (req.method === 'eth_chainId') result = '0x1';
    else if (req.method === 'eth_blockNumber') result = toHex(head);
    else if (req.method === 'eth_getLogs') result = [];
    else if (req.method === 'eth_getTransactionByHash') result = transaction(req.params[0]);
    else if (req.method === 'eth_getTransactionReceipt') {
      const hash = req.params[0]; result = hash === approvalHash ? receipt(hash, [approval]) : hash === retried ? receipt(hash, [requested]) : hash === replacement ? receipt(hash, ['repriced', 'replacement-request'].includes(mode) ? [requested] : []) : null;
    } else if (req.method === 'eth_getBlockByNumber') result = { number: toHex(head), hash: blockHash, timestamp: '0x6a500000', transactions: req.params[1] && mode !== 'unknown' ? [transaction(replacement)] : [] };
    else if (req.method === 'eth_call') {
      const selector = req.params[0].data.slice(0, 10);
      result = encodeAbiParameters(parseAbiParameters('uint256'), [selector === toFunctionSelector('balanceOf(address)') ? 10n ** 19n : price]);
    } else if (req.method === 'eth_estimateGas') result = '0x20000';
    else if (req.method === 'eth_gasPrice') result = '0x1';
    await r.fulfill({ json: { jsonrpc: '2.0', id: req.id, result } });
  };
  await page.route('https://rpc.mevblocker.io', answer); await page.route('https://wallet.hooks.test', answer);
  await injectedOwner(page, owner, 'https://wallet.hooks.test'); await page.goto('#launch');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click(); await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await page.getByRole('button', { name: 'Check confirmation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Approved', exact: true })).toBeVisible();
  return { key, sends: () => sends };
}
for (const mode of ['cancelled', 'replaced'] as const) test(`a confirmed ${mode} launch fails, persists and retries without another approval`, async ({ page }) => {
  const fixture = await cancelledLaunch(page, mode);
  await page.getByRole('button', { name: 'Launch hook', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'cancelled or replaced without this request' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch hook', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Pay from')).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).launch.phase, fixture.key)).toBe('failed');
  await page.getByRole('button', { name: 'Launch hook', exact: true }).click();
  await expect(page.locator('.launch-done')).toContainText('The swarm has your request'); expect(fixture.sends()).toBe(2);
  const archive = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hooks-store:submitted:')).map(k => JSON.parse(localStorage.getItem(k)!)));
  expect(archive).toHaveLength(1); expect(archive[0].request).toContain('Observe swaps without fees');
});
for (const mode of ['repriced', 'replacement-request'] as const) test(`a ${mode} launch verifies the exact Requested event and finishes without a second payment`, async ({ page }) => {
  const fixture = await cancelledLaunch(page, mode);
  await page.getByRole('button', { name: 'Launch hook', exact: true }).click();
  await expect(page.locator('.launch-done')).toContainText('The swarm has your request'); expect(fixture.sends()).toBe(1);
});
test('a genuinely unknown launch stays pending across reload and receipt retry', async ({ page }) => {
  const fixture = await cancelledLaunch(page, 'unknown');
  await page.getByRole('button', { name: 'Launch hook', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Launching…', exact: true })).toBeDisabled();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).launch?.phase, fixture.key)).toBe('pending');
  expect(fixture.sends()).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click(); await page.getByRole('button', { name: 'Fork Wallet', exact: true }).click();
  await page.getByRole('button', { name: 'Check confirmation', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Launching…', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Pay from')).toBeDisabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).launch.phase, fixture.key)).toBe('pending');
  expect(fixture.sends()).toBe(1);
});

for (const width of [320, 390, 1440]) for (const [name, hash, heading] of [
  ['store', '#store', 'Stack blocks.'], ['catalog', '#catalog', 'Catalog'], ['builder', '#builder', 'Builder'],
  ['launch', '#launch', 'Review your launch'], ['hook', route, 'PondGuard'], ['mine', `#mine?address=${owner}`, 'My hooks'], ['learn', '#learn', 'Learn'],
]) test(`launch safety ${name} at ${width}px: route, primary interaction, export resources and reflow`, async ({ page }) => {
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
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
    await expect(page.locator('#composed')).toContainText('paired with IMD.');
    await page.locator('#s-pair').selectOption('eth'); await expect(page.locator('#composed')).toContainText('paired with ETH.');
    await expect(page.locator('#composed')).toContainText('Hook fee rate: 0%.');
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

