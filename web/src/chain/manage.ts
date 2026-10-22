import { parseAbiItem, isAddress, getAddress, formatEther, type AbiFunction } from 'viem';
import { BY_ID, type BlockEntry, type Fn } from '../../../src/lib/compose.ts';
import pondside2424 from '../../../src/abi/PondsideGuard-2424-controls.json' with { type: 'json' };
import legacyCatalog from '../../../src/blocks/legacy-catalog.json' with { type: 'json' };
const LEGACY_BY_ID = Object.fromEntries(legacyCatalog.blocks.map(block => [block.id, block])) as typeof BY_ID;
export type ManagementFn = Fn & { access: 'owner' | 'anyone' | 'user' | 'view'; abi: AbiFunction };
const boolViews = new Set(['isVolatile', 'isLpAllowed', 'isOpen', 'isAllowed', 'paused']);
export function functionAbi(sig: string, view: boolean): AbiFunction {
  const name = sig.split('(')[0];
  const result = name === 'owner' ? 'address' : boolViews.has(name) ? 'bool' : name === 'twap' ? 'uint160' : 'uint256';
  // Solidity's PoolId is a bytes32 user-defined value type at the ABI boundary.
  const abiSig = sig.replace(/\bPoolId(?:\s+poolId)?\b/g, 'bytes32 poolId');
  return parseAbiItem(`function ${abiSig}${view ? ` view returns (${result})` : name === 'placeOrder' ? ' returns (uint256)' : ''}`) as AbiFunction;
}
export const ownerAbi = [functionAbi('owner()', true)];
export function managementFunctions(blocks: BlockEntry[]) {
  const seen = new Set<string>(), rows: ManagementFn[] = [];
  for (const block of blocks) for (const access of ['owner', 'anyone', 'user', 'view'] as const) {
    for (const fn of (block.legacy ? LEGACY_BY_ID : BY_ID)[block.id]?.[access] ?? []) {
      if (!block.legacy && block.id === 'donate' && block.p.who !== 'only allowlisted addresses' && fn.sig.startsWith('setDonor(')) continue;
      if (seen.has(fn.sig)) continue;
      seen.add(fn.sig); rows.push({ ...fn, access, abi: functionAbi(fn.sig, access === 'view') });
    }
  }
  return rows;
}
export function argumentValues(abi: AbiFunction, values: string[]): unknown[] {
  return abi.inputs.map((input, i) => {
    const raw = (values[i] ?? '').trim(), label = input.name || `Argument ${i + 1}`;
    if (input.type === 'address' || input.type === 'address[]') {
      const addresses = input.type.endsWith('[]') ? raw.split(/[\s,]+/).filter(Boolean) : [raw];
      if (!addresses.length || addresses.some(a => !isAddress(a))) throw new Error(`${label}: enter ${input.type.endsWith('[]') ? 'comma-separated addresses' : 'a full address'} with a valid checksum or all lowercase.`);
      return input.type.endsWith('[]') ? addresses.map(a => getAddress(a)) : getAddress(addresses[0]);
    }
    if (input.type === 'bool') {
      if (!['true', 'false'].includes(raw)) throw new Error(`${label}: choose true or false.`);
      return raw === 'true';
    }
    if (/^bytes\d+$/.test(input.type)) {
      const length = Number(input.type.slice(5));
      if (!new RegExp(`^0x[\\da-fA-F]{${length * 2}}$`).test(raw)) throw new Error(`${input.name === 'poolId' ? 'Pool id' : label}: enter a full ${length}-byte 0x value.`);
      return raw;
    }
    const int = /^(u?int)(\d*)$/.exec(input.type);
    if (int) {
      if (!/^-?\d+$/.test(raw)) throw new Error(`${label}: enter a whole number in contract units.`);
      const bits = BigInt(int[2] || 256), n = BigInt(raw), signed = int[1] === 'int';
      if (n < (signed ? -(1n << (bits - 1n)) : 0n) || n > (signed ? (1n << (bits - 1n)) - 1n : (1n << bits) - 1n)) throw new Error(`${label}: outside the ${input.type} range.`);
      return bits <= 48n ? Number(n) : n;
    }
    throw new Error(`Unsupported argument type: ${input.type}`);
  });
}
export function formatReading(name: string, value: unknown, pairCurrency = 'ETH'): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'bigint' || typeof value === 'number') {
    const n = BigInt(value);
    if (name === 'jar' || name === 'pot') return `${formatEther(n)} ${pairCurrency}`;
    if (name === 'currentFeeBps') return `${Number(n) / 100}%`;
    if (name === 'currentLpFee') return `${Number(n) / 10000}%`;
    if (/At$|Until$/.test(name)) return n === 0n ? 'Not set (0)' : Number(n) < 8640000000000 ? `${new Date(Number(n) * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}` : String(n);
    if (name === 'twap') return `${n} (Q64.96 sqrt price)`;
    return `${n} contract units`;
  }
  return String(value);
}
export function contractError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/reject|denied|cancel/i.test(text)) return 'Cancelled in your wallet. You can try again.';
  if (/insufficient funds/i.test(text)) return 'Not enough ETH for gas. Add ETH on this chain and try again.';
  if (/revert/i.test(text)) return 'The contract refused this call. Check its current readings, permissions and arguments before retrying.';
  return 'Could not complete the call. Check the network connection and try again.';
}

