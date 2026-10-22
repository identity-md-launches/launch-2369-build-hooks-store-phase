import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, parseAbiParameters, stringToHex, zeroAddress } from '../web/node_modules/viem/_esm/index.js';
import * as C from '../src/lib/compose.ts';
import { applyResult, applyLaunchRecord, blockShortOf, intakeAbi, launchFromRequested, matchRule, parseObjective } from '../web/src/chain/decode.ts';
import { argumentValues, functionAbi, managementFunctions } from '../web/src/chain/manage.ts';
import { DYNAMIC_FEE_FLAG, initializeAbi, poolCall } from '../web/src/chain/pool.ts';
import { cacheKey, COMPLETE_TOPIC, LaunchStore, REQUEST_TOPIC } from '../web/src/chain/store.ts';
import config from '../public/site-config.json' with { type: 'json' };
import legacy from '../src/blocks/legacy-catalog.json' with { type: 'json' };

const payer = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const token = '0x8e7c7936b4f2d4475dc4bacd174dc228d4d24e86';
const hook = '0x82f636a92364d13754d7b3e72d460f0be20a28cc';
const poolId = '0x' + '12'.repeat(32);
function draft(type = 'A', pair = 'imd') {
  const d = C.newDraft(); d.type = type; d.mode = 'blocks'; d.seeded = true;
  d.settings = { ...d.settings, chain: 1, pool: 50, pair, hname: 'PondGuard', token };
  return d;
}
function withBlock(d, id) {
  const def = C.BY_ID[id];
  if (def.requires) d = withBlock(d, def.requires);
  if (def.requiresAny) d = withBlock(d, def.requiresAny[0]);
  d = C.addBlock(d, id);
  const block = d.blocks.find(block => block.id === id);
  if (block) for (const p of def.params) {
    if (p.type === 'address') block.p[p.k] = payer;
    if (p.type === 'datetime') block.p[p.k] = '2030-01-01 00:00';
    if (p.type === 'textarea') block.p[p.k] = 'Observe swaps without changing them. No owner functions.';
  }
  return d;
}

test('every available catalog rule decodes with its complete context under every type and pairing', () => {
  for (const type of ['A', 'B', 'C']) for (const pair of type === 'A' ? ['imd', 'eth'] : ['eth']) {
    for (const def of C.BLOCKS.filter(block => !C.TOKEN_IDS.includes(block.id) && !block.disabled && block.types.includes(type))) {
      const d = withBlock(draft(type, pair), def.id), text = C.compose(d, payer), parsed = parseObjective(text, payer);
      assert.equal(parsed.type, type, `${type}/${pair}/${def.id}`);
      assert.equal(parsed.name, type === 'A' ? 'Pondside' : 'PondGuard');
      if (def.id === 'custom') assert.ok(parsed.blocks.includes('Custom'));
      else assert.ok(parsed.matchedBlocks.some(block => block.id === def.id), `${type}/${pair}/${def.id}\n${text}`);
      assert.equal(parsed.tokenAddress, type === 'C' ? token : null);
      for (const block of parsed.matchedBlocks) assert.ok(!block.legacy, `Current ${block.id} unexpectedly decoded as legacy`);
    }
  }
});

test('legacy job7 sentences keep their original labels and callable ABI', () => {
  const ctx = { name: 'Pond', symbol: 'POND', pair: 'IMD', wallet: payer, destination: `send it to ${payer}` };
  for (const def of legacy.blocks.filter(block => !C.TOKEN_IDS.includes(block.id) && block.id !== 'custom')) {
    const entry = { id: def.id, p: Object.fromEntries(def.params.map(param => [param.k, param.default])) };
    if (def.id === 'jar') ctx.jarAction = 'burn the bought tokens';
    const sentence = C.fill(def.sentence, def, entry.p, ctx), match = matchRule(sentence, ctx);
    assert.equal(match?.id, def.id, sentence);
    const rows = managementFunctions([match]);
    for (const fn of [...(def.owner ?? []), ...(def.anyone ?? []), ...(def.user ?? []), ...(def.view ?? [])]) assert.ok(rows.some(row => row.sig === fn.sig), `${def.id}: ${fn.sig}`);
    assert.equal(blockShortOf(match, ctx), C.fill(def.short, def, entry.p, ctx));
  }
});

test('PoolId ABI is bytes32, values are validated and position keys remain explicit', () => {
  const fn = functionAbi('boughtBy(PoolId poolId, address wallet)', true);
  assert.equal(fn.inputs[0].type, 'bytes32'); assert.equal(fn.inputs[0].name, 'poolId');
  const values = argumentValues(fn, [poolId, payer]);
  assert.equal(values[0], poolId); assert.equal(values[1].toLowerCase(), payer);
  assert.throws(() => argumentValues(fn, ['0x1234', payer]), /full 32-byte/);
  const position = functionAbi('unlockAt(bytes32 positionKey)', true);
  assert.equal(position.inputs[0].name, 'positionKey');
  assert.deepEqual(argumentValues(position, [poolId]), [poolId]);
});

