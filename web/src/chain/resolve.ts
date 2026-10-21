import { parseAbi, isAddress, getAddress, type Address } from 'viem';
import type { ReadClient } from './clients.ts';
export const PERMISSIONS = ['beforeInitialize', 'afterInitialize', 'beforeAddLiquidity', 'afterAddLiquidity', 'beforeRemoveLiquidity', 'afterRemoveLiquidity', 'beforeSwap', 'afterSwap', 'beforeDonate', 'afterDonate', 'beforeSwapReturnDelta', 'afterSwapReturnDelta', 'afterAddLiquidityReturnDelta', 'afterRemoveLiquidityReturnDelta'] as const;
export const resolutionAbi = parseAbi([
  'function poolManager() view returns (address)',
  `function getHookPermissions() pure returns ((${PERMISSIONS.map(p => `bool ${p}`).join(', ')}))`,
  'function name() view returns (string)', 'function symbol() view returns (string)',
]);
export type ResolvedAddress = { chainId: number; address: string; kind: 'hook'; poolManager: string; permissions: string[] } | { chainId: number; address: string; kind: 'token'; name: string; symbol: string };
export function searchAddress(q: string): Address | null {
  const value = q.trim().replace(/^(?=[\da-fA-F]{40}$)/, '0x');
  return isAddress(value, { strict: false }) ? getAddress(value.toLowerCase()) : null;
}
export async function resolveOnChain(client: ReadClient, chainId: number, address: Address): Promise<ResolvedAddress | null> {
  const code = await client.getCode({ address });
  if (!code || code === '0x') return null;
  const [manager, permissions] = await Promise.allSettled([
    client.readContract({ address, abi: resolutionAbi, functionName: 'poolManager' }),
    client.readContract({ address, abi: resolutionAbi, functionName: 'getHookPermissions' }),
  ]);
  if (manager.status === 'fulfilled' && permissions.status === 'fulfilled' && typeof manager.value === 'string') {
    const flags = permissions.value as unknown as Record<string, boolean> | boolean[];
    return { chainId, address, kind: 'hook', poolManager: manager.value, permissions: PERMISSIONS.filter((p, i) => Array.isArray(flags) ? flags[i] : flags[p]) };
  }
  const [name, symbol] = await Promise.allSettled([
    client.readContract({ address, abi: resolutionAbi, functionName: 'name' }),
    client.readContract({ address, abi: resolutionAbi, functionName: 'symbol' }),
  ]);
  if (name.status === 'fulfilled' && symbol.status === 'fulfilled' && typeof name.value === 'string' && typeof symbol.value === 'string') return { chainId, address, kind: 'token', name: name.value, symbol: symbol.value };
  const failures = [manager, permissions, name, symbol].filter(r => r.status === 'rejected');
  if (failures.some(r => /network|fetch|timeout|rate limit|429|503|HTTP request failed/i.test(String((r as PromiseRejectedResult).reason)))) throw new Error('RPC unavailable');
  return null;
}
export async function resolveAddress(clients: Record<number, ReadClient>, address: Address) {
  const results = await Promise.allSettled([4663, 1].map(id => resolveOnChain(clients[id], id, address)));
  return { found: results.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []), unavailable: [4663, 1].filter((_, i) => results[i].status === 'rejected') };
}
