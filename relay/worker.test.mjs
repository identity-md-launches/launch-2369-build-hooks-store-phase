import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const tx = `0x${'a'.repeat(64)}`;
async function fixture(run, answer = () => new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'must-not-forward=yes' } })) {
  const originalFetch = globalThis.fetch, originalCache = globalThis.caches;
  const calls = [], stored = new Map(), writes = []; let now = 0;
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), ...options }); return answer(url, options); };
  globalThis.caches = { default: {
    async match(key) { const hit = stored.get(key.url); return hit && now < hit.expires ? hit.response.clone() : undefined; },
    async put(key, response) { writes.push(response.headers.get('Cache-Control')); stored.set(key.url, { response, expires: now + 30000 }); },
  } };
  const request = (path, method = 'GET', options = {}) => worker.fetch(new Request(`https://relay.example${path}`, { method, ...options }), {}, { waitUntil: promise => writes.push(promise) });
  try { await run({ request, calls, writes, advance: ms => { now += ms; } }); }
  finally { globalThis.fetch = originalFetch; if (originalCache === undefined) delete globalThis.caches; else globalThis.caches = originalCache; }
}

test('the exact GET allowlist forwards paths and queries to the fixed production origin', async () => fixture(async ({ request, calls }) => {
  for (const path of ['/launches?limit=10&status=live', '/launches/abc-123', '/jobs/abc-123', `/intake/4663/${tx}`]) {
    const response = await request(path);
    assert.equal(response.status, 200); assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(calls.at(-1).url, `https://api.imd.fun${path}`);
    assert.equal(calls.at(-1).method, 'GET'); assert.equal(calls.at(-1).redirect, 'manual');
    assert.equal(response.headers.has('Set-Cookie'), false);
  }
}));

test('POST check and import preserve JSON bytes, never forward credentials, and never cache', async () => fixture(async ({ request, calls, writes }) => {
  for (const path of ['/check', '/import']) for (let i = 0; i < 2; i++) {
    const body = JSON.stringify({ action: 'launch.open', input: { objective: 'Unicode: pond · hook' } });
    const response = await request(path, 'POST', { headers: { 'Content-Type': 'application/json; charset=utf-8', Cookie: 'private=true', Authorization: 'secret', 'X-Forwarded-Host': 'evil.example' }, body });
    assert.equal(calls.at(-1).url, `https://api.imd.fun/requests${path}`);
    assert.equal(calls.at(-1).body, body);
    assert.deepEqual(calls.at(-1).headers, { Accept: 'application/json', 'Content-Type': 'application/json' });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(calls.length, 4); assert.equal(writes.length, 0);
}));

test('successful GETs cache for 30 seconds, with query strings as separate keys', async () => fixture(async ({ request, calls, writes, advance }) => {
  await request('/launches?limit=1'); await request('/launches?limit=1');
  assert.equal(calls.length, 1); assert.equal(writes[0], 'public, max-age=30');
  await request('/launches?limit=2'); assert.equal(calls.length, 2);
  advance(29999); await request('/launches?limit=1'); assert.equal(calls.length, 2);
  advance(1); const response = await request('/launches?limit=1'); assert.equal(calls.length, 3);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
}));

test('all other paths and methods are rejected locally, including path-prefix and encoded-path attacks', async () => fixture(async ({ request, calls }) => {
  for (const path of ['/', '/requests/check', '/launches-extra', '/launches/', '/launches/a/b', '/jobs', '/jobs/a/result', '/jobs/a%2Fb', '/jobs/%2e%2e/check', '/intake/1/no-tx', `/intake/0/${tx}`, '//evil.example/check']) {
    assert.ok([404, 405].includes((await request(path)).status), path); // URL parsing normalizes dot segments before routing.
  }
  for (const [path, method] of [['/check', 'GET'], ['/import', 'PUT'], ['/launches', 'POST'], ['/jobs/abc', 'DELETE'], ['/launches', 'HEAD'], ['/launches/abc', 'PATCH']]) assert.equal((await request(path, method)).status, 405);
  assert.equal(calls.length, 0);
}));

test('CORS preflight accepts only the route method and safe headers', async () => fixture(async ({ request, calls }) => {
  const response = await request('/check', 'OPTIONS', { headers: { Origin: 'https://store.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(response.status, 204); assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST');
  assert.equal((await request('/check', 'OPTIONS', { headers: { 'Access-Control-Request-Method': 'DELETE' } })).status, 405);
  assert.equal((await request('/check', 'OPTIONS', { headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization' } })).status, 405);
  assert.equal((await request('/other', 'OPTIONS')).status, 404); assert.equal(calls.length, 0);
}));

test('upstream errors retain status and CORS, are not cached, and can be retried', async () => fixture(async ({ request, calls, writes }) => {
  for (let i = 0; i < 2; i++) { const response = await request('/jobs/abc'); assert.equal(response.status, 429); assert.equal(await response.text(), '{"error":"busy"}'); assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*'); }
  assert.equal(calls.length, 2); assert.equal(writes.length, 0);
}, () => new Response('{"error":"busy"}', { status: 429 })));

test('network failures and redirects fail closed with CORS', async () => {
  for (const answer of [() => { throw new Error('socket failure'); }, () => new Response(null, { status: 302, headers: { Location: 'https://evil.example' } })]) await fixture(async ({ request, calls }) => {
    const response = await request('/launches'); assert.equal(response.status, 502);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*'); assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.equal(calls.length, 1);
  }, answer);
});

test('non-JSON and oversized POSTs do not reach IMD', async () => fixture(async ({ request, calls }) => {
  assert.equal((await request('/check', 'POST', { body: '{}' })).status, 415);
  assert.equal((await request('/check', 'POST', { headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(65537) })).status, 413);
  assert.equal(calls.length, 0);
}));

test('cache failures still return a CORS-enabled upstream response', async () => fixture(async ({ request }) => {
  globalThis.caches.default.match = async () => { throw new Error('cache unavailable'); };
  globalThis.caches.default.put = async () => { throw new Error('cache unavailable'); };
  const response = await request('/launches'); assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
}));
