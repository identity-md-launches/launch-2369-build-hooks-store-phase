import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newDraft, entry, body, sentenceOf, context, BY_ID, IMD_TREASURY } from '../src/lib/compose.ts';
import { checkConsistency, fixedFactConflicts } from '../src/lib/safety.ts';

const payer = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const site = JSON.parse(readFileSync(new URL('../public/site-config.json', import.meta.url)));
const recorded = JSON.parse(readFileSync(new URL('../evidence/check-A-default-blocks.response.json', import.meta.url)));
const splitFact = recorded.facts.find(f => f.id === 'token_split');
function draft(type = 'A', pair = 'imd', chain = 1) {
  const d = newDraft(); d.type = type; d.mode = 'blocks';
  d.settings = { ...d.settings, chain, pair, pool: 50, rem: IMD_TREASURY, owner: payer, hname: 'SafetyHook', token: site.chains.find(c => c.id === chain).imdAddress };
  return d;
}
function custom(text, type = 'A', pair = 'imd', chain = 1) {
  const d = draft(type, pair, chain); d.blocks.push({ id: 'custom', p: { text } }); return d;
}
const findings = d => checkConsistency(body(d, payer));

for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) for (const chain of [1, 4663]) {
  for (const ids of [['lp-lock', 'hours'], ['lp-lock', 'pause'], ['lp-lock', 'breaker'], ['max-buy', 'max-swap'], ['max-buy', 'hours'], ['max-buy', 'pause'], ['max-buy', 'breaker'], ['max-buy', 'open-at'], ['max-buy', 'cooldown']]) {
    test(`conflicting catalog pair ${ids.join('+')}/${type}/${pair}/${chain}, in either order`, () => {
      if (!ids.every(id => BY_ID[id].types.includes(type))) return;
      for (const order of [ids, [...ids].reverse()]) {
        const d = draft(type, pair, chain); d.blocks.push(...order.map(entry));
        const conflict = findings(d).find(f => f.code === 'contradiction');
        assert.ok(conflict, order.join('+'));
        for (const [i, id] of ids.entries()) {
          const sentence = sentenceOf(d.blocks.find(b => b.id === id), context(d, payer));
          assert.ok(sentence.includes(conflict.sentence.split('\nConflicts with: ')[i]), `${id}: quote the offending sentence`);
        }
        for (const removed of ids) {
          const corrected = { ...d, blocks: d.blocks.filter(b => b.id !== removed) };
          assert.deepEqual(findings(corrected), [], `remove ${removed}`);
        }
      }
    });
  }
  test(`custom fee settlement assertions/${type}/${pair}/${chain}`, () => {
    const expected = type === 'A' && pair === 'imd' ? 'IMD' : 'ETH', wrong = expected === 'IMD' ? 'ETH' : 'IMD';
    for (const phrase of ['Every swap fee must be paid in', 'Swap fees are paid out in', 'Pay the swap fees in', 'All hook fees are denominated in', 'Distribute the fee in', 'Swap fees are payable in', 'All hook fees must be sent in', 'Fee payments must be made in', 'The fee payment currency is']) {
      const bad = `${phrase} ${wrong}.`, f = findings(custom(bad, type, pair, chain));
      assert.ok(f.some(f => f.code === 'fee-settlement' && f.sentence.includes(bad)), bad);
      assert.deepEqual(findings(custom(`${phrase} ${expected}.`, type, pair, chain)), []);
    }
    assert.deepEqual(findings(custom(`Do not pay the fee in ${wrong}.`, type, pair, chain)), []);
  });
  test(`fee recipient clauses/${type}/${pair}/${chain}`, () => {
    for (const clause of ['Send swap fees to', 'Send all accrued hook fees to', 'The fees go to', 'Swap fees must go to', 'Send the fee to']) {
      for (const target of ['Bob', 'bob.eth', `0x${'0'.repeat(40)}`]) {
        const text = `${clause} ${target}.`;
        assert.ok(findings(custom(text, type, pair, chain)).some(f => f.code === 'recipient' && f.sentence.includes(text)), text);
      }
      assert.deepEqual(findings(custom(`${clause} ${IMD_TREASURY}.`, type, pair, chain)), []);
    }
  });
  test(`dependency addresses belong to the service, not the recipient/${type}/${pair}/${chain}`, () => {
    for (const text of [
      `Use Chainlink VRF to draw the pot and pay the winner at ${IMD_TREASURY}.`,
      'Use Chainlink VRF to draw the pot.',
      'Use the USDC/ETH pool for pricing.',
      `Use the USDC/ETH pool for pricing and send the fees to ${IMD_TREASURY}.`,
      `Use Aave and send the fees to ${IMD_TREASURY}.`,
      `Use Chainlink VRF and Aave at ${IMD_TREASURY}.`,
      `Use the USDC token and send the fees to ${IMD_TREASURY}.`,
    ]) assert.ok(findings(custom(text, type, pair, chain)).some(f => f.code === 'dependency' && f.sentence.includes(text)), text);
    for (const text of [
      `Use Chainlink VRF coordinator at ${site.chains.find(c => c.id === chain).imdAddress} with subscription 42 to draw the pot and pay the winner at ${IMD_TREASURY}.`,
      `Use the USDC/ETH pool at ${site.chains.find(c => c.id === chain).imdAddress} for pricing.`,
      `Use the USDC token at ${site.chains.find(c => c.id === chain).imdAddress}.`,
      'Do not use Chainlink VRF. Never use another pool.',
    ]) {
      const result = findings(custom(text, type, pair, chain));
      if (/^Do not/.test(text)) assert.deepEqual(result, [], text);
      else {
        assert.ok(!result.some(finding => finding.code === 'dependency'), 'The named service has its own address.');
        assert.ok(result.some(finding => finding.code === 'contradiction'), 'SPEC 4.16.5 still forbids outside dependencies in this request.');
      }
    }
  });
}

