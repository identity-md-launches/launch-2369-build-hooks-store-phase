import { createPublicClient, defineChain, fallback, http, toHex, type Transport } from 'viem';
import { mainnet } from 'viem/chains';
import type { SiteConfig } from '../config';
export const logBackoffMs = [2000, 4000, 8000] as const;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export function rateLimited(error: unknown): boolean {
  const e = error as { status?: number; message?: string; cause?: unknown } | null;
  return !!e && (e.status === 429 || /\b429\b|too many requests|rate limit/i.test(e.message ?? '') || !!e.cause && e.cause !== error && rateLimited(e.cause));
}
/** Share a cooldown across a chain. A 429 waits before fallback tries another
 * endpoint; it never spends repeated attempts on a throttled primary first. */
export function rpcBackoff(wait = sleep, now = Date.now) {
  let until = 0, failures = 0;
  return async <T>(read: () => Promise<T>): Promise<T> => {
    while (until > now()) await wait(until - now());
    try { const result = await read(); failures = 0; return result; }
    catch (error) {
      if (rateLimited(error)) {
        const delay = logBackoffMs[Math.min(failures++, logBackoffMs.length - 1)];
        until = Math.max(until, now() + delay);
        await wait(until - now());
      }
      throw error;
    }
  };
}
/** Shared by all endpoints and all readers of a chain, including direct hash lookups. */
export function scanQueue(limit = 2) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(read: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>(resolve => waiting.push(resolve));
    else active++;
    try { return await read(); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  };
}
export function* logWindows(from: bigint, to: bigint, maximum: number): Generator<[bigint, bigint]> {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid endpoint log range');
  const size = BigInt(maximum);
  for (let start = from; start <= to; start += size) yield [start, start + size - 1n < to ? start + size - 1n : to];
}
/** Split again for the endpoint actually being used, including a fallback with a smaller cap. */
export const rpcTransport = (urls: string[], maximums: Record<string, number> = {}, lookbacks: Record<string, number> = {}): Transport => {
  const enqueue = scanQueue(2);
  let observedHead: bigint | undefined;
  const guarded = rpcBackoff();
  const endpoints: Transport[] = urls.map(url => options => {
    const endpoint = http(url, { timeout: 12000, retryCount: 0 })(options);
    const read = (args: any) => guarded(() => endpoint.request(args));
    return { ...endpoint, request: async (args: any) => {
      const filter = args.params?.[0];
      if (args.method !== 'eth_getLogs' || !/^0x[\da-f]+$/i.test(filter?.fromBlock ?? '') || !/^0x[\da-f]+$/i.test(filter?.toBlock ?? '')) {
        const result = await read(args);
        if (args.method === 'eth_blockNumber' && typeof result === 'string') observedHead = BigInt(result);
        return result;
      }
      // Some public endpoints serve recent blocks only, even below their range
      // cap. Skip a known-ineligible history source without making a doomed call.
      const lookback = lookbacks[url];
      if (lookback === 0) throw new Error('This endpoint does not serve public Intake logs');
      if (lookback !== undefined) {
        observedHead ??= BigInt(await read({method:'eth_blockNumber'}) as string);
        if (BigInt(filter.fromBlock) < observedHead - BigInt(lookback) + 1n) throw new Error('This endpoint does not serve this Intake history window');
      }
      const logs: unknown[] = [];
      for (const [from, to] of logWindows(BigInt(filter.fromBlock), BigInt(filter.toBlock), maximums[url] ?? 10000)) {
        logs.push(...await read({ ...args, params: [{ ...filter, fromBlock: toHex(from), toBlock: toHex(to) }] }) as unknown[]);
      }
      return logs;
    } } as ReturnType<Transport>;
  });
  const base = fallback(endpoints, { retryCount: 1, retryDelay: 500 });
  return options => {
    const transport = base(options);
    return { ...transport, request: (args: any) => args.method === 'eth_getLogs' ? enqueue(() => transport.request(args)) : transport.request(args) } as ReturnType<Transport>;
  };
};
/** Each chain lists one or more public HTTPS RPC endpoints, tried in order. */
export const validRpcUrls = (urls: unknown): urls is string[] => Array.isArray(urls) && urls.length > 0 && new Set(urls).size === urls.length
  && urls.every(url => typeof url === 'string' && /^https:\/\/[^/?#\s]+(\/[^?#\s]*)?$/.test(url) && !new URL(url).username && !new URL(url).password);
export function publicClients(config: SiteConfig) {
  return Object.fromEntries(config.chains.map(c => [c.id, createPublicClient({
    chain: c.id === 1 ? mainnet : defineChain({ id: c.id, name: c.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: c.rpcUrls } } }),
    transport: rpcTransport(c.rpcUrls, config.rpcLogRanges, config.rpcLogLookbacks),
    batch: { multicall: false },
  })]));
}
export type ReadClient = ReturnType<typeof publicClients>[number];
export const readCache = <T>(key: string): T | null => { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } };
export const writeCache = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Memory remains usable when storage is unavailable or full. */ } };
