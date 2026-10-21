import { parseAbiItem, isAddress, getAddress, formatEther, type AbiFunction } from 'viem';
import { BY_ID, type BlockEntry, type Fn } from '../../../src/lib/compose.ts';
export type ManagementFn = Fn & { access: 'owner' | 'anyone' | 'user' | 'view'; abi: AbiFunction };
const boolViews = new Set(['isVolatile', 'isLpAllowed', 'isOpen', 'isAllowed', 'paused']);
export function functionAbi(sig: string, view: boolean): AbiFunction {
  const name = sig.split('(')[0];
  const result = name === 'owner' ? 'address' : boolViews.has(name) ? 'bool' : name === 'twap' ? 'uint160' : 'uint256';
  return parseAbiItem(`function ${sig}${view ? ` view returns (${result})` : name === 'placeOrder' ? ' returns (uint256)' : ''}`) as AbiFunction;
}
export const ownerAbi = [functionAbi('owner()', true)];
export function managementFunctions(blocks: BlockEntry[]) {
  const seen = new Set<string>(), rows: ManagementFn[] = [];
  for (const block of blocks) for (const access of ['owner', 'anyone', 'user', 'view'] as const) {
    for (const fn of BY_ID[block.id]?.[access] ?? []) {
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
