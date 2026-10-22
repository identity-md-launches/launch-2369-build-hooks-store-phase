// Job 9 revision: reproductions from the independent review, each fixed at its cause.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';
import { matchProvenLaunch } from '../src/lib/proven.ts';
import { writtenFeeClauses, writtenFeeRates, writtenFeeTargets } from '../src/lib/writtenFees.ts';

const wallet = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', lower = wallet.toLowerCase();
const TREASURY = '0x3f252e859a277a86a3967c11d4e054b2f07a1f22';
const entryOf = (type, blocks) => ({ launchId: 'l1', launchNumber: 1, chainId: 4663, type, blocks, repoUrl: 'https://github.com/identity-md-launches/launch-1-x', commit: 'a'.repeat(40), name: 'PondsideGuard', verifiedAt: '2026-10-22' });
const base = () => { const d = C.newDraft(); d.settings.chain = 4663; d.settings.pool = 50; return d; };
const words = (prompt, type = 'A') => { const d = base(); d.type = type; d.settings.hname = 'PondHook'; d.mode = 'prompt'; d.prompt = prompt; return d; };

test('proven instruction follows the first sentence even when the token name contains ". "', () => {
  for (const name of ['Dr. Pond', 'St. Croix']) {
    let d = base(); d.mode = 'blocks'; d.blocks.push(C.entry('swap-fee'));
    d = C.setParam(d, 0, 'name', name); d = C.setParam(d, 0, 'symbol', 'DRP');
    d.proven = entryOf('A', ['token', 'swap-fee']);
    const b = C.body(d, wallet), lines = b.objective.split('\n');
    assert.equal(lines[0], `Launch ${name} (DRP) with a Uniswap v4 hook on Robinhood Chain, paired with IMD.`);
    assert.ok(lines[1].startsWith('Start from the audited source at https://github.com/identity-md-launches/launch-1-x commit '));
    assert.ok(lines[2].startsWith(`Token: ${name} (DRP)`));
    assert.deepEqual(checkConsistency(b), []);
    assert.deepEqual(C.validate(d, wallet), []);
  }
});

test('contracts-only proven requests still split after the deployer sentence and keep the rest', () => {
  for (const type of ['B', 'C']) {
    let d = base(); d.type = type; d.mode = 'blocks'; d.settings.hname = 'PondHook'; d.settings.token = lower;
    for (const id of ['swap-fee']) d = C.addBlock(d, id);
    const plain = C.compose(d, wallet).split('\n')[0];
    const lines = C.compose({ ...d, proven: entryOf(type, ['swap-fee']) }, wallet).split('\n');
    assert.ok(lines[0].endsWith('(apart from the deployer creating the hook).'));
    assert.ok(lines[1].startsWith('Start from the audited source'));
    assert.equal(`${lines[0]} ${lines[2]}`, plain);
  }
});

test('a written amount paid by swappers, buyers or sellers composes the fee facts', () => {
  const cases = [
    ['Swappers pay 1 percent.', { buy: 1, sell: 1 }],
    ['Every buyer pays 1%.', { buy: 1, sell: 0 }],
    ['Sellers pay 2%.', { buy: 0, sell: 2 }],
    ['Buyers and sellers pay 1% to the owner.', { buy: 1, sell: 1 }],
    ['Swappers pay one percent to the owner.', { buy: 1, sell: 1 }],
    ['Traders pay 50 basis points.', { buy: 0.5, sell: 0.5 }],
    ['Buyers pay 2% and sellers pay 1%.', { buy: 2, sell: 1 }],
    ['Sellers pay 1% and buyers pay 2%.', { buy: 2, sell: 1 }],
  ];
  for (const type of ['A', 'B']) for (const [prompt, rates] of cases) {
    const d = words(prompt, type), b = C.body(d, wallet);
    assert.equal(writtenFeeClauses(prompt).length, 1, prompt);
    assert.deepEqual(writtenFeeRates(prompt), rates, prompt);
    assert.ok(!b.objective.includes('Hook fee rate: 0%.'), prompt);
    const pair = type === 'A' ? 'IMD' : 'ETH';
    assert.ok(new RegExp(`Fees are always taken from the ${pair} \\(pair currency\\) side, never from [^;]+; settled in ${pair};`).test(b.objective), prompt);
    assert.ok(b.objective.includes('Fees are computed on the amount actually traded'), prompt);
    assert.ok(b.objective.includes(`Fee recipient: ${lower}.`), prompt);
    assert.deepEqual(checkConsistency(b), [], prompt);
    assert.deepEqual(C.validate(d, wallet), [], prompt);
  }
});

