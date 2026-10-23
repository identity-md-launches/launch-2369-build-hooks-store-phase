import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newDraft, addBlock, body, compose, POOL_MANAGERS } from '../src/lib/compose.ts';
import { matchProvenLaunch, provenLine, provenRequestLine } from '../src/lib/proven.ts';
import { AD_PRICE, PROMOTE_NOTE, depositSteps, promoteState, depositState, boostState, parseImd } from '../web/src/chain/ads.ts';
import { validRpcUrls } from '../web/src/chain/clients.ts';
import { genericRules, blockedNames, PINNED } from '../scripts/easylist-check.mjs';
const owner = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const site = JSON.parse(fs.readFileSync(new URL('../public/site-config.json', import.meta.url), 'utf8'));
const p = {launchId:'9f778988-4553-4ff6-99fb-706824bb9e31',launchNumber:2424,chainId:4663,type:'B',blocks:['swap-fee','anti-sniper','jar','pause'],repoUrl:'https://github.com/identity-md-launches/launch-2424-deploy-one-contract-pondsideguard.git',commit:'5a9f6a36d659084e084a8abc08a55213c9516f07',name:'PondsideGuard',verifiedAt:'2026-10-22'};
function draft(ids, chain = 4663, type = 'B') { let d = { ...newDraft(), type, mode: 'blocks', seeded: true }; d.settings = { ...d.settings, chain, hname: 'ReedHook', pool: 50, token: owner }; for (const id of ids) d = addBlock(d, id); return d; }