test('Donation rules expose setDonor only for the allowlisted option', () => {
  for (const who of ['only the owner', 'nobody', 'only allowlisted addresses']) {
    const block = C.entry('donate'); block.p.who = who;
    assert.equal(managementFunctions([block]).some(fn => fn.sig.startsWith('setDonor(')), who === 'only allowlisted addresses');
  }
});

test('dynamic LP pool initialization sets 0x800000 and refuses a conflicting fixed fee tier', () => {
  const call = poolCall(1, token, hook, [C.entry('lp-fee')], '1', 18);
  assert.equal(call.poolKey.fee, DYNAMIC_FEE_FLAG);
  assert.equal(decodeFunctionData({ abi: initializeAbi, data: call.data }).args[0].fee, DYNAMIC_FEE_FLAG);
  assert.equal(call.poolKey.tickSpacing, 60);
  assert.throws(() => poolCall(1, token, hook, [C.entry('lp-fee'), C.entry('pool-rules')], '1', 18), /cannot be combined/);
});

test('the verified deployer is resolved through hook(), including zero, retry and cached pending state', async t => {
  const fixture = JSON.parse(fs.readFileSync(new URL('fixtures/chain/1-intake.json', import.meta.url), 'utf8'));
  const base = fixture.logs.find(log => log.topics[0] === REQUEST_TOPIC), requestId = base.topics[1];
  const d = withBlock(draft('B', 'eth'), 'pause');
  const requested = { ...base, topics: encodeEventTopics({ abi: intakeAbi, eventName: 'Requested', args: { requestId, payer, action: config.intake.launchAction } }),
    data: encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'), [stringToHex(JSON.stringify(C.body(d, payer))), payer, '0x00000000', token, 500000000000000000n]) };
  const completed = { ...base, logIndex: '0x1', topics: encodeEventTopics({ abi: intakeAbi, eventName: 'Completed', args: { requestId } }),
    data: encodeAbiParameters(parseAbiParameters('uint8,bytes32,string,bool'), [0, stringToHex('', { size: 32 }), 'ipfs://bafybeiehm6g5f64gnapfl2elqikvaxb2paxsljvhrow43dxoidn6macbpm/result.json', false]) };
  const result = { launch: { id: '2424', chainId: 1 } };
  const launchRecord = { id: '2424', chainId: 1, status: 'live', artifacts: [{ role: 'other', name: 'PondGuardDeployer', address: payer }] };
  const launch = launchFromRequested(requested, 1, config.intake.launchAction);
  assert.equal(applyResult(launch, result).deployerAddress, null);
  assert.equal(applyLaunchRecord(applyResult(launch, result), launchRecord).deployerAddress, payer);
  assert.equal(applyResult(launch, result).hookAddress, null);
  const storage = new Map(); globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  t.after(() => { delete globalThis.localStorage; });
  const block = String(BigInt(base.blockNumber));
  storage.set(cacheKey(1), JSON.stringify({ version: 2, head: block, cursor: String(BigInt(block) - 1n), records: { [requestId]: { requested, completed, result, launchRecord, timestamp: 1792563203 } }, completions: {} }));
  let returnedHook = zeroAddress, reads = 0;
  const client = { getChainId: async () => 1, getBlockNumber: async () => BigInt(block), getBlock: async () => ({ hash: base.blockHash, timestamp: 1792563203n }), getEnsName: async () => null,
    request: async ({ params: [q] }) => q.topics[0] === REQUEST_TOPIC ? [requested] : [completed],
    readContract: async call => { assert.equal(call.address, payer); assert.equal(call.functionName, 'hook'); reads++; return returnedHook; } };
  const site = { ...config, relayUrl: null, chains: [{ ...config.chains.find(chain => chain.id === 1), intakeFromBlock: Number(block) }], intake: { ...config.intake, pollIntervalMs: 60000 } };
  const store = new LaunchStore(site, { 1: client }), stop = store.start(); t.after(stop);
  const eventually = async predicate => { for (let i = 0; i < 100 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5)); assert.ok(predicate()); };
  await eventually(() => store.getSnapshot().launches[0]?.hookPending);
  assert.equal(store.getSnapshot().launches[0].status, 'live');
  assert.equal(store.getSnapshot().launches[0].hookAddress, null);
  assert.equal(new LaunchStore(site, { 1: client }).getSnapshot().launches[0].hookPending, true);
  returnedHook = hook; store.retry();
  await eventually(() => store.getSnapshot().launches[0]?.hookAddress === hook);
  assert.equal(store.getSnapshot().launches[0].status, 'live'); assert.ok(reads >= 2);
});
