import { createPublicClient, defineChain, http } from 'viem';
import { mainnet } from 'viem/chains';
import type { SiteConfig } from '../config';
export function publicClients(config: SiteConfig) {
  return Object.fromEntries(config.chains.map(c => [c.id, createPublicClient({
    chain: c.id === 1 ? mainnet : defineChain({ id: c.id, name: c.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [c.rpcUrl] } } }),
    transport: http(c.rpcUrl, { timeout: 12000, retryCount: 1, retryDelay: 1000 }),
    batch: { multicall: false },
  })]));
}
export type ReadClient = ReturnType<typeof publicClients>[number];
export const readCache = <T>(key: string): T | null => { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } };
export const writeCache = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Memory remains usable when storage is unavailable or full. */ } };
