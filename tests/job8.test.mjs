// Job 8: independent assertions against SPEC 1.31 §4.16 and §6.7.
// Tests inspect the exact request, and inject incompatible entries directly to
// exercise the last pre-payment check independently of the palette controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../src/lib/compose.ts';
import { checkConsistency, fixedFactConflicts } from '../src/lib/safety.ts';

const config = JSON.parse(readFileSync(new URL('../public/site-config.json', import.meta.url), 'utf8'));
const wallet = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const owner = '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0';
const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
const feeIds = ['swap-fee', 'fee-dir', 'fee-size', 'fee-fade', 'fee-vol', 'jar', 'pot'];
const disabledIds = ['async', 'yield'];

function draft(type = 'A', pair = 'imd', chain = 4663) {
  const d = C.newDraft();
  return { ...d, type, mode: 'blocks', blocks: type === 'A' ? [C.entry('token')] : [], settings: {
    ...d.settings, chain, pair, pool: 50, hname: 'JobEightHook', owner,
    token: config.chains.find(c => c.id === chain).imdAddress, tsym: 'IMD',
  } };
}
function add(d, id) {
  if (C.has(d, id)) return d;
  const def = C.BY_ID[id];
  for (const requirement of list(def.requires)) d = add(d, requirement);
  // Whale fee accepts either basic schedule; exercise Swap fee in the matrix.
  const any = list(def.requiresAny);
  if (any.length && !any.some(id => C.has(d, id))) d = add(d, any[0]);
  if (id === 'fee-size' && !C.has(d, 'swap-fee') && !C.has(d, 'fee-dir')) d = add(d, 'swap-fee');
  if (C.TOKEN_IDS.includes(id)) d = { ...d, blocks: d.blocks.filter(b => !C.TOKEN_IDS.includes(b.id)) };
  const b = C.entry(id);
  if (id === 'fee-split') b.p.b = C.IMD_TREASURY;
  if (id === 'custom') b.p.text = 'Observe swaps without changing them.';
  return { ...d, blocks: [...d.blocks, b] };
}
function withBlocks(ids, type = 'A', pair = 'imd', chain = 4663) {
  return ids.reduce(add, draft(type, pair, chain));
}
function sentence(d, id) {
  return C.sentenceOf(d.blocks.find(b => b.id === id), C.context(d, wallet));
}
function assertClause(text, pattern, label) {
  assert.match(text, pattern, `${label}: ${text}`);
}

for (const def of C.BLOCKS) for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) for (const chain of [1, 4663]) {
  test(`job8 catalog ${def.id}/${type}/${pair}/${chain}`, () => {
    const d = add(draft(type, pair, chain), def.id);
    const request = C.body(d, wallet), text = request.objective;
    const allowed = def.types.includes(type);
    assert.equal(request.owner.toLowerCase(), owner);
    assert.deepEqual(request.references, ['uniswap-v4-hooks', 'uniswap-v4-security']);
    if (!allowed || disabledIds.includes(def.id)) {
      const unselected = { ...d, blocks: d.blocks.filter(b => b.id !== def.id) };
      assert.ok(C.blockedReason(unselected, def), `${def.id}/${type} must be unavailable`);
      if (allowed && disabledIds.includes(def.id)) assert.ok(checkConsistency(request).length, `${def.id} cannot reach payment through an imported draft`);
      return;
    }
    assert.deepEqual(checkConsistency(request), [], text);
    assert.ok(text.includes(sentence(d, def.id)), `${def.id} sentence appears in objective`);
    assert.ok(!/\{@?\w+(?::\w+)?\}/.test(text), 'no unresolved catalog substitution');
    assert.ok(text.includes('The hook uses no outside pool, token, price feed or service; every price it needs comes from its own pool.'));
    if (type === 'A') {
      assert.match(text, /beforeInitialize accepts only the IMD launch factory/);
      assert.match(text, /\$factory; any other initialization reverts; the hook serves only the pool the factory initializes/);
      assert.match(text, new RegExp(`Constructor arguments: the .*PoolManager ${C.POOL_MANAGERS[chain]}, \\$owner and \\$factory\\.`));
      assert.match(text, /the launch factory \(\$factory\) may always add liquidity and collect fees with a zero-change modify/i);
    } else {
      assert.match(text.split('\n')[0], /^Deploy .*JobEightHookDeployer/);
      assert.ok(!/factory/i.test(text), 'B/C never name a factory');
      assert.ok(text.includes('Only pools whose currency0 is native ETH may be initialized with this hook; any other initialization reverts'));
      assert.ok(text.includes("In this hook, the token is the pool's non-ETH currency and its total supply is that token's totalSupply()."));
      if (type === 'C') assert.match(text, new RegExp(`only pools of native ETH and ${d.settings.token}`, 'i'));
    }
    if (type === 'A' && pair === 'imd') {
      assert.ok(text.includes(C.IMD_FEE_OPT_OUT));
      assert.match(text, /the launch token may be currency0 or currency1; handle both orders/i);
      assert.ok(!/\bETH\b/.test(text.replace(C.IMD_FEE_OPT_OUT, '')), 'IMD requests mention ETH only in their opt-out');
    }
    if (!C.activeBlocks(d).some(b => feeIds.includes(b.id))) {
      assert.ok(text.includes('Hook fee rate: 0%.'));
      assert.ok(!text.includes('Fees are always taken from'), 'zero fee request has no charged-fee footer');
    }
  });
}

