import { CHAIN_NAMES, POOL_MANAGERS, type Draft } from './compose.ts';
import catalog from '../blocks/catalog.json' with { type: 'json' };

export const PROVEN_LAUNCHES_URL = 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/proven-launches.json';
export const LAUNCH_WAIT = 'Usually 30 to 90 minutes, sometimes up to 3 hours. From a proven launch, usually less.';
export type ProvenLaunch = {
  launchId: string; launchNumber: number; chainId: number; type: 'A' | 'B' | 'C'; blocks: string[];
  repoUrl: string; commit: string; name: string; verifiedAt: string; hookAddress?: string;
};
const tokenIds = new Set(['token', 'own-token']);
const draftIds = (draft: Draft) => new Set(draft.blocks.filter(b => b.id !== 'custom' && (!tokenIds.has(b.id) || draft.type === 'A')).map(b => b.id));
const launchIds = (p: ProvenLaunch) => new Set(p.blocks.filter(id => id !== 'custom'));
export function provenChanges(draft: Draft, p: ProvenLaunch) {
  const ids = draftIds(draft), source = launchIds(p);
  return { remove: [...source].filter(id => !ids.has(id)), add: [...ids].filter(id => !source.has(id)) };
}
export const blockNames = (ids: string[]) => ids.map(id => catalog.blocks.find(b => b.id === id)?.title ?? id).join(', ') || 'none';
const sameBlocks = (draft: Draft, p: ProvenLaunch) => { const changes = provenChanges(draft, p); return p.type === draft.type && !changes.remove.length && !changes.add.length; };
export const exactProvenMatch = (draft: Draft, p: ProvenLaunch) => p.chainId === draft.settings.chain && sameBlocks(draft, p);
/** The draft deploys on a chain other than the proven launch's own: name it and its PoolManager. */
const otherChain = (draft: Draft, p: ProvenLaunch) => draft.settings.chain !== null && draft.settings.chain !== p.chainId && CHAIN_NAMES[draft.settings.chain] ? draft.settings.chain : null;
export const provenLine = (p: ProvenLaunch, draft?: Draft) => {
  const title = `${p.name} (launch ${p.launchNumber}, audited ${p.verifiedAt})`;
  if (!draft || exactProvenMatch(draft, p) || (draft.settings.chain === null && sameBlocks(draft, p))) return `Built from a proven launch: ${title}`;
  const chain = otherChain(draft, p);
  if (chain && sameBlocks(draft, p)) return `Adapted from a proven launch: ${title}: the same blocks, redeployed on ${CHAIN_NAMES[chain]}`;
  const changes = provenChanges(draft, p);
  return `Adapted from a proven launch: ${title}: the swarm removes ${blockNames(changes.remove)} and adds ${blockNames(changes.add)}${chain ? `, redeployed on ${CHAIN_NAMES[chain]}` : ''}`;
};
export function provenRequestLine(p: ProvenLaunch, request: string) {
  const title = `${p.name} (launch ${p.launchNumber}, audited ${p.verifiedAt})`;
  const redeploy = /Start from the audited source at https:\/\/github\.com\/\S+ commit [\da-f]{40}: keep its behavior, deploy on (Ethereum|Robinhood Chain) with/.exec(request);
  if (redeploy) return `Adapted from a proven launch: ${title}: the same blocks, redeployed on ${redeploy[1]}`;
  const changes = /Start from the audited source at https:\/\/github\.com\/\S+ commit [\da-f]{40}: remove ([^;]+); add ([^;]+);( deploy on (Ethereum|Robinhood Chain) with)?/.exec(request);
  return changes ? `Adapted from a proven launch: ${title}: the swarm removes ${changes[1]} and adds ${changes[2]}${changes[4] ? `, redeployed on ${changes[4]}` : ''}` : provenLine(p);
}
export function provenInstruction(draft: Draft, p: ProvenLaunch) {
  const start = `Start from the audited source at ${p.repoUrl} commit ${p.commit}: `, chain = otherChain(draft, p);
  const deploy = chain ? `deploy on ${CHAIN_NAMES[chain]} with that chain's PoolManager ${POOL_MANAGERS[chain]}` : '';
  const tail = 'apply the parameters and rules of this request, adapt the deployer to mine its salt inside its constructor if it mines after deployment, and audit it as';
  if (sameBlocks(draft, p)) return start + `keep its behavior, ${deploy ? `${deploy}, ` : ''}${tail} imported code.`;
  const changes = provenChanges(draft, p);
  return start + `remove ${blockNames(changes.remove)}; add ${blockNames(changes.add)}; ${deploy ? `${deploy}; ` : ''}${tail} a new hook.`;
}
/** This launch itself is in the runtime index, rather than merely based on one. */
export function provenForLaunch(launch: { launchId?: string | null; launchNumber: number | null; chainId: number; hookAddress?: string | null }, entries: ProvenLaunch[]) {
  return entries.find(p => p.chainId === launch.chainId && (p.launchId === launch.launchId || p.launchNumber === launch.launchNumber || !!p.hookAddress && p.hookAddress.toLowerCase() === launch.hookAddress?.toLowerCase()));
}

