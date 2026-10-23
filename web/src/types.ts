import type { BlockEntry, LaunchType } from '../../src/lib/compose';
export type Launch = {
  id: string; requestId: string; kind: string; type: LaunchType; name: string; symbol: string | null;
  /** chainId is the deployment chain. intakeChainId locates the payment event and hash route. */
  chainId: number; intakeChainId: number; status: 'live' | 'requested' | 'in-progress' | 'checking' | 'failed';
  launchNumber: number | null;
  isHook?: boolean; sourceCommit?: string; contractName?: string; hookCodeVerified?: boolean;
  launchId?: string | null; createdAt: string | null; blockNumber: string;
  summary: string; request: string; blocks: string[]; matchedBlocks: BlockEntry[]; groups: string[];
  hookAddress: string | null; tokenAddress: string | null; distributorAddress: string | null; poolId: string | null;
  deployerAddress?: string | null; hookPending?: boolean;
  launchRecordStatus?: string;
  jobState?: string; jobNeedsInput?: boolean; attentionReasons?: string[];
  payer: string; creatorName?: string | null; txHashes: string[]; currencies: string[];
  sourceRepoUrl: string | null; jobIds: string[]; auditUrl?: string | null; resultUrl?: string | null;
  completion?: { status: number; reason: string; uri: string; blockNumber: string; txHash: string };
  resultError?: string; resultLoaded?: boolean;
};
export const CHAINS: Record<number, string> = { 1: 'Ethereum', 4663: 'Robinhood Chain' };
export const GROUPS = [['fees', 'Fees'], ['protection', 'Protection'], ['treasury', 'Treasury and rewards'], ['liquidity', 'Liquidity rules'], ['timing', 'Timing and access'], ['advanced', 'Advanced'], ['custom', 'Own source']] as const;
export const STATUSES = { live: 'Live', requested: 'Requested', 'in-progress': 'In progress', checking: 'Checking…', failed: 'Failed' };
export const hookHref = (launch: Launch) => `#hook/${launch.intakeChainId}/${launch.requestId}`;