test('job8 B/C deployers mine inside the constructor and forward exact arguments', () => {
  for (const type of ['B', 'C']) {
    const text = C.compose(withBlocks(['swap-fee'], type), wallet);
    const opening = text.split('\n')[0];
    assertClause(opening, /constructor[^\n]*(?:PoolManager|pool manager)[^\n]*\$owner[^\n]*(?:fee )?recipient/i, type);
    assertClause(opening, /(?:takes?|accepts?) no salt|no salt argument/i, type);
    assertClause(opening, /(?:start|begin)[^\n]*salt 0[^\n]*(?:increment|increase)/i, type);
    assertClause(opening, /CREATE2[^\n]*(?:permission|flags)/i, type);
    assertClause(opening, /(?:creat|deploy)[^\n]*hook[^\n]*(?:launch transaction|constructor)/i, type);
    assertClause(opening, /(?:pass|forward)[^\n]*(?:unchanged|without chang)/i, type);
    assertClause(opening, /neither constructor calls any other contract/i, type);
    assertClause(opening, /no deploy function[^\n]*(?:afterwards|later)/i, type);
    assertClause(opening, /hook\(\)[^\n]*(?:returns?|returning)[^\n]*address/i, type);
    assert.ok(!/off.chain|mined (?:before|in advance)|deploy\(salt\)/i.test(opening));
  }
});

test('job8 every charged fee uses the traded pair amount and rejects unreconcilable partial fills', () => {
  for (const id of feeIds) for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) {
    const d = withBlocks([id], type, pair), text = sentence(d, id), currency = C.pairCurrency(d);
    assert.match(text, /computed on the amount actually traded/);
    assert.ok(text.includes(`when the swap specifies its ${currency} amount`));
    assert.match(text, /pool fills only part of it[^.]*swap reverts rather than overpaying/);
    // Fade/volatility inherit the Swap fee's side and replace only its rate.
    const sideRule = ['fee-fade', 'fee-vol'].includes(id) ? sentence(d, 'swap-fee') : text;
    assert.match(sideRule, new RegExp(`(?:of (?:the |its )?|on the )${currency} side`));
    assert.match(text, new RegExp(`settl(?:ed|e) in ${currency}`));
    assert.ok(!text.includes(`${currency === 'IMD' ? 'ETH' : 'IMD'} side`));
  }
});

test('job8 no charged fee block leaves destinations as burn, wallet labels or unspecified treasury', () => {
  for (const id of ['swap-fee', 'fee-dir']) {
    const to = C.BY_ID[id].params.find(p => p.k === 'to');
    assert.deepEqual(to.options, ['my wallet', "IMD's treasury"]);
    for (const value of to.options) {
      const d = withBlocks([id]); d.blocks.find(b => b.id === id).p.to = value;
      const text = C.compose(d, wallet);
      assert.ok(text.includes(value === 'my wallet' ? wallet : C.IMD_TREASURY));
      assert.ok(!/send it to (?:my wallet|treasury address)|buy and burn/.test(text));
      assert.deepEqual(checkConsistency(C.body(d, wallet)), []);
    }
  }
});

