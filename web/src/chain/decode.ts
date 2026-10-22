import { decodeEventLog, hexToString, isAddress, encodeAbiParameters, keccak256, type Hex, type Abi } from 'viem';
import intakeJson from '../../../src/abi/intake.json' with { type: 'json' };
import { BLOCKS, BY_ID, IMD_TREASURY, TOKEN_IDS, defaults, fill, shortOf, type BlockDef, type BlockEntry, type Context } from '../../../src/lib/compose.ts';
import { CHAINS, type Launch } from '../types.ts';
import legacyCatalog from '../../../src/blocks/legacy-catalog.json' with { type: 'json' };
const LEGACY_BLOCKS = legacyCatalog.blocks as unknown as BlockDef[];
const LEGACY_BY_ID = Object.fromEntries(LEGACY_BLOCKS.map(block => [block.id, block]));

export const intakeAbi = intakeJson as Abi;
export const REQUESTED = intakeAbi.find(a => a.type === 'event' && a.name === 'Requested')!;
export const COMPLETED = intakeAbi.find(a => a.type === 'event' && a.name === 'Completed')!;
export const STORE_ENDINGS = ['Composed with The Hooks Store block builder.', 'Composed with The Hooks Store.'];
export type RawLog = { address: string; data: Hex; topics: [Hex, ...Hex[]]; blockNumber: string | bigint; blockHash?: string; transactionHash: string; logIndex?: string | number; removed?: boolean; blockTimestamp?: string };
export function decodeIntake(log: RawLog) {
  return decodeEventLog({ abi: intakeAbi, data: log.data, topics: log.topics, strict: true });
}
export function parseBody(body: Hex): Record<string, unknown> | null {
  try { const value = JSON.parse(hexToString(body)); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; }
}
export function isStoreBody(body: Record<string, unknown> | null): body is Record<string, unknown> & { objective: string } {
  return !!body && ['univ4_hook', 'evm_contracts'].includes(String(body.onchain)) && typeof body.objective === 'string' && STORE_ENDINGS.some(end => (body.objective as string).trimEnd().endsWith(end));
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Full sentence matching, including function signatures. Substring mentions never grant controls. */
export function matchRule(rule: string, ctx: Context): BlockEntry | null {
  const candidates = [
    ...BLOCKS.map(def => ({ def, legacy: false })),
    ...LEGACY_BLOCKS.map(def => ({ def, legacy: true })),
  ];
  for (const { def, legacy } of candidates.filter(({ def }) => !TOKEN_IDS.includes(def.id) && def.id !== 'custom')) {
    const templates = [
      { template: def.sentence, option: undefined as string | undefined },
      ...(def.legacySentences ?? []).map(template => ({ template, option: undefined as string | undefined })),
      ...Object.entries(def.optionSentences ?? {}).map(([option, template]) => ({ template, option })),
    ];
    for (const { template, option } of templates) {
      const keys: { key: string; fmt?: string; at: boolean }[] = [];
      let pattern = '', from = 0;
      for (const m of template.matchAll(/\{(@?)(\w+)(?::(\w+))?\}/g)) {
        pattern += escape(template.slice(from, m.index));
        keys.push({ key: m[2], fmt: m[3], at: !!m[1] });
        const known = m[1] && !['destination', 'wallet'].includes(m[2]) && !(legacy && m[2] === 'jarAction');
        const expected = ctx[m[2] as keyof Context] ?? (m[2] === 'pair' ? 'ETH' : '');
        // Adjacent context sentences (wallet limit, fee basis) must match their
        // complete known text rather than split at an arbitrary first space.
        pattern += known ? `(${escape(String(expected))})` : '(.*?)'; from = m.index! + m[0].length;
      }
      pattern += escape(template.slice(from));
      const matched = new RegExp('^' + pattern + '$').exec(rule.trim());
      if (!matched) continue;
      const p = defaults(def); let valid = true;
      if (option) p.who = option;
      keys.forEach((key, i) => {
        const value = matched[i + 1];
        if (key.at) {
          if (key.key === 'destination') {
            if (/^send it to 0x[\da-fA-F]{40}$/.test(value)) {
              const recipient = value.slice('send it to '.length);
              p.to = recipient.toLowerCase() === IMD_TREASURY.toLowerCase() ? "IMD's treasury" : recipient.toLowerCase() === ctx.wallet?.toLowerCase() ? 'my wallet' : recipient;
            } else if (!legacy && value === 'distribute it as specified by Split the fee' && value === ctx.destination) p.to = 'my wallet';
            else if (legacy && value === `use it to buy ${ctx.symbol} from this pool and burn the bought tokens`) p.to = 'burn (buy and burn)';
            else valid = false;
          } else if (key.key === 'wallet') { if (!/^0x[\da-fA-F]{40}$/.test(value)) valid = false; }
          else if (key.key === 'jarAction' && legacy) {
            if (value === 'burn the bought tokens') p.act = value;
            else if (value === `send the bought tokens to ${IMD_TREASURY}`) p.act = "send them to the IMD's treasury";
            else valid = false;
          } else if (value !== (ctx[key.key as keyof Context] ?? (key.key === 'pair' ? 'ETH' : ''))) valid = false;
          return;
        }
        if (key.fmt === 'rest') { if (Number(value) !== 100 - Number(p[key.key])) valid = false; return; }
        const param = def.params.find(x => x.k === key.key);
        let parsed = param?.type === 'number' ? Number(value.replaceAll(',', '')) : value.replace('treasury address', "IMD's treasury");
        if (param?.options?.includes("IMD's treasury") && typeof parsed === 'string' && /treasury/.test(parsed)) parsed = "IMD's treasury";
        if (typeof parsed === 'number' && !Number.isFinite(parsed)) valid = false;
        if (param?.options && !param.options.includes(String(parsed))) valid = false;
        const earlier = keys.slice(0, i).findIndex(k => k.key === key.key && k.fmt !== 'rest');
        if (earlier !== -1 && matched[earlier + 1] !== value) valid = false;
        p[key.key] = parsed;
      });
      if (valid) return { id: def.id, p, ...(legacy ? { legacy: true } : {}) };
    }
  }
  return null;
}
export function requestContext(objective: string, payer?: string): Context {
  const first = objective.split('\n')[0];
  const a = /^Launch (.+?) \(([^)]+)\) with a Uniswap v4 hook on /.exec(first);
  const oldB = /^Deploy one contract: (.+?), a standalone Uniswap v4 hook/.exec(first);
  const oldC = /^Deploy one contract on .+?: (.+?), a Uniswap v4 hook for the existing token (0x[\da-fA-F]{40})(?: \(([^)]+)\))?/.exec(first);
  const deployer = /^Deploy one contract, (.+?)Deployer, on [^:]+:/.exec(first);
  const newC = /^(.+?) is a Uniswap v4 hook for the existing token (0x[\da-fA-F]{40})(?: \(([^)]+)\))?/m.exec(objective);
  const c = oldC ?? newC, type = a ? 'A' : c ? 'C' : 'B';
  const name = a?.[1] ?? oldB?.[1] ?? c?.[1] ?? deployer?.[1] ?? 'Untitled hook';
  const symbol = a?.[2] ?? c?.[3] ?? (type === 'C' ? 'the token' : 'the pool’s token');
  const pair = a && /paired with IMD\./.test(first) ? 'IMD' : 'ETH';
  const baseFee = /^\d+\. Take ([\d.]+)% of the (?:IMD|ETH) side of every (buy and sell|buy|sell) as a hook fee/m.exec(objective);
  return { name, symbol, type, pair, wallet: payer, liquidityAccess: type === 'A' ? 'the factory and the owner' : 'the owner',
    destination: /^\d+\. Replace the Swap fee's destination: split/m.test(objective) ? 'distribute it as specified by Split the fee' : `send it to ${payer ?? ''}`,
    feeBasis: `Fees are computed on the amount actually traded; when the swap specifies its ${pair} amount and the pool fills only part of it, the swap reverts rather than overpaying.`,
    walletLimit: 'A wallet means tx.origin; several wallets or a shared relayer can defeat the limit.',
    baseRate: Number(baseFee?.[1] ?? 0).toFixed(1), feeApplies: baseFee?.[2] ?? 'buy and sell',
    jarAction: type === 'A' ? /^Token: my own token /m.test(objective) ? "burn the bought tokens with the token's burn(uint256)" : 'keep the bought tokens in the hook forever; no function can move them'
      : "attempt to burn with the token's burn(uint256); if it has none, or the burn call reverts, keep them in the hook forever; no function can move retained tokens",
  };
}
export function blockShortOf(block: BlockEntry, ctx: Context) {
  const legacy = block.legacy && LEGACY_BY_ID[block.id];
  return legacy ? fill(legacy.short, legacy, block.p, ctx) : shortOf(block, ctx);
}
export function parseObjective(objective: string, payer?: string) {
  const first = objective.split('\n')[0], ctx = requestContext(objective, payer);
  const rules = Array.from(objective.matchAll(/^\d+\. (.+)$/gm), m => m[1]);
  const matchedBlocks: BlockEntry[] = [], blocks: string[] = [], groups = new Set<string>();
  for (const rule of rules) {
    const match = matchRule(rule, ctx);
    if (match) { matchedBlocks.push(match); blocks.push(blockShortOf(match, ctx)); groups.add(BY_ID[match.id].group === 'games' ? 'treasury' : BY_ID[match.id].group); }
    else { blocks.push('Custom'); groups.add('custom'); }
  }
  if (/<custom>[\s\S]*?<\/custom>/.test(objective)) { blocks.push('Custom'); groups.add('custom'); }
  if (!groups.size || objective.includes('own source at ')) groups.add('custom');
  const words = /<description>([\s\S]*?)<\/description>/.exec(objective)?.[1];
  const tokenAddress = /(?:hook for the existing token) (0x[\da-fA-F]{40})/.exec(objective)?.[1] ?? null;
  return { type: ctx.type!, name: ctx.name, symbol: ctx.type === 'A' || ctx.type === 'C' && ctx.symbol !== 'the token' ? ctx.symbol : null, blocks, matchedBlocks, groups: [...groups],
    tokenAddress, summary: words?.slice(0, 240) || rules[0]?.split('. Expose')[0] || first };
}
export function launchFromRequested(log: RawLog, intakeChainId: number, action: string, timestamp?: number): Launch | null {
  if (log.removed) return null;
  try {
    const event = decodeIntake(log);
    if (event.eventName !== 'Requested') return null;
    const args = event.args as unknown as { requestId: Hex; payer: string; action: Hex; body: Hex };
    if (args.action.toLowerCase() !== action.toLowerCase()) return null;
    const body = parseBody(args.body);
    if (!body || !['univ4_hook', 'evm_contracts'].includes(String(body.onchain)) || typeof body.objective !== 'string') return null;
    const hookLaunch = isStoreBody(body);
    if (!hookLaunch && !(String(body.onchain) === 'evm_contracts' && /HookListingRegistry/.test(body.objective) && /FeaturedPlacementsV2/.test(body.objective))) return null;
    const parsed = parseObjective(body.objective, args.payer), chainId = Number(body.chainId);
    if (!CHAINS[chainId]) return null;
    const time = timestamp ?? (log.blockTimestamp ? Number(BigInt(log.blockTimestamp)) : undefined);
    return { ...parsed, id: `${intakeChainId}:${args.requestId}`, requestId: args.requestId, intakeChainId, chainId,
      kind: String(body.onchain), isHook: hookLaunch, status: 'requested', launchNumber: null, request: body.objective,
      createdAt: time ? new Date(time * 1000).toISOString() : null, blockNumber: String(BigInt(log.blockNumber)),
      payer: args.payer, hookAddress: null, distributorAddress: null, poolId: null, currencies: [], txHashes: [log.transactionHash],
      sourceRepoUrl: safeUrl(body.repoUrl), jobIds: [],
    };
  } catch { return null; }
}
export function reasonText(reason: string) {
  try { return hexToString(reason as Hex).replace(/\0+$/, '').replace(/[^\x20-\x7e]/g, '').trim() || 'No reason supplied by Intake'; }
  catch { return 'No reason supplied by Intake'; }
}
export function applyCompleted(launch: Launch, log: RawLog): Launch {
  try {
    const event = decodeIntake(log);
    if (event.eventName !== 'Completed' || log.removed) return launch;
    const args = event.args as unknown as { requestId: string; status: number; resultHash: string; uri: string };
    if (args.requestId.toLowerCase() !== launch.requestId.toLowerCase()) return launch;
    return { ...launch, status: args.status === 1 || args.status === 2 ? 'failed' : 'in-progress',
      completion: { status: args.status, reason: args.status ? reasonText(args.resultHash) : '', uri: args.uri, blockNumber: String(BigInt(log.blockNumber)), txHash: log.transactionHash },
      txHashes: [...new Set([...launch.txHashes, log.transactionHash])],
    };
  } catch { return launch; }
}
export function resultUrl(uri: string, gateway: string): string | null {
  const cid = /^ipfs:\/\/(?:ipfs\/)?([a-zA-Z0-9]+)(?:\/result\.json)?\/?$/.exec(uri)?.[1];
  return cid && /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})$/.test(cid) ? `${gateway}${cid}/result.json` : null;
}
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const address = (...values: unknown[]) => values.find((v): v is string => typeof v === 'string' && isAddress(v, { strict: false })) ?? null;
/** Results are untrusted JSON. Do not infer Live from a successful build with no deployment. */
export function applyResult(launch: Launch, input: unknown): Launch {
  const root = object(input), data = object(root.launch), addresses = object(data.addresses ?? root.addresses), pool = object(data.pool ?? data.poolKey ?? root.poolKey);
  const contracts = Array.isArray(data.artifacts ?? data.contracts ?? root.artifacts ?? root.contracts) ? data.artifacts ?? data.contracts ?? root.artifacts ?? root.contracts : [];
  const artifact = (role: string) => contracts.find((c: any) => c.role === role);
  if (data.chainId != null && Number(data.chainId) !== launch.chainId) return { ...launch, resultError: 'Result chain differs from the requested chain. Controls remain locked.', resultLoaded: true };
  const hook = address(data.hookAddress, data.hook, addresses.hook, addresses.hookAddress, root.hookAddress,
    artifact('hook')?.address, contracts.find((c: any) => /hook/i.test(String(c.name ?? c.contractName)) && !/deployer/i.test(String(c.name ?? c.contractName)))?.address);
  const deployer = launch.type === 'A' ? null : address(data.deployerAddress, data.deployer, addresses.deployer, root.deployerAddress, artifact('deployer')?.address,
    contracts.find((c: any) => /deployer$/i.test(String(c.name ?? c.contractName)))?.address)
    ?? (/^Deploy one contract, .+?Deployer, on /.test(launch.request) ? hook : null);
  const token = address(data.tokenAddress, data.token, addresses.token, addresses.tokenAddress, root.tokenAddress, artifact('token')?.address) ?? launch.tokenAddress;
  const distributor = address(data.distributorAddress, data.distributor, addresses.distributor, root.distributorAddress, artifact('distributor')?.address);
  const number = Number(data.launchNumber ?? root.launchNumber ?? data.id ?? data.launchId ?? root.launchId);
  const rawId = data.id ?? data.launchId ?? root.launchId;
  const launchId = typeof rawId === 'string' && /^(?:[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|[1-9]\d*)$/i.test(rawId) ? rawId : Number.isSafeInteger(rawId) && rawId > 0 ? String(rawId) : null;
  const jobId = typeof root.jobId === 'string' ? root.jobId : null;
  const poolId = [data.poolId, pool.id, root.poolId].find(v => typeof v === 'string' && /^0x[\da-fA-F]{64}$/.test(v)) ?? null;
  return { ...launch, hookAddress: launch.type === 'A' ? hook : null, deployerAddress: launch.type === 'A' ? deployer : null, hookPending: false, tokenAddress: launch.type === 'A' ? token : launch.tokenAddress, distributorAddress: launch.type === 'A' ? distributor : null, poolId: launch.type === 'A' ? poolId : null,
    status: launch.type === 'A' && hook && !deployer ? 'live' : 'in-progress', resultLoaded: true, resultError: undefined,
    launchId, launchNumber: Number.isSafeInteger(number) && number > 0 ? number : null,
    currencies: [pool.currency0, pool.currency1, data.currency0, data.currency1].filter((v): v is string => !!address(v)),
    sourceRepoUrl: safeUrl(object(root.delivery).repoUrl) ?? safeUrl(data.repoUrl) ?? launch.sourceRepoUrl,
    jobIds: jobId ? [jobId] : [], auditUrl: safeUrl(data.auditUrl ?? root.auditUrl),
    txHashes: [...new Set([...launch.txHashes, ...[data.transactionHash, data.txHash, data.deployTxHash, ...contracts.map((c: any) => c.txHash)].filter((v): v is string => typeof v === 'string' && /^0x[\da-fA-F]{64}$/.test(v))])],
  };
}
/** Contracts-only addresses are delivered after the result file was written.
 * The relay record supplements a matching on-chain request; it cannot confirm it. */
export function applyLaunchRecord(launch: Launch, value: unknown): Launch {
  const root = object(value), data = Object.keys(object(root.launch)).length ? object(root.launch) : root;
  if (String(data.id) !== launch.launchId || Number(data.chainId) !== launch.chainId) return { ...launch, resultError: 'Launch record does not match this request and deploy chain. Retry the reading.' };
  const artifacts: Record<string, any>[] = Array.isArray(data.artifacts) ? data.artifacts.map(object) : [];
  const attestation = object(data.attestation ?? root.attestation);
  const contracts: Record<string, any>[] = Array.isArray(attestation.contracts) ? attestation.contracts.map(object) : [];
  const manifest = object(attestation.manifest);
  const manifestContracts: Record<string, any>[] = Array.isArray(manifest.contracts) ? manifest.contracts.map(object) : [];
  const named: Record<string, any>[] = artifacts.map((artifact, index) => {
    const name = artifact.name ?? artifact.contractName ?? manifestContracts[index]?.contract ?? (artifacts.length === 1 && contracts.length === 1 ? contracts[0].name : undefined);
    const contract = contracts.find(c => c.name === name || c.contractName === name);
    return { ...artifact, name: contract?.name ?? contract?.contractName ?? name };
  });
  const deployer = named.find(a => a.role === 'deployer' || /deployer$/i.test(String(a.name ?? '')));
  const hook = named.find(a => a.role === 'hook' && !/deployer$/i.test(String(a.name ?? '')))
    ?? named.find(a => /hook/i.test(String(a.name ?? '')) && !/deployer$/i.test(String(a.name ?? '')))
    ?? (named.length === 1 && !deployer ? named[0] : undefined);
  const seeded = object(data.seeded), pools = Array.isArray(seeded.pools) ? seeded.pools.map(object) : [];
  const key = pools.find((p: any) => String(p.hooks).toLowerCase() === String(hook?.address).toLowerCase());
  let poolId = launch.poolId;
  if (key && address(key.currency0) && address(key.currency1) && Number.isInteger(key.fee) && Number.isInteger(key.tickSpacing)) {
    poolId = keccak256(encodeAbiParameters([{type:'address'}, {type:'address'}, {type:'uint24'}, {type:'int24'}, {type:'address'}],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]));
  }
  const number = Number(data.launchNumber);
  return { ...launch, launchRecordStatus: typeof data.status === 'string' ? data.status : undefined,
    status: launch.completion?.status === 0 && data.status === 'live' ? 'live' : launch.status === 'failed' ? 'failed' : 'in-progress',
    deployerAddress: address(deployer?.address), hookAddress: deployer ? null : address(hook?.address), hookPending: false,
    launchNumber: Number.isSafeInteger(number) && number > 0 ? number : launch.launchNumber,
    tokenAddress: launch.type === 'A' ? address(named.find(a => a.role === 'token')?.address) ?? launch.tokenAddress : launch.tokenAddress,
    distributorAddress: launch.type === 'A' ? address(named.find(a => a.role === 'distributor')?.address) ?? launch.distributorAddress : null,
    poolId: launch.type === 'A' ? poolId : null,
    currencies: key ? [key.currency0, key.currency1] : launch.currencies,
    sourceCommit: typeof data.sourceCommit === 'string' && /^[a-f\d]{40}$/i.test(data.sourceCommit) ? data.sourceCommit : launch.sourceCommit,
    contractName: hook?.name ?? launch.contractName,
    sourceRepoUrl: safeUrl(data.sourceRepoUrl) ?? launch.sourceRepoUrl,
    jobIds: [...new Set([...launch.jobIds, ...(Array.isArray(data.jobs) ? data.jobs.map(object).map(j => j.id).filter((id: unknown): id is string => typeof id === 'string' && /^[\w-]+$/.test(id)) : [])])],
    resultError: undefined,
    txHashes: [...new Set([...launch.txHashes, ...artifacts.map(a => a.txHash).filter((tx: unknown): tx is string => typeof tx === 'string' && /^0x[\da-fA-F]{64}$/.test(tx))])],
  };
}
export function matchesQuery(launch: Launch, query: string) {
  const q = query.trim().toLowerCase().replace(/^(?=[a-f\d]{40}$|[a-f\d]{64}$)/, '0x');
  if (/^0x[\da-f]{40}$/.test(q)) return [launch.hookAddress, launch.deployerAddress, launch.tokenAddress, launch.distributorAddress, ...launch.currencies].some(a => a?.toLowerCase() === q);
  if (/^0x[\da-f]{64}$/.test(q)) return [launch.requestId, ...launch.txHashes].some(h => h.toLowerCase() === q);
  const hay = [launch.name, launch.symbol, CHAINS[launch.chainId], launch.summary, ...launch.blocks, ...launch.matchedBlocks.map(b => BY_ID[b.id]?.title), launch.request].join(' ').toLowerCase();
  return q.split(/\s+/).filter(Boolean).every(word => hay.includes(word));
}
export function pondMessage(launch: Launch) {
  const name = parseObjective(launch.request).name;
  return name === 'Untitled hook' ? `A new hook was requested on ${CHAINS[launch.chainId]}` : `${name} was requested on ${CHAINS[launch.chainId]}`;
}
