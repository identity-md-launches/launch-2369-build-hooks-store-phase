import type { Draft } from './compose.ts';

export const PROVEN_LAUNCHES_URL = 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/proven-launches.json';
export const LAUNCH_WAIT = 'Typically 1 to 3 hours: the swarm writes, tests, audits with four auditors and a judge, then deploys. From a proven launch, usually less.';
export type ProvenLaunch = {
  launchId: string; launchNumber: number; chainId: number; type: 'A' | 'B' | 'C'; blocks: string[];
  repoUrl: string; commit: string; name: string; verifiedAt: string;
};
export const provenLine = (p: ProvenLaunch) => `Built from a proven launch: ${p.name} (launch ${p.launchNumber}, audited ${p.verifiedAt})`;

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
  if (draft.settings.repo.trim() || draft.settings.commit.trim()) return;
  const ids = new Set(draft.blocks.filter(b => b.id !== 'custom' && (['token', 'own-token'].includes(b.id) ? draft.type === 'A' : draft.mode !== 'prompt')).map(b => b.id));
  return entries.find(p => p.type === draft.type && p.chainId === draft.settings.chain
    && new Set(p.blocks.filter(id => id !== 'custom')).size === ids.size
    && p.blocks.filter(id => id !== 'custom').every(id => ids.has(id)));
}

/** Provenance is tied to the exact source in the paid request, not today's stack. */
export function provenFromRequest(request: string, entries: ProvenLaunch[]): ProvenLaunch | undefined {
  const source = /Start from the audited source at (https:\/\/github\.com\/\S+) commit ([\da-f]{40}):/.exec(request);
  return source ? entries.find(p => p.repoUrl === source[1] && p.commit === source[2]) : undefined;
}