test('job8 fee modifiers define one schedule and destination, including Whale, Fade and Volatility', () => {
  const bare = draft();
  assert.ok(C.blockedReason(bare, C.BY_ID['fee-size']));
  for (const base of ['swap-fee', 'fee-dir']) {
    const d = withBlocks([base, 'fee-size']);
    d.blocks.find(b => b.id === base).p.to = "IMD's treasury";
    assert.equal(C.blockedReason({ ...d, blocks: d.blocks.filter(b => b.id !== 'fee-size') }, C.BY_ID['fee-size']), null);
    assert.match(sentence(d, 'fee-size'), /using that fee block's recipient and distribution/i);
    assert.match(C.compose(d, wallet), new RegExp(C.IMD_TREASURY, 'i'));
  }
  assert.ok(!C.BY_ID['fee-fade'].params.some(p => p.k === 'end'), 'fade has no independent end rate');
  assert.ok(C.blockedReason(bare, C.BY_ID['fee-vol']));
  const d = withBlocks(['swap-fee', 'fee-fade', 'fee-vol']);
  const fade = sentence(d, 'fee-fade'), vol = sentence(d, 'fee-vol');
  assert.match(fade, /Swap fee[^.]*rate|rate[^.]*Swap fee/);
  assert.match(fade, /same (?:buy and sell |buy |sell )?swaps|swaps (?:to which|where|that) the Swap fee/i);
  assert.match(vol, /same (?:buy and sell |buy |sell )?swaps|swaps (?:to which|where|that) the Swap fee/i);
  assert.match(vol, /higher[^.]*wins|maximum[^.]*(?:fade|fading)/i);
  const split = withBlocks(['swap-fee', 'fee-size', 'lp-share', 'fee-split']);
  assert.ok(!/send it to/.test(sentence(split, 'swap-fee')), 'split replaces base destination');
  assert.ok(!/send it to/.test(sentence(split, 'fee-size')), 'split replaces whale destination');
  for (const id of ['lp-share', 'fee-split']) {
    const text = sentence(split, id);
    assert.match(text, /Swap fee[^.]*Whale fee|Whale fee[^.]*Swap fee/);
    assert.match(text, /(?:never|not|excluding)[^.]*jar[^.]*pot/i);
  }
  assert.match(sentence(split, 'fee-split'), /(?:LP shar(?:e|ing)|Share fees with LPs) first/i);
  assert.match(sentence(split, 'lp-share'), /if no liquidity is in range, the whole fee goes to the recipient/i);
  assert.deepEqual(checkConsistency(C.body(split, wallet)), []);
});

test('job8 Split replaces the old treasury destination for claims and LP-share fallbacks too', () => {
  for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) {
    const d = withBlocks(['swap-fee', 'fee-size', 'lp-share', 'fee-split'], type, pair);
    d.blocks.find(b => b.id === 'swap-fee').p.to = "IMD's treasury";
    // Use the explicit owner address as the second recipient so the discarded
    // treasury cannot accidentally look like a legitimate split destination.
    d.blocks.find(b => b.id === 'fee-split').p.b = owner;
    const text = C.compose(d, wallet);
    assert.ok(!text.includes(`Fee recipient: ${C.IMD_TREASURY}`));
    assert.equal(C.feeRecipient(d, wallet).toLowerCase(), wallet);
    assert.match(sentence(d, 'swap-fee'), /claimFees[^.]*same distribution/i);
    assert.match(sentence(d, 'lp-share'), /if no liquidity[^.]*recipient[^.]*Split/i);
    assert.deepEqual(checkConsistency(C.body(d, wallet)), []);
  }
});

