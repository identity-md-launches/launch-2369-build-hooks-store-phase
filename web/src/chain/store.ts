import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { toHex, type Address, type Hex } from 'viem';
import type { SiteConfig } from '../config';
import { CHAINS, type Launch } from '../types.ts';
import { cast } from '../../../src/scene/cast.ts';
import { applyCompleted, applyResult, launchFromRequested, pondMessage, resultUrl, type RawLog } from './decode.ts';
import { publicClients, readCache, writeCache, type ReadClient } from './clients.ts';
import { creatorName } from './ens.ts';
export const REQUEST_TOPIC = '0x1c521a43c9b0f72a335bc80a6918abce08af7949ebbd1c41fe2a576074379063';
export const COMPLETE_TOPIC = '0xd4ad2d2ef4e8ea9995103f34e322dbefb2534f3a52984a308f7db8e257b76fa1';
const CACHE_VERSION = 1;
export const cacheKey = (chainId: number) => `hooks-store:intake:v${CACHE_VERSION}:${chainId}`;
type RecordEntry = { requested: RawLog; completed?: RawLog; result?: unknown; completionCursor?: string; timestamp?: number };
type ChainCache = { version: number; head: string; cursor: string; records: Record<string, RecordEntry> };
export type ChainState = { chainId: number; loading: boolean; backfilling: boolean; error: string | null; head?: string; cursor?: string };
export type StoreState = { launches: Launch[]; chains: ChainState[] };
/** Inclusive, gap-free windows, newest first. All eth_getLogs calls stay at or below 10,000 blocks. */
export function* backwardsRanges(from: bigint, to: bigint, size = 10000n): Generator<[bigint, bigint]> {
  while (to >= from) { const start = to - size + 1n > from ? to - size + 1n : from; yield [start, to]; to = start - 1n; }
}
export async function readLogs(client: ReadClient, address: string, topics: (Hex | Hex[] | null)[], from: bigint, to: bigint): Promise<RawLog[]> {
  if (to < from) return [];
  try {
    const logs = await client.request({ method: 'eth_getLogs', params: [{ address: address as Address, topics, fromBlock: toHex(from), toBlock: toHex(to) }] });
    if (logs.length >= 10000 && from < to) throw new Error('Possible RPC result cap');
    return logs as RawLog[];
  } catch (error) {
    // Providers may impose a smaller range. Never skip a rejected interval.
    if (to - from < 500n || !/limit|range|size|too many|cap/i.test(String(error))) throw error;
    const middle = (from + to) / 2n;
    return [...await readLogs(client, address, topics, from, middle), ...await readLogs(client, address, topics, middle + 1n, to)];
  }
}
export class LaunchStore {
  readonly clients: ReturnType<typeof publicClients>;
  private caches = new Map<number, ChainCache>();
  private rows = new Map<string, Launch>();
  private listeners = new Set<() => void>();
  private epoch = 0;
  private timer?: ReturnType<typeof setInterval>;
  private busy = new Set<number>();
  private pendingHead = new Set<number>();
  private resultDue = new Map<string, number>();
  private named = new Set<string>();
  private state: StoreState;
  readonly config: SiteConfig;
  private onCast: typeof cast;
  constructor(config: SiteConfig, clients = publicClients(config), onCast = cast) {
    this.config = config; this.onCast = onCast;
    this.clients = clients;
    this.state = { launches: [], chains: config.chains.map(c => ({ chainId: c.id, loading: true, backfilling: true, error: null })) };
    for (const chain of config.chains) {
      const saved = readCache<ChainCache>(cacheKey(chain.id));
      const valid = saved?.version === CACHE_VERSION && /^\d+$/.test(saved.head) && /^-?\d+$/.test(saved.cursor) && saved.records && typeof saved.records === 'object';
      const cache = valid ? saved : { version: CACHE_VERSION, head: '0', cursor: '-1', records: {} };
      this.caches.set(chain.id, cache);
      for (const [id, entry] of Object.entries(cache.records)) {
        const row = this.hydrate(entry, chain.id);
        if (row) this.rows.set(row.id, row); else delete cache.records[id];
      }
    }
    this.emit();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  private emit() { this.state = { ...this.state, launches: [...this.rows.values()].sort((a,b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0) || a.id.localeCompare(b.id)) }; this.listeners.forEach(fn => fn()); }
  private status(chainId: number, patch: Partial<ChainState>) { this.state = { ...this.state, chains: this.state.chains.map(c => c.chainId === chainId ? { ...c, ...patch } : c) }; this.emit(); }
  private hydrate(entry: RecordEntry, chain: number) {
    if (!entry || !entry.requested) return null;
    let row = launchFromRequested(entry.requested, chain, this.config.intake.launchAction, entry.timestamp);
    if (!row) return null;
    if (entry.completed) row = applyCompleted(row, entry.completed);
    if (entry.result && row.completion?.status === 0) row = applyResult(row, entry.result);
    if (row.completion) row.resultUrl = resultUrl(row.completion.uri, this.config.intake.ipfsGateway);
    return row;
  }
  start() {
    const epoch = ++this.epoch;
    for (const chain of this.config.chains) void this.run(chain.id, epoch, false);
    this.timer = setInterval(() => this.poll(), this.config.intake.pollIntervalMs);
    return () => { ++this.epoch; clearInterval(this.timer); };
  }
  private poll = () => { for (const chain of this.config.chains) void this.run(chain.id, this.epoch, false); };
  retry = () => { this.resultDue.clear(); this.poll(); };
  private async run(chainId: number, epoch: number, history: boolean) {
    if (this.busy.has(chainId)) { if (!history) this.pendingHead.add(chainId); return; }
    this.busy.add(chainId);
    const chain = this.config.chains.find(c => c.id === chainId)!, client = this.clients[chainId], cache = this.caches.get(chainId)!;
    try {
      const previous = BigInt(cache.head), floor = BigInt(chain.intakeFromBlock);
      if (!history && await client.getChainId() !== chainId) throw new Error('RPC returned the wrong chain');
      const head = history ? previous : await client.getBlockNumber({ cacheTime: 0 });
      // Replay a short overlap for delayed indexing; deduplication is by request id.
      const from = previous > floor ? (previous - 12n > floor ? previous - 12n : floor) : head - 9999n > floor ? head - 9999n : floor;
      if (!history) for (const [start, end] of backwardsRanges(from, head)) {
        if (epoch !== this.epoch) return;
        await this.requestRange(chainId, start, end, previous > 0n ? previous : undefined);
      }
      if (previous === 0n) cache.cursor = String(from - 1n);
      cache.head = String(head);
      // A restart resumes the historical cursor; no old log moves the pond.
      let ranges = history ? 4 : 0;
      while (BigInt(cache.cursor) >= floor && ranges-- > 0 && epoch === this.epoch) {
        const to = BigInt(cache.cursor), start = to - 9999n > floor ? to - 9999n : floor;
        await this.requestRange(chainId, start, to); cache.cursor = String(start - 1n);
      }
      await this.completions(chainId, head, epoch);
      if (epoch !== this.epoch) return;
      this.status(chainId, { loading: false, error: null, backfilling: BigInt(cache.cursor) >= floor, head: cache.head, cursor: cache.cursor });
      writeCache(cacheKey(chainId), cache);
    } catch {
      if (epoch === this.epoch) this.status(chainId, { loading: false, error: `Could not finish reading ${CHAINS[chainId]}. Showing what is cached. Retry the chain reads.` });
    } finally {
      // Persist successful subranges even if a later RPC request failed.
      writeCache(cacheKey(chainId), cache);
      this.busy.delete(chainId);
      if (epoch === this.epoch && this.pendingHead.delete(chainId)) {
        void this.run(chainId, epoch, false); return;
      }
      if (epoch === this.epoch && !this.state.chains.find(c => c.chainId === chainId)?.error && BigInt(cache.cursor) >= BigInt(chain.intakeFromBlock)) {
        // Cooperative history traversal; the head poll stays independent and no overlap runs in parallel.
        setTimeout(() => { if (epoch === this.epoch) void this.run(chainId, epoch, true); }, 500);
      } else if (epoch !== this.epoch && this.listeners.size) {
        setTimeout(() => { if (this.listeners.size) void this.run(chainId, this.epoch, false); }, 0);
      }
    }
  }
  private async requestRange(chainId: number, from: bigint, to: bigint, castAfter?: bigint) {
    const client = this.clients[chainId], cache = this.caches.get(chainId)!;
    const logs = await readLogs(client, this.config.intake.address, [REQUEST_TOPIC, null, null, this.config.intake.launchAction as Hex], from, to);
    for (const log of logs) {
      let row = launchFromRequested(log, chainId, this.config.intake.launchAction);
      if (!row) continue;
      const existed = cache.records[row.requestId];
      const entry = existed ?? { requested: log, completionCursor: row.blockNumber };
      if (!row.createdAt) {
        try { entry.timestamp ??= Number((await client.getBlock({ blockNumber: BigInt(log.blockNumber) })).timestamp); } catch { /* Dates can remain unknown; no invented times. */ }
      }
      entry.requested = log; cache.records[row.requestId] = entry;
      row = this.hydrate(entry, chainId)!;
      const old = this.rows.get(row.id); row.creatorName = old?.creatorName;
      this.rows.set(row.id, row);
      if (!existed && castAfter !== undefined && BigInt(log.blockNumber) > castAfter) this.onCast(pondMessage(row));
      if (!this.named.has(row.payer.toLowerCase())) {
        this.named.add(row.payer.toLowerCase());
        void creatorName(this.clients[1], row.payer).then(name => { for (const [key, value] of this.rows) if (value.payer.toLowerCase() === row!.payer.toLowerCase()) this.rows.set(key, { ...value, creatorName: name }); this.emit(); });
      }
    }
    this.emit();
  }
  private async completions(chainId: number, head: bigint, epoch: number) {
    const cache = this.caches.get(chainId)!, client = this.clients[chainId];
    for (const [requestId, entry] of Object.entries(cache.records)) {
      if (epoch !== this.epoch) return;
      if (!entry.completed) {
        let cursor = BigInt(entry.completionCursor ?? entry.requested.blockNumber), budget = 4;
        while (cursor <= head && budget-- > 0) {
          const end = cursor + 9999n < head ? cursor + 9999n : head;
          const logs = await readLogs(client, this.config.intake.address, [COMPLETE_TOPIC, requestId as Hex], cursor, end);
          if (logs.length) { entry.completed = logs.at(-1); break; }
          cursor = end + 1n; entry.completionCursor = String(cursor);
        }
      }
      let row = this.hydrate(entry, chainId)!;
      if (!this.named.has(row.payer.toLowerCase())) {
        this.named.add(row.payer.toLowerCase());
        void creatorName(this.clients[1], row.payer).then(name => { for (const [key, value] of this.rows) if (value.payer.toLowerCase() === row.payer.toLowerCase()) this.rows.set(key, { ...value, creatorName: name }); this.emit(); });
      }
      if (row.completion?.status === 0 && !entry.result && (this.resultDue.get(row.id) ?? 0) <= Date.now()) {
        this.resultDue.set(row.id, Date.now() + 20000);
        const url = resultUrl(row.completion.uri, this.config.intake.ipfsGateway);
        if (url) {
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error('Result unavailable');
            const data: unknown = await response.json();
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid result');
            entry.result = data; row = this.hydrate(entry, chainId)!;
          } catch { row.resultError = 'The result file is unavailable. It will be retried on the next refresh.'; }
        } else row.resultError = 'Intake completed this request without a supported IPFS result URI.';
      }
      const old = this.rows.get(row.id); row.creatorName = old?.creatorName; row.resultError ??= old?.resultError;
      if (row.resultLoaded && !this.hydrate(entry, chainId)?.resultError) row.resultError = undefined;
      this.rows.set(row.id, row);
    }
    this.emit();
  }
}
export function useLaunches(config: SiteConfig) {
  const store = useMemo(() => new LaunchStore(config), [config]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => store.start(), [store]);
  return { ...state, store };
}
