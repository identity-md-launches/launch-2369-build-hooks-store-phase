import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';

// Offline fixtures only. No account is connected and no request is sent.
const payer = '0x1111111111111111111111111111111111111111';
const owner = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const token = '0x2222222222222222222222222222222222222222';
function draft(type = 'B', mode = 'prompt', pair = 'eth', chain = 4663) {
  const d = C.newDraft(); d.type = type; d.mode = mode === 'custom' ? 'blocks' : mode;
  d.settings = { ...d.settings, chain, pair, pool: 50, hname: 'PondHook', owner, token };
  if (mode === 'custom') d.blocks.push(C.entry('custom'));
  return d;
}
function words(d, text) {
  if (d.blocks.some(b => b.id === 'custom')) d.blocks.find(b => b.id === 'custom').p.text = text;
  else d.prompt = text;
  return d;
}
const contexts = () => ['A', 'B', 'C'].flatMap(type => ['imd', 'eth'].flatMap(pair => [1, 4663].flatMap(chain => ['prompt', 'custom'].map(mode => ({ type, pair, chain, mode })))));

test('written percent, basis points, word fractions and flat fees never get a zero default, in either editor and every launch context', () => {
  for (const { type, pair, chain, mode } of contexts()) {
    const d = draft(type, mode, pair, chain), currency = C.pairCurrency(d);
    for (const amount of ['1%', '1 percent', '30 basis points', '30 bps', 'half a percent', 'one percent', '0.3 per cent', `1 ${currency}`]) {
      words(d, `Charge a fee of ${amount} on every swap and send it to ${payer}. No owner functions.`);
      const input = C.body(d, payer), text = input.objective;
      assert.ok(!text.includes('Hook fee rate: 0%.'), `${mode}/${type}/${pair}/${chain}/${amount}`);
      assert.ok(text.includes(`Fees are always taken from the ${currency} (pair currency) side`));
      assert.ok(text.includes(`settled in ${currency}`));
      assert.ok(text.includes(`Fee recipient: ${payer}.`));
      assert.ok(text.includes('computed on the amount actually traded'));
      assert.ok(text.includes(`when the swap specifies its ${currency} amount and the pool fills only part of it, the swap reverts`));
      assert.deepEqual(C.validate(d, payer), []);
      assert.deepEqual(checkConsistency(input), [], `${mode}/${type}/${amount}`);
      const corrupted = { ...input, objective: text + '\nHook fee rate: 0%.' };
      assert.ok(checkConsistency(corrupted).some(f => f.code === 'contradiction' && f.sentence.includes('Hook fee rate: 0%.')), amount);
      if (type === 'A' && pair === 'imd') assert.ok(!/\bETH\b/.test(text.replace(C.IMD_FEE_OPT_OUT, '')));
    }
  }
});

test('uncertain written fee amounts block the actual body; protection percentages and explicit no-fee rules retain the zero default', () => {
  for (const mode of ['prompt', 'custom']) {
    const d = draft('B', mode);
    for (const prose of ['Charge a small hook fee on every swap.', 'Take a reasonable fee for the owner.', 'Use a swap fee.', 'Charge an unspecified number of basis points as a swap fee.']) {
      words(d, prose);
      assert.ok(!C.compose(d, payer).includes('Hook fee rate: 0%.'));
      assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'fee-rate'), prose);
    }
    for (const prose of ['Each wallet may buy at most 1% of supply. No owner functions.', 'No hook fee. Observe swaps.', 'Do not charge any fees.', 'Observe swaps without charging fees.']) {
      words(d, prose);
      assert.ok(C.compose(d, payer).includes('Hook fee rate: 0%.'));
      assert.deepEqual(checkConsistency(C.body(d, payer)), [], prose);
    }
  }
  for (const id of ['lp-fee', 'pool-rules']) {
    const d = words(draft('B', 'blocks'), 'No hook fees.'); d.blocks.push(C.entry(id));
    assert.deepEqual(checkConsistency(C.body(d, payer)), [], 'LP fees and pool fee tiers do not contradict zero hook fees');
  }
});

test('generated defaults complete a minimal written fee and the final-body guard rejects missing fee facts', () => {
  const d = words(draft(), 'Take 1% of every swap as a fee.');
  const input = C.body(d, payer);
  assert.deepEqual(checkConsistency(input), []);
  const incomplete = { ...input, objective: input.objective.split('\n').filter(line => !line.startsWith('Fees are always taken from')).join('\n') };
  const codes = checkConsistency(incomplete).map(f => f.code);
  for (const code of ['fee-side', 'fee-settlement', 'recipient']) assert.ok(codes.includes(code), code);
});

test('written fee recipients are forwarded unchanged by B/C deployers and compared against the exact body', () => {
  for (const type of ['A', 'B', 'C']) for (const mode of ['prompt', 'custom']) {
    const d = draft(type, mode), currency = C.pairCurrency(d);
    for (const recipient of [C.IMD_TREASURY, owner, payer]) {
      words(d, `Take 1% of the ${currency} side of every buy as a hook fee, settled in ${currency} and send it to ${recipient}. No owner functions.`);
      const input = C.body(d, payer);
      assert.equal(C.feeRecipient(d, payer), recipient);
      assert.ok(input.objective.includes(`Fee recipient: ${recipient}.`));
      assert.deepEqual(checkConsistency(input), []);
      if (type !== 'A') {
        const opening = input.objective.split('\n')[0];
        assert.ok(opening.includes(`fee recipient ${recipient}, takes no salt argument`));
        assert.ok(!/factory/i.test(input.objective));
        if (recipient !== payer) {
          const mutated = { ...input, objective: input.objective.replace(`fee recipient ${recipient},`, `fee recipient ${payer},`) };
          assert.ok(checkConsistency(mutated).some(f => f.code === 'fee-recipient'));
        }
      }
    }
    words(d, 'Take half a percent of every swap as a fee for the owner.');
    assert.equal(C.feeRecipient(d, payer), owner, 'owner and paying wallet are distinct');
    assert.deepEqual(checkConsistency(C.body(d, payer)), []);
    words(d, `Take 1% of every swap as a fee and send it to ${payer}. Send the fees to ${C.IMD_TREASURY}.`);
    assert.ok(checkConsistency(C.body(d, payer)).some(f => /recipient/.test(f.code)), 'two destinations must block');
    words(d, `Take 1% of every swap as a fee and send it to ${C.IMD_TREASURY}.`);
    d.mode = 'blocks'; d.blocks.push(C.entry('swap-fee'));
    assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'fee-recipient'), 'written destination cannot override the structured destination silently');
  }
});

