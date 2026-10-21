import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCheck, checkRequest, importSource, intakeJob, jobStages, parseLaunches, matchesLaunch, relativeTime } from '../web/src/relay.ts';
import { newDraft, body, normalizeDraft } from '../src/lib/compose.ts';

const result = JSON.parse(readFileSync(new URL('../evidence/check-A-default-blocks.response.json', import.meta.url)));
test('IMD facts, states, plan titles, blockers and suggestions are retained without inventing success', () => {
  const parsed = parseCheck(result); assert.equal(parsed.facts[0].state, 'stated'); assert.equal(parsed.plan[0].title, 'Build and test the contracts');
  assert.deepEqual(parseCheck({ ...result, blockers: [{ detail: 'Choose a supported lending protocol.' }], suggestions: ['Describe the fee destination.'] }).blockers, ['Choose a supported lending protocol.']);
  assert.throws(() => parseCheck({ facts: [], plan: [] }), /incomplete/);
  assert.throws(() => parseCheck({ ...result, facts: [{ label: 'No state' }] }), /invalid/);
  assert.equal(parseCheck({ ...result, facts: [{ label: 'Safe optional text', state: 'unknown', assumed: { unsafe: true } }] }).facts[0].assumed, undefined);
});
test('free check sends the exact composer body inside the action envelope', async t => {
  const input = body(newDraft()); let sent;
  t.mock.method(globalThis, 'fetch', async (url, options) => { sent = { url, options }; return Response.json(result); });
  await checkRequest('https://relay.example/', input);
  assert.equal(sent.url, 'https://relay.example/check'); assert.equal(sent.options.method, 'POST');
  assert.deepEqual(JSON.parse(sent.options.body), { action: 'launch.open', input });
});
test('own-code import uses the production API shape and only accepts a pinned GitHub source', async t => {
  const draft = newDraft(); draft.settings.repo = 'https://github.com/the-hook-store/hooks-store-spec'; draft.settings.commit = '76254535510fb51581489aed5ffbc5aecb16d7da';
  const source = { repoUrl: draft.settings.repo + '.git', baseCommit: draft.settings.commit };
  let answer = { ok: true, source }, sent;
  t.mock.method(globalThis, 'fetch', async (_url, options) => { sent = JSON.parse(options.body); return Response.json(answer); });
  assert.deepEqual(await importSource('https://relay.example', draft), source);
  assert.deepEqual(sent, { url: draft.settings.repo, ref: draft.settings.commit, kind: 'contracts' });
  answer = { ok: false, problems: [{ detail: 'foundry.toml is missing' }] }; await assert.rejects(importSource('https://relay.example', draft), /foundry.toml/);
  answer = { ok: true, source: { repoUrl: 'https://evil.example', baseCommit: draft.settings.commit } }; await assert.rejects(importSource('https://relay.example', draft), /pinned GitHub/);
});
test('IMD HTTP failures never become a clear check', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'Try later' }, { status: 503 }));
  await assert.rejects(checkRequest('https://relay.example', {}), /503.*Try later/);
});
test('intake job discovery matches the request id and action before using admission.result.jobId', () => {
  const entry = { requestId: '0xABC', action: 'launch.open', admission: { result: { jobId: 'job-123' } } };
  assert.equal(intakeJob({ entries: [entry] }, '0xabc'), 'job-123');
  assert.equal(intakeJob({ entries: [entry] }, '0xdef'), null);
  assert.equal(intakeJob({ entries: [{ ...entry, action: 'job.open' }] }, '0xabc'), null);
});
test('job nodes map real build, audit and deployment states, including failures', () => {
  const job = { nodes: [{ key: 'build_contract_project', state: 'accepted' }, { key: 'write_foundry_tests', state: 'accepted' }, { key: 'audit_math', role: 'review', state: 'running' }, { key: 'audit_judge', state: 'pending' }], launch: { status: 'pending' } };
  assert.deepEqual(jobStages(job).map(s => [s.title, s.state]), [['Building', 'complete'], ['Audit panel', 'active'], ['Deploying', 'pending']]);
  job.nodes[2].state = 'blocked'; assert.equal(jobStages(job)[1].state, 'failed');
  job.nodes[2].state = 'accepted'; job.nodes[3].state = 'accepted'; job.launch.status = 'deploying';
  assert.deepEqual(jobStages(job).map(s => s.state), ['complete', 'complete', 'active']);
  job.launch.status = 'live'; assert.equal(jobStages(job)[2].state, 'complete');
  assert.throws(() => jobStages({}), /unavailable/);
});
test('ticker names come from API artifacts and match a chain-proven store launch; unrelated launches stay out', () => {
  const rows = parseLaunches({ launches: [{ id: 'launch-1', status: 'live', chainId: 1, updatedAt: '2026-10-21T12:00:00Z', artifacts: [{ role: 'token', name: 'Actual name' }, { role: 'hook', name: 'Guard', address: '0xABC' }] }] });
  assert.equal(rows[0].name, 'Actual name'); assert.equal(matchesLaunch(rows[0], { chainId: 1, launchId: 'launch-1' }), true);
  assert.equal(matchesLaunch(rows[0], { chainId: 4663, launchId: 'launch-1' }), false);
  assert.equal(matchesLaunch(rows[0], { chainId: 1, launchId: 'another-id' }), false);
  assert.equal(relativeTime('2026-10-21T12:00:00Z', Date.parse('2026-10-21T12:03:00Z')), '3 min ago');
  const standalone = parseLaunches({ launches: [{ id: 'standalone', status: 'live', chainId: 4663, updatedAt: '2026-10-21T12:00:00Z', artifacts: [{ role: 'other', name: 'StandaloneHook', address: '0xABC' }] }] });
  assert.equal(standalone[0].name, 'StandaloneHook'); assert.equal(matchesLaunch(standalone[0], { chainId: 4663, hookAddress: '0xabc' }), true);
});
test('new type A drafts default to IMD and persisted explicit pairings survive normalization', () => {
  assert.equal(newDraft().settings.pair, 'imd'); assert.equal(body(newDraft()).pairWith, 'imd');
  assert.equal(normalizeDraft({ settings: { pair: 'eth' } }).settings.pair, 'eth');
});
