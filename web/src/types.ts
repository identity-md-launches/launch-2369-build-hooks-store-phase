export type Launch = {
  id: string; requestId: string | null; kind: string; name: string; symbol: string | null;
  chainId: number; status: 'live' | 'requested' | 'in-progress' | 'failed'; sourceStatus: string;
  launchNumber: number | null; createdAt: string | null; updatedAt: string | null;
  summary: string; request: string; blocks: string[]; groups: string[]; builtHere: boolean;
  hookAddress: string | null; tokenAddress: string | null; distributorAddress: string | null;
  payer: string | null; txHashes: string[]; currencies: string[]; sourceRepoUrl: string | null; jobIds: string[];
};
export type Snapshot = { version: number; generatedAt: string; source: string; inspected: number; launches: Launch[] };
export const CHAINS: Record<number, string> = { 1: 'Ethereum', 4663: 'Robinhood Chain', 11155111: 'Sepolia' };
export const GROUPS = [['fees', 'Fees'], ['protection', 'Protection'], ['treasury', 'Treasury and rewards'], ['liquidity', 'Liquidity rules'], ['timing', 'Timing and access'], ['advanced', 'Advanced'], ['custom', 'Own source']] as const;
