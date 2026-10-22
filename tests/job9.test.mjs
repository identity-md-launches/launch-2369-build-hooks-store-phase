import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';
import { fetchProvenLaunches, matchProvenLaunch, parseProvenLaunches, provenFromRequest } from '../src/lib/proven.ts';
import { writtenFeeRates } from '../src/lib/writtenFees.ts';
import { importProvenSource } from '../web/src/relay.ts';
import { applyLaunchRecord, applyCompleted, launchFromRequested } from '../web/src/chain/decode.ts';
import { getAddress } from '../web/node_modules/viem/_esm/index.js';
import fs from 'node:fs';

const payer = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const owner = '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0';
// Runtime response fixture only: this file is never imported by the production application.
export const proven = { launchId: '9f778988-4553-4ff6-99fb-706824bb9e31', launchNumber: 2424, chainId: 4663, type: 'B', blocks: ['swap-fee', 'anti-sniper', 'jar', 'pause'], repoUrl: 'https://github.com/identity-md-launches/launch-2424-deploy-one-contract-pondsideguard', commit: '5a9f6a36d659084e084a8abc08a55213c9516f07', name: 'PondsideGuard', verifiedAt: '2026-10-22' };
function draft(type = 'B', ids = proven.blocks) {
  let d = { ...C.newDraft(), type, mode: 'blocks', seeded: true };
  d.settings = { ...d.settings, chain: 4663, pool: 50, hname: 'PondHook', token: payer, owner };
  for (const id of ids) d = C.addBlock(d, id);
  return d;
}

test('checksum wallet, owner, remainder, token, fee recipients and embedded addresses are lowercased in every body', () => {
  for (const type of ['A', 'B', 'C']) {
    let d = draft(type, ['swap-fee', 'fee-split']);
    d.settings = { ...d.settings, owner: '', rem: getAddress(owner), token: getAddress(payer) };
    d.blocks.find(b => b.id === 'fee-split').p.b = getAddress(owner);
    const input = C.body(d, getAddress(payer));
    assert.equal(input.owner, payer);
    if (type === 'A') assert.equal(input.economics.remainderTo, owner);
    for (const m of JSON.stringify(input).matchAll(/0x[\da-fA-F]{40}\b/g)) assert.equal(m[0], m[0].toLowerCase());
    assert.deepEqual(checkConsistency(input), []);
    d.settings.owner = getAddress(owner);
    assert.equal(C.body(d, getAddress(payer)).owner, owner);
    assert.deepEqual(checkConsistency(C.body(d, getAddress(payer))), []);
    assert.ok(checkConsistency({ ...input, owner: getAddress(payer) }).some(f => f.code === 'address-case'));
    assert.ok(checkConsistency({ ...input, economics: { remainderTo: getAddress(owner) } }).some(f => f.code === 'address-case'));
    assert.ok(checkConsistency({ ...input, objective: input.objective.replace(payer, getAddress(payer)) }).some(f => f.code === 'address-case'));
    assert.ok(checkConsistency({ ...input, nested: [{ recipient: 'not-an-address' }] }).some(f => f.code === 'address-case'));
  }
});

