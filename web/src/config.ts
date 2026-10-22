import defaults from '../../public/site-config.json';
import { validRpcUrls } from './chain/clients';
export type SiteConfig = Omit<typeof defaults, 'relayUrl' | 'ads'> & { relayUrl: string | null; ads?: Record<string, { registry: string; placements: string; launchNumber: number; commit: string }> };
export const defaultConfig: SiteConfig = defaults;
export const assetUrl = (file: string) => new URL(`${import.meta.env.BASE_URL}${file}`, document.baseURI).href;
export async function loadConfig(): Promise<SiteConfig> {
  try {
    const response = await fetch(assetUrl('site-config.json'), { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Configuration unavailable');
    const data = await response.json();
    if (data.schemaVersion !== 1 || typeof data.inProgress !== 'boolean' || !Array.isArray(data.chains) || data.chains.length !== 2 || !data.chains.every((c: { id: number; rpcUrls: unknown }) => (c.id === 1 || c.id === 4663) && validRpcUrls(c.rpcUrls))) throw new Error('Invalid configuration');
    if (data.relayUrl != null && (typeof data.relayUrl !== 'string' || !/^https:\/\//.test(data.relayUrl) || new URL(data.relayUrl).username || new URL(data.relayUrl).password || new URL(data.relayUrl).search || new URL(data.relayUrl).hash)) throw new Error('Invalid relay URL');
    return { ...defaults, ...data, ads: data.ads ?? {} };
  } catch { return defaults; } // Use the same reviewed configuration bundled in this export.
}