test('B/C written pool-dependent functions require a pool argument, in Describe it and Custom rule', () => {
  for (const type of ['B', 'C']) for (const mode of ['prompt', 'custom']) {
    const d = draft(type, mode);
    for (const [bad, good] of [
      ['twap(uint32 secondsAgo)', 'twap(PoolId poolId, uint32 secondsAgo)'],
      ['pause()', 'pause(PoolId poolId)'], ['unpause()', 'unpause(PoolId poolId)'], ['paused()', 'paused(PoolId poolId)'],
      ['boughtBy(address wallet)', 'boughtBy(PoolId poolId, address wallet)'],
      ['haltedUntil()', 'haltedUntil(bytes32 poolId)'],
    ]) {
      words(d, `Expose ${bad} for this pool.`);
      const finding = checkConsistency(C.body(d, payer)).find(f => f.code === 'pool-signature');
      assert.ok(finding?.sentence.includes(bad), `${mode}/${type}/${bad}`);
      words(d, `Expose ${good} for this pool.`);
      assert.deepEqual(checkConsistency(C.body(d, payer)), []);
    }
  }
});

test('a written fee and its destination may span description and Custom rule without defaulting the constructor to the payer', () => {
  for (const type of ['B', 'C']) for (const reversed of [false, true]) {
    const d = draft(type, 'custom');
    const charge = 'Charge a 1 percent hook fee on every buy.';
    const destination = `Send the fee to ${C.IMD_TREASURY}. No owner functions.`;
    d.prompt = reversed ? destination : charge;
    d.blocks.find(b => b.id === 'custom').p.text = reversed ? charge : destination;
    const input = C.body(d, payer);
    assert.equal(C.feeRecipient(d, payer), C.IMD_TREASURY);
    assert.ok(input.objective.split('\n')[0].includes(`fee recipient ${C.IMD_TREASURY},`));
    assert.deepEqual(checkConsistency(input), []);
    const corrupted = { ...input, objective: input.objective.replaceAll(C.IMD_TREASURY, payer).replace(`Send the fee to ${payer}.`, `Send the fee to ${C.IMD_TREASURY}.`) };
    assert.ok(checkConsistency(corrupted).some(f => f.code === 'fee-recipient'));
  }
});

test('the 5% cap uses the higher replacement rate once, plus every additive fee, and guards rendered requests independently', () => {
  for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) {
    let d = draft(type, 'blocks', pair);
    for (const id of ['swap-fee', 'jar', 'fee-fade', 'fee-vol', 'fee-size', 'pot']) d = C.addBlock(d, id);
    const set = (id, key, value) => { d = C.setParam(d, d.blocks.findIndex(b => b.id === id), key, value); };
    set('swap-fee', 'rate', 0.1); set('jar', 'rate', 4.9); set('fee-fade', 'start', 30); set('fee-vol', 'fee', 3); set('fee-size', 'extra', 0); set('pot', 'rate', 0);
    assert.equal(C.rateTotal(d), 34.9);
    assert.ok(C.validate(d, payer).some(i => i.field === 'rates'));
    assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'));
    set('fee-fade', 'start', 1);
    assert.equal(C.rateTotal(d), 7.9);
    assert.ok(C.validate(d, payer).some(i => i.field === 'rates'));
    assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'));
    set('jar', 'rate', 0.5); set('pot', 'rate', 0.5); set('fee-size', 'extra', 1); set('fee-vol', 'fee', 3);
    assert.equal(C.rateTotal(d), 5);
    assert.deepEqual(checkConsistency(C.body(d, payer)), [], 'fade and volatility replace the base, rather than adding to it');
    set('fee-vol', 'fee', 3.1);
    assert.equal(C.rateTotal(d), 5.1);
    assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'rates'));
  }
});

test('every reported catalog conflict is explained in the palette, in both addition orders and all launch contexts', () => {
  const pairs = [['max-buy', 'pause'], ['max-buy', 'hours'], ['max-buy', 'breaker'], ['max-buy', 'max-swap'], ['max-buy', 'open-at'], ['max-buy', 'cooldown'], ['lp-lock', 'pause'], ['lp-lock', 'breaker'], ['lp-lock', 'hours']];
  for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) for (const ids of pairs) for (const order of [ids, [...ids].reverse()]) {
    let d = draft(type, 'blocks', pair); d = C.addBlock(d, order[0]);
    assert.match(C.blockedReason(d, C.BY_ID[order[1]]), /^REMOVE .* FIRST$/);
    assert.equal(C.addBlock(d, order[1]), d);
    d.blocks.push(C.entry(order[1])); // imported drafts bypass the palette
    assert.ok(C.validate(d, payer).some(i => /cannot be combined/.test(i.message)));
    assert.ok(checkConsistency(C.body(d, payer)).some(f => f.code === 'contradiction'));
  }
});