test('proven match compares type, chain and id set; parameters, words and Custom rule are allowed', () => {
  let d = draft();
  d.blocks.reverse(); d.blocks.find(b => b.id === 'swap-fee').p.rate = 0.5;
  d.prompt = 'Observe swaps.'; d = C.addBlock(d, 'custom'); d.blocks.find(b => b.id === 'custom').p.text = 'No other rules.';
  assert.equal(matchProvenLaunch(d, [proven]), proven);
  const input = C.body({ ...d, proven }, payer), fresh = C.body(d, payer);
  assert.equal(input.repoUrl, proven.repoUrl); assert.equal(input.baseCommit, proven.commit);
  const instruction = `Start from the audited source at ${proven.repoUrl} commit ${proven.commit}: keep its behavior, apply the parameters and rules of this request, adapt the deployer to mine its salt inside its constructor if it mines after deployment, and audit it as imported code.`;
  assert.equal(input.objective.split('\n')[1], instruction);
  assert.equal(input.objective.replace(instruction + '\n', '').replace(/\n/g, ' '), fresh.objective.replace(/\n/g, ' '));
  assert.equal(provenFromRequest(input.objective, [proven]), proven);
  assert.deepEqual(checkConsistency(input), []);
  for (const changed of [{ ...d, type: 'C' }, { ...d, blocks: [C.entry('oracle')] }, { ...d, mode: 'prompt' }]) {
    assert.equal(matchProvenLaunch(changed, [proven]), undefined);
    assert.equal(C.body({ ...changed, proven }, payer).repoUrl, undefined);
    assert.ok(!C.compose({ ...changed, proven }, payer).includes('Start from the audited source'));
  }
  const own = { ...d, proven, settings: { ...d.settings, repo: 'https://github.com/the-hook-store/hooks-store-spec', commit: proven.commit } };
  assert.equal(matchProvenLaunch(own, [proven]), undefined);
  assert.equal(C.body(own, payer).repoUrl, own.settings.repo);
  assert.ok(!C.compose(own, payer).includes('Start from the audited source'));
  assert.equal(C.normalizeDraft({ ...d, proven }).proven, undefined, 'saved edits cannot reuse a stale import');
});

test('runtime proven index has no bundled fallback and validates source pins', async t => {
  const calls = []; t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push([url, options]); return Response.json({ version: 1, launches: [proven] }); });
  assert.deepEqual(await fetchProvenLaunches(), [proven]); assert.equal(calls.length, 1); assert.equal(calls[0][1].cache, 'no-store');
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  assert.deepEqual(await fetchProvenLaunches(), []);
  assert.deepEqual(parseProvenLaunches({ launches: [{ ...proven, commit: 'main' }, { ...proven, repoUrl: 'javascript:bad' }] }), []);
});

test('proven source resolves through the relay import first; absent/failed/mismatched imports compose from scratch', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push([url, JSON.parse(options.body)]); return Response.json({ ok: true, source: { repoUrl: proven.repoUrl + '.git', baseCommit: proven.commit } }); });
  const source = await importProvenSource('https://relay.test', proven);
  assert.equal(source, proven); assert.deepEqual(calls, [['https://relay.test/import', { url: proven.repoUrl, ref: proven.commit, kind: 'contracts' }]]);
  assert.equal(C.body({ ...draft(), proven: source }, payer).baseCommit, proven.commit);
  assert.equal(await importProvenSource(null, proven), null); assert.equal(calls.length, 1);
  for (const answer of [Response.json({ ok: false }), new Response('<html>proxy</html>', { status: 502 }), Response.json({ ok: true, source: { repoUrl: proven.repoUrl + '.git', baseCommit: 'main' } })]) {
    t.mock.method(globalThis, 'fetch', async () => answer);
    const source = await importProvenSource('https://relay.test', proven);
    assert.equal(source, null); assert.equal(C.body({ ...draft(), proven: source ?? undefined }, payer).repoUrl, undefined);
  }
});

