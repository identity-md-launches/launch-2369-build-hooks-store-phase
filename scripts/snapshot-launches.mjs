#!/usr/bin/env node
/** Public, build-time catalog. No browser CORS workaround or private credentials. */
import { mkdir, writeFile, rename, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

export const API = 'https://api.imd.fun';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const text = value => typeof value === 'string' ? value : '';
const address = value => /^0x[0-9a-f]{40}$/i.test(text(value)) ? value : null;
const hash = value => /^0x[0-9a-f]{64}$/i.test(text(value)) ? value : null;

export function requestText(detail) {
  return (Array.isArray(detail.jobs) ? detail.jobs : []).map(job => text(job.objective)).filter(Boolean).join('\n\n');
}

export function isHookLaunch(detail) {
  return detail.kind === 'univ4_hook' || (detail.kind === 'evm_contracts' && /\bUniswap\s+v4\s+hook\b/i.test(requestText(detail)));
}

// Conservative matches of affirmative numbered rules. Unknown/legacy prose stays Custom.
const RULES = [
  ['fees', 'Different buy and sell fees', /^Take [\d.]+% of the ETH side of every buy and [\d.]+% of the ETH side of every sell as a hook fee/i],
  ['fees', 'Swap fee', /^Take [\d.]+% of the ETH side of every (?:buy and sell|buy|sell) as a hook fee/i],
  ['fees', 'Fee that fades', /^The hook fee starts at [\d.]+% .* decreases linearly/i],
  ['fees', 'Whale fee', /^Any swap whose ETH side is larger than .* pays an extra/i],
  ['fees', 'Volatility fee', /^When the pool price has moved more than .* the hook fee/i],
  ['fees', 'Split the fee', /^Split every hook fee:/i],
  ['fees', 'Dynamic LP fee', /^The pool uses a dynamic LP fee that the hook sets per swap/i],
  ['protection', 'Anti-sniper window', /^For the first \d+ minutes after the pool opens, each wallet may buy at most/i],
  ['protection', 'Max buy per wallet', /^Each wallet may buy at most .* for the life of the pool/i],
  ['protection', 'Max swap size', /^Reject any single swap whose specified amount is above/i],
  ['protection', 'Anti-sandwich', /^Protect swappers from sandwich attacks:/i],
  ['protection', 'Cooldown', /^A wallet must wait at least \d+ seconds between its swaps/i],
  ['protection', 'Circuit breaker', /^If the pool price moves more than .* reject every swap for the next/i],
  ['treasury', 'Buyback jar', /^Collect [\d.]+% of the ETH side of every swap into a jar/i],
  ['treasury', 'Prize pot', /^Collect [\d.]+% of the ETH side of every buy into a prize pot/i],
  ['treasury', 'Share fees with LPs', /^Donate [\d.]+% of every hook fee back to the pool/i],
  ['liquidity', 'Liquidity lock', /^Liquidity added to the pool is locked for/i],
  ['liquidity', 'JIT penalty', /^Penalize just-in-time liquidity:/i],
  ['liquidity', 'LP allowlist', /^Only addresses the owner has added to a liquidity allowlist/i],
  ['liquidity', 'Minimum position', /^Reject adding liquidity worth less than/i],
  ['timing', 'Scheduled open', /^Reject every swap before .* UTC/i],
  ['timing', 'Trading hours', /^Allow swaps only between .* UTC each day/i],
  ['timing', 'Allowlist opening', /^For the first \d+ minutes after the pool opens, only addresses the owner has added to an allowlist/i],
  ['timing', 'Pause switch', /^The owner may pause and unpause swaps/i],
  ['timing', 'Sunset', /^After .* UTC every rule above stops applying/i],
  ['advanced', 'Price oracle', /^Record a time-weighted average price of the pool/i],
  ['advanced', 'Limit orders', /^Let users place limit orders in the hook/i],
  ['advanced', 'Yield on idle liquidity', /^Liquidity the pool is not using at the current price is lent/i],
  ['advanced', 'Batch auctions', /^Swaps are not filled immediately: the hook collects them/i],
  ['advanced', 'Stable curve', /^Replace the pool.s pricing with a constant-sum curve/i],
  ['advanced', 'Pool rules', /^Only pools where one currency is native ETH and the fee tier is/i],
  ['advanced', 'Donation rules', /^Donations to the pool are allowed from/i],
];

export function parseBlocks(request) {
  const found = new Map();
  const rules = [...request.matchAll(/(?:^|\n|\s)(\d+)\.\s+([\s\S]*?)(?=(?:\s+\d+\.\s+)|\n\s*\n|$)/g)].map(m => m[2].trim());
  for (const rule of rules) {
    let matched = false;
    for (const [group, label, pattern] of RULES) {
      if (pattern.test(rule)) { found.set(label, group); matched = true; break; }
    }
    if (!matched) found.set('Custom', 'custom');
  }
  if (/(?:Start from (?:the creator.s |my )?own source|import(?:ed)? (?:code|source)|own repository|from this repository|from https:\/\/github\.com\/)/i.test(request)) found.set('Own source', 'custom');
  if (!found.size) found.set('Custom', 'custom');
  return { blocks: [...found.keys()], groups: [...new Set(found.values())] };
}

export function normalizeStatus(value) {
  if (value === 'live') return 'live';
  if (['failed', 'rejected', 'cancelled', 'canceled', 'parked'].includes(value)) return 'failed';
  if (['requested', 'pending', 'queued', 'created'].includes(value)) return 'requested';
  return 'in-progress';
}

export function normalizeLaunch(detail) {
  if (!isHookLaunch(detail)) return null;
  if (!text(detail.id) || !Number.isSafeInteger(detail.chainId)) throw new Error('Launch is missing its id or chainId');
  const request = requestText(detail);
  const artifacts = Array.isArray(detail.artifacts) ? detail.artifacts : [];
  const hook = artifacts.find(a => a.role === 'hook') ?? artifacts.find(a => /hook/i.test(text(a.name)));
  const token = artifacts.find(a => a.role === 'token');
  const distributor = artifacts.find(a => a.role === 'distributor');
  const manifest = detail.attestation?.manifest;
  const name = text(hook?.name) || text(manifest?.hook?.contract) || request.match(/(?:^|\n)Hook name:\s*([^\n]+)/i)?.[1]?.trim() || text(artifacts.find(a => a.role !== 'token' && a.role !== 'distributor')?.name) || 'Unnamed hook';
  const symbol = text(manifest?.token?.symbol) || request.match(/(?:^|\n)Token symbol:\s*([A-Za-z0-9._-]+)/i)?.[1] || null;
  const prose = request.split('\n').filter(line => !/^(?:Project site:|Token name:|Token symbol:|WORKFLOW CONTRACT STAGE CONTEXT:|\[SIMD-LAUNCH\])/i.test(line.trim())).join(' ').replace(/\s+/g, ' ').trim();
  const firstSentence = prose.match(/^.*?[.!?](?=\s|$)/)?.[0];
  const summary = firstSentence && firstSentence.length <= 240 && !/0x[0-9a-f]{40}/i.test(firstSentence)
    ? firstSentence : detail.kind === 'univ4_hook' ? 'A Uniswap v4 hook requested through the IMD swarm.' : 'A contract launch whose request mentions a Uniswap v4 hook.';

  return {
    id: detail.id, requestId: hash(detail.requestId), kind: detail.kind,
    name, symbol, chainId: detail.chainId, status: normalizeStatus(detail.status), sourceStatus: text(detail.status),
    launchNumber: Number.isSafeInteger(detail.launchNumber) ? detail.launchNumber : null,
    createdAt: text(detail.createdAt) || null, updatedAt: text(detail.updatedAt) || null,
    summary, request, ...parseBlocks(request),
    builtHere: /Composed with The Hooks Store(?: block builder)?\./.test(request),
    hookAddress: address(hook?.address), tokenAddress: address(token?.address), distributorAddress: address(distributor?.address),
    payer: address(detail.requester), txHashes: [...new Set(artifacts.map(a => hash(a.txHash)).filter(Boolean))],
    currencies: [...new Set((detail.seeded?.pools ?? []).flatMap(p => [address(p.currency0), address(p.currency1)]).filter(Boolean))],
    sourceRepoUrl: text(detail.sourceRepoUrl) || null,
    jobIds: (detail.jobs ?? []).map(j => text(j.id)).filter(Boolean),
  };
}

export async function buildSnapshot({ fetchJson, now = () => new Date().toISOString(), concurrency = 2 } = {}) {
  fetchJson ??= async url => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await fetch(url, { signal: AbortSignal.timeout(45_000), headers: { accept: 'application/json' } });
      if (response.ok) return response.json();
      if (![429, 502, 503, 504].includes(response.status) || attempt === 5) throw new Error(`${response.status} fetching ${url}`);
      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Math.min(30_000, Math.max(2000 * (attempt + 1), Number.isFinite(retryAfter) ? retryAfter * 1000 : 0));
      await response.arrayBuffer();
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };
  const index = await fetchJson(`${API}/launches?limit=500`);
  if (!Array.isArray(index.launches)) throw new Error('Invalid launches index');
  const candidates = [...new Map(index.launches.filter(l => ['univ4_hook', 'evm_contracts'].includes(l.kind)).map(l => [l.id, l])).values()];
  const launches = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, async () => {
    while (cursor < candidates.length) {
      const entry = candidates[cursor++];
      if (!text(entry.id)) throw new Error('Index entry is missing id');
      const detail = await fetchJson(`${API}/launches/${encodeURIComponent(entry.id)}`);
      if (detail.id !== entry.id || detail.kind !== entry.kind) throw new Error(`Mismatched detail for ${entry.id}`);
      const launch = normalizeLaunch(detail);
      if (launch) launches.push(launch);
    }
  }));
  launches.sort((a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0) || a.id.localeCompare(b.id));
  return { version: 1, generatedAt: now(), source: `${API}/launches?limit=500`, inspected: index.launches.length, launches };
}

export async function saveSnapshot(snapshot, output) {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
  await rename(temporary, output); // A partial/failed fetch never replaces the last complete snapshot.
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const fixtureIndex = process.argv.indexOf('--fixture');
    const options = fixtureIndex >= 0 ? { fetchJson: async url => {
      const fixture = JSON.parse(await readFile(resolve(process.argv[fixtureIndex + 1]), 'utf8'));
      if (!(url in fixture)) throw new Error(`Fixture missing ${url}`);
      return fixture[url];
    } } : {};
    const outputIndex = process.argv.indexOf('--output');
    const output = outputIndex >= 0 ? resolve(process.argv[outputIndex + 1]) : resolve(ROOT, 'public/launches.json');
    const snapshot = await buildSnapshot(options);
    await saveSnapshot(snapshot, output);
    console.log(`Saved ${snapshot.launches.length} real hook launches; inspected ${snapshot.inspected} launches. ${outputIndex >= 0 ? 'Custom output.' : 'public/launches.json'}`);
  } catch (error) {
    console.error(`Snapshot failed; previous file retained. ${error.message}`);
    process.exitCode = 1;
  }
}
