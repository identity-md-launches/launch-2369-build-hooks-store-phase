import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCheck, checkRequest, importSource, intakeJob, jobAttention, jobStages, parseLaunches, matchesLaunch, relativeTime, relayFetch } from '../web/src/relay.ts';
import { newDraft, body, normalizeDraft } from '../src/lib/compose.ts';

const safeDraft = () => { const d = newDraft(); d.settings.chain = 1; d.settings.pool = 50; return body(d, '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34'); };
const result = JSON.parse(readFileSync(new URL('../evidence/check-A-default-blocks.response.json', import.meta.url)));
test('IMD facts, states, plan titles, blockers and suggestions are retained without inventing success', () => {
  const parsed = parseCheck(result); assert.equal(parsed.facts[0].state, 'stated'); assert.equal(parsed.plan[0].title, 'Build and test the contracts');
  assert.deepEqual(parseCheck({ ...result, blockers: [{ detail: 'Choose a supported lending protocol.' }], suggestions: ['Describe the fee destination.'] }).blockers, ['Choose a supported lending protocol.']);
  assert.throws(() => parseCheck({ facts: [], plan: [] }), /incomplete/);
  assert.throws(() => parseCheck({ ...result, facts: [{ label: 'No state' }] }), /invalid/);
  assert.equal(parseCheck({ ...result, facts: [{ label: 'Safe optional text', state: 'unknown', assumed: { unsafe: true } }] }).facts[0].assumed, undefined);
});
test('free check sends the exact composer body inside the action envelope', async t => {
  const input = safeDraft(); let sent;
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
  await assert.rejects(checkRequest('https://relay.example', safeDraft()), /503.*Try later/);
});
test('HTML, proxy text, empty and malformed JSON responses use a retryable status message', async t => {
  let response;
  t.mock.method(globalThis, 'fetch', async () => response);
  for (const [status, text] of [[503, '<html>Cloudflare unavailable</html>'], [502, 'Bad Gateway'], [500, ''], [200, '<html>Proxy page</html>'], [200, '{broken'], [204, null]]) {
    response = new Response(text, { status });
    await assert.rejects(relayFetch('https://relay.example', '/check', {}), e => {
      assert.equal(e instanceof SyntaxError, false);
      assert.equal(e.message, `IMD could not finish this request (${status}). Try again.`);
      return true;
    });
  }
  response = Response.json({ error: { unexpected: 'shape' } }, { status: 503 });
  await assert.rejects(relayFetch('https://relay.example', '/launches'), /\(503\)\. Try again\./);
});
test('intake job discovery matches the request id and action before using admission.result.jobId', () => {
  const entry = { requestId: '0xABC', action: 'launch.open', admission: { result: { jobId: 'job-123' } } };
  assert.equal(intakeJob({ entries: [entry] }, '0xabc'), 'job-123');
  assert.equal(intakeJob({ entries: [entry] }, '0xdef'), null);
  assert.equal(intakeJob({ entries: [{ ...entry, action: 'job.open' }] }, '0xabc'), null);
});
test('recorded live GET /jobs/:id response uses waiting, accepted and failed without inventing progress', () => {
  const job = JSON.parse(readFileSync(new URL('fixtures/relay/job-live.response.json', import.meta.url)));
  assert.equal(job.id, 'a6715145-76db-498f-9ca9-a11ed38d82a8');
  assert.deepEqual(jobStages(job).map(s => s.state), ['failed', 'pending', 'pending']);
  // Replay the active phases in the recorded response's actual schema.
  const build = job.nodes.find(n => n.role === 'implement');
  build.state = 'working'; assert.equal(jobStages(job)[0].state, 'active');
  build.state = 'accepted';
  job.nodes.find(n => n.role === 'review' && n.state === 'waiting').state = 'working';
  assert.equal(jobStages(job)[1].state, 'active');
  job.nodes.forEach(n => n.state = 'accepted'); job.state = 'completed';
  assert.deepEqual(jobStages(job).map(s => s.state), ['complete', 'complete', 'active']);
  job.launch.status = 'live'; assert.equal(jobStages(job)[2].state, 'complete');
});
test('blocked questions retain IMD blockedReason and every failed-node failureReason verbatim', () => {
  const job = JSON.parse(readFileSync(new URL('fixtures/relay/job-live.response.json', import.meta.url)));
  const attention = jobAttention(job);
  assert.equal(attention.blocked, true);
  assert.deepEqual(attention.questions, [job.blockedReason, ...job.nodes.filter(n => n.state === 'failed').map(n => n.failureReason)]);
  assert.deepEqual(jobAttention({ state: 'completed', nodes: [] }), { blocked: false, questions: [] });
  assert.deepEqual(jobAttention({ state: 'blocked', blockedReason: null, nodes: [] }), { blocked: true, questions: [] });
  const question = 'needs_input: <script>literal question</script>\nWhich pool?';
  assert.deepEqual(jobAttention({ state: 'executing', nodes: [{ state: 'failed', failureReason: question }] }), { blocked: true, questions: [question] });
});
test('an inconsistent composer body is refused locally without making a relay call', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json(result); });
  const input = safeDraft(); input.pairWith = 'imd'; input.objective = input.objective.replace('paired with IMD.', 'paired with ETH.');
  await assert.rejects(checkRequest('https://relay.example', input), /request and launch body/);
  assert.equal(calls, 0);
});
test('job nodes map real build, audit and deployment states, including failures', () => {
  const job = { state: 'executing', nodes: [{ key: 'build_contract_project', state: 'accepted' }, { key: 'write_foundry_tests', state: 'accepted' }, { key: 'audit_math', role: 'review', state: 'working' }, { key: 'audit_judge', state: 'waiting' }], launch: { status: null } };
  assert.deepEqual(jobStages(job).map(s => [s.title, s.state]), [['Building', 'complete'], ['Audit panel', 'active'], ['Deploying', 'pending']]);
  job.nodes[2].state = 'failed'; assert.equal(jobStages(job)[1].state, 'failed');
  job.nodes[2].state = 'accepted'; job.nodes[3].state = 'accepted'; job.state = 'completed';
  assert.deepEqual(jobStages(job).map(s => s.state), ['complete', 'complete', 'active']);
  job.launch.status = 'live'; assert.equal(jobStages(job)[2].state, 'complete');
  assert.equal(jobStages({ nodes: [{ key: 'security_check', role: 'audit', state: 'working' }] })[1].state, 'active');
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
