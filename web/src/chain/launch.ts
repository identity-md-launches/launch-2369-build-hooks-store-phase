import { decodeEventLog, erc20Abi, hexToString, stringToHex, zeroAddress, type Address, type Hex, type TransactionReceipt, type WalletClient } from 'viem';
import { body, MAX_BODY_BYTES, validate, type Draft } from '../../../src/lib/compose.ts';
import type { SiteConfig } from '../config.ts';
import type { ReadClient } from './clients.ts';
import { checkConsistency } from '../../../src/lib/safety.ts';
import { intakeAbi } from './decode.ts';

export const MAX_LAUNCH_PRICE = 500000000000000000n;
export function launchBody(draft: Draft, config: SiteConfig, account?: string) {
  const issues = validate(draft, account);
  if (!draft.settings.chain || !config.enabledDeployChains.includes(draft.settings.chain)) issues.push({ field: 'settings.chain', message: 'Choose an enabled deploy chain in the Builder.' });
  if (issues.length) throw new Error(issues[0].message);
  const input = body(draft, account), findings = checkConsistency(input);
  if (findings.length) throw new Error(`${findings[0].message} Sentence: ${findings[0].sentence}`);
  const json = JSON.stringify(input);
  if (new TextEncoder().encode(json).length > MAX_BODY_BYTES) throw new Error('The request exceeds 16 KiB. Shorten it in the Builder.');
  return { json, bytes: stringToHex(json) };
}
export function paymentTerms(config: SiteConfig, chainId: number) {
  const chain = config.chains.find(c => c.id === chainId);
  if (!chain || !config.paymentChains.includes(chainId)) throw new Error('Choose Ethereum or Robinhood Chain for payment.');
  return { chain, intake: config.intake.address as Address, action: config.intake.launchAction as Hex, imd: chain.imdAddress as Address };
}
export function checkedPrice(price: bigint) {
  if (price === 0n) throw new Error('Launches are not sold for IMD on this chain (price is zero). No payment was sent.');
  if (price < 0n || price > MAX_LAUNCH_PRICE) throw new Error('The launch price exceeds 0.5 IMD. No payment was sent.');
  return price;
}
export async function readLaunchPrice(client: ReadClient, config: SiteConfig, chainId: number) {
  const { intake, action, imd } = paymentTerms(config, chainId);
  if (await client.getChainId() !== chainId) throw new Error('The payment RPC returned the wrong chain.');
  return checkedPrice(await client.readContract({ address: intake, abi: intakeAbi, functionName: 'priceOf', args: [action, imd] }) as bigint);
}
export type LaunchContext = { config: SiteConfig; chainId: number; account: Address; client: ReadClient; wallet: WalletClient; bytes: Hex };
export async function assertWallet(ctx: LaunchContext) {
  if (ctx.config.inProgress) throw new Error('Launches open when the site banner goes away.');
  paymentTerms(ctx.config, ctx.chainId);
  if (await ctx.wallet.getChainId() !== ctx.chainId) throw new Error('Your wallet is on the wrong payment chain. Switch networks, then try again.');
  const accounts = await ctx.wallet.getAddresses();
  if (accounts[0]?.toLowerCase() !== ctx.account.toLowerCase()) throw new Error('The connected wallet changed. Review the request again.');
  if ((ctx.bytes.length - 2) / 2 > MAX_BODY_BYTES) throw new Error('The request exceeds 16 KiB. Shorten it in the Builder.');
  let input;
  try { input = JSON.parse(hexToString(ctx.bytes)); } catch { throw new Error('The launch request is not valid JSON. Return to the Builder.'); }
  const findings = checkConsistency(input);
  if (findings.length) throw new Error(`${findings[0].message} Sentence: ${findings[0].sentence}`);
}
export async function approveLaunch(ctx: LaunchContext) {
  await assertWallet(ctx);
  const { intake, imd } = paymentTerms(ctx.config, ctx.chainId);
  const price = await readLaunchPrice(ctx.client, ctx.config, ctx.chainId);
  const balance = await ctx.client.readContract({ address: imd, abi: erc20Abi, functionName: 'balanceOf', args: [ctx.account] });
  if (balance < price) throw new Error('Not enough IMD on the payment chain. Add IMD to this wallet, then retry.');
  const { request } = await ctx.client.simulateContract({ address: imd, abi: erc20Abi, functionName: 'approve', args: [intake, price], account: ctx.account });
  await assertWallet(ctx);
  const hash = await ctx.wallet.writeContract({ ...request, chain: ctx.client.chain });
  return { hash, price };
}
export async function requestLaunch(ctx: LaunchContext, approvedPrice: bigint) {
  await assertWallet(ctx);
  const { intake, imd, action } = paymentTerms(ctx.config, ctx.chainId);
  const price = await readLaunchPrice(ctx.client, ctx.config, ctx.chainId);
  if (price !== approvedPrice) throw new Error('The price changed after approval. Review the new price and approve again.');
  const allowance = await ctx.client.readContract({ address: imd, abi: erc20Abi, functionName: 'allowance', args: [ctx.account, intake] });
  if (allowance < price) throw new Error('IMD approval is no longer sufficient. Approve the current price again.');
  const { request } = await ctx.client.simulateContract({ address: intake, abi: intakeAbi, functionName: 'request', args: [action, ctx.bytes, { target: zeroAddress, selector: '0x00000000' }, imd, price], account: ctx.account, value: 0n });
  await assertWallet(ctx);
  return ctx.wallet.writeContract({ ...request, account: ctx.account, chain: ctx.client.chain });
}
/** Approval logs work for both direct EOA transactions and Smart Wallet / EntryPoint receipts. */
export function verifyApprovalReceipt(receipt: TransactionReceipt, ctx: LaunchContext, price: bigint) {
  const { intake, imd } = paymentTerms(ctx.config, ctx.chainId);
  if (receipt.status !== 'success') throw new Error('The approval reverted. You can retry this step.');
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== imd.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: erc20Abi, eventName: 'Approval', data: log.data, topics: log.topics, strict: true });
      if (event.args.owner.toLowerCase() === ctx.account.toLowerCase() && event.args.spender.toLowerCase() === intake.toLowerCase() && event.args.value === price) return;
    } catch { /* Only the exact token approval can unlock the next step. */ }
  }
  throw new Error('This receipt does not contain the expected IMD approval. Review its hash, then retry approval.');
}
export function requestedId(receipt: TransactionReceipt, ctx: Pick<LaunchContext, 'config' | 'chainId' | 'account' | 'bytes'>, price: bigint): Hex {
  if (receipt.status !== 'success') throw new Error('The launch transaction reverted. No request was created.');
  const { intake, action, imd } = paymentTerms(ctx.config, ctx.chainId);
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== intake.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: intakeAbi, data: log.data, topics: log.topics, eventName: 'Requested', strict: true });
      const args = event.args as unknown as { requestId: Hex; payer: Address; action: Hex; body: Hex; asset: Address; amount: bigint };
      if (args.payer.toLowerCase() === ctx.account.toLowerCase() && args.action === action && args.body === ctx.bytes && args.asset.toLowerCase() === imd.toLowerCase() && args.amount === price) return args.requestId;
    } catch { /* Ignore unrelated logs, including the token's Transfer event. */ }
  }
  throw new Error('The transaction confirmed but its Requested event could not be verified. Check the transaction; do not pay again.');
}
export function launchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/reject|denied|cancelled by user|4001/i.test(message)) return 'Signature cancelled. Nothing was sent. You can try again.';
  if (/insufficient funds|exceeds the balance/i.test(message)) return 'Not enough ETH for gas on the payment chain. Add ETH, then retry.';
  if (/execution reverted|ContractFunctionReverted/i.test(message)) return 'The contract refused this transaction. Check your IMD balance and approval, then retry.';
  if (/HTTP|fetch|timeout|timed out|network|socket/i.test(message) && !/wrong payment chain/i.test(message)) return 'The network did not confirm this action. If a hash is shown, check its receipt before trying again.';
  return message.split('\n')[0];
}
