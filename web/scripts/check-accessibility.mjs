// Tool-only dependencies may live outside the repository. No build/package changes needed.
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { serve } from '../../scripts/serve.mjs';
import { newDraft } from '../../src/lib/compose.ts';
import site from '../../public/site-config.json' with { type: 'json' };

const toolRoot = process.env.HOOKS_A11Y_TOOLS;
if (!toolRoot) throw new Error('Set HOOKS_A11Y_TOOLS to a directory with node_modules/lighthouse and node_modules/puppeteer-core.');
const toolRequire = createRequire(pathToFileURL(resolve(toolRoot, 'package.json')));
const { default: lighthouse, snapshot } = await import(pathToFileURL(toolRequire.resolve('lighthouse')).href);
const { default: puppeteer } = await import(pathToFileURL(toolRequire.resolve('puppeteer-core')).href);
const output = resolve(process.env.HOOKS_A11Y_OUT ?? new URL('../../tests/results/job7/', import.meta.url).pathname);
const checked = JSON.parse(await readFile(new URL('../../evidence/check-A-default-blocks.response.json', import.meta.url), 'utf8'));
const server = await serve();
const url = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
const results = [];
try {
  browser = await puppeteer.launch({ executablePath: chromium.executablePath(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const draft = newDraft(); draft.mode = 'prompt'; draft.prompt = 'Observe swaps with no fees or owner powers.'; draft.settings.chain = 1; draft.settings.pool = 50;
  draft.settings.rem = '0x3f252e859a277a86A3967c11D4E054B2f07a1F22';
  await page.evaluateOnNewDocument(d => { try { localStorage.setItem('hooks-store:draft:v2', JSON.stringify(d)); } catch {} }, draft);
  await page.setRequestInterception(true);
  page.on('request', async request => {
    try {
      if (request.method() === 'OPTIONS') return await request.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET', 'Access-Control-Allow-Headers': 'Content-Type' } });
      if (request.url().endsWith('/site-config.json')) return await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...site, relayUrl: 'https://relay.hooks.test' }) });
      if (request.url().startsWith(url)) return await request.continue();
      if (request.url() === 'https://relay.hooks.test/check') return await request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(checked) });
      if (request.url().includes('rpc.mevblocker.io') || request.url().includes('rpc.mainnet.chain.robinhood.com')) {
        const req = JSON.parse(request.postData() || '{}'), chain = request.url().includes('robinhood') ? 4663 : 1;
        const answer = r => ({ jsonrpc: '2.0', id: r.id, result: r.method === 'eth_chainId' ? `0x${chain.toString(16)}` : r.method === 'eth_getLogs' ? [] : '0x6000000' });
        return await request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(Array.isArray(req) ? req.map(answer) : answer(req)) });
      }
      return await request.respond({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Unavailable in this deterministic accessibility fixture' });
    } catch { /* A Lighthouse target can close during cleanup. */ }
  });
  await mkdir(output, { recursive: true });
  const flags = { onlyCategories: ['accessibility'], logLevel: 'error', output: 'json', disableStorageReset: true, formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }, throttlingMethod: 'provided' };
  for (const route of ['store', 'builder']) {
    const run = await lighthouse(`${url}#${route}`, flags, undefined, page);
    await writeFile(resolve(output, `lighthouse-${route}.json`), JSON.stringify(run.lhr, null, 2) + '\n');
    results.push({ route, mode: 'navigation', finalUrl: run.lhr.finalDisplayedUrl, score: run.lhr.categories.accessibility.score * 100, failed: Object.entries(run.lhr.audits).filter(([, a]) => a.score !== null && a.score < 1).map(([id, a]) => ({ id, title: a.title, score: a.score })) });
  }
  await page.click('.preview .actions button:first-child');
  await page.waitForSelector('.swarm-panel');
  const run = await snapshot(page, { flags });
  await writeFile(resolve(output, 'lighthouse-builder-checked.json'), JSON.stringify(run.lhr, null, 2) + '\n');
  results.push({ route: 'builder', mode: 'checked response snapshot', score: run.lhr.categories.accessibility.score * 100, failed: Object.entries(run.lhr.audits).filter(([, a]) => a.score !== null && a.score < 1).map(([id, a]) => ({ id, title: a.title, score: a.score })) });
  await writeFile(resolve(output, 'lighthouse-summary.json'), JSON.stringify({ lighthouseVersion: run.lhr.lighthouseVersion, width: 390, results, fixture: 'Production export; deterministic empty chain history, unavailable swarm metrics, and a recorded IMD free-check response. No wallet or transaction.' }, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => r.score < 95)) process.exitCode = 1;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
