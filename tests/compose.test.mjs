// Unit tests for SPEC 4 and 5: catalog sentences, the 4.10 rules, fixtures and the request body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../src/lib/compose.ts';

const fixtureWallet = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const fixture = name => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');
const draftOf = (type, ids, settings = {}) => {
  let d = { ...C.newDraft(), type };
  for (const id of ids) d = C.addBlock(d, id);
  return { ...d, settings: { ...d.settings, chain: 4663, ...settings } };
};
const fixtureA = () => draftOf('A', ['swap-fee', 'anti-sniper', 'jar'], { pool: 50 });
const fixtureB = () => draftOf('B', ['anti-sniper', 'cooldown'], { hname: 'PondGuardHook' });
const fixtureC = () => draftOf('C', ['swap-fee'], { hname: 'UniFeeHook', token: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', tsym: 'UNI' });

test('catalog has every section 4 block with the required fields', () => {
  assert.equal(C.BLOCKS.length, 35); // two token blocks plus 33 behavior blocks, Custom rule included
  for (const b of C.BLOCKS) {
    for (const k of ['id', 'group', 'title', 'blurb', 'types', 'params', 'short', 'sentence', 'who']) assert.ok(b[k] !== undefined, `${b.id}.${k}`);
    for (const p of b.params) assert.ok('default' in p && p.label, `${b.id}.${p.k} default`);
    if (b.requires) assert.ok(C.BY_ID[b.requires], `${b.id} requires`);
    if (b.excludes) assert.ok(C.BY_ID[b.excludes], `${b.id} excludes`);
  }
  assert.equal(C.BY_ID.pot.group, 'games');
  assert.deepEqual(C.BLOCKS.filter(b => b.risk).map(b => b.id).sort(), ['anti-sniper', 'breaker', 'cooldown', 'max-buy', 'max-swap', 'pot']);
});

test('every block renders its sentence with defaults under each allowed type, ending with its 4.11 functions', () => {
  let rendered = 0;
  for (const def of C.BLOCKS) {
    for (const type of def.types) {
      let d = { ...C.newDraft(), type };
      if (def.requires) d = C.addBlock(d, def.requires);
      d = def.id === 'token' ? d : C.addBlock(d, def.id);
      assert.ok(C.has(d, def.id), `${def.id} addable under ${type}`);
      const sentence = C.sentenceOf(d.blocks.find(b => b.id === def.id), C.context(d));
      assert.ok(sentence.length > 10 && !/[{}]/.test(sentence), `${def.id}/${type}: ${sentence}`);
      const text = C.compose(d);
      assert.ok(text.includes(sentence), `${def.id}/${type} in text`);
      for (const fn of C.functionsOf(def)) assert.ok(sentence.includes(fn.sig), `${def.id}/${type} names ${fn.sig}`);
      const names = C.functionsOf(def).map(f => f.sig.split('(')[0]);
      if (names.length) assert.match(sentence, /Expose [^.]*\.$|Expose .*$/, `${def.id} ends with Expose`);
      if (names.length) assert.ok(names.every(n => sentence.lastIndexOf('Expose') < sentence.lastIndexOf(n)), `${def.id} functions are in the final Expose sentence`);
      rendered++;
    }
  }
  assert.ok(rendered >= 90);
});

test('blocks a launch type does not allow are dimmed in the palette and left out of the request', () => {
  const d = draftOf('B', ['async', 'curve']);
  const a = { ...d, type: 'A' };
  assert.equal(C.blockedReason(a, C.BY_ID.async), 'ADDED');
  assert.equal(C.blockedReason({ ...C.newDraft(), type: 'A' }, C.BY_ID['lp-fee']), 'OWN POOLS ONLY');
  assert.equal(C.blockedReason({ ...C.newDraft(), type: 'B' }, C.BY_ID['own-token']), 'TOKEN LAUNCH ONLY');
  assert.equal(C.activeBlocks(a).length, 0);
  assert.ok(!C.compose(a).includes('BaseAsyncSwap'));
  assert.ok(C.compose(d).includes('BaseAsyncSwap'));
});

test('composed text equals the three fixtures byte for byte', () => {
  assert.equal(C.compose(fixtureA(), fixtureWallet) + '\n', fixture('compose-A.txt'));
  assert.equal(C.compose(fixtureB(), fixtureWallet) + '\n', fixture('compose-B.txt'));
  assert.equal(C.compose(fixtureC(), fixtureWallet) + '\n', fixture('compose-C.txt'));
  for (const d of [fixtureA(), fixtureB(), fixtureC()]) assert.deepEqual(C.validate(d), []);
});

test('words and rules together: numbered rules win; owner sentence names the functions; last line keeps names', () => {
  let d = draftOf('A', ['pause', 'allowlist'], { pool: 40, owner: '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0' });
  d = { ...d, prompt: 'Buyers "love" <b>this</b>\nsecond line' };
  const text = C.compose(d);
  assert.ok(text.includes('The hook does exactly what the creator describes, plus the numbered rules, and nothing else. If the description and a numbered rule disagree, the numbered rule wins.'));
  assert.ok(text.includes('<description>Buyers love b this /b second line</description>'));
  assert.ok(text.includes('Owner 0x9a50fd22bcefd3774d796e775a467a7f743e0ab0 may only: pause and unpause swaps, add and remove buyer allowlist addresses, through the functions named above. No other admin function, no backend signer, no upgrade path.'));
  assert.ok(text.endsWith('Keep the function names exactly as written so the storefront can show them. Composed with The Hooks Store block builder.'));
  const words = C.compose({ ...C.newDraft(), prompt: 'Only words', settings: { ...C.emptySettings(), pool: 50 } });
  assert.ok(words.includes('The hook does exactly what the creator describes below, and nothing else.'));
  assert.ok(words.endsWith('Composed with The Hooks Store.'));
});

test('request bodies follow 5.2 for every type and stay under 16 KiB', () => {
  const a = C.body(fixtureA());
  assert.deepEqual(Object.keys(a), ['objective', 'shape', 'references', 'steps', 'onchain', 'chainId', 'pairWith', 'economics', 'github']);
  assert.deepEqual(a.economics, { poolBps: 5000 });
  assert.equal(a.onchain, 'univ4_hook'); assert.equal(a.customToken, undefined);
  const own = C.body({ ...C.addBlock(fixtureA(), 'own-token'), settings: { ...fixtureA().settings, rem: '0x9A50fd22bcefd3774d796e775a467a7f743e0ab0', owner: '0x9A50fd22bcefd3774d796e775a467a7f743e0ab0' } });
  assert.equal(own.customToken, true); assert.equal(own.owner, '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0');
  assert.deepEqual(own.economics, { poolBps: 5000, remainderTo: '0x9a50fd22bcefd3774d796e775a467a7f743e0ab0' });
  const b = C.body(fixtureB());
  assert.deepEqual(Object.keys(b), ['objective', 'onchain', 'chainId', 'github']);
  assert.equal(b.onchain, 'evm_contracts');
  const repo = { repo: 'https://github.com/the-hook-store/hooks-store-spec', commit: '3d4ef5b0000000000000000000000000000000aa' };
  const c = C.body({ ...fixtureC(), settings: { ...fixtureC().settings, ...repo } });
  assert.equal(c.repoUrl, repo.repo); assert.equal(c.baseCommit, repo.commit);
  assert.ok(c.objective.includes(`Start from the creator’s own source at ${repo.repo} commit ${repo.commit}: audit it as imported code, adapt it to this launch, and keep its behavior.`));
  // The largest possible stack still fits: every block allowed under B with long words.
  let all = { ...C.newDraft(), type: 'B', prompt: 'x'.repeat(3000), settings: { ...C.emptySettings(), hname: 'BigHook' } };
  for (const def of C.BLOCKS) all = C.addBlock(all, def.id);
  for (const d of [fixtureA(), fixtureB(), fixtureC()]) assert.ok(C.bodyBytes(C.body(d)) < C.MAX_BODY_BYTES);
  assert.ok(C.bodyBytes(C.body(all)) < C.MAX_BODY_BYTES, 'all-blocks body under 16 KiB');
  assert.ok(C.validate({ ...all, prompt: 'y'.repeat(3001) }).some(i => i.field === 'prompt'));
});

test('pool share has no default: economics only once chosen, Continue blocked until 10 to 90 in steps of 5', () => {
  const d = draftOf('A', ['swap-fee']);
  assert.equal(d.settings.pool, null);
  assert.equal(C.body(d).economics, undefined);
  assert.ok(!C.compose(d).includes('Pool:'));
  assert.ok(C.validate(d).some(i => i.field === 'settings.pool'));
  for (const bad of [5, 12, 95, 100, 0]) assert.ok(C.validate({ ...d, settings: { ...d.settings, pool: bad } }).some(i => i.field === 'settings.pool'), String(bad));
  for (const good of [10, 25, 90]) assert.ok(!C.validate({ ...d, settings: { ...d.settings, pool: good } }).some(i => i.field === 'settings.pool'), String(good));
});

test('the 5% rule counts swap fee or the larger buy/sell fee, whale fee, jar and pot', () => {
  let d = draftOf('A', ['swap-fee', 'jar', 'pot'], { pool: 50 });
  assert.equal(C.rateTotal(d), 4);
  assert.ok(!C.validate(d).some(i => i.field === 'rates'));
  d = C.addBlock(d, 'fee-size');
  assert.equal(C.rateTotal(d), 5);
  d = C.setParam(d, d.blocks.findIndex(b => b.id === 'fee-size'), 'extra', 1.1);
  assert.ok(C.validate(d).some(i => i.field === 'rates' && i.message.startsWith('Fees total 5.1%')));
  let dir = draftOf('A', ['fee-dir'], { pool: 50 });
  dir = C.setParam(dir, 1, 'sell', 4); dir = C.addBlock(dir, 'jar');
  assert.equal(C.rateTotal(dir), 5);
  dir = C.setParam(dir, 2, 'rate', 1.5);
  assert.ok(C.validate(dir).some(i => i.field === 'rates'));
});

test('swap-fee dependencies: fade, split and LP share need it and leave with it', () => {
  let d = C.newDraft();
  for (const id of ['fee-fade', 'fee-split', 'lp-share']) {
    assert.equal(C.blockedReason(d, C.BY_ID[id]), 'NEEDS SWAP FEE');
    assert.equal(C.addBlock(d, id), d);
  }
  d = C.addBlock(d, 'swap-fee');
  for (const id of ['fee-fade', 'fee-split', 'lp-share', 'cooldown']) d = C.addBlock(d, id);
  assert.deepEqual(d.blocks.map(b => b.id), ['token', 'swap-fee', 'fee-fade', 'fee-split', 'lp-share', 'cooldown']);
  d = C.removeBlock(d, 1);
  assert.deepEqual(d.blocks.map(b => b.id), ['token', 'cooldown']);
  // A stored draft with an orphaned dependant is reported, not silently sent.
  const orphan = C.normalizeDraft({ type: 'A', blocks: [{ id: 'token' }, { id: 'fee-fade' }], settings: { pool: 50 } });
  assert.ok(C.validate(orphan).some(i => i.message === 'Fee that fades needs Swap fee.'));
});

test('buy/sell fees and the swap fee exclude each other; each block once', () => {
  let d = C.addBlock(C.newDraft(), 'swap-fee');
  assert.equal(C.blockedReason(d, C.BY_ID['fee-dir']), 'REMOVE SWAP FEE FIRST');
  assert.equal(C.addBlock(d, 'fee-dir'), d);
  assert.equal(C.blockedReason(d, C.BY_ID['swap-fee']), 'ADDED');
  assert.equal(C.addBlock(d, 'swap-fee'), d);
  d = C.addBlock(C.newDraft(), 'fee-dir');
  assert.equal(C.blockedReason(d, C.BY_ID['swap-fee']), 'REMOVE DIFFERENT BUY AND SELL FEES FIRST');
  const both = C.normalizeDraft({ blocks: [{ id: 'swap-fee' }, { id: 'fee-dir' }, { id: 'swap-fee' }], settings: { pool: 50 } });
  assert.equal(both.blocks.filter(b => b.id === 'swap-fee').length, 1);
  assert.ok(C.validate(both).some(i => i.message.includes('cannot be combined')));
});

test('reorder keeps the token first; bring-your-own token replaces the standard one', () => {
  let d = draftOf('A', ['swap-fee', 'cooldown', 'jar']);
  d = C.moveBlock(d, 2, 1); assert.deepEqual(d.blocks.map(b => b.id), ['token', 'swap-fee', 'jar', 'cooldown']);
  d = C.moveBlock(d, 1, -1); assert.deepEqual(d.blocks.map(b => b.id), ['token', 'swap-fee', 'jar', 'cooldown']);
  d = C.addBlock(d, 'own-token'); assert.equal(d.blocks[0].id, 'own-token');
  assert.equal(C.body({ ...d, settings: { ...d.settings, pool: 50 } }).customToken, true);
  d = C.addBlock(d, 'token'); assert.equal(d.blocks[0].id, 'token');
});

test('field limits produce inline issues', () => {
  let d = draftOf('A', ['fee-split', 'swap-fee', 'custom'], { pool: 50 });
  d = draftOf('A', ['swap-fee', 'fee-split', 'custom'], { pool: 50, owner: 'nope' });
  const fields = C.validate(d).map(i => i.field);
  assert.ok(fields.includes('block:2:b'), 'split address required');
  assert.ok(fields.includes('block:3:text'), 'custom text required');
  assert.ok(fields.includes('settings.owner'));
  d = C.setParam(d, 0, 'symbol', 'pond');
  assert.ok(C.validate(d).some(i => i.field === 'block:0:symbol'));
  const c = draftOf('C', ['swap-fee']);
  assert.ok(C.validate(c).some(i => i.field === 'settings.token'));
  assert.ok(C.validate(c).some(i => i.field === 'settings.hname'));
});

test('job 1 landing drafts open in the describe editor', () => {
  const d = C.normalizeDraft({ prompt: 'Send 1% of every buy to a prize pot', mode: 'prompt' });
  assert.equal(d.mode, 'prompt'); assert.equal(d.prompt, 'Send 1% of every buy to a prize pot'); assert.equal(d.type, 'A');
  assert.deepEqual(d.blocks.map(b => b.id), ['token']);
  const old = C.normalizeDraft({ type: 'B', blocks: [{ id: 'pause' }], settings: { chain: 4663 } });
  assert.deepEqual(old.blocks.map(b => b.id), ['token', 'pause']);
  assert.deepEqual(C.normalizeDraft('garbage'), C.newDraft());
});
test('the fee sentence names the actual pair currency; hook-only and existing-token requests use ETH', () => {
  for (const pair of ['imd', 'eth']) {
    const d = draftOf('A', ['swap-fee'], { pool: 50, pair });
    assert.equal(C.body(d).pairWith, pair);
    assert.ok(C.compose(d).includes(`Fees are always taken from the ${pair.toUpperCase()} (pair currency) side`));
  }
  for (const type of ['B', 'C']) {
    const d = draftOf(type, [], { pair: 'imd' });
    assert.match(C.compose(d), /Fees are always taken from the ETH \(pair currency\) side/);
  }
});
