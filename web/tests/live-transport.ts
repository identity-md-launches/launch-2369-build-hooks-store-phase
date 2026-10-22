import type { Page } from '@playwright/test';
import site from '../../public/site-config.json' with { type: 'json' };

/** Use contributor-supplied read transports only during opted-in verification; never bundle their URLs. */
export async function routeReadTransports(page: Page) {
  const observations: Record<string, { calls: number; statuses: Record<string, number>; transportErrors: number }> = {};
  for (const chain of site.chains) {
    const endpoint = process.env[`HOOKS_READ_RPC_${chain.id}`];
    if (endpoint) await page.route(chain.rpcUrls[0], async route => {
      const observation = observations[chain.rpcUrls[0]] ??= { calls: 0, statuses: {}, transportErrors: 0 }; observation.calls++;
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: route.request().postData(), signal: AbortSignal.timeout(12000) });
        observation.statuses[response.status] = (observation.statuses[response.status] ?? 0) + 1;
        await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      } catch {
        observation.transportErrors++;
        if (!page.isClosed()) await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: { code: -32000, message: 'The verification read transport timed out.' } }) }).catch(() => {});
      }
    });
  }
  return observations;
}
