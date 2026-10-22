import { createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { coinbaseWallet } from 'wagmi/connectors/coinbaseWallet';
import { defineChain } from 'viem';
import type { SiteConfig } from '../config';
import { rpcTransport } from '../chain/clients';

export function createWalletConfig(site: SiteConfig) {
  const chains = site.chains.map(chain => defineChain({
    id: chain.id, name: chain.name, testnet: chain.testnet,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: chain.rpcUrls } },
    blockExplorers: { default: { name: `${chain.name} explorer`, url: chain.explorerUrl } },
  }));
  return createConfig({
    chains: [chains[0], chains[1]],
    multiInjectedProviderDiscovery: true,
    connectors: [injected(), coinbaseWallet({ appName: 'The Hooks Store', appLogoUrl: new URL('favicon.svg', document.baseURI).href, preference: { options: 'all' } })],
    transports: Object.fromEntries(chains.map(chain => [chain.id, rpcTransport([...chain.rpcUrls.default.http])])),
  });
}
