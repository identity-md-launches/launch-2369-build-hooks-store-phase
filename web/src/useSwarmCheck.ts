import { useEffect, useRef, useState } from 'react';
import type { Draft } from '../../src/lib/compose';
import { checkRequest, importSource, parseCheck, type CheckResult, type ImportedSource } from './relay';
import { checkConsistency, fixedFactConflicts } from '../../src/lib/safety';

type Checked = { relay: string; json: string; result: CheckResult | null; error?: string };
const CHECK_KEY = 'hooks-store:check:v1', IMPORT_KEY = 'hooks-store:import:v1';
function read<T>(key: string): T | null { try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; } }
function save(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* In-memory state still works for this page. */ } }
let recentCheck: Checked | null = null;
export function useSwarmCheck(relay: string | null, json: string | null, payingWallet?: string) {
  const [checked, setChecked] = useState<Checked | null>(() => {
    const value = recentCheck ?? read<Checked>(CHECK_KEY);
    try {
      if (!value || typeof value.relay !== 'string' || typeof value.json !== 'string') return null;
      return value.error && typeof value.error === 'string' ? { ...value, result: null } : { ...value, result: parseCheck(value.result) };
    } catch { return null; }
  });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const flight = useRef<AbortController | null>(null);
  useEffect(() => { flight.current?.abort(); setBusy(false); setError(''); return () => flight.current?.abort(); }, [relay, json]);
  const relevant = checked?.relay === relay ? checked : null;
  const stale = !!relevant && relevant.json !== json;
  const result = stale ? null : relevant?.result ?? null;
  const input = json ? JSON.parse(json) : null;
  const consistency = input ? checkConsistency(input) : [];
  const conflicts = input && result ? fixedFactConflicts(input, result.facts, payingWallet) : [];
  const currentError = error || (!stale ? relevant?.error ?? '' : '');
  const gate = consistency.length ? 'Fix the request consistency findings before continuing.' : conflicts.length ? 'Resolve the conflicting fixed facts in the request and check again before launching.' : !relay ? '' : busy ? 'Wait for the free check to finish.' : currentError ? 'Retry the free check before continuing.' : stale ? 'Your request changed. Check it again before continuing.' : result?.blockers.length ? 'Resolve the swarm’s blockers and check again before launching.' : '';
  const run = async () => {
    if (!relay || !json || checkConsistency(JSON.parse(json)).length || flight.current && !flight.current.signal.aborted) return;
    const controller = new AbortController(); flight.current = controller; setBusy(true); setError('');
    try {
      const result = await checkRequest(relay, JSON.parse(json), controller.signal);
      if (controller.signal.aborted) return;
      const next = { relay, json, result }; recentCheck = next; save(CHECK_KEY, next); setChecked(next);
    } catch (e) {
      if (!controller.signal.aborted) {
        const error = e instanceof Error ? e.message : 'The free check failed. Try again.';
        const failed = { relay, json, result: null, error };
        recentCheck = failed; save(CHECK_KEY, failed); setChecked(failed); setError(error);
      }
    }
    finally { if (!controller.signal.aborted) { setBusy(false); flight.current = null; } }
  };
  return { result, stale, busy, error: currentError, gate, run, consistency, conflicts };
}

type ImportRecord = { relay: string; repo: string; commit: string; source: ImportedSource };
const recentImports = new Map<string, ImportRecord>();
const importKey = (relay: string | null, repo: string, commit: string) => JSON.stringify([relay, repo, commit]);
export function useOwnCode(draft: Draft, relay: string | null) {
  const [record, setRecord] = useState<ImportRecord | null>(() => {
    const value = recentImports.get(importKey(relay, draft.settings.repo.trim(), draft.settings.commit.trim())) ?? read<ImportRecord>(IMPORT_KEY);
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
      const next = { relay, repo, commit, source };
      recentImports.set(importKey(relay, repo, commit), next); setRecord(next); save(IMPORT_KEY, next);
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : 'Could not import this repository. Try again.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  // Only the source pinned by /import enters the composer when a relay is configured.
  const prepared = ready ? source ? { ...draft, settings: { ...draft.settings, repo: source.repoUrl, commit: source.baseCommit } } : draft : null;
  return { prepared, ready, needed, source, busy, error, resolve };
}
