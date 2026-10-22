import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';
import { writtenFeeRates, writtenFeeTargets } from '../src/lib/writtenFees.ts';

// Offline fixtures: deliberately distinct payer and owner, never live accounts/signatures.
const payer = '0x1111111111111111111111111111111111111111';
const owner = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const contexts = ['A', 'B', 'C'].flatMap(type => ['eth', 'imd'].flatMap(pair => [1, 4663].flatMap(chain => ['prompt', 'custom'].map(mode => ({ type, pair, chain, mode })))));
function draft({ type = 'B', pair = 'eth', chain = 4663, mode = 'prompt' } = {}, text = 'Observe swaps.') {
  const d = C.newDraft(); d.type = type; d.mode = mode === 'custom' ? 'blocks' : mode;
  d.settings = { ...d.settings, pair, chain, owner, pool: 50, hname: 'PondHook', token: '0x2222222222222222222222222222222222222222' };
  if (mode === 'custom') d.blocks.push({ id: 'custom', p: { text } }); else d.prompt = text;
  return d;
}
function replaceWritten(input, original, replacement) {
  return { ...input, objective: input.objective.replace(original, replacement) };
}

test('trade introductions and commas keep unknown receiving payees unresolved', () => {
  for (const context of contexts) for (const prefix of ['On every swap, ', 'For every swap, ', 'From each trade, ', 'After each buy, ', 'On every swap ', 'Observe swaps, then ']) {
    for (const verb of ['receives', 'accrues', 'gets', 'earns', 'keeps', 'collects', 'is paid']) {
      const currency = context.type === 'A' && context.pair === 'imd' ? 'IMD' : 'ETH';
      const text = `${prefix}Alice ${verb} 1% of the ${currency} side.`;
      assert.ok(writtenFeeTargets(text).includes('Alice'), text);
      assert.deepEqual(writtenFeeRates(text), { buy: 1, sell: prefix.includes('buy') ? 0 : 1 }, text);
      const d = draft(context, text), input = C.body(d, payer);
      assert.equal(C.feeRecipient(d, payer), 'Alice', text);
      assert.ok(input.objective.includes('Fee recipient: Alice.'), text);
      assert.ok(checkConsistency(input).some(f => f.code === 'recipient'), text);
      assert.ok(!input.objective.includes(`Fee recipient: ${payer}.`), text);
      const resolved = draft(context, text.replace('Alice', owner));
      assert.equal(C.feeRecipient(resolved, payer), owner);
      assert.deepEqual(checkConsistency(C.body(resolved, payer)), [], text);
    }
  }
  for (const text of ['For every swap, Alice receives 1%.', 'From each trade, Alice collects 1%.']) {
    assert.deepEqual(writtenFeeTargets(text), ['Alice'], text);
    assert.ok(checkConsistency(C.body(draft({}, text), payer)).some(f => f.code === 'recipient'), text);
  }
});