/** Prefer the verified source ABI, retaining the catalog's labels and access rules. */
export function functionsFromAbi(blocks: BlockEntry[], abi?: readonly unknown[]): ManagementFn[] {
  const fallback = managementFunctions(blocks);
  if (!abi) return fallback;
  return fallback.flatMap(row => {
    const matches = abi.filter((item: any): item is AbiFunction => item?.type === 'function' && item.name === row.abi.name) as AbiFunction[];
    return matches.map(fn => ({ ...row, abi: { ...fn, inputs: fn.inputs.map(input => input.internalType?.includes('PoolId') ? { ...input, name: 'poolId' } : input) }, sig: `${fn.name}(${fn.inputs.map(i => `${i.type}${i.name ? ` ${i.name}` : ''}`).join(',')})` }));
  });
}
export async function sourceAbi(repo: string | null, commit?: string, name?: string, signal?: AbortSignal) {
  const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(repo ?? '');
  if (!match || !/^[a-f\d]{40}$/i.test(commit ?? '') || !/^[A-Za-z_$][\w$]*$/.test(name ?? '')) return undefined;
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/${commit}/out/${name}.sol/${name}.json`, { signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(10000)]) });
    if (response.ok) { const artifact = await response.json(); if (Array.isArray(artifact.abi)) return artifact.abi as readonly unknown[]; }
  } catch { if (signal?.aborted) return undefined; }
  // This first launch did not publish out/. Its checked control ABI is retained
  // from the exact source commit; newer contracts still fall back to catalog rows.
  if (match[1].toLowerCase() === 'identity-md-launches' && match[2].toLowerCase() === 'launch-2424-deploy-one-contract-pondsideguard' && commit?.toLowerCase() === '5a9f6a36d659084e084a8abc08a55213c9516f07' && name === 'PondsideGuard') return pondside2424;
  return undefined;
}
const REVERT_REASONS: Record<string, string> = {
  claimFees: 'Nothing to claim yet', buyback: 'The jar is below its threshold', draw: 'The draw is not ready yet',
  pause: 'Swaps are already paused', unpause: 'Swaps are not paused', settle: 'Nothing to settle yet',
  claimPrize: 'Nothing to claim yet', placeOrder: 'This order cannot be placed with these values', cancelOrder: 'This order cannot be cancelled by this wallet',
};
export function managementError(error: unknown, name: string, reason?: string) {
  if (/\bPaused\b|SwapsPaused/.test(String(error))) return 'Swaps are paused';
  return /revert/i.test(String(error)) ? reason ?? REVERT_REASONS[name] ?? 'Check this action’s current readings and arguments.' : contractError(error);
}