for (const type of ['A', 'B', 'C']) for (const mode of ['prompt', 'custom']) test(`structural written fee intents ${type}/${mode}`, () => {
  for (const text of ['The owner receives 1% of every swap.', '1% of each trade goes to the owner.', '2% commission.', 'Collect a toll of 1 percent on each trade.', 'Route 30 basis points of every swap to the owner.', 'Divert half a percent of each trade to the owner.', 'One hundredth of every trade accrues to the owner.', '1% accrues on every swap for the owner.', "Take one percent on every swap payable to IMD’s treasury."]) {
    const d = draft(type, mode === 'custom' ? ['custom'] : []); d.mode = mode === 'prompt' ? 'prompt' : 'blocks';
    if (mode === 'prompt') d.prompt = text; else d.blocks.find(b => b.id === 'custom').p.text = text;
    const input = C.body(d, payer), currency = C.pairCurrency(d);
    assert.ok(!input.objective.includes('Hook fee rate: 0%.'), text);
    for (const part of [`${currency} (pair currency) side`, `settled in ${currency}`, 'Fee recipient:', 'amount actually traded', 'swap reverts rather than overpaying']) assert.ok(input.objective.includes(part), text + ': ' + part);
    assert.deepEqual(checkConsistency(input), [], text);
    if (/treasury/.test(text)) { assert.ok(input.objective.includes(`Fee recipient: ${C.IMD_TREASURY}.`)); if (type !== 'A') assert.ok(input.objective.includes(`fee recipient ${C.IMD_TREASURY},`)); }
  }
  for (const text of ['A 1% price movement on a trade triggers a small hook fee.', 'When price moves by one percent charge a small hook fee.', 'When price moves by 1 percent charge a small hook fee.', 'After a trade reaches a 1% threshold, accrue a fee.', 'Apply a small toll on each swap.']) {
    const d = draft(type, mode === 'custom' ? ['custom'] : []); d.mode = mode === 'prompt' ? 'prompt' : 'blocks';
    if (mode === 'prompt') d.prompt = text; else d.blocks.find(b => b.id === 'custom').p.text = text;
    const input = C.body(d, payer);
    assert.ok(!input.objective.includes('Hook fee rate: 0%.'), text);
    assert.ok(checkConsistency(input).some(f => f.code === 'fee-rate'), text);
  }
});

test('combined cap uses matching directions, including directional base, replacement, jar and pot', () => {
  let d = draft('B', ['fee-dir', 'custom']); d.blocks.find(b => b.id === 'fee-dir').p = { buy: 1, sell: 4, to: 'my wallet' };
  d.blocks.find(b => b.id === 'custom').p.text = 'An additional 3% of every buy goes to my wallet.';
  assert.deepEqual(writtenFeeRates(d.blocks.find(b => b.id === 'custom').p.text), { buy: 3, sell: 0 });
  assert.equal(C.rateTotal(d), 4); assert.deepEqual(checkConsistency(C.body(d, payer)), []);
  d.blocks.find(b => b.id === 'custom').p.text = 'An additional 2% of every sell goes to my wallet.';
  assert.equal(C.rateTotal(d), 6); assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'));
  d = draft('B', ['swap-fee', 'fee-fade', 'custom']); d.blocks.find(b => b.id === 'swap-fee').p.applies = 'sell';
  d.blocks.find(b => b.id === 'custom').p.text = 'Take 4% of each buy for my wallet.';
  assert.equal(C.rateTotal(d), 4); assert.deepEqual(checkConsistency(C.body(d, payer)), []);
});

test('contracts-only Live is Completed status zero plus a matching live launch record, independent of hook address', () => {
  const log = JSON.parse(fs.readFileSync(new URL('fixtures/chain/1-intake.json', import.meta.url))).logs[0];
  // A minimal chain-derived row; contract metadata is applied to this request id only.
  const launch = { id: '1:' + log.topics[1], requestId: log.topics[1], type: 'B', chainId: 4663, intakeChainId: 1, status: 'in-progress', launchId: proven.launchId, completion: { status: 0 }, request: C.compose(draft(), payer), hookAddress: null, deployerAddress: null, tokenAddress: null, txHashes: [], jobIds: [], sourceRepoUrl: null, launchNumber: null };
  const artifact = { role: 'other', address: owner };
  const record = { id: proven.launchId, chainId: 4663, status: 'live', launchNumber: 2424, artifacts: [artifact], attestation: { contracts: [{ name: 'PondsideGuard' }, { name: 'PondsideGuardDeployer' }], manifest: { contracts: [{ contract: 'PondsideGuardDeployer' }] } } };
  const live = applyLaunchRecord(launch, record);
  assert.equal(live.status, 'live'); assert.equal(live.hookAddress, null); assert.equal(live.deployerAddress, owner);
  assert.equal(applyLaunchRecord({ ...launch, completion: undefined }, record).status, 'in-progress');
  assert.equal(applyLaunchRecord({ ...launch, completion: { status: 1 }, status: 'failed' }, record).status, 'failed');
  assert.equal(applyLaunchRecord(launch, { ...record, status: 'deploying' }).status, 'in-progress');
  assert.equal(applyLaunchRecord(launch, { ...record, id: 'other-launch' }).status, 'in-progress');
  assert.equal(applyLaunchRecord(launch, { ...record, chainId: 1 }).status, 'in-progress');
  const direct = applyLaunchRecord(launch, { ...record, artifacts: [{ role: 'other', address: payer }], attestation: { contracts: [{ name: 'PondsideGuard' }] } });
  assert.equal(direct.hookAddress, payer); assert.equal(direct.deployerAddress, null); assert.equal(direct.status, 'live');
});