for (const context of contexts) test(`written fee regressions ${Object.values(context).join('/')}`, () => {
  const currency = context.type === 'A' && context.pair === 'imd' ? 'IMD' : 'ETH';
  for (const text of ['1% of every swap goes to the owner.', 'Add a 2% tax on sells for the owner.', 'Skim 1% of every swap for the owner.', 'Keep 1% of each swap for the owner.']) {
    const d = draft(context, text), input = C.body(d, payer);
    assert.ok(!input.objective.includes('Hook fee rate: 0%.'), text);
    assert.ok(input.objective.includes(`Fees are always taken from the ${currency} (pair currency) side`));
    assert.ok(input.objective.includes(`settled in ${currency}`));
    assert.equal(C.feeRecipient(d, payer), owner);
    assert.ok(input.objective.includes(`Fee recipient: ${owner}.`));
    assert.deepEqual(C.validate(d, payer), []);
    assert.deepEqual(checkConsistency(input), [], text);
    assert.ok(checkConsistency({ ...input, objective: input.objective + '\nHook fee rate: 0%.' }).some(f => f.code === 'contradiction'), 'independent zero-footer mutation');
    const overCap = replaceWritten(input, text, text.replace(/\d+%/, '6%'));
    assert.ok(checkConsistency(overCap).some(f => f.code === 'rates'), 'written cap applies without fee vocabulary');
    const forbidden = { ...input, objective: input.objective + '\nCustom rule: <custom>No hook fees.</custom>' };
    assert.ok(checkConsistency(forbidden).some(f => f.code === 'contradiction'));
  }
  const payable = `Charge a 1 percent hook fee on the ${currency} side of every buy, settled in ${currency} and payable to ${C.IMD_TREASURY}. No owner functions.`;
  const d = draft(context, payable), input = C.body(d, payer);
  assert.equal(C.feeRecipient(d, payer), C.IMD_TREASURY);
  assert.deepEqual(checkConsistency(input), []);
  if (context.type !== 'A') assert.ok(input.objective.split('\n')[0].includes(`fee recipient ${C.IMD_TREASURY}, takes no salt argument`));
  const wrongRecipient = { ...input, objective: input.objective.replaceAll(C.IMD_TREASURY, payer).replace(`payable to ${payer}`, `payable to ${C.IMD_TREASURY}`) };
  assert.ok(checkConsistency(wrongRecipient).some(f => f.code === 'fee-recipient'), 'written destination survives independent footer/constructor mutation');
  assert.ok(checkConsistency(replaceWritten(input, `payable to ${C.IMD_TREASURY}`, 'payable to an unnamed treasury')).some(f => /recipient/.test(f.code)));

  for (const trigger of ['1 percent', '30 basis points', `1 ${currency}`, '6 percent']) {
    const vague = `When the pool price moves by ${trigger} over 30 seconds, charge a small hook fee on the ${currency} side of every buy, settled in ${currency} and send it to ${C.IMD_TREASURY}. No owner functions.`;
    const bad = C.body(draft(context, vague), payer);
    assert.ok(!bad.objective.includes('Hook fee rate: 0%.'));
    assert.ok(checkConsistency(bad).some(f => f.code === 'fee-rate' && f.sentence.includes('small hook fee')), trigger);
    const precise = replaceWritten(bad, 'a small hook fee', 'a 0.3 percent hook fee');
    assert.deepEqual(checkConsistency(precise), [], 'trigger and rate are separate');
    assert.ok(checkConsistency(replaceWritten(precise, 'a 0.3 percent hook fee', 'a small hook fee')).some(f => f.code === 'fee-rate'));
  }
  if (context.type === 'A' && context.pair === 'imd') assert.ok(!/\bETH\b/.test(input.objective.replace(C.IMD_FEE_OPT_OUT, '')));
});

test('the cap combines block and written charges at both validation boundaries, and respects hidden blocks', () => {
  for (const context of contexts) {
    const d = draft(context, 'Also charge a 4% fee on every swap for the owner.');
    d.settings.owner = payer;
    const base = { ...C.entry('swap-fee'), p: { ...C.entry('swap-fee').p, rate: 3 } };
    d.blocks.push(base);
    const active = context.mode === 'custom';
    assert.equal(C.rateTotal(d), active ? 7 : 4);
    assert.equal(C.validate(d, payer).some(f => f.field === 'rates'), active);
    assert.equal(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'), active);
    if (!active) continue;
    const input = C.body(d, payer), lower = input.objective.replace('Also charge a 4%', 'Also charge a 2%');
    assert.deepEqual(checkConsistency({ ...input, objective: lower }), [], 'exactly 5%');
    assert.ok(checkConsistency({ ...input, objective: lower.replace('Also charge a 2%', 'Also charge a 2.01%') }).some(f => f.code === 'rates'), '5.01%');
    assert.ok(checkConsistency({ ...input, objective: lower.replace('Also charge a 2%', 'Also charge a 2.0001%') }).some(f => f.code === 'rates'), 'written precision cannot round 5.0001% down to 5%');
    d.blocks.find(b => b.id === 'custom').p.text = 'Also charge a 2.0001% fee on every swap for the owner.';
    assert.ok(C.validate(d, payer).some(f => f.field === 'rates'));
    d.blocks.find(b => b.id === 'custom').p.text = 'Also charge a 2% fee on every swap for the owner.';
    assert.equal(C.rateTotal(d), 5);
    assert.deepEqual(C.validate(d, payer), []);
  }
});

test('limits, price triggers and explicit fee prohibitions keep a zero default without a charge', () => {
  for (const context of contexts) for (const text of ['Each wallet may buy at most 1% of supply. No owner functions.', 'Observe when the pool price moves by 6 percent over 30 seconds. No owner functions.', 'Keep a record of every swap. No hook fees.', 'No hook fees. Observe swaps.']) {
    const input = C.body(draft(context, text), payer);
    assert.ok(input.objective.includes('Hook fee rate: 0%.'), text);
    assert.deepEqual(checkConsistency(input), [], text);
  }
});
