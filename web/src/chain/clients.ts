import { createPublicClient, defineChain, fallback, http } from 'viem';
import { mainnet } from 'viem/chains';
import type { SiteConfig } from '../config';
/** Every public endpoint in order, each tried once more after the list, before a read reports an error. */
export const rpcTransport = (urls: string[]) => fallback(urls.map(url => http(url, { timeout: 12000, retryCount: 0 })), { retryCount: 1, retryDelay: 500 });
/** Each chain lists one or more public HTTPS RPC endpoints, tried in order. */
export const validRpcUrls = (urls: unknown): urls is string[] => Array.isArray(urls) && urls.length > 0 && new Set(urls).size === urls.length
  && urls.every(url => typeof url === 'string' && /^https:\/\/[^/?#\s]+(\/[^?#\s]*)?$/.test(url) && !new URL(url).username && !new URL(url).password);
export function publicClients(config: SiteConfig) {
  return Object.fromEntries(config.chains.map(c => [c.id, createPublicClient({
    chain: c.id === 1 ? mainnet : defineChain({ id: c.id, name: c.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: c.rpcUrls } } }),
    transport: rpcTransport(c.rpcUrls),
    batch: { multicall: false },
  })]));
}
export type ReadClient = ReturnType<typeof publicClients>[number];
export const readCache = <T>(key: string): T | null => { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } };
export const writeCache = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Memory remains usable when storage is unavailable or full. */ } };
