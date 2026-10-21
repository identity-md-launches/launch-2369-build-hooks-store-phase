import type { Body, Draft } from '../../src/lib/compose.ts';
import type { Launch } from './types.ts';
import { checkConsistency } from '../../src/lib/safety.ts';

export type CheckResult = {
  facts: { id: string; label: string; state: string; required?: boolean; assumed?: string; example?: string }[];
  plan: { title: string }[]; blockers: string[]; suggestions: string[];
};
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const message = (v: unknown): string => typeof v === 'string' ? v : typeof object(v).detail === 'string' ? object(v).detail : typeof object(v).message === 'string' ? object(v).message : typeof object(v).label === 'string' ? object(v).label : JSON.stringify(v);
export function parseCheck(value: unknown): CheckResult {
  const data = object(value);
  if (!['facts', 'plan', 'blockers', 'suggestions'].every(k => Array.isArray(data[k]))) throw new Error('The free check returned an incomplete response. Try again.');
  if (!data.facts.every((f: unknown) => typeof object(f).label === 'string' && typeof object(f).state === 'string') || !data.plan.every((p: unknown) => typeof object(p).title === 'string')) throw new Error('The free check returned an invalid response. Try again.');
  return { facts: data.facts.map((f: any, index: number) => ({
    id: typeof f.id === 'string' ? f.id : String(index), label: f.label, state: f.state, required: f.required === true,
    ...(typeof f.assumed === 'string' ? { assumed: f.assumed } : {}), ...(typeof f.example === 'string' ? { example: f.example } : {}),
  })), plan: data.plan.map((p: any) => ({ title: p.title })), blockers: data.blockers.map(message), suggestions: data.suggestions.map(message) };
}
export async function relayFetch(relay: string, path: string, input?: unknown, signal?: AbortSignal) {
  const response = await fetch(`${relay.replace(/\/+$/, '')}${path}`, {
    method: input === undefined ? 'GET' : 'POST',
    ...(input === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
  });
  const text = await response.text();
  const failure = `IMD could not finish this request (${response.status}). Try again.`;
  // Proxies and Cloudflare can return HTML or an empty body at any status.
  if (!response.ok) {
    let detail: unknown;
    try { const data = object(JSON.parse(text)); detail = data.detail ?? data.error; } catch { /* Use the status message. */ }
    throw new Error(typeof detail === 'string' && detail.trim()
      ? `IMD could not finish this request (${response.status}). ${detail}` : failure);
  }
  try { return JSON.parse(text) as unknown; } catch { throw new Error(failure); }
}
export async function checkRequest(relay: string, input: Body, signal?: AbortSignal) {
  const findings = checkConsistency(input);
  if (findings.length) throw new Error(`${findings[0].message} Sentence: ${findings[0].sentence}`);
  return parseCheck(await relayFetch(relay, '/check', { action: 'launch.open', input }, signal));
}
export type ImportedSource = { repoUrl: string; baseCommit: string };
export async function importSource(relay: string, draft: Draft, signal?: AbortSignal): Promise<ImportedSource> {
  const data = object(await relayFetch(relay, '/import', { url: draft.settings.repo.trim(), ref: draft.settings.commit.trim(), kind: 'contracts' }, signal));
  if (data.ok !== true) throw new Error(`Could not import this repository. ${(Array.isArray(data.problems) ? data.problems.map(message).join(' ') : 'Check its URL, commit and Foundry project.')}`);
  const source = object(data.source);
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(source.repoUrl ?? '') || !/^[\da-f]{40}$/i.test(source.baseCommit ?? '')) throw new Error('The import did not return a pinned GitHub source. Try again.');
  return { repoUrl: source.repoUrl, baseCommit: source.baseCommit };
}

