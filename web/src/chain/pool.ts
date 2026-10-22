import { encodeFunctionData, getAddress, isAddress, parseAbi, zeroAddress, type Address } from 'viem';
import { POOL_MANAGERS, type BlockEntry } from '../../../src/lib/compose.ts';
export const initializeAbi = parseAbi(['function initialize((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key,uint160 sqrtPriceX96) returns (int24 tick)']);
export const poolReadAbi = parseAbi(['function decimals() view returns (uint8)', 'function poolManager() view returns (address)']);
export const FEE_TIERS: Record<string, { fee: number; tickSpacing: number }> = { '0.05': { fee: 500, tickSpacing: 10 }, '0.3': { fee: 3000, tickSpacing: 60 }, '1': { fee: 10000, tickSpacing: 200 } };
export const DYNAMIC_FEE_FLAG = 0x800000;
export function poolTerms(blocks: BlockEntry[]) {
  const dynamic = blocks.some(block => block.id === 'lp-fee');
  if (dynamic && blocks.some(block => block.id === 'pool-rules')) throw new Error('Dynamic LP fee cannot be combined with Pool rules.');
  const tier = String(blocks.find(block => block.id === 'pool-rules')?.p.tier ?? '0.3'), fixed = FEE_TIERS[tier];
  if (!fixed) throw new Error('The Pool rules fee tier is not supported.');
  return { tier: dynamic ? 'dynamic' : tier, fee: dynamic ? DYNAMIC_FEE_FLAG : fixed.fee, tickSpacing: fixed.tickSpacing, dynamic };
}
export function integerSqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('A square root cannot be negative.');
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) { const next = (x + n / x) / 2n; if (next >= x) return x; x = next; }
}
/** 1 token = price ETH; native ETH sorts first, so v4 encodes token base units per wei. */
export function sqrtPriceX96(price: string, tokenDecimals: number): bigint {
  const text = price.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text) || text.length > 100) throw new Error('Enter a positive decimal price, such as 0.001.');
  if (!Number.isInteger(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 255) throw new Error('Token decimals are unavailable.');
  const [whole, fraction = ''] = text.split('.'), numerator = BigInt(whole + fraction);
  if (numerator === 0n) throw new Error('The starting price must be above zero.');
  const denominator = 10n ** BigInt(fraction.length);
  const value = integerSqrt(((10n ** BigInt(tokenDecimals)) * denominator * (1n << 192n)) / (numerator * 10n ** 18n));
  if (value < 4295128739n || value >= 1461446703485210103287273052203988822378723970342n) throw new Error('The starting price is outside the v4 pool range.');
  return value;
}
export function poolCall(chainId: number, token: string, hook: string, blocks: BlockEntry[], price: string, decimals: number) {
  if (!POOL_MANAGERS[chainId]) throw new Error('No PoolManager is configured for this chain.');
  if (!isAddress(token, { strict: false }) || token.toLowerCase() === zeroAddress || !isAddress(hook, { strict: false }) || hook.toLowerCase() === zeroAddress) throw new Error('A live token and hook address are required.');
  const { tier, dynamic: _dynamic, ...terms } = poolTerms(blocks);
  const [currency0, currency1] = [zeroAddress, getAddress(token)].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1) as [Address, Address];
  const poolKey = { currency0, currency1, ...terms, hooks: getAddress(hook) }, sqrt = sqrtPriceX96(price, decimals);
  return { chainId, to: getAddress(POOL_MANAGERS[chainId]), function: 'PoolManager.initialize', poolKey, sqrtPriceX96: sqrt.toString(), data: encodeFunctionData({ abi: initializeAbi, functionName: 'initialize', args: [poolKey, sqrt] }), value: '0', tier };
}
