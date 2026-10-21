import { test, expect } from '@playwright/test';
import { routeReadTransports } from './live-transport';
import fs from 'node:fs';
test('a fresh browser settles both real RPC histories within 30 seconds', async ({ page }) => {
  test.skip(process.env.HOOKS_LIVE_RPC !== '1', 'Opt in to real, read-only public RPC calls with HOOKS_LIVE_RPC=1.');
  const transports = await routeReadTransports(page);
  const calls: Record<string, number> = {}, start = Date.now();
  page.on('request', request => { if (/rpc.mevblocker.io|rpc.mainnet.chain.robinhood.com/.test(request.url())) { const req = request.postDataJSON(); if (req?.method === 'eth_getLogs') calls[request.url()] = (calls[request.url()] ?? 0) + 1; } });
  let passed = false;
  try {
    await page.goto('./#catalog');
    await expect(page.locator('.read-status')).toContainText('Read from Ethereum and Robinhood Chain', { timeout: Math.max(1, 30000 - (Date.now() - start)) });
    expect(Date.now() - start).toBeLessThan(30000);
    expect(Object.keys(calls)).toHaveLength(2); passed = true;
  } finally {
    const result = { capturedAt: new Date().toISOString(), passed, liveRpcElapsedMs: Date.now() - start, status: await page.locator('.read-status').innerText().catch(() => 'Page closed'), logCalls: calls, transports };
    fs.mkdirSync('../tests/results/job7', { recursive: true }); fs.writeFileSync('../tests/results/job7/live-rpc.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  }
});
