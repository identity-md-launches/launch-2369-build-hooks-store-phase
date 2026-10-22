// Refreshes the pinned EasyList generic cosmetic rules used by tests/job13.test.mjs.
// Run before `npm --prefix web run build`: node scripts/refresh-easylist.mjs
// Only the header and the generic single-class (##.name) and single-id (###name) rules are kept,
// which is everything the dist/ class and id check needs, at a tenth of the full list's size.
import fs from 'node:fs';
const SOURCE = 'https://easylist.to/easylist/easylist.txt';
const out = new URL('../tests/fixtures/easylist/easylist-generic.txt', import.meta.url);
const response = await fetch(SOURCE, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`EasyList answered HTTP ${response.status}`);
const text = await response.text();
if (!text.startsWith('[Adblock Plus')) throw new Error('The download is not an Adblock Plus filter list.');
const lines = text.split(/\r?\n/);
const header = lines.slice(0, lines.findIndex(l => l.startsWith('! ***'))).filter(l => /^(\[|! (Version|Title|Last modified|Commit|Homepage|License))/.test(l));
const rules = lines.filter(l => /^##\.[\w-]+$/.test(l) || /^###[\w-]+$/.test(l));
if (rules.length < 1000) throw new Error(`Only ${rules.length} generic rules found; refusing to pin a truncated list.`);
fs.writeFileSync(out, [...header, `! Source: ${SOURCE}`, `! Pinned: generic ##.class and ###id rules only (${rules.length} of ${lines.length} lines)`, ...rules, ''].join('\n'));
console.log(`Pinned ${rules.length} generic rules from ${header.find(l => l.startsWith('! Version')) ?? 'EasyList'}`);
