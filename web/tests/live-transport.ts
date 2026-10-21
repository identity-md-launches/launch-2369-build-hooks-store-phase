import type { Page } from '@playwright/test';
import site from '../../public/site-config.json' with { type: 'json' };

/** Use contributor-supplied read transports only during opted-in verification; never bundle their URLs. */
export async function routeReadTransports(page: Page) {
  for (const chain of site.chains) {
    const endpoint = process.env[`HOOKS_READ_RPC_${chain.id}`];
    if (endpoint) await page.route(chain.rpcUrl, async route => {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: route.request().postData(), signal: AbortSignal.timeout(12000) });
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
  }
}
