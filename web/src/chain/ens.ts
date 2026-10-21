import { getAddress, type Address } from 'viem';
import { readCache, writeCache, type ReadClient } from './clients.ts';
const pending = new Map<string, Promise<string | null>>();
const memory = new Map<string, { name: string | null; expires: number }>();
export async function creatorName(client: ReadClient, payer: string, now = Date.now()): Promise<string | null> {
  const key = `hooks-store:ens:v1:${payer.toLowerCase()}`;
  const cached = memory.get(key) ?? readCache<{ name: string | null; expires: number }>(key);
  if (cached && cached.expires > now && (cached.name === null || typeof cached.name === 'string')) return cached.name;
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    try {
      const name = await client.getEnsName({ address: getAddress(payer) as Address });
      // A reverse record is a display name; never use it to authorize owner controls.
      const entry = { name, expires: now + 86400000 };
      memory.set(key, entry); writeCache(key, entry); return name;
    } catch { return null; } finally { pending.delete(key); }
  })();
  pending.set(key, request); return request;
}