export type RelayLaunch = { id: string; name: string; chainId: number; updatedAt: string; status: string; hookAddress: string | null; sourceRepoUrl: string | null };
export function parseLaunches(value: unknown): RelayLaunch[] {
  const data = object(value);
  if (!Array.isArray(data.launches)) throw new Error('Launch names are unavailable.');
  return data.launches.flatMap((raw: unknown) => {
    const row = object(raw), artifacts = Array.isArray(row.artifacts) ? row.artifacts : [];
    // Standalone evm_contracts launches expose their hook as role "other".
    const hook = artifacts.find((a: any) => a.role === 'hook') ?? artifacts.find((a: any) => a.role === 'other' && /hook/i.test(a.name)) ?? artifacts.find((a: any) => a.role === 'other');
    const name = artifacts.find((a: any) => a.role === 'token')?.name || hook?.name;
    if (typeof row.id !== 'string' || typeof name !== 'string' || ![1, 4663].includes(row.chainId) || !hook || !Number.isFinite(Date.parse(row.updatedAt))) return [];
    return [{ id: row.id, name, chainId: row.chainId, updatedAt: row.updatedAt, status: row.status, hookAddress: hook.address ?? null, sourceRepoUrl: row.sourceRepoUrl ?? null }];
  });
}
export function matchesLaunch(row: RelayLaunch, launch: Launch) {
  return row.chainId === launch.chainId && (launch.launchId === row.id || !!launch.hookAddress && row.hookAddress?.toLowerCase() === launch.hookAddress.toLowerCase());
}
export const relativeTime = (date: string, now = Date.now()) => {
  const seconds = Math.max(0, Math.floor((now - Date.parse(date)) / 1000));
  return seconds < 60 ? 'just now' : seconds < 3600 ? `${Math.floor(seconds / 60)} min ago` : seconds < 86400 ? `${Math.floor(seconds / 3600)} h ago` : `${Math.floor(seconds / 86400)} d ago`;
};

export type JobStage = { title: 'Building' | 'Audit panel' | 'Deploying'; state: 'active' | 'complete' | 'pending' | 'failed'; detail: string };
export function jobAttention(value: unknown): { blocked: boolean; questions: string[] } {
  const job = object(value), nodes = Array.isArray(job.nodes) ? job.nodes.map(object) : [];
  const blocked = job.state === 'blocked' || nodes.some(n => n.state === 'failed' && typeof n.failureReason === 'string' && /needs_input|needs input/i.test(n.failureReason));
  const questions = blocked ? [job.blockedReason, ...nodes.filter(n => n.state === 'failed').map(n => n.failureReason)]
    .filter((q): q is string => typeof q === 'string' && q.trim().length > 0) : [];
  return { blocked, questions: [...new Set(questions)] };
}
export function jobStages(value: unknown): JobStage[] {
  const job = object(value);
  if (!Array.isArray(job.nodes)) throw new Error('Job stages are unavailable.');
  const done = (n: any) => n.state === 'accepted';
  const running = (n: any) => n.state === 'working';
  const failed = (n: any) => n.state === 'failed';
  const nodes = job.nodes.map(object);
  const audits = nodes.filter(n => /audit|judge|adversarial/.test(String(n.key)) || ['review', 'audit'].includes(n.role));
  const builds = nodes.filter(n => !audits.includes(n) && !/deploy/.test(String(n.key)));
  const status = (group: any[]): JobStage['state'] => group.length && group.every(done) ? 'complete' : group.some(failed) ? 'failed' : group.some(running) ? 'active' : 'pending';
  const deploy = object(job.launch), deployNodes = nodes.filter(n => /deploy/.test(String(n.key)));
  const deployState = deploy.status === 'live' ? 'complete' : ['failed', 'parked'].includes(deploy.status) ? 'failed' : deploy.status === 'deploying' || job.state === 'completed' ? 'active' : status(deployNodes);
  return [
    { title: 'Building', state: status(builds), detail: builds.length ? `${builds.filter(done).length} of ${builds.length} build and test steps complete` : 'Waiting for build steps' },
    { title: 'Audit panel', state: status(audits), detail: audits.length ? `${audits.filter(done).length} of ${audits.length} review steps complete` : 'Waiting for audit steps' },
    { title: 'Deploying', state: deployState, detail: typeof deploy.status === 'string' ? `Deployment: ${deploy.status}` : deployNodes.length ? 'Deployment steps reported by IMD' : 'Waiting for deployment' },
  ];
}
export function intakeJob(value: unknown, requestId: string): string | null {
  const entries = object(value).entries;
  const entry = Array.isArray(entries) ? entries.find(e => object(e).requestId?.toLowerCase() === requestId.toLowerCase() && object(e).action === 'launch.open') : null;
  const id = object(object(object(entry).admission).result).jobId;
  return typeof id === 'string' && /^[\w-]+$/.test(id) ? id : null;
}
