import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLOCKS, BY_ID, IMD_TREASURY, IMD_FEE_OPT_OUT, newDraft, entry, body, compose, context, pairCurrency, sentenceOf, normalizeDraft, blockedReason } from '../src/lib/compose.ts';
import { checkConsistency, fixedFactConflicts, KNOWN_QUESTIONS } from '../src/lib/safety.ts';
const config = JSON.parse(readFileSync(new URL('../public/site-config.json', import.meta.url)));
const wallet = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
function one(def, type, pair, chain) {
  const d = newDraft(); d.type = type;
  d.settings = { ...d.settings, chain, pair, pool: 50, hname: 'SafetyHook', token: config.chains.find(c => c.id === chain).imdAddress, tsym: 'IMD' };
  if (def.requires) d.blocks.push(entry(def.requires));
  if (def.id === 'own-token') d.blocks = [entry(def.id)];
  else if (def.id !== 'token') d.blocks.push(entry(def.id));
  if (def.id === 'fee-split') d.blocks.at(-1).p.b = IMD_TREASURY;
  if (def.id === 'custom') d.blocks.at(-1).p.text = 'Observe swaps without changing them.';
  return d;
}
// Each case inspects real composed output, rather than duplicating the renderer.
for (const def of BLOCKS) for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) for (const chain of [1, 4663]) {
  test(`composed ${def.id}/${type}/${pair}/${chain}: currency, recipients, dependencies and consistency`, () => {
    const d = one(def, type, pair, chain), input = body(d, wallet), findings = checkConsistency(input);
    const active = def.types.includes(type);
    if (def.id === 'yield' && active) {
      assert.ok(findings.some(f => f.code === 'dependency' && f.sentence.includes('ReHypothecationHook')));
      assert.equal(blockedReason({ ...d, blocks: d.blocks.filter(b => b.id !== 'yield') }, def), 'NO VERIFIED DEPLOYMENT');
      return;
    }
    assert.deepEqual(findings, []);
    if (!active && !['token', 'own-token'].includes(def.id)) assert.ok(!input.objective.includes(def.sentence.split('{')[0]));
    if (!active) return;
    const sentence = sentenceOf(d.blocks.find(b => b.id === def.id), context(d, wallet));
    assert.ok(input.objective.includes(sentence));
    if (/\{@pair\}/.test(def.sentence)) {
      assert.ok(sentence.includes(pairCurrency(d)));
      assert.ok(!sentence.includes(`${pairCurrency(d) === 'IMD' ? 'ETH' : 'IMD'} side`));
      // Independently corrupt the output to reproduce launch 2 for every fee template.
      const wrong = pairCurrency(d) === 'IMD' ? 'ETH' : 'IMD';
      if (/\b(?:settled|settle) in (ETH|IMD)\b/.test(sentence)) {
        const corrupted = input.objective.replace(sentence, sentence.replace(/\b(settled|settle) in (ETH|IMD)\b/, `$1 in ${wrong}`));
        assert.ok(checkConsistency({ ...input, objective: corrupted }).some(f => f.code === 'fee-settlement'), sentence);
      }
    }
    if (type === 'A' && pair === 'imd') assert.ok(input.objective.includes(IMD_FEE_OPT_OUT));
    else assert.ok(!input.objective.includes(IMD_FEE_OPT_OUT));
  });
}
test('all fee recipient and buyback choices resolve to paying wallet, IMD treasury or same-pool burn', () => {
  for (const id of ['swap-fee', 'fee-dir', 'jar']) for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) {
    const def = BY_ID[id], param = def.params.find(p => p.k === 'to' || p.k === 'act');
    for (const value of param.options) {
      const d = one(def, type, pair, 1); d.blocks.at(-1).p[param.k] = value;
      const input = body(d, wallet);
      assert.deepEqual(checkConsistency(input), [], `${id}/${type}/${pair}/${value}`);
      if (value.includes('treasury')) assert.ok(input.objective.includes(IMD_TREASURY));
      if (value === 'my wallet') assert.ok(input.objective.includes(`send it to ${wallet}`));
      if (value.startsWith('burn') && id !== 'jar') assert.ok(input.objective.includes('from this pool and burn the bought tokens'));
      assert.ok(!input.objective.includes('to my wallet'));
    }
  }
});
test('known launch 2 question is a live rule and catches the contradictory historical output', () => {
  assert.equal(KNOWN_QUESTIONS[0].launch, 2);
  const input = body(one(BY_ID['swap-fee'], 'A', 'imd', 1), wallet);
  const noOptOut = { ...input, objective: input.objective.replace(`Keep every hook fee in IMD: ${IMD_FEE_OPT_OUT}.\n`, '') };
  assert.ok(checkConsistency(noOptOut).some(f => f.code === KNOWN_QUESTIONS[0].id));
  const broken = { ...input, objective: input.objective.replace('of the IMD side', 'of the ETH side').replace('settled in IMD', 'settled in ETH') };
  assert.deepEqual(checkConsistency(broken).filter(f => ['fee-side', 'fee-settlement'].includes(f.code)).map(f => f.code), ['fee-side', 'fee-settlement']);
});
test('unresolved, shortened and zero recipients fail before the free check or launch', () => {
  const d = one(BY_ID['swap-fee'], 'A', 'imd', 1);
  assert.ok(checkConsistency(body(d)).some(f => f.code === 'recipient'));
  for (const target of ['treasury address', 'my wallet', '0x1234', '0x' + '0'.repeat(40)]) {
    const input = body(d, wallet); input.objective = input.objective.replace(`send it to ${wallet}`, `send it to ${target}`);
    assert.ok(checkConsistency(input).some(f => f.code === 'recipient' || f.code === 'address'), target);
  }
});
test('external services and conversion pools need a deploy-chain address; forbidding other pools passes', () => {
  const input = body(one(BY_ID.custom, 'A', 'imd', 4663), wallet);
  for (const dependency of ['Use Chainlink VRF for randomness.', 'Use another pool for conversion.', 'Read the external price feed.', 'Use Aave to lend the idle tokens.']) {
    assert.ok(checkConsistency({ ...input, objective: input.objective.replace('Observe swaps without changing them.', dependency) }).some(f => f.code === 'dependency'), dependency);
  }
  assert.deepEqual(checkConsistency(input), []);
  assert.deepEqual(checkConsistency({ ...input, objective: input.objective.replace('Observe swaps without changing them.', 'Do not use Chainlink VRF. Never use another pool.') }), []);
});
test('contradictions are reported with both sentences and corrected combinations pass', () => {
  for (const ids of [['swap-fee','fee-dir'], ['lp-fee','pool-rules'], ['swap-fee','lp-share','donate'], ['max-buy','pause'], ['open-at','sunset']]) {
    const d = one(BY_ID.cooldown, 'B', 'eth', 1); d.blocks = ids.map(entry);
    if (ids.includes('donate')) d.blocks.find(b => b.id === 'donate').p.who = 'nobody';
    if (ids.includes('sunset')) d.blocks.find(b => b.id === 'sunset').p.when = '2026-01-01 00:00';
    const f = checkConsistency(body(d, wallet)); assert.ok(f.some(f => f.code === 'contradiction'), ids.join('+'));
  }
  const d = one(BY_ID['swap-fee'], 'A', 'imd', 1); d.prompt = 'No hook fees.';
  assert.ok(checkConsistency(body(d, wallet)).some(f => f.code === 'contradiction'));
  d.prompt = ''; d.blocks.push(entry('fee-fade'), entry('fee-vol'), entry('fee-split'), entry('lp-share')); d.blocks.at(-2).p.b = IMD_TREASURY;
  assert.deepEqual(checkConsistency(body(d, wallet)), []);
  for (const who of ['only the owner', 'only allowlisted addresses', 'nobody']) {
    const donation = one(BY_ID['lp-share'], 'A', 'imd', 1); donation.blocks.push({ id: 'donate', p: { who } });
    assert.ok(checkConsistency(body(donation, wallet)).some(f => f.code === 'contradiction'), who);
  }
  for (const pause of ['pause', 'breaker']) {
    const locked = one(BY_ID['lp-lock'], 'A', 'imd', 1); locked.blocks.push(entry(pause));
    assert.ok(checkConsistency(body(locked, wallet)).some(f => f.code === 'contradiction'), pause);
  }
});
test('fixed IMD fee conversion is shown as a conflict until the request explicitly opts out', () => {
  const input = body(one(BY_ID['swap-fee'], 'A', 'imd', 1), wallet);
  const facts = [{ id: 'hook_fee', state: 'fixed', label: 'Hook fee: the IMD-side fee is sold for ETH in the same swap unless told otherwise.' }];
  const noOptOut = { ...input, objective: input.objective.replace(IMD_FEE_OPT_OUT, 'retain the fee') };
  assert.equal(fixedFactConflicts(noOptOut, facts).length, 1);
  assert.deepEqual(fixedFactConflicts(input, facts), []);
  assert.deepEqual(fixedFactConflicts(noOptOut, [{ ...facts[0], state: 'stated' }]), []);
  assert.deepEqual(fixedFactConflicts({ ...noOptOut, pairWith: 'eth' }, facts), []);
});
test('fixed-fact opt-outs must be positive sentences, and custom owner rules cannot contradict the footer', () => {
  const d = one(BY_ID.pause, 'A', 'imd', 1), facts = [{ id: 'admin', state: 'fixed', label: 'No owner functions are permitted by default.' }];
  d.prompt = 'Do not opt out of fixed fact admin.';
  assert.equal(fixedFactConflicts(body(d, wallet), facts).length, 1);
  d.prompt = 'Opt out of fixed fact admin.';
  assert.deepEqual(fixedFactConflicts(body(d, wallet), facts), []);
  d.blocks = [entry('token')]; d.prompt = 'The owner may pause swaps.';
  assert.ok(checkConsistency(body(d, wallet)).some(f => f.code === 'contradiction'));
  d.prompt = `Use another pool at ${config.chains[0].imdAddress}.`;
  assert.ok(checkConsistency(body(d, wallet)).some(f => f.code === 'contradiction'));
});
test('saved treasury choices migrate to the owner-approved IMD treasury without a new field', () => {
  const d = normalizeDraft({ blocks: [{ id: 'swap-fee', p: { to: 'treasury address' } }], settings: { chain: 1, pool: 50 } });
  assert.equal(d.blocks[1].p.to, "IMD's treasury");
  assert.ok(compose(d, wallet).includes(IMD_TREASURY));
});
