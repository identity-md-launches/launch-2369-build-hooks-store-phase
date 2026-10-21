import defaults from '../../public/site-config.json';
export type SiteConfig = typeof defaults;
export const defaultConfig: SiteConfig = defaults;
export const assetUrl = (file: string) => new URL(`${import.meta.env.BASE_URL}${file}`, document.baseURI).href;
export async function loadConfig(): Promise<SiteConfig> {
  try {
    const response = await fetch(assetUrl('site-config.json'), { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Configuration unavailable');
    const data = await response.json();
    if (data.schemaVersion !== 1 || typeof data.inProgress !== 'boolean' || !Array.isArray(data.chains) || data.chains.length !== 3) throw new Error('Invalid configuration');
    return { ...defaults, ...data };
  } catch { return defaults; } // Fail closed: the committed in-progress flag is true.
}