/** The index is runtime data only. Invalid entries cannot introduce unpinned source. */
export function parseProvenLaunches(value: unknown): ProvenLaunch[] {
  const rows = (value as { launches?: unknown } | null)?.launches;
  if (!Array.isArray(rows)) return [];
  return rows.filter((p): p is ProvenLaunch => p && typeof p === 'object'
    && typeof p.launchId === 'string' && /^[\w-]+$/.test(p.launchId)
    && Number.isSafeInteger(p.launchNumber) && p.launchNumber > 0 && [1, 4663].includes(p.chainId)
    && ['A', 'B', 'C'].includes(p.type) && Array.isArray(p.blocks) && p.blocks.every((id: unknown) => typeof id === 'string')
    && typeof p.repoUrl === 'string' && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(p.repoUrl)
    && typeof p.commit === 'string' && /^[\da-f]{40}$/.test(p.commit)
    && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 120
    && typeof p.verifiedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.verifiedAt) && Number.isFinite(Date.parse(p.verifiedAt)));
}
export async function fetchProvenLaunches(signal?: AbortSignal): Promise<ProvenLaunch[]> {
  try {
    const response = await fetch(PROVEN_LAUNCHES_URL, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(6000)]) : AbortSignal.timeout(6000) });
    return response.ok ? parseProvenLaunches(await response.json()) : [];
  } catch { return []; }
}
export function matchProvenLaunch(draft: Draft, entries: ProvenLaunch[]): ProvenLaunch | undefined {
  if (draft.mode !== 'blocks' || draft.settings.repo.trim() || draft.settings.commit.trim()) return;
  const ids = draftIds(draft);
  if (![...ids].some(id => !tokenIds.has(id))) return;
  const candidates = entries.filter(p => p.type === draft.type);
  const newerFirst = (a: ProvenLaunch, b: ProvenLaunch) => b.launchNumber - a.launchNumber;
  const exact = candidates.filter(p => exactProvenMatch(draft, p)).sort(newerFirst)[0];
  if (exact) return exact;
  const overlap = (p: ProvenLaunch) => [...launchIds(p)].filter(id => !tokenIds.has(id) && ids.has(id)).length;
  // Nearest matches may adapt to another chain; count all shared ids, but require a behavior block.
  const common = (p: ProvenLaunch) => [...launchIds(p)].filter(id => ids.has(id)).length;
  return candidates.filter(p => overlap(p) > 0).sort((a, b) => common(b) - common(a) || newerFirst(a, b))[0];
}

/** Provenance is tied to the exact source in the paid request, not today's stack. */
export function provenFromRequest(request: string, entries: ProvenLaunch[]): ProvenLaunch | undefined {
  const source = /Start from the audited source at (https:\/\/github\.com\/\S+) commit ([\da-f]{40}):/.exec(request);
  return source ? entries.find(p => p.repoUrl === source[1] && p.commit === source[2]) : undefined;
}
