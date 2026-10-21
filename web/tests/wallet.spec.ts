import { emptyIntake } from './chain-fixture';
import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({page}) => emptyIntake(page));
// A real public payer address from job 1's saved launch snapshot; no private key is involved.
const payer = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
async function walletFixture(page: Page, reject = false) {
  await page.addInitScript(({ account, shouldReject }) => {
    const testWindow = window as unknown as Window & { walletFixture: { reject: boolean; events: Record<string, ((value: unknown) => void)[]>; methods: string[] } };
    const events: Record<string, ((value: unknown) => void)[]> = {};
    let chainId = '0x1', authorized = false;
    testWindow.walletFixture = { reject: shouldReject, events, methods: [] };
    const provider = {
      on(event: string, fn: (value: unknown) => void) { (events[event] ??= []).push(fn); },
      removeListener(event: string, fn: (value: unknown) => void) { events[event] = (events[event] ?? []).filter(x => x !== fn); },
      async request({ method, params }: { method: string; params?: { chainId: string }[] }) {
        testWindow.walletFixture.methods.push(method);
        if (method === 'eth_requestAccounts') {
          if (testWindow.walletFixture.reject) throw Object.assign(new Error('User rejected the request'), { code: 4001 });
          authorized = true; return [account];
        }
        if (method === 'eth_accounts') return authorized ? [account] : [];
        if (method === 'eth_chainId') return chainId;
        if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
          chainId = params![0].chainId; events.chainChanged?.forEach(fn => fn(chainId)); return null;
        }
        if (method === 'wallet_revokePermissions') return null;
        throw Object.assign(new Error(`Unsupported fixture method ${method}`), { code: 4200 });
      },
    };
    const announce = () => dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { uuid: '26a04a43-28d9-490b-84f7-bc02ef1be771', name: 'Fixture Wallet', rdns: 'test.hooks-store.wallet', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path d="M4 4h20v20H4z"/></svg>' }, provider } }));
    addEventListener('eip6963:requestProvider', announce); announce();
  }, { account: payer, shouldReject: reject });
}
test('EIP-6963 lists a named wallet, handles rejection, connects a real fixture address and disconnects', async ({ page }) => {
  await walletFixture(page, true); await page.route('https://api.imd.fun/swarm', route => route.fulfill({ status: 503 })); await page.goto('#store');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Browser wallet' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fixture Wallet', exact: true }).click();
  await expect(page.getByText('Connection cancelled. Choose a wallet to try again.')).toBeVisible();
  await page.evaluate(() => { (window as unknown as Window & { walletFixture: { reject: boolean } }).walletFixture.reject = false; });
  await page.getByRole('button', { name: 'Fixture Wallet', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#connect')).toHaveClass(/address/); expect((await page.locator('#connect').textContent())!.length).toBe(12);
  expect((await page.locator('#connect').boundingBox())!.width).toBe(168);
  await expect(page.locator('.chainpill')).toHaveText('ETHEREUM · ROBINHOOD');
  await page.locator('#connect').click(); await expect(page.locator('#connect')).toHaveText('Connect');
  const methods = await page.evaluate(() => (window as unknown as Window & { walletFixture: { methods: string[] } }).walletFixture.methods);
  expect(methods.some(m => /sendTransaction|sign/i.test(m))).toBe(false);
});
test('mobile connect offers four wallet-browser links and Coinbase Smart Wallet without a relay', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/preview/#store'); await page.locator('#connect').click();
  for (const name of ['MetaMask', 'Coinbase Wallet', 'Rabby', 'Phantom']) await expect(page.getByRole('link', { name: `Open in ${name}` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Coinbase Smart Wallet', exact: true })).toBeVisible();
  await expect(page.getByText('WalletConnect', { exact: true })).toHaveCount(0);
  const href = await page.getByRole('link', { name: 'Open in Rabby' }).getAttribute('href');
  expect(new URL(href!).searchParams.get('dapp')).toBe(page.url());
  const sheet = (await page.getByRole('dialog').boundingBox())!; expect(sheet.y + sheet.height).toBeLessThanOrEqual(844); expect(sheet.y).toBeGreaterThan(300);
  await page.getByRole('button', { name: 'Close wallet picker' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible(); await context.close();
});
