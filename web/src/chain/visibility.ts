import type { Launch } from '../types.ts';

export const REQUEST_PUBLIC_MS = 24 * 60 * 60 * 1000;
const stoppedJobs = new Set(['blocked', 'cancelled', 'failed', 'superseded']);
export const launchStopped = (launch: Launch) => stoppedJobs.has(launch.jobState ?? '') || launch.jobNeedsInput === true || launch.launchRecordStatus === 'parked';
export const launchFailed = (launch: Launch) => launch.completion?.status === 1 || launch.completion?.status === 2 || launch.status === 'failed' || launch.launchRecordStatus === 'failed';
export const launchRunning = (launch: Launch) => ['executing', 'running', 'completed'].includes(launch.jobState ?? '') || launch.launchRecordStatus === 'deploying';

/** All public surfaces share this rule. The Requested block time is the age clock. */
export function isPublicLaunch(launch: Launch, now = Date.now()): boolean {
  if (launchFailed(launch) || launchStopped(launch)) return false;
  if (launch.status === 'live' || launch.status === 'checking' || launchRunning(launch)) return true;
  const requestedAt = Date.parse(launch.createdAt ?? '');
  return Number.isFinite(requestedAt) && now - requestedAt < REQUEST_PUBLIC_MS;
}
export function pondNotice(launch: Launch, now = Date.now()): string | null {
  if (isPublicLaunch(launch, now)) return null;
  if (launchFailed(launch)) return 'Not on the pond: this launch failed';
  // Until the Requested block time arrives, the public list is conservative;
  // the direct page must not claim that IMD stopped an unclassified request.
  return launchStopped(launch) || Number.isFinite(Date.parse(launch.createdAt ?? '')) ? 'Not on the pond: IMD stopped this launch' : null;
}
export function deriveLaunchStatus(launch: Launch): Launch['status'] {
  if (launchFailed(launch)) return 'failed';
  if (launchStopped(launch)) return 'requested';
  if (launch.type === 'A' && (launch.launchRecordStatus === 'live' || launch.status === 'live')) return launch.hookCodeVerified ? 'live' : 'checking';
  if (launch.status === 'live') return 'live';
  return launchRunning(launch) ? 'in-progress' : launch.status;
}
