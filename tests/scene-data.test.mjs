import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('Pepe grids and all meta values match the reference character for character', async () => {
  const reference = await readFile(new URL('../mockup/index.html', import.meta.url), 'utf8');
  const expected = JSON.parse(reference.match(/var PEPE = (.*?);\n/)[1]);
  const actual = JSON.parse(await readFile(new URL('../src/scene/pepe.json', import.meta.url), 'utf8'));
  assert.deepEqual(actual, expected);
});
test('Learn retains all seven answers and all fourteen permissions, with only the specified ad-term correction', async () => {
  const reference = (await readFile(new URL('../mockup/index.html', import.meta.url), 'utf8')).split('<!-- ============ LEARN')[1].split('</main>')[0];
  const actual = JSON.parse(await readFile(new URL('../web/src/learn-content.json', import.meta.url), 'utf8'));
  const clean = s => s.replace(/<[^>]*>/g, '').trim();
  const faqs = [...reference.matchAll(/<details(?: open)?><summary>(.*?)<\/summary><div><p>(.*?)<\/p><\/div><\/details>/gs)].map(([, question, answer]) => ({ question: clean(question), answer: clean(answer).replace('for 7 days', 'for 24 hours') }));
  assert.deepEqual(actual.faqs, faqs);
  const permissions = [...reference.matchAll(/<tr><th>(.*?)<\/th><td>(.*?)<\/td><\/tr>/gs)].map(([, callback, detail]) => ({ callback: clean(callback), description: clean(detail).split('Blocks:')[0].trim(), blocks: clean(detail).split('Blocks:')[1].trim() }));
  assert.deepEqual(actual.permissions, permissions);
  assert.equal(actual.permissions.flatMap(row => row.callback.split(' / ')).length, 14);
});
test('exported cast integration delivers real messages and unsubscribes on route cleanup', async () => {
  const { cast, subscribeToCasts } = await import('../src/scene/cast.ts');
  const calls = [];
  const unsubscribe = subscribeToCasts(message => calls.push(message));
  cast('A new hook was requested on Robinhood Chain'); unsubscribe(); cast('Must not reach the destroyed scene');
  assert.deepEqual(calls, ['A new hook was requested on Robinhood Chain']);
});
