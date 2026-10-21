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
const CACHE_VERSION = 2;
export const cacheKey = (chainId: number) => `hooks-store:intake:v${CACHE_VERSION}:${chainId}`;
type RecordEntry = { requested: RawLog; completed?: RawLog; result?: unknown; timestamp?: number };
type ChainCache = { version: number; head: string; cursor: string; records: Record<string, RecordEntry>; completions: Record<string, RawLog> };
export type ChainState = { chainId: number; loading: boolean; backfilling: boolean; error: string | null; head?: string; cursor?: string };
export type StoreState = { launches: Launch[]; chains: ChainState[] };
/** Inclusive, gap-free windows, newest first. Callers supply the chain's configured range. */
export function* backwardsRanges(from: bigint, to: bigint, size = 10000n): Generator<[bigint, bigint]> {
  if (size < 1n) throw new Error('Log range must be positive');
  while (to >= from) { const start = to - size + 1n > from ? to - size + 1n : from; yield [start, to]; to = start - 1n; }
}
export async function readLogs(client: ReadClient, address: string, topics: (Hex | Hex[] | null)[], from: bigint, to: bigint): Promise<RawLog[]> {
  if (to < from) return [];
  try {
    const logs = await client.request({ method: 'eth_getLogs', params: [{ address: address as Address, topics, fromBlock: toHex(from), toBlock: toHex(to) }] });
    if (logs.length >= 10000 && from < to) throw new Error('Possible RPC result cap');
    return logs as RawLog[];
  } catch (error) {
    // Any failure (including HTTP/timeout/archive errors) gets smaller windows. Never skip blocks.
    if (to - from + 1n <= 1000n) throw error;
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
    this.config = config; this.onCast = onCast; this.clients = clients;
    this.state = { launches: [], chains: config.chains.map(c => ({ chainId: c.id, loading: true, backfilling: true, error: null })) };
    for (const chain of config.chains) {
      const saved = readCache<ChainCache>(cacheKey(chain.id));
      const valid = saved?.version === CACHE_VERSION && /^\d+$/.test(saved.head) && /^-?\d+$/.test(saved.cursor) && saved.records && typeof saved.records === 'object';
      const cache: ChainCache = valid ? { ...saved, completions: saved.completions ?? {} } : { version: CACHE_VERSION, head: '0', cursor: '-1', records: {}, completions: {} };
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
    if (!entry?.requested) return null;
    let row = launchFromRequested(entry.requested, chain, this.config.intake.launchAction, entry.timestamp);
    if (!row) return null;
    if (entry.completed) row = applyCompleted(row, entry.completed);
    if (entry.result && row.completion?.status === 0) row = applyResult(row, entry.result);
    if (row.completion) row.resultUrl = resultUrl(row.completion.uri, this.config.intake.ipfsGateway);
    return row;
  }
  /** Add a confirmed local receipt immediately; later polling deduplicates the same request. */
  acceptReceipt(chainId: number, logs: RawLog[]) {
    this.accept(chainId, logs, []);
    writeCache(cacheKey(chainId), this.caches.get(chainId));
  }
  start() {
    const epoch = ++this.epoch;
    for (const chain of this.config.chains) void this.run(chain.id, epoch);
    this.timer = setInterval(() => this.poll(), this.config.intake.pollIntervalMs);
    return () => { ++this.epoch; clearInterval(this.timer); };
  }
  private poll = () => { for (const chain of this.config.chains) void this.run(chain.id, this.epoch); };
  retry = () => { this.resultDue.clear(); this.poll(); };
  private async run(chainId: number, epoch: number) {
    if (this.busy.has(chainId)) { this.pendingHead.add(chainId); return; }
    this.busy.add(chainId);
    const chain = this.config.chains.find(c => c.id === chainId)!, client = this.clients[chainId], cache = this.caches.get(chainId)!;
    try {
      const previous = BigInt(cache.head), floor = BigInt(chain.intakeFromBlock), size = BigInt(chain.logRange);
      if (await client.getChainId() !== chainId) throw new Error('RPC returned the wrong chain');
      const head = await client.getBlockNumber({ cacheTime: 0 });
      const from = previous > floor ? (previous - 12n > floor ? previous - 12n : floor) : head - size + 1n > floor ? head - size + 1n : floor;
      // The head overlaps twelve blocks; history resumes independently from its saved cursor.
      for (const [start, end] of backwardsRanges(from, head, size)) {
        if (epoch !== this.epoch) return;
        const [requests, completions] = await this.window(chainId, start, end);
        this.accept(chainId, requests, completions, previous > 0n ? previous : undefined);
      }
      if (previous === 0n) cache.cursor = String(from - 1n);
      cache.head = String(head);
      const history = [...backwardsRanges(floor, BigInt(cache.cursor), size)];
      // Four windows in flight keeps a fresh browser quick without an unbounded RPC fan-out.
      for (let i = 0; i < history.length; i += 4) {
        if (epoch !== this.epoch) return;
        const group = history.slice(i, i + 4);
        const results = await Promise.allSettled(group.map(([start, end]) => this.window(chainId, start, end)));
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.status === 'fulfilled') this.accept(chainId, ...result.value);
        }
        // Advance only a completely read group. A retry safely deduplicates successful siblings.
        const failed = results.find(r => r.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
        cache.cursor = String(group.at(-1)![0] - 1n);
        writeCache(cacheKey(chainId), cache);
      }
      if (epoch !== this.epoch) return;
      cache.completions = {}; // All known requests have been matched; discard unrelated completions.
      this.status(chainId, { loading: false, error: null, backfilling: false, head: cache.head, cursor: cache.cursor });
      // Optional names, timestamps and IPFS files never hold the chain-read status hostage.
      void this.enrich(chainId, epoch);
    } catch {
      if (epoch === this.epoch) this.status(chainId, { loading: false, error: `Could not finish reading ${CHAINS[chainId]}. Showing what is cached. Retry the chain reads.` });
    } finally {
      writeCache(cacheKey(chainId), cache); this.busy.delete(chainId);
      if (epoch === this.epoch && this.pendingHead.delete(chainId)) void this.run(chainId, epoch);
      else if (epoch !== this.epoch && this.listeners.size) void this.run(chainId, this.epoch);
    }
  }
  private window(chainId: number, from: bigint, to: bigint): Promise<[RawLog[], RawLog[]]> {
    return Promise.all([
      readLogs(this.clients[chainId], this.config.intake.address, [REQUEST_TOPIC, null, null, this.config.intake.launchAction as Hex], from, to),
      readLogs(this.clients[chainId], this.config.intake.address, [COMPLETE_TOPIC], from, to),
    ]);
  }
  private accept(chainId: number, requests: RawLog[], completions: RawLog[], castAfter?: bigint) {
    const cache = this.caches.get(chainId)!;
    // Backwards traversal can see a completion before its request. Retain it until history finishes.
    for (const log of completions) if (!log.removed && log.topics[1]) cache.completions[log.topics[1].toLowerCase()] = log;
    for (const log of requests) {
      const row = launchFromRequested(log, chainId, this.config.intake.launchAction);
      if (!row) continue;
      const existed = cache.records[row.requestId];
      cache.records[row.requestId] = { ...existed, requested: log };
      if (!existed && castAfter !== undefined && BigInt(log.blockNumber) > castAfter) this.onCast(pondMessage(row));
    }
    for (const [id, entry] of Object.entries(cache.records)) {
      entry.completed = cache.completions[id.toLowerCase()] ?? entry.completed;
      const row = this.hydrate(entry, chainId);
      if (row) { const old = this.rows.get(row.id); this.rows.set(row.id, { ...row, creatorName: old?.creatorName, resultError: row.resultError ?? old?.resultError }); }
    }
    this.emit();
  }
  private async enrich(chainId: number, epoch: number) {
    const cache = this.caches.get(chainId)!, entries = Object.values(cache.records);
    for (let i = 0; i < entries.length && epoch === this.epoch; i += 4) await Promise.all(entries.slice(i, i + 4).map(async entry => {
      let row = this.hydrate(entry, chainId)!;
      if (!row.createdAt) {
        try { entry.timestamp ??= Number((await this.clients[chainId].getBlock({ blockNumber: BigInt(entry.requested.blockNumber) })).timestamp); } catch { /* Leave dates unknown. */ }
        row = this.hydrate(entry, chainId)!;
      }
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
      const old = this.rows.get(row.id); row.creatorName = old?.creatorName;
      this.rows.set(row.id, row); this.emit();
    }));
    writeCache(cacheKey(chainId), cache);
  }
}
export function useLaunches(config: SiteConfig) {
  const store = useMemo(() => new LaunchStore(config), [config]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => store.start(), [store]);
  return { ...state, store };
}
