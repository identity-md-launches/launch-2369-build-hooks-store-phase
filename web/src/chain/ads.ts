import { encodeAbiParameters, keccak256, erc20Abi, type Abi, type Address, type WalletClient, type TransactionReceipt } from 'viem';
import registryJson from '../../../src/abi/HookListingRegistry.json' with { type: 'json' };
import placementsJson from '../../../src/abi/FeaturedPlacementsV2.json' with { type: 'json' };
import type { SiteConfig } from '../config';
import type { Launch } from '../types';
import type { ReadClient } from './clients';
import { BY_ID, shortOf, powersOf } from '../../../src/lib/compose.ts';
import { requestContext } from './decode.ts';
import { PERMISSIONS } from './resolve.ts';
export const registryAbi = registryJson as Abi, placementsAbi = placementsJson as Abi;
export const AD_PRICE = 100000000000000000n;
export const BOOST_TERMS = 'A boost is non-refundable, has no deadline and pays for whatever time remains on this placement';
export type AdsConfig = { registry: Address; placements: Address; launchNumber: number; commit: string };
export function adsConfig(config: SiteConfig, chainId: number): AdsConfig | null {
  const value = (config.ads as Record<string, AdsConfig> | undefined)?.[chainId];
  return value && /^0x[\da-f]{40}$/i.test(value.registry ?? '') && /^0x[\da-f]{40}$/i.test(value.placements ?? '') && BigInt(value.registry) !== 0n && BigInt(value.placements) !== 0n ? value : null;
}
export type Metadata = { name: string; sourceRef: string; testRef: string; reviewRef: string; auditRef: string; callbackMask: bigint; callbackDisclosure: string; feeDisclosure: string; adminDisclosure: string; labels: string[] };
export type Listing = { chainId: bigint; hook: Address; owner: Address; proposedOwner: Address; revision: bigint; active: boolean };
export type Placement = { id: bigint; listingId: bigint; revision: bigint; payer: Address; recipient: Address; startsAt: bigint; endsAt: bigint; closedAt: bigint; refund: bigint; status: number; label: string };
export type Ad = { chainId: number; placement: Placement; listing: Listing; metadata: Metadata; total: bigint; launch?: Launch };
export const activePlacement = (p: Placement, now = Math.floor(Date.now() / 1000)) => Number(p.status) === 1 && p.endsAt > BigInt(now);
export const sortAds = (ads: Ad[]) => ads.sort((a, b) => a.total === b.total ? a.placement.id < b.placement.id ? -1 : a.placement.id > b.placement.id ? 1 : a.chainId - b.chainId : a.total > b.total ? -1 : 1);
export type MergedAd = Ad & { placements: Ad[] };
const hookIdentity = (ad: Ad) => ad.listing ? `${ad.listing.chainId}:${ad.listing.hook.toLowerCase()}` : ad.launch?.id ?? `${ad.chainId}:${ad.placement.id}`;
/** One strip card per deployed hook, funded by any number of promotion chains. */
export function mergeAds(ads: Ad[]): MergedAd[] {
  const groups = new Map<string, MergedAd>();
  for (const ad of ads.filter(a => !!a.launch && activePlacement(a.placement))) {
    const key = hookIdentity(ad), previous = groups.get(key);
    if (!previous) { groups.set(key, { ...ad, placement: { ...ad.placement }, placements: [ad] }); continue; }
    previous.total += ad.total; previous.placements.push(ad);
    if (ad.placement.endsAt > previous.placement.endsAt) previous.placement.endsAt = ad.placement.endsAt;
    if (ad.placement.startsAt < previous.placement.startsAt) previous.placement.startsAt = ad.placement.startsAt;
  }
  const firstPurchase = (ad: MergedAd) => ad.placements.reduce((first, next) =>
    next.placement.startsAt < first.placement.startsAt || next.placement.startsAt === first.placement.startsAt && (next.placement.id < first.placement.id || next.placement.id === first.placement.id && next.chainId < first.chainId) ? next : first);
  return [...groups.values()].sort((a, b) => {
    if (a.total !== b.total) return a.total > b.total ? -1 : 1;
    const first = firstPurchase(a), second = firstPurchase(b);
    return first.placement.startsAt !== second.placement.startsAt ? first.placement.startsAt < second.placement.startsAt ? -1 : 1
      : first.placement.id < second.placement.id ? -1 : first.placement.id > second.placement.id ? 1 : first.chainId - second.chainId;
  });
}
/** Position uses the same combined hook totals as the Store strip. */
export function placementPosition(ads: Ad[], ad: Ad) {
  const visible = mergeAds(ads);
  return { rank: visible.findIndex(a => a.placements.some(p => p.chainId === ad.chainId && p.placement.id === ad.placement.id)) + 1, total: visible.length };
}
/** Keep wallet funds distinct from the deposit inside the promotion contract. */
export async function readPromotionBalances(client: ReadClient, config: AdsConfig, imd: Address, account: Address) {
  const [wallet, deposited] = await Promise.all([
    client.readContract({ address: imd, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
    client.readContract({ address: config.placements, abi: placementsAbi, functionName: 'available', args: [account] }) as Promise<bigint>,
  ]);
  return { wallet, deposited };
}
export const listingIdentity = (chainId: number, hook: Address, account: Address) => keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }, { type: 'address' }], [BigInt(chainId), hook, account]));
export function listingMetadata(launch: Launch): Metadata {
  if (!launch.hookAddress) throw new Error('A live hook address is required.');
  const ctx = requestContext(launch.request, launch.payer), mask = BigInt(launch.hookAddress) & 0x3fffn;
  const fees = launch.matchedBlocks.filter(b => BY_ID[b.id]?.group === 'fees' || ['jar', 'pot', 'lp-share'].includes(b.id));
  const owner = /^Owner .+$/m.exec(launch.request)?.[0] ?? 'Owner powers are described in the source and request.';
  const words = /<description>|<custom>/.test(launch.request);
  const feeLine = /^(?:Fees are always taken|Hook fee rate:).*$/m.exec(launch.request)?.[0];
  // Preserve the hook page's evidence; missing URLs stay empty rather than claiming a review.
  const result = { name: launch.name, sourceRef: launch.sourceRepoUrl ?? '', testRef: '',
    reviewRef: launch.jobIds[0] ? `https://explorer.imd.fun/jobs/${launch.jobIds[0]}` : '', auditRef: launch.auditUrl ?? '', callbackMask: mask,
    callbackDisclosure: PERMISSIONS.filter((_, i) => (mask & (1n << BigInt(13 - i))) !== 0n).join(', ') || 'No callbacks enabled by the hook address.',
    feeDisclosure: [...fees.map(b => shortOf(b, ctx)), feeLine ?? (words ? 'Written fee rules: read the source and request before using this hook.' : 'No hook fee blocks.')].join(' · '),
    adminDisclosure: owner, labels: [...new Set(launch.matchedBlocks.map(b => b.id))].slice(0, 16) };
  for (const key of ['name', 'callbackDisclosure', 'feeDisclosure', 'adminDisclosure', 'sourceRef', 'testRef', 'reviewRef', 'auditRef'] as const) {
    const limit = key === 'name' ? 96 : key.endsWith('Ref') ? 512 : 1024;
    if (new TextEncoder().encode(result[key]).length > limit) throw new Error(`${key}: the hook page disclosure is too long for a listing. Use a shorter hook name or disclosure.`);
  }
  return result;
}
/** Scan every page, including empty pages. A stale featured ID never overrides getPlacement. */
export async function readAds(client: ReadClient, chainId: number, config: AdsConfig, launches: Launch[] = []): Promise<Ad[]> {
  const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
  const read = (abi: Abi, address: Address, functionName: string, args: unknown[] = []) => client.readContract({ abi, address, functionName, args, blockNumber });
  const count = await read(placementsAbi, config.placements, 'placementCount') as bigint;
  const rows: Ad[] = []; let cursor = 1n;
  while (cursor <= count) {
    const [page, _totals, next] = await read(placementsAbi, config.placements, 'featured', [cursor, 100n]) as [Placement[], bigint[], bigint];
    if (next <= cursor) throw new Error('Placement paging did not advance. Retry the reading.');
    const batch = await Promise.all(page.map(async candidate => {
      const p = await read(placementsAbi, config.placements, 'getPlacement', [candidate.id]) as Placement;
      if (!activePlacement(p)) return null;
      const [listing, metadata, total] = await Promise.all([
        read(registryAbi, config.registry, 'getListing', [p.listingId]) as Promise<Listing>,
        read(registryAbi, config.registry, 'getMetadata', [p.listingId, p.revision]) as Promise<Metadata>,
        read(placementsAbi, config.placements, 'rankOf', [p.id]) as Promise<bigint>,
      ]);
      const launch = launches.find(l => l.isHook !== false && l.chainId === Number(listing.chainId) && l.hookAddress?.toLowerCase() === listing.hook.toLowerCase());
      return { chainId, placement: p, listing, metadata, total, launch };
    }));
    rows.push(...batch.filter((row): row is NonNullable<typeof row> => row !== null)); cursor = next;
  }
  return sortAds(rows);
}
export type AdsWallet = { client: ReadClient; wallet: WalletClient; account: Address; chainId: number; config: AdsConfig; imd: Address; onHash?: (hash: Address | `0x${string}`) => void; onConfirmed?: () => void };
export async function sendAdTransaction(ctx: AdsWallet, address: Address, abi: Abi, functionName: string, args: unknown[]): Promise<TransactionReceipt> {
  if (await ctx.client.getChainId() !== ctx.chainId || await ctx.wallet.getChainId() !== ctx.chainId) throw new Error('Switch your wallet to the promotion chain and try again.');
  if ((await ctx.wallet.getAddresses())[0]?.toLowerCase() !== ctx.account.toLowerCase()) throw new Error('The connected wallet changed. Review the promotion again.');
  const simulation = await ctx.client.simulateContract({ address, abi, functionName, args, account: ctx.account });
  const hash = await ctx.wallet.writeContract({ ...simulation.request, chain: ctx.client.chain }); ctx.onHash?.(hash);
  const receipt = await ctx.client.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('Transaction reverted. Retry after checking the current terms.');
  ctx.onConfirmed?.();
  return receipt;
}
export async function depositFor(ctx: AdsWallet, required: bigint) {
  const [token, available] = await Promise.all([
    ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'imd' }),
    ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'available', args: [ctx.account] }) as Promise<bigint>,
  ]);
  if (String(token).toLowerCase() !== ctx.imd.toLowerCase()) throw new Error('The placement contract is not configured with this chain’s IMD. No deposit was sent.');
  if (available >= required) return;
  const amount = required - available;
  const allowance = await ctx.client.readContract({ address: ctx.imd, abi: erc20Abi, functionName: 'allowance', args: [ctx.account, ctx.config.placements] });
  if (allowance < amount) await sendAdTransaction(ctx, ctx.imd, erc20Abi, 'approve', [ctx.config.placements, amount]);
  await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'deposit', [amount]);
}
export function adError(error: unknown) {
  const text = String(error);
  if (/reject|denied|cancelled/i.test(text)) return 'Cancelled in your wallet. Your confirmed steps are saved; try again when ready.';
  if (/TermsChanged/.test(text)) return 'The listing revision or proceeds recipient changed. Review the latest terms and try again.';
  if (/AlreadyFeatured/.test(text)) return 'This listing already has an active placement.';
  if (/InsufficientBalance|insufficient funds|exceeds the balance/i.test(text)) return 'Not enough IMD or ETH for this step. Add funds on this chain and retry.';
  if (/PlacementExpired|PlacementClosed/.test(text)) return 'This placement has ended. Refresh to see its current state.';
  return error instanceof Error ? (error.message.length < 200 ? error.message : 'Could not complete this step. Check the network and current contract terms, then retry.') : 'Could not complete this step. Retry the reading.';
}
