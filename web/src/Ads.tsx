import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LaunchStore } from './chain/store';
import type { Launch } from './types';
import { activePlacement, adsConfig, readAds, sortAds, type Ad } from './chain/ads';
import { isPublicLaunch } from './chain/visibility';
const Context = createContext<{ ads: Ad[]; errors: string[]; enabled: boolean; refresh: () => void }>({ ads: [], errors: [], enabled: false, refresh: () => {} });
export const useAds = () => useContext(Context);
export function AdsProvider({ store, launches, children }: { store: LaunchStore; launches: Launch[]; children: ReactNode }) {
  const [ads, setAds] = useState<Ad[]>([]), [errors, setErrors] = useState<string[]>([]), [revision, setRevision] = useState(0);
  const [expiryClock, setExpiryClock] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  const enabled = store.config.chains.some(c => adsConfig(store.config, c.id));
  // Launch enrichment adds payer names and the store-only route without rereading placements.
  const linked = ads.filter(a => activePlacement(a.placement)).map(a => ({ ...a, launch: launches.find(l => l.isHook !== false && isPublicLaunch(l) && l.chainId === Number(a.listing.chainId) && l.hookAddress?.toLowerCase() === a.listing.hook.toLowerCase()) }));
  useEffect(() => {
    const future = ads.map(a => Number(a.placement.endsAt) * 1000).filter(end => end > Date.now());
    if (!future.length) return;
    const timer = setTimeout(() => setExpiryClock(v => v + 1), Math.min(2147483647, Math.max(1, Math.min(...future) - Date.now() + 10)));
    return () => clearTimeout(timer);
  }, [ads, expiryClock]);
  useEffect(() => {
    let active = true, busy = false;
    const read = async () => {
      if (busy) return; busy = true;
      const chains = store.config.chains.filter(c => adsConfig(store.config, c.id));
      const results = await Promise.allSettled(chains.map(c => readAds(store.clients[c.id], c.id, adsConfig(store.config, c.id)!)));
      if (active) {
        // Failed chains contribute no stale placements. Keep a clear retry path.
        setAds(sortAds(results.flatMap(r => r.status === 'fulfilled' ? r.value : [])));
        setErrors(results.flatMap((r, i) => r.status === 'rejected' ? [`Could not read promotions on ${chains[i].name}.`] : []));
      }
      busy = false;
    };
    void read(); const timer = setInterval(read, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [store, revision]);
  return <Context.Provider value={{ ads: linked, errors, enabled, refresh }}>{children}</Context.Provider>;
}
