// Shared by tests/job13.test.mjs and the Playwright case: the pinned EasyList generic cosmetic
// rules, and every class and id the built export can put on the page.
import fs from 'node:fs';
import path from 'node:path';
export const PINNED = new URL('../tests/fixtures/easylist/easylist-generic.txt', import.meta.url);
export function genericRules(text = fs.readFileSync(PINNED, 'utf8')) {
  const classes = new Set(), ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (/^##\.[\w-]+$/.test(line)) classes.add(line.slice(3));
    else if (/^###[\w-]+$/.test(line)) ids.add(line.slice(3));
  }
  return { classes, ids };
}
const words = value => value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(w => /^-?[A-Za-z_][\w-]*$/.test(w));
/** Classes and ids from index.html, the CSS selectors and the className/id literals of the bundle. */
export function exportNames(dist) {
  const classes = new Set(), ids = new Set();
  const files = fs.readdirSync(path.join(dist, 'assets')).map(f => path.join(dist, 'assets', f)).concat(path.join(dist, 'index.html'));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.html')) {
      for (const m of text.matchAll(/\bclass="([^"]*)"/g)) words(m[1]).forEach(w => classes.add(w));
      for (const m of text.matchAll(/\bid="([^"]*)"/g)) words(m[1]).forEach(w => ids.add(w));
    } else if (file.endsWith('.css')) {
      const selectors = text.replace(/\{[^{}]*\}/g, '{}').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of selectors.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) classes.add(m[1]);
      for (const m of selectors.matchAll(/#(-?[A-Za-z_][\w-]*)/g)) ids.add(m[1]);
    } else if (file.endsWith('.js')) {
      for (const m of text.matchAll(/\bclassName:\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)) words(m[1] ?? m[2] ?? m[3]).forEach(w => classes.add(w));
      for (const m of text.matchAll(/\bclassName:[^,}]*?\?\s*(?:"([^"]*)"|`([^`]*)`)\s*:\s*(?:"([^"]*)"|`([^`]*)`)/g)) [m[1], m[2], m[3], m[4]].filter(Boolean).forEach(v => words(v).forEach(w => classes.add(w)));
      for (const m of text.matchAll(/\bid:\s*(?:"([^"]*)"|`([^`]*)`)/g)) words(m[1] ?? m[2]).forEach(w => ids.add(w));
      for (const m of text.matchAll(/getElementById\(\s*"([^"]+)"/g)) ids.add(m[1]);
    }
  }
  return { classes, ids };
}
export function blockedNames(dist, rules = genericRules()) {
  const names = exportNames(dist);
  return { classes: [...names.classes].filter(c => rules.classes.has(c)).sort(), ids: [...names.ids].filter(i => rules.ids.has(i)).sort(), scanned: { classes: names.classes.size, ids: names.ids.size } };
}
/** The rules as one hiding stylesheet, the way a blocker applies them. */
export function hidingStylesheet(rules = genericRules()) {
  const selectors = [...[...rules.classes].map(c => `.${CSS_escape(c)}`), ...[...rules.ids].map(i => `#${CSS_escape(i)}`)];
  const chunks = [];
  for (let i = 0; i < selectors.length; i += 500) chunks.push(`${selectors.slice(i, i + 500).join(',\n')} { display: none !important; }`);
  return chunks.join('\n');
}
const CSS_escape = name => name.replace(/^(\d)/, '\\3$1 ').replace(/[^\w-]/g, c => `\\${c}`);
