// Reproducible, read-only request corpus for the separate job 8 sentence review.
// These are offline fixtures, never requests to launch or deploy a contract.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as C from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';

const config = JSON.parse(readFileSync(new URL('../public/site-config.json', import.meta.url)));
const payer = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const cases = [];
for (const def of C.BLOCKS) for (const type of ['A', 'B', 'C']) for (const pair of ['imd', 'eth']) for (const chain of [1, 4663]) {
  let draft = C.newDraft(); draft.type = type; draft.mode = 'blocks'; draft.seeded = true;
  draft.settings = { ...draft.settings, chain, pair, pool: 50, owner: payer, hname: 'CorpusHook', token: config.chains.find(c => c.id === chain).imdAddress };
  const include = id => {
    if (draft.blocks.some(b => b.id === id)) return;
    const block = C.BY_ID[id];
    if (block.requires) include(block.requires);
    if (block.requiresAny) include(block.requiresAny[0]);
    if (C.TOKEN_IDS.includes(id)) draft.blocks = [C.entry(id), ...draft.blocks.filter(b => !C.TOKEN_IDS.includes(b.id))];
    else draft.blocks.push(C.entry(id));
  };
  include(def.id);
  for (const block of draft.blocks) {
    if (block.id === 'fee-split') block.p.b = C.IMD_TREASURY;
    if (block.id === 'custom') block.p.text = 'Observe swaps without changing them. No owner functions.';
  }
  const input = C.body(draft, payer);
  cases.push({ id: `${def.id}/${type}/${pair}/${chain}`, applicable: def.types.includes(type), disabled: def.disabled ?? null,
    sha256: createHash('sha256').update(JSON.stringify(input)).digest('hex'), input,
    consistency: checkConsistency(input), validation: C.validate(draft, payer) });
}
const out = new URL('results/job8/', import.meta.url); mkdirSync(out, { recursive: true });
writeFileSync(new URL('composed-requests.jsonl', out), cases.map(row => JSON.stringify(row)).join('\n') + '\n');
console.log(JSON.stringify({ cases: cases.length, applicable: cases.filter(c => c.applicable).length,
  enabledApplicable: cases.filter(c => c.applicable && !c.disabled).length,
  enabledApplicableWithFindings: cases.filter(c => c.applicable && !c.disabled && c.consistency.length).map(c => c.id),
  disabledApplicableWithoutFindings: cases.filter(c => c.applicable && c.disabled && !c.consistency.length).map(c => c.id) }, null, 2));
