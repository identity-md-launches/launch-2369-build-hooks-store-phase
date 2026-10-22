import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Draft } from '../../src/lib/compose';
import { fetchProvenLaunches, matchProvenLaunch, provenLine, provenRequestLine, type ProvenLaunch } from '../../src/lib/proven';
import { importProvenSource } from './relay';

const ProvenContext = createContext<{ entries: ProvenLaunch[]; loaded: boolean }>({ entries: [], loaded: false });
export const useProvenLaunches = () => useContext(ProvenContext).entries;
export function ProvenLaunches({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ProvenLaunch[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetchProvenLaunches(controller.signal).then(entries => { if (!controller.signal.aborted) { setEntries(entries); setLoaded(true); } });
    return () => controller.abort();
  }, []);
  return <ProvenContext.Provider value={{ entries, loaded }}>{children}</ProvenContext.Provider>;
}
export function ProvenLine({ entry, draft, request }: { entry?: ProvenLaunch; draft?: Draft; request?: string }) {
  return entry ? <p className="proven-line">{request ? provenRequestLine(entry, request) : provenLine(entry, draft)}</p> : null;
}

const resolved = new Map<string, ProvenLaunch | null>();
const pending = new Map<string, Promise<ProvenLaunch | null>>();
/** A draft never persists an automatic match. Recheck type, chain and ids on every edit. */
export function useProvenSource(draft: Draft, relay: string | null) {
  const { entries, loaded } = useContext(ProvenContext), match = matchProvenLaunch(draft, entries);
  const key = match && relay ? JSON.stringify([relay, match.repoUrl, match.commit]) : '';
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!key || !match || resolved.has(key)) return;
    let active = true;
    if (!pending.has(key)) pending.set(key, importProvenSource(relay, match).then(source => { resolved.set(key, source); pending.delete(key); return source; }));
    void pending.get(key)!.then(() => { if (active) setRevision(n => n + 1); });
    return () => { active = false; };
  }, [key, relay, revision]);
  const proven = key ? resolved.get(key) ?? undefined : undefined;
  return { prepared: proven ? { ...draft, proven } : draft, proven, ready: (!!draft.settings.repo.trim() || loaded) && (!key || resolved.has(key)) };
}