test('the supplied Buy back and burn example passes; opposite fee scopes pass and same scopes conflict', () => {
  const d = draft('A', 'eth');
  d.prompt = 'Take 1% of every sell and buy my token back with it, then burn what was bought. No fees on buys.';
  assert.deepEqual(findings(d), []);
  for (const scope of ['on sells', 'from each sell', 'of all sells', 'per sell']) {
    d.prompt = `Charge 1% ${scope}. No fees on buys.`;
    assert.deepEqual(findings(d), [], scope);
  }
  for (const [forbidden, charged] of [['buys', 'sell'], ['sells', 'buy']]) {
    d.prompt = `No fees on ${forbidden}. Take 1% of every ${charged} as a hook fee.`;
    assert.deepEqual(findings(d), []);
    d.prompt = `No fees on ${forbidden}. Take 1% of every ${forbidden.slice(0, -1)} as a hook fee.`;
    const conflict = findings(d).find(f => f.code === 'contradiction'); assert.ok(conflict);
    assert.notEqual(...conflict.sentence.split('\nConflicts with: '));
  }
  d.prompt = 'No hook fees.'; d.blocks.push(entry('fee-dir')); d.blocks.at(-1).p.to = IMD_TREASURY;
  assert.ok(findings(d).some(f => f.code === 'contradiction'));
  d.prompt = 'No fees on buys.'; d.blocks.at(-1).p.buy = 0; d.blocks.at(-1).p.sell = 1;
  assert.deepEqual(findings(d), []);
  d.blocks.at(-1).p.buy = 1;
  assert.ok(findings(d).some(f => f.code === 'contradiction'));
});

test('recorded token_split compares pool share with the exact request and requires an explicit checked opt-out', () => {
  const d = draft('A', 'eth'); d.prompt = 'Observe swaps.'; d.settings.pool = 65;
  const conflicts = fixedFactConflicts(body(d, payer), [splitFact]);
  assert.equal(conflicts.length, 1); assert.equal(conflicts[0].code, 'fixed:token_split');
  assert.ok(conflicts[0].sentence.includes(splitFact.label));
  assert.match(conflicts[0].sentence, /Pool: 65%/);
  for (const prompt of ['Do not opt out of fixed fact token_split.', 'Opt out of fixed fact token.']) {
    d.prompt = prompt; assert.equal(fixedFactConflicts(body(d, payer), [splitFact]).length, 1);
  }
  d.prompt = 'Observe swaps. Opt out of fixed fact token_split.';
  assert.deepEqual(fixedFactConflicts(body(d, payer), [splitFact]), []);
  d.prompt = ''; d.settings.pool = 50;
  assert.deepEqual(fixedFactConflicts(body(d, payer), [splitFact]), []);
});
test('fixed token_split compares concrete remainder addresses and resolves your wallet from the payer', () => {
  const d = draft();
  const fact = { ...splitFact, label: `Split: 10% to the swarm, the other 90% is yours: 50% into the pool, the rest to ${payer}` };
  assert.equal(fixedFactConflicts(body(d, payer), [fact]).length, 1);
  assert.equal(fixedFactConflicts(body(d, payer), [splitFact], payer).length, 1);
  d.settings.rem = payer;
  assert.deepEqual(fixedFactConflicts(body(d, payer), [fact]), []);
  assert.deepEqual(fixedFactConflicts(body(d, payer), [splitFact], payer), []);
});


test('type C accepts a full existing-token address with no optional symbol', () => {
  for (const chain of [1, 4663]) {
    const d = draft('C', 'eth', chain); d.blocks.push(entry('cooldown'));
    assert.equal(d.settings.tsym, '');
    assert.deepEqual(findings(d), []);
    assert.ok(body(d, payer).objective.includes(`existing token ${d.settings.token}; only pools`));
  }
});
