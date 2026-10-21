import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { API, isHookLaunch, normalizeLaunch, normalizeStatus, parseBlocks, buildSnapshot, saveSnapshot } from '../scripts/snapshot-launches.mjs';
const fixture = async name => JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const hook = await fixture('univ4_hook'), contracts = await fixture('evm_contracts'), evmHook = await fixture('evm-hook');

test('saved API fixtures: include native hooks and contracts whose actual job objective mentions a v4 hook', () => {
  assert.equal(isHookLaunch(hook), true); assert.equal(isHookLaunch(contracts), false); assert.equal(isHookLaunch(evmHook), true);
  assert.equal(isHookLaunch({ ...contracts, sourceRepoUrl: 'Uniswap v4 hook' }), false);
});
test('preserve real identifiers, request text and addresses, without reward or verifier payloads', () => {
  const row = normalizeLaunch(hook);
  assert.equal(row.name, 'HamsterHook'); assert.equal(row.symbol, 'HAMSTER'); assert.equal(row.launchNumber, 2336);
  assert.equal(row.hookAddress, hook.artifacts.find(a => a.role === 'hook').address);
  assert.match(row.request, /80% remainder/); assert.equal(row.request, hook.jobs.map(j => j.objective).join('\n\n'));
  assert.equal(row.requestId, null); assert.equal(row.status, 'live');
  assert.ok(row.currencies.includes(hook.seeded.pools[0].currency0));
  assert.equal('rewardSnapshot' in row, false); assert.equal('allocations' in row, false);
});
test('missing metadata remains absent; names use actual artifacts and never synthesize a symbol or launch number', () => {
  const row = normalizeLaunch({ ...hook, artifacts: [], launchNumber: null, jobs: [], seeded: null });
  assert.equal(row.name, 'Unnamed hook'); assert.equal(row.symbol, null); assert.equal(row.launchNumber, null); assert.equal(row.hookAddress, null);
  assert.equal(normalizeLaunch(evmHook).name, evmHook.artifacts[0].name);
});
test('parse the saved spec request into exact block labels, ignoring numeric amounts in the prose', async () => {
  const request = await readFile(new URL('./fixtures/numbered-request.txt', import.meta.url), 'utf8');
  assert.deepEqual(parseBlocks(request), { blocks: ['Anti-sniper window', 'Cooldown'], groups: ['protection'] });
  assert.deepEqual(parseBlocks('1. No owner, pause or fee changes. 2. A custom behavior.'), { blocks: ['Custom'], groups: ['custom'] });
  assert.deepEqual(parseBlocks('1. The owner may pause and unpause swaps. 2. Liquidity added to the pool is locked for 7 days.'), { blocks: ['Pause switch', 'Liquidity lock'], groups: ['timing', 'liquidity'] });
  assert.deepEqual(parseBlocks('Take 1% of a trade, maybe. No specified template.'), { blocks: ['Custom'], groups: ['custom'] });
});
test('status distinguishes failed and parked launches from work in progress', () => {
  assert.equal(normalizeStatus('live'), 'live'); assert.equal(normalizeStatus('parked'), 'failed'); assert.equal(normalizeStatus('rejected'), 'failed');
  assert.equal(normalizeStatus('requested'), 'requested'); assert.equal(normalizeStatus('deploying'), 'in-progress');
});
test('fetch index then candidate details, deduplicate, preserve sorting, skip unrelated kinds', async () => {
  const calls = [];
  const fetchJson = async url => {
    calls.push(url);
    if (url === `${API}/launches?limit=500`) return { launches: [hook, contracts, evmHook, hook, { id: hook.id, kind: 'custom_token' }] };
    return [hook, contracts, evmHook].find(f => url === `${API}/launches/${f.id}`);
  };
  const result = await buildSnapshot({ fetchJson, now: () => hook.updatedAt });
  assert.equal(calls[0], `${API}/launches?limit=500`); assert.equal(calls.length, 4);
  assert.equal(result.launches.length, 2); assert.equal(result.generatedAt, hook.updatedAt);
  assert.equal(result.launches[0].id, hook.id);
});
test('a failed or mismatched detail rejects the snapshot; the last complete file survives', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hooks-snapshot-')); const file = join(dir, 'launches.json');
  try {
    const complete = { version: 1, launches: [normalizeLaunch(hook)] }; await saveSnapshot(complete, file);
    for (const broken of [() => { throw new Error('503 unavailable'); }, () => ({ ...hook, id: contracts.id })]) {
      await assert.rejects(async () => {
        const next = await buildSnapshot({ fetchJson: async url => url.endsWith('?limit=500') ? { launches: [hook] } : broken() });
        await saveSnapshot(next, file);
      });
      assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), complete);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('invalid index and chain metadata are rejected instead of becoming an empty success', async () => {
  await assert.rejects(buildSnapshot({ fetchJson: async () => ({}) }), /Invalid launches index/);
  assert.throws(() => normalizeLaunch({ ...hook, chainId: null }), /chainId/);
});
