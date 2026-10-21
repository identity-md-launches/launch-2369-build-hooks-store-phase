import { useEffect, useRef, useState } from 'react';
import type { Draft } from '../../src/lib/compose';
import { checkRequest, importSource, parseCheck, type CheckResult, type ImportedSource } from './relay';

type Checked = { relay: string; json: string; result: CheckResult };
const CHECK_KEY = 'hooks-store:check:v1', IMPORT_KEY = 'hooks-store:import:v1';
function read<T>(key: string): T | null { try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; } }
function save(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* In-memory state still works for this page. */ } }
let recentCheck: Checked | null = null;
export function useSwarmCheck(relay: string | null, json: string | null) {
  const [checked, setChecked] = useState<Checked | null>(() => {
    const value = recentCheck ?? read<Checked>(CHECK_KEY);
    try { return value && { ...value, result: parseCheck(value.result) }; } catch { return null; }
  });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const flight = useRef<AbortController | null>(null);
  useEffect(() => { flight.current?.abort(); setBusy(false); setError(''); return () => flight.current?.abort(); }, [relay, json]);
  const relevant = checked?.relay === relay ? checked : null;
  const stale = !!relevant && relevant.json !== json;
  const result = stale ? null : relevant?.result ?? null;
  const gate = !relay ? '' : busy ? 'Wait for the free check to finish.' : error ? 'Retry the free check before continuing.' : stale ? 'Your request changed. Check it again before continuing.' : result?.blockers.length ? 'Resolve the swarm’s blockers and check again before launching.' : '';
  const run = async () => {
    if (!relay || !json || flight.current && !flight.current.signal.aborted) return;
    const controller = new AbortController(); flight.current = controller; setBusy(true); setError('');
    try {
      const result = await checkRequest(relay, JSON.parse(json), controller.signal);
      if (controller.signal.aborted) return;
      const next = { relay, json, result }; recentCheck = next; save(CHECK_KEY, next); setChecked(next);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'The free check failed. Try again.'); }
    finally { if (!controller.signal.aborted) { setBusy(false); flight.current = null; } }
  };
  return { result, stale, busy, error, gate, run };
}

type ImportRecord = { relay: string; repo: string; commit: string; source: ImportedSource };
export function useOwnCode(draft: Draft, relay: string | null) {
  const [record, setRecord] = useState<ImportRecord | null>(() => {
    const value = read<ImportRecord>(IMPORT_KEY);
    return value && typeof value.relay === 'string' && typeof value.repo === 'string' && typeof value.commit === 'string' && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value.source?.repoUrl ?? '') && /^[\da-f]{40}$/i.test(value.source?.baseCommit ?? '') ? value : null;
  });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const repo = draft.settings.repo.trim(), commit = draft.settings.commit.trim();
  const needed = !!relay && !!(repo || commit);
  const source = record?.relay === relay && record.repo === repo && record.commit === commit ? record.source : null;
  const ready = !needed || !!source;
  useEffect(() => { controller.current?.abort(); setBusy(false); setError(''); return () => controller.current?.abort(); }, [relay, repo, commit]);
  const resolve = async () => {
    if (!relay || busy) return;
    const request = new AbortController(); controller.current = request; setBusy(true); setError('');
    try {
      const source = await importSource(relay, draft, request.signal);
      if (request.signal.aborted) return;
      const next = { relay, repo, commit, source }; setRecord(next); save(IMPORT_KEY, next);
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : 'Could not import this repository. Try again.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  // Only the source pinned by /import enters the composer when a relay is configured.
  const prepared = ready ? source ? { ...draft, settings: { ...draft.settings, repo: source.repoUrl, commit: source.baseCommit } } : draft : null;
  return { prepared, ready, needed, source, busy, error, resolve };
}
