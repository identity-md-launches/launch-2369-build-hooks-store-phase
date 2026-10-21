import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { coinbaseWallet } from 'wagmi/connectors/coinbaseWallet';
import { defineChain } from 'viem';
import type { SiteConfig } from '../config';

export function createWalletConfig(site: SiteConfig) {
  const chains = site.chains.map(chain => defineChain({
    id: chain.id, name: chain.name, testnet: chain.testnet,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [chain.rpcUrl] } },
    blockExplorers: { default: { name: `${chain.name} explorer`, url: chain.explorerUrl } },
  }));
  return createConfig({
    chains: [chains[0], chains[1], chains[2]],
    multiInjectedProviderDiscovery: true,
    connectors: [injected(), coinbaseWallet({ appName: 'The Hooks Store', appLogoUrl: new URL('favicon.svg', document.baseURI).href, preference: { options: 'all' } })],
    transports: Object.fromEntries(chains.map(chain => [chain.id, http(chain.rpcUrls.default.http[0])])),
  });
}
