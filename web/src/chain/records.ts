import { sha256, stringToHex, isAddress } from 'viem';
import type { Launch } from '../types.ts';
import { applyLaunchRecord } from './decode.ts';
import { applyJobRecord } from '../relay.ts';

export const LAUNCH_RECORDS_URL = 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/launch-records.json';
export type LaunchRecord = {
  launchId: string; launchNumber: number; chainId: number; kind: string; status: string;
  parkedReason: string | null; createdAt: string; updatedAt: string; jobId: string | null;
  jobState: string | null; blockedReason: string | null; paidBy: string; objectiveSha256: string;
  sourceRepoUrl: string | null; sourceCommit: string | null; attested: boolean;
  artifacts: { role: string; name: string; address: string; txHash: string | null; blockNumber: number | null }[];
  pool: Record<string, unknown> | null;
};
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
export function parseLaunchRecords(value: unknown): LaunchRecord[] {
  const data = object(value);
  if (data.version !== 1 || !Number.isFinite(Date.parse(data.generatedAt)) || !Array.isArray(data.launches)) throw new Error('Invalid launch records snapshot');
  return data.launches.filter((row: unknown) => {
    const r = object(row);
    return typeof r.launchId === 'string' && /^[\w-]+$/.test(r.launchId) && Number.isSafeInteger(r.launchNumber) && r.launchNumber > 0
      && [1, 4663].includes(r.chainId) && ['univ4_hook', 'evm_contracts'].includes(r.kind) && typeof r.status === 'string'
      && typeof r.objectiveSha256 === 'string' && /^[a-f\d]{64}$/.test(r.objectiveSha256) && typeof r.paidBy === 'string' && isAddress(r.paidBy, { strict: false })
      && Array.isArray(r.artifacts) && r.artifacts.every((a: unknown) => { const v = object(a); return typeof v.name === 'string' && typeof v.role === 'string' && typeof v.address === 'string' && isAddress(v.address, { strict: false }); });
  });
}
export const objectiveHash = (objective: string) => sha256(stringToHex(objective)).slice(2);
export function matchingLaunchRecord(launch: Launch, records: LaunchRecord[]): LaunchRecord | undefined {
  const hash = objectiveHash(launch.request);
  return records.find(r => r.objectiveSha256 === hash && r.paidBy.toLowerCase() === launch.payer.toLowerCase() && r.chainId === launch.chainId && r.kind === launch.kind && (!launch.launchId || launch.launchId === r.launchId));
}
export function applySnapshotRecord(launch: Launch, record: LaunchRecord): Launch {
  if (!matchingLaunchRecord(launch, [record])) return launch;
  const row = applyLaunchRecord({ ...launch, launchId: record.launchId }, { ...record, id: record.launchId, jobs: record.jobId ? [{ id: record.jobId }] : [], seeded: { pools: record.pool ? [record.pool] : [] } });
  return applyJobRecord(row, { id: record.jobId, state: record.jobState, blockedReason: record.blockedReason, nodes: [] });
}
