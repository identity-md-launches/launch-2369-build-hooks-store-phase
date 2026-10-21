import { test, expect } from '@playwright/test';
import { routeReadTransports } from './live-transport';
test('a fresh browser settles both real RPC histories within 30 seconds', async ({ page }) => {
  test.skip(process.env.HOOKS_LIVE_RPC !== '1', 'Opt in to real, read-only public RPC calls with HOOKS_LIVE_RPC=1.');
  await routeReadTransports(page);
  const calls: Record<string, number> = {}, start = Date.now();
  page.on('request', request => { if (/rpc.mevblocker.io|rpc.mainnet.chain.robinhood.com/.test(request.url())) { const req = request.postDataJSON(); if (req?.method === 'eth_getLogs') calls[request.url()] = (calls[request.url()] ?? 0) + 1; } });
  await page.goto('./#catalog');
  await expect(page.locator('.read-status')).toContainText('Read from Ethereum and Robinhood Chain', { timeout: Math.max(1, 30000 - (Date.now() - start)) });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(30000);
  expect(Object.keys(calls)).toHaveLength(2);
  console.log(JSON.stringify({ liveRpcElapsedMs: elapsed, logCalls: calls }));
});