// (q) Proven line for an exact stack on the other chain (SPEC 4.17, decision 47)
for (const [source, target, name] of [[4663, 1, 'Ethereum'], [1, 4663, 'Robinhood Chain']]) test(`exact stack proven on chain ${source}, drafted on ${name}: the same blocks, redeployed`, () => {
  const entry = { ...p, chainId: source }, d = draft(p.blocks, target);
  assert.equal(matchProvenLaunch(d, [entry]), entry);
  const line = `Adapted from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22): the same blocks, redeployed on ${name}`;
  assert.equal(provenLine(entry, d), line);
  const objective = body({ ...d, proven: entry }, owner).objective;
  assert.ok(objective.includes(`Start from the audited source at ${entry.repoUrl} commit ${entry.commit}: keep its behavior, deploy on ${name} with that chain's PoolManager ${POOL_MANAGERS[target]}, apply the parameters and rules of this request`), objective);
  assert.doesNotMatch(objective, /removes none|remove none|adds none|add none/);
  assert.match(objective, /audit it as imported code\./);
  assert.equal(provenRequestLine(entry, objective), line);
  assert.doesNotMatch(provenLine(entry, d), /none/);
});
test('exact stack on the same chain keeps the job 12 sentence and the Built from line', () => {
  const d = draft(p.blocks, 4663);
  assert.equal(provenLine(p, d), 'Built from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22)');
  const text = compose({ ...d, proven: p }, owner);
  assert.match(text, /commit [\da-f]{40}: keep its behavior, apply the parameters and rules of this request, adapt the deployer/);
  assert.doesNotMatch(text, /deploy on .* with that chain's PoolManager/);
});
for (const chainId of [1, 4663]) test(`exact stack before choosing a chain names the proven launch on chain ${chainId} without an empty change list`, () => {
  const entry = { ...p, chainId }, d = draft(p.blocks, null);
  assert.equal(d.settings.chain, null);
  assert.equal(matchProvenLaunch(d, [entry]), entry);
  assert.equal(provenLine(entry, d), 'Built from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22)');
  assert.doesNotMatch(provenLine(entry, d), /none|redeployed/);
});
test('a nearest stack before choosing a chain still describes its block changes', () => {
  const d = draft(['swap-fee', 'cooldown', 'pause'], null);
  assert.equal(matchProvenLaunch(d, [p]), p);
  assert.equal(provenLine(p, d), 'Adapted from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22): the swarm removes Anti-sniper window, Buyback jar and adds Cooldown');
});
test('nearest match on the other chain: remove X; add Y; deploy on <chain>', () => {
  const d = draft(['swap-fee', 'cooldown', 'pause'], 1);
  assert.equal(matchProvenLaunch(d, [p]), p);
  assert.equal(provenLine(p, d), 'Adapted from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22): the swarm removes Anti-sniper window, Buyback jar and adds Cooldown, redeployed on Ethereum');
  const objective = body({ ...d, proven: p }, owner).objective;
  assert.ok(objective.includes(`remove Anti-sniper window, Buyback jar; add Cooldown; deploy on Ethereum with that chain's PoolManager ${POOL_MANAGERS[1]}; apply the parameters and rules of this request`), objective);
  assert.match(objective, /audit it as a new hook\./);
  assert.equal(provenRequestLine(p, objective), provenLine(p, d));
  const same = draft(['swap-fee', 'cooldown', 'pause'], 4663);
  assert.equal(provenLine(p, same), 'Adapted from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22): the swarm removes Anti-sniper window, Buyback jar and adds Cooldown');
  assert.doesNotMatch(body({ ...same, proven: p }, owner).objective, /deploy on/);
});

// (o) Public RPC fallback (SPEC 7.2, decision 45)
test('site-config lists RPC URLs per chain in fallback order', () => {
  const byId = Object.fromEntries(site.chains.map(c => [c.id, c]));
  assert.deepEqual(byId[1].rpcUrls, ['https://ethereum-rpc.publicnode.com', 'https://rpc.mevblocker.io', 'https://eth.llamarpc.com']);
  assert.equal(byId[4663].rpcUrls[0], 'https://rpc.mainnet.chain.robinhood.com');
  assert.ok(byId[4663].rpcUrls.length >= 2, 'Robinhood Chain needs a second public endpoint');
  for (const c of site.chains) { assert.equal(c.rpcUrl, undefined); assert.ok(validRpcUrls(c.rpcUrls), c.name); }
  assert.equal(validRpcUrls([]), false); assert.equal(validRpcUrls(['http://x.example']), false);
  assert.equal(validRpcUrls(['https://a.example', 'https://a.example']), false); assert.equal(validRpcUrls(['https://user:pw@a.example']), false);
  const clients = fs.readFileSync(new URL('../web/src/chain/clients.ts', import.meta.url), 'utf8');
  assert.match(clients, /fallback\(endpoints, \{ retryCount: 1/);
  assert.match(fs.readFileSync(new URL('../web/src/wallet/config.ts', import.meta.url), 'utf8'), /rpcTransport\(/);
});

// (p) Ad-blocker-safe markup (SPEC 3.1, decision 46)
test('the pinned EasyList copy holds the generic cosmetic rules, including ##.adcard', () => {
  const text = fs.readFileSync(PINNED, 'utf8');
  assert.match(text, /^\[Adblock Plus/); assert.match(text, /^! Version: \d{12}$/m);
  const rules = genericRules(text);
  assert.ok(rules.classes.size > 5000 && rules.ids.size > 2000);
  for (const name of ['adcard', 'ad-card', 'adslot']) assert.ok(rules.classes.has(name), name);
});
test('no class or id in the built dist/ matches a ##.class or ###id rule', () => {
  const found = blockedNames(new URL('../dist', import.meta.url).pathname);
  assert.ok(found.scanned.classes > 150 && found.scanned.ids > 50, JSON.stringify(found.scanned));
  assert.deepEqual({ classes: found.classes, ids: found.ids }, { classes: [], ids: [] });
});
test('the strip and panel never use ad, ads, adcard, adslot, ad-card, sponsored or promo as a class or id; #AD stays as text', () => {
  const src = ['Catalog.tsx', 'Promotions.tsx', 'Hook.tsx'].map(f => fs.readFileSync(new URL(`../web/src/${f}`, import.meta.url), 'utf8')).join('\n');
  const css = fs.readFileSync(new URL('../web/src/styles.css', import.meta.url), 'utf8');
  const forbidden = ['ad', 'ads', 'adcard', 'adslot', 'ad-card', 'sponsored', 'promo'];
  const names = [...src.matchAll(/(?:className|id)=["{`]+([^"`}]*)/g)].flatMap(m => m[1].split(/\s+/));
  for (const name of forbidden) { assert.ok(!names.includes(name), name); assert.doesNotMatch(css, new RegExp(`[.#]${name}(?![\\w-])`)); }
  for (const name of ['placement-card', 'placement-slot', 'featured-band', 'featured-track', 'featured-group', 'promotion-row']) assert.ok(src.includes(name), name);
  assert.match(src, />#AD</);
});

// (n) Promotions panel: balance first, then hooks (SPEC 3.5, decision 44)
test('allowance decision: approve only when the allowance is short, then exactly one deposit', () => {
  const amount = parseImd('0.25');
  assert.equal(amount, 250000000000000000n);
  assert.deepEqual(depositSteps(0n, amount), ['approve', 'deposit']);
  assert.deepEqual(depositSteps(amount - 1n, amount), ['approve', 'deposit']);
  assert.deepEqual(depositSteps(amount, amount), ['deposit']);
  assert.deepEqual(depositSteps(10n ** 30n, amount), ['deposit']);
  assert.deepEqual(depositSteps(0n, 0n), []);
});
test('typed IMD amounts and their disabled states', () => {
  assert.equal(parseImd('.5'), 500000000000000000n); assert.equal(parseImd(' 1 '), 10n ** 18n);
  for (const bad of ['', '0', '0.0', '-1', '1e3', 'abc', '1.0000000000000000001', '1,5']) assert.equal(parseImd(bad), null, bad);
  assert.deepEqual(depositState('', 10n ** 18n), { amount: null, error: '' });
  assert.deepEqual(depositState('abc', 10n ** 18n), { amount: null, error: 'Enter a positive IMD amount, with up to 18 decimals.' });
  assert.deepEqual(depositState('2', 10n ** 18n), { amount: null, error: 'More than your wallet holds on this chain.' });
  assert.deepEqual(depositState('0.25', 10n ** 18n), { amount: 250000000000000000n, error: '' });
  assert.deepEqual(boostState('0.2', AD_PRICE), { amount: null, error: 'More than your deposit. Deposit more IMD first.' });
  assert.deepEqual(boostState('0.05', AD_PRICE), { amount: 50000000000000000n, error: '' });
});
test('PROMOTE is disabled with "Deposit at least 0.1 IMD first" below 0.1 IMD deposited', () => {
  const ok = { ready: true, wrongChain: false, busy: false };
  assert.equal(PROMOTE_NOTE, 'Deposit at least 0.1 IMD first');
  assert.deepEqual(promoteState(0n, ok), { disabled: true, note: PROMOTE_NOTE });
  assert.deepEqual(promoteState(AD_PRICE - 1n, ok), { disabled: true, note: PROMOTE_NOTE });
  assert.deepEqual(promoteState(AD_PRICE, ok), { disabled: false, note: '' });
  assert.deepEqual(promoteState(null, ok), { disabled: true, note: 'Reading your deposit…' });
  assert.equal(promoteState(AD_PRICE, { ...ok, ready: false }).disabled, true);
  assert.equal(promoteState(AD_PRICE, { ...ok, wrongChain: true }).disabled, true);
  assert.deepEqual(promoteState(AD_PRICE, { ...ok, busy: true }), { disabled: true, note: '' });
});
test('the panel source has no four-step flow and reads proceeds for WITHDRAW PROCEEDS', () => {
  const src = fs.readFileSync(new URL('../web/src/Promotions.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Promote a hook<|promotion-steps|promo-step/);
  for (const text of ['In your wallet on {chainName}', 'Deposited for promotions', 'Earned as recipient', 'Withdraw proceeds', "'withdrawProceeds'", "'purchase'", 'Deposit IMD']) assert.ok(src.includes(text), text);
});