test('adversarial review: whole spelled amounts, scoped prohibitions, payee subjects and direction prefixes', () => {
  for (const [text, rate] of [['Take five and a half percent on every swap.', 5.5], ['Take one fifth of every swap.', 20], ['Take one hundred and fifty basis points of every swap.', 1.5], ['Take one and a half percent of every swap.', 1.5], ['Take eleven basis points of every swap.', 0.11]]) {
    const d = draft('B', []); d.mode = 'prompt'; d.prompt = text;
    assert.equal(C.rateTotal(d), rate, text);
    assert.ok(!C.compose(d, payer).includes('Hook fee rate: 0%.'));
    assert.equal(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'), rate > 5, text);
  }
  for (const text of ['Take a percentage of every swap.', 'Accrue a slice of every swap.', 'Take one quadrillion and fifty basis points of every swap.']) {
    const d = draft('B', []); d.mode = 'prompt'; d.prompt = text;
    assert.ok(!C.compose(d, payer).includes('Hook fee rate: 0%.'), text);
    assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'fee-rate'), text);
  }
  const d = draft('B', []); d.mode = 'prompt'; d.prompt = 'No buy fee, and the owner receives 1% of every sell.';
  assert.equal(C.rateTotal(d), 1); assert.ok(!C.compose(d, payer).includes('Hook fee rate: 0%.')); assert.deepEqual(checkConsistency(C.body(d, payer)), []);
  d.prompt = 'Pay the owner 1% of every swap.';
  assert.ok(C.compose(d, payer).includes(`Fee recipient: ${owner}.`)); assert.ok(C.compose(d, payer).includes(`fee recipient ${owner},`)); assert.deepEqual(checkConsistency(C.body(d, payer)), []);
  d.prompt = 'On buys, take 4%. On sells, take 4%.';
  assert.equal(C.rateTotal(d), 4); assert.deepEqual(checkConsistency(C.body(d, payer)), []);
  d.prompt = 'No buy fee, and the owner receives 1% of every buy.';
  assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'contradiction'));
});

test('adversarial review: grouped/leading-decimal amounts and non-string body addresses cannot bypass the guard', () => {
  for (const [text, rate] of [['Take 1,000 basis points of every swap.', 10], ['Take 1,000% of every swap.', 1000], ['Take .5% of every swap.', 0.5], ['Take a 1% hook fee on every swap.', 1], ['Take a 0.3 percent hook fee on every swap.', 0.3]]) {
    const d = draft('B', []); d.mode = 'prompt'; d.prompt = text;
    assert.equal(C.rateTotal(d), rate, text);
    assert.equal(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'), rate > 5, text);
  }
  const input = C.body(draft('A', ['swap-fee']), payer);
  for (const value of [null, 1, {}, [], [payer], undefined]) assert.ok(checkConsistency({ ...input, economics: { poolBps: 5000, remainderTo: value } }).some(f => f.code === 'address-case'));
});

test('adversarial review: named payees precede amounts; every non-trigger amount must attach to a charge', () => {
  const d = draft('B', []); d.mode = 'prompt';
  d.prompt = 'Give the owner 1% of every swap.';
  assert.ok(C.compose(d, payer).includes(`Fee recipient: ${owner}.`)); assert.deepEqual(checkConsistency(C.body(d, payer)), []);
  for (const text of ['Take 1% of every swap and an additional 5% for the owner.', 'Take 1% of every swap, plus 6% credited to the owner.', 'A malformed 1.2.3% share of each trade belongs to the owner.']) {
    d.prompt = text; assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'fee-rate'), text);
  }
});