test('an unattached written amount near a trade party still raises the fee-rate finding', () => {
  const b = C.body(words('Buyers pay attention: 1% matters.'), wallet);
  assert.ok(!b.objective.includes('Hook fee rate: 0%.'));
  assert.ok(checkConsistency(b).some(f => f.code === 'fee-rate'));
});

test('a charge followed by a scoped prohibition keeps the charge', () => {
  for (const prompt of ['Collect a 2% fee on sells and no fee on buys.', 'Collect a 2% fee on sells, and no fee on buys.']) {
    const b = C.body(words(prompt), wallet);
    assert.deepEqual(writtenFeeClauses(prompt), ['Collect a 2% fee on sells']);
    assert.deepEqual(writtenFeeRates(prompt), { buy: 0, sell: 2 });
    assert.ok(!b.objective.includes('Hook fee rate: 0%.'));
    assert.deepEqual(checkConsistency(b), []);
  }
  assert.deepEqual(checkConsistency(C.body(words('No buy fee, and the owner receives 1% of every sell.'), wallet)), []);
});

test('two destinations after one preposition are both read and refused until clarified', () => {
  const prompt = "Take 1% of every swap for IMD's treasury and the owner.", d = words(prompt, 'B');
  assert.deepEqual([...new Set(writtenFeeTargets(prompt))], ["IMD's treasury", 'the owner']);
  assert.equal(C.feeRecipient(d, wallet), 'the unresolved written fee recipient');
  const codes = checkConsistency(C.body(d, wallet)).map(f => f.code);
  assert.ok(codes.includes('recipient'));
});

test("'the treasury' is IMD's treasury, as in the fee blocks", () => {
  for (const prompt of ['Collect 1% for the treasury.', 'Take 1% of every swap and send it to the treasury.']) {
    const d = words(prompt, 'B'), b = C.body(d, wallet);
    assert.equal(C.feeRecipient(d, wallet).toLowerCase(), TREASURY);
    assert.ok(b.objective.includes(`Fee recipient: ${TREASURY}.`));
    assert.ok(b.objective.includes(`the fee recipient ${TREASURY},`));
    assert.deepEqual(checkConsistency(b), [], prompt);
  }
});

test('a words-only draft never matches a proven entry without behavior blocks', () => {
  const f = words('Reject every swap larger than 10 ETH.', 'B');
  for (const blocks of [[], ['custom']]) {
    assert.equal(matchProvenLaunch(f, [entryOf('B', blocks)]), undefined);
    const b = C.body({ ...f, proven: entryOf('B', blocks) }, wallet);
    assert.equal(b.repoUrl, undefined);
    assert.ok(!b.objective.includes('Start from the audited source'));
  }
  const a = words('Reject every swap larger than 10 ETH.', 'A');
  assert.equal(matchProvenLaunch(a, [entryOf('A', ['token'])]), undefined);
});

test('a passive or active owner payee flows into the constructor and the footer, never the payer', () => {
  const owner = '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0', payer = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
  for (const type of ['A', 'B', 'C']) for (const prompt of ['The owner is paid 1% of every swap.', 'The owner gets 1% of every swap.', 'The owner takes 1% of every swap.', 'The owner is credited 1% of each trade.']) {
    const d = words(prompt, type); d.settings.owner = owner; if (type !== 'A') d.settings.token = lower;
    assert.deepEqual(writtenFeeTargets(prompt).map(t => t.toLowerCase()), ['the owner'], prompt);
    const b = C.body(d, payer);
    assert.equal(b.owner, owner);
    assert.equal(C.feeRecipient(d, payer), owner, prompt);
    assert.ok(!new RegExp(`(?:Fee recipient:|fee recipient) ${payer}`, 'i').test(b.objective), `${type} ${prompt}: the payer must not be the recipient`);
    assert.match(b.objective, new RegExp(`Fee recipient: ${owner}\\.`));
    if (type !== 'A') assert.match(b.objective, new RegExp(`fee recipient ${owner}\\b`));
    assert.deepEqual(checkConsistency(b), [], `${type} ${prompt}`);
  }
});

test('an unknown passive payee is refused until its address is given', () => {
  const d = words('Alice is paid 1% of every swap.', 'B'); d.settings.token = lower;
  const b = C.body(d, wallet);
  assert.ok(!b.objective.includes(lower) || !/Fee recipient: 0x/.test(b.objective));
  assert.ok(checkConsistency(b).some(f => f.code === 'recipient'));
  assert.deepEqual(writtenFeeTargets('The fee is paid in ETH. Charge 1% of every swap.'), []);
});