test('job8 buybacks happen only by explicit call, have a price bound and retain or burn legally', () => {
  for (const type of ['A', 'B', 'C']) {
    const d = withBlocks(['jar'], type), text = sentence(d, 'jar');
    assert.match(text, /only inside buyback\(\)/i);
    assert.match(text, /never inside a swap/i);
    assert.match(text, /(?:price limit|limit price)[^.]*3%[^.]*price at the start of the call/i);
    assert.match(text, /keep[^.]*(?:could not spend|unspent)/i);
    assert.match(text, /anyone may call it again/i);
    assert.ok(!/does not revert/i.test(text));
    if (type === 'A') assert.match(text, /keep the bought tokens in the hook forever; no function can move them/i);
    if (type !== 'A') assert.match(text, /attempt to burn with the token['’]s burn\(uint256\); if it has none, or the burn call reverts, keep them in the hook forever/i);
  }
  const own = withBlocks(['own-token', 'jar']);
  assert.match(C.compose(own, wallet), /public burn\(uint256\) that burns the caller['’]s own tokens/i);
  assert.match(sentence(own, 'jar'), /burn the bought tokens/i);
});

test('job8 Prize pot uses pull payments, bounded recorded totals and clear completed periods', () => {
  const text = sentence(withBlocks(['pot'], 'B'), 'pot');
  assert.match(text, /winner[^.]*withdraw[^.]*claimPrize\(PoolId poolId\)/i);
  assert.match(text, /(?:period with no buyers|no buyers)[^.]*roll[^.]*next/i);
  assert.match(text, /draw\(PoolId poolId\)[^.]*most recent complete(?:d)? period/i);
  assert.match(text, /(?:bounded|no (?:loop|iteration))[^.]*|weighted winner[^.]*recorded totals/i);
  assert.match(text, /tx.origin/);
});

test('job8 windows start at first swap and wallet restrictions disclose identity limitations', () => {
  for (const id of ['anti-sniper', 'allowlist', 'fee-fade', 'pot']) assert.match(sentence(withBlocks([id]), id), /first swap/i, id);
  for (const id of ['anti-sniper', 'max-buy', 'cooldown', 'allowlist', 'lp-allow', 'pot']) {
    const text = sentence(withBlocks([id]), id);
    assert.match(text, /tx.origin/, id);
    assert.match(text, /several wallets or a shared relayer can defeat the limit/i, id);
  }
  for (const id of ['fee-vol', 'breaker', 'jit']) {
    const text = sentence(withBlocks([id]), id);
    assert.match(text, /seconds[^.]*block timestamp|block timestamp[^.]*seconds/i, id);
    assert.ok(!/\bblocks\b/.test(text), id);
    assert.ok(!C.BY_ID[id].params.some(p => p.k === 'blocks'), `${id} has no obsolete block-time parameter`);
  }
});

test('job8 Anti-sandwich direction, opening price and LP donation cannot be captured by a dust first swap', () => {
  const text = sentence(withBlocks(['anti-sandwich'], 'B'), 'anti-sandwich');
  assert.match(text, /Within one block, no swap executes at a better price than the block['’]s opening price in its own direction/i);
  assert.match(text, /difference[^.]*donated[^.]*liquidity providers[^.]*PoolManager['’]s donate/i);
  assert.match(text, /never to the fee recipient or the owner/i);
  assert.match(text, /chain['’]s own block number/);
  assert.match(text, /ArbSys\(address\(100\)\)\.arbBlockNumber\(\)/);
});

test('job8 Max swap size caps specified token units and lets pair-amount swaps pass this rule', () => {
  const text = sentence(withBlocks(['max-swap']), 'max-swap');
  assert.match(text, /(?:specifies|specified)[^.]*token amount|token amount[^.]*specif/i);
  assert.match(text, /pair.currency amount[^.]*not capped by this rule/i);
  assert.match(text, /token['’]s own decimals/i);
});

test('job8 liquidity is keyed by full position and own positions are exempt', () => {
  for (const id of ['lp-lock', 'lp-min', 'jit']) {
    const text = sentence(withBlocks([id]), id);
    assert.match(text, /(?:per position|each position|position key)/i, id);
    assert.match(text, /sender[^.]*tickLower[^.]*tickUpper[^.]*salt/, id);
  }
  assert.match(sentence(withBlocks(['lp-lock']), 'lp-lock'), /unlockAt\(bytes32 positionKey\)/);
  for (const id of ['lp-lock', 'lp-min', 'jit', 'lp-allow']) {
    assert.match(sentence(withBlocks([id]), id), /hook['’]s own positions[^.]*exempt/i, id);
  }
});

test('job8 Sunset is independent of stack order and preserves withdrawals', () => {
  for (const ids of [['sunset', 'jar'], ['jar', 'sunset']]) {
    const d = withBlocks(ids), text = sentence(d, 'sunset');
    assert.match(text, /every other rule in this request stops applying/);
    assert.match(text, /funds already collected stay withdrawable through their functions/i);
  }
});

test('job8 Donation rules expose an owner function only for the donor allowlist', () => {
  for (const who of C.BY_ID.donate.params.find(p => p.k === 'who').options) {
    const d = withBlocks(['donate']); d.blocks.find(b => b.id === 'donate').p.who = who;
    const text = sentence(d, 'donate'), objective = C.compose(d, wallet);
    assert.match(text, /hook['’]s own donations[^.]*always allowed/i);
    if (/allowlist/.test(who)) {
      assert.match(text, /setDonor\(PoolId poolId, address(?: account)?, bool(?: allowed)?\)/);
      assert.match(text, /tx.origin/);
      assert.match(text, /several wallets or a shared relayer can defeat the limit/i);
      assert.match(objective, /Owner [^\n]*(?:donor|donation) allowlist/);
    } else {
      assert.ok(!text.includes('setDonor('));
      assert.ok(!/^Owner .*may only:.*donor/m.test(objective));
      if (who === 'nobody') assert.match(text, /donations?[^.]*reverts?/i);
      else assert.match(text, /only the owner may donate/i);
    }
    assert.deepEqual(checkConsistency(C.body(d, wallet)), []);
  }
});

test('job8 excludes are lists and the safety check refuses every forbidden pair', () => {
  for (const def of C.BLOCKS) {
    if (def.excludes !== undefined) assert.ok(Array.isArray(def.excludes), `${def.id}.excludes`);
    for (const other of list(def.excludes)) {
      assert.ok(C.BY_ID[other], `${def.id} excludes a known block`);
      const sharedTypes = def.types.filter(t => C.BY_ID[other].types.includes(t));
      for (const type of sharedTypes) for (const pair of ['imd', 'eth']) for (const chain of [1, 4663]) {
        const d = withBlocks([def.id, other], type, pair, chain), label = `${def.id}+${other}/${type}/${pair}/${chain}`;
        assert.ok(checkConsistency(C.body(d, wallet)).some(f => f.code === 'contradiction' || f.code === 'dependency' || /unavailable|version|disabled/.test(f.code)), `${label} reached payment`);
        const issues = C.validate(d, wallet);
        assert.ok(issues.length, `${label} escaped form validation`);
      }
    }
  }
  for (const id of ['fee-vol', 'breaker', 'anti-sandwich', 'oracle', 'limit', 'lp-fee']) assert.ok(list(C.BY_ID.curve.excludes).includes(id), `Stable curve excludes ${id}`);
  assert.ok(list(C.BY_ID.limit.excludes).includes('async'));
  assert.ok(list(C.BY_ID['lp-fee'].excludes).includes('pool-rules'));
  assert.deepEqual(C.BY_ID.yield.types, ['B', 'C']);
  for (const id of ['lp-lock', 'jit', 'lp-allow', 'lp-min']) assert.ok(list(C.BY_ID.yield.excludes).includes(id));
});

test('job8 Batch auctions and unverified Yield stay unavailable on both deploy chains', () => {
  for (const chain of [1, 4663]) for (const type of ['A', 'B', 'C']) {
    const d = draft(type, 'eth', chain);
    assert.ok(C.blockedReason(d, C.BY_ID.async));
    if (C.BY_ID.async.types.includes(type)) assert.match(C.blockedReason(d, C.BY_ID.async), /not in this version|version 1/i);
    assert.ok(C.blockedReason(d, C.BY_ID.yield));
    assert.equal(C.addBlock(d, 'async'), d);
    assert.equal(C.addBlock(d, 'yield'), d);
  }
  const text = sentence(withBlocks(['lp-fee'], 'C'), 'lp-fee');
  assert.match(text, /dynamic.fee flag \(fee 0x800000\)/i);
  assert.match(text, /fee moves linearly with the absolute price move over the last \d+ seconds/i);
});

test('job8 B/C pool-dependent views explicitly take PoolId', () => {
  for (const type of ['B', 'C']) {
    for (const id of ['anti-sniper', 'max-buy', 'cooldown', 'breaker', 'fee-fade', 'fee-vol', 'jar', 'pot', 'oracle', 'lp-fee']) {
      const text = sentence(withBlocks([id], type), id);
      assert.match(text, /PoolId/, `${id}/${type}`);
      for (const fn of C.BY_ID[id].view ?? []) assert.match(fn.sig, /PoolId/, `${id}: ${fn.sig}`);
    }
  }
});

test('job8 Describe mode does not compose a hidden block stack and preserves described owner functions', () => {
  const d = withBlocks(['swap-fee', 'pause', 'jar']);
  d.mode = 'prompt'; d.prompt = 'The owner may pause and unpause swaps through pause() and unpause(). No hook fee.';
  const text = C.compose(d, wallet);
  assert.ok(!text.includes('Take 1.0%'));
  assert.ok(!text.includes('buyback()'));
  assert.ok(!/^\d+\. /m.test(text), 'hidden numbered rules are absent');
  assert.ok(!/^No owner functions/m.test(text));
  assert.ok(text.includes(d.prompt));
  assert.deepEqual(checkConsistency(C.body(d, wallet)), []);
  const blocks = withBlocks(['pause', 'custom']); blocks.prompt = 'The owner can pause swaps.';
  blocks.blocks.find(b => b.id === 'custom').p.text = 'Never pause swaps.';
  const numbered = C.compose(blocks, wallet);
  assert.match(numbered, /numbered (?:block )?rule[^.]*wins[^.]*(?:Custom rule|custom rule|description)|Custom rule[^.]*numbered[^.]*wins/i);
});

test('job8 zero-fee defaults distinguish written percentage limits from complete positive flat fees', () => {
  for (const mode of ['prompt', 'custom']) for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) {
    const d = mode === 'custom' ? withBlocks(['custom'], type, pair) : draft(type, pair);
    if (mode === 'prompt') d.mode = 'prompt';
    const setWords = words => { if (mode === 'custom') d.blocks.find(b => b.id === 'custom').p.text = words; else d.prompt = words; };
    setWords('Each wallet may buy at most 1% of the total supply per buy. No owner functions.');
    assert.ok(C.compose(d, wallet).includes('Hook fee rate: 0%.'), `${mode}/${type}/${pair}: a percentage limit is not a fee`);
    assert.deepEqual(checkConsistency(C.body(d, wallet)), []);
    const currency = C.pairCurrency(d);
    setWords(`Charge a flat fee of 1 ${currency} per swap, settled in ${currency} and send it to ${wallet}. No owner functions.`);
    assert.ok(!C.compose(d, wallet).includes('Hook fee rate: 0%.'), `${mode}/${type}/${pair}: a written flat fee must not get a contradictory zero default`);
    assert.deepEqual(checkConsistency(C.body(d, wallet)), []);
  }
});

test('job8 percentage arithmetic and the own-token supply have explicit bounds', () => {
  assert.match(C.compose(withBlocks(['swap-fee', 'anti-sniper']), wallet), /mulDiv/);
  const supply = C.BY_ID['own-token'].params.find(p => p.k === 'supply');
  assert.equal(supply.max, 1_000_000_000_000);
  const d = withBlocks(['own-token']); d.blocks[0].p.supply = 1_000_000_000_001;
  assert.ok(C.validate(d, wallet).some(i => i.field.includes('supply')));
});

test('job8 off-grid rates cannot round a sub-5% draft into a request charging over 5%', () => {
  const d = withBlocks(['swap-fee', 'fee-size', 'jar', 'pot']);
  for (const b of d.blocks) {
    if (['swap-fee', 'jar', 'pot'].includes(b.id)) b.p.rate = 1.26;
    if (b.id === 'fee-size') b.p.extra = 1.2;
  }
  assert.equal(C.rateTotal(d), 4.98);
  const renderedRates = ['swap-fee', 'fee-size', 'jar', 'pot'].map(id => Number(/([\d.]+)%/.exec(sentence(d, id))[1]));
  assert.equal(Number(renderedRates.reduce((sum, rate) => sum + rate, 0).toFixed(2)), 5.1, 'this is the precise rounding reproduction');
  const issues = C.validate(d, wallet);
  for (const id of ['swap-fee', 'jar', 'pot']) assert.ok(issues.some(i => i.field === `block:${d.blocks.findIndex(b => b.id === id)}:rate`), `${id} rejects its off-grid rate`);
  for (const b of d.blocks) if (['swap-fee', 'jar', 'pot'].includes(b.id)) b.p.rate = 1.2;
  assert.equal(C.rateTotal(d), 4.8);
  assert.deepEqual(C.validate(d, wallet), []);
  assert.deepEqual(['swap-fee', 'fee-size', 'jar', 'pot'].map(id => Number(/([\d.]+)%/.exec(sentence(d, id))[1])), [1.2, 1.2, 1.2, 1.2]);
});

test('job8 consistency mutations catch mismatched fee currency, incomplete recipients and unnamed dependencies', () => {
  const d = withBlocks(['swap-fee']), input = C.body(d, wallet);
  for (const [from, to, code] of [
    ['of the IMD side', 'of the ETH side', 'fee-side'],
    ['settled in IMD', 'settled in ETH', 'fee-settlement'],
    [`send it to ${wallet}`, 'send it to my wallet', 'recipient'],
    [`send it to ${wallet}`, 'send it to 0x1234', 'recipient'],
  ]) {
    assert.ok(input.objective.includes(from), from);
    const corrupted = { ...input, objective: input.objective.replace(from, to) };
    assert.ok(checkConsistency(corrupted).some(f => f.code === code || (code === 'recipient' && f.code === 'address')), to);
  }
  for (const words of ['Use Chainlink VRF for randomness.', 'Use another pool for conversion.', 'Use Aave to lend the idle tokens.', 'Read the external price feed.']) {
    const custom = withBlocks(['custom']); custom.blocks.at(-1).p.text = words;
    assert.ok(checkConsistency(C.body(custom, wallet)).some(f => f.code === 'dependency'), words);
  }
});

test('job8 fixed facts honor positive opt-outs and detect fee conversion, owner and allocation conflicts', () => {
  const d = withBlocks(['swap-fee']), input = C.body(d, wallet);
  const conversion = [{ id: 'hook_fee', state: 'fixed', label: 'The IMD-side hook fee is sold for ETH in the same swap unless told otherwise.' }];
  assert.deepEqual(fixedFactConflicts(input, conversion, wallet), []);
  assert.equal(fixedFactConflicts({ ...input, objective: input.objective.replace(C.IMD_FEE_OPT_OUT, 'retain the fee') }, conversion, wallet).length, 1);
  const admin = [{ id: 'admin', state: 'fixed', label: 'No owner functions are permitted by default.' }];
  const pause = withBlocks(['pause']);
  assert.equal(fixedFactConflicts(C.body(pause, wallet), admin, wallet).length, 1);
  pause.prompt = 'Do not opt out of fixed fact admin.';
  assert.equal(fixedFactConflicts(C.body(pause, wallet), admin, wallet).length, 1);
  pause.prompt = 'Opt out of fixed fact admin.';
  assert.deepEqual(fixedFactConflicts(C.body(pause, wallet), admin, wallet), []);
  const split = [{ id: 'token_split', state: 'fixed', label: 'Split: 10% to the swarm, the other 90% is yours: 80% into the pool, the rest to your wallet.' }];
  assert.equal(fixedFactConflicts(input, split, wallet).length, 1);
  const notFixed = conversion.map(f => ({ ...f, state: 'stated' }));
  assert.deepEqual(fixedFactConflicts({ ...input, objective: input.objective.replace(C.IMD_FEE_OPT_OUT, '') }, notFixed, wallet), []);
});

test('job8 a position lock cannot coexist with an unconditional withdrawal promise', () => {
  for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) for (const chain of [1, 4663]) {
    for (const id of ['pause', 'breaker', 'hours']) {
      const input = C.body(withBlocks(['lp-lock', id], type, pair, chain), wallet);
      assert.ok(checkConsistency(input).some(f => f.code === 'contradiction'), `lp-lock+${id}/${type}/${pair}/${chain}`);
    }
  }
});

test('job8 Custom rule fixed-fact opt-outs work only as positive sentences', () => {
  const admin = [{ id: 'admin', state: 'fixed', label: 'No owner functions are permitted by default.' }];
  const d = withBlocks(['pause', 'custom']);
  d.blocks.at(-1).p.text = 'Do not opt out of fixed fact admin.';
  assert.equal(fixedFactConflicts(C.body(d, wallet), admin, wallet).length, 1);
  d.blocks.at(-1).p.text = 'Opt out of fixed fact admin.';
  assert.deepEqual(fixedFactConflicts(C.body(d, wallet), admin, wallet), []);
  const words = draft(); words.mode = 'prompt'; words.prompt = 'The owner may pause swaps through pause() and resume through unpause().';
  assert.equal(fixedFactConflicts(C.body(words, wallet), admin, wallet).length, 1, 'described owner powers conflict with a fixed denial');
});
