import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { CHAINS, STATUSES, hookHref } from './types';
import type { LaunchStore, StoreState } from './chain/store';
import { readCache } from './chain/clients';
import { DRAFT_KEY, loadDraft } from './draft';
import { context } from '../../src/lib/compose';
import { AddressValue } from './AddressValue';
import { ReadStatus } from './ReadStatus';
import { Text } from './Text';
export const PENDING_KEY = 'hooks-store:pending';
export type PendingRequest = { requestId: string; chainId: number; payer: string; txHash?: string; createdAt?: string };
export function pendingRequests(): PendingRequest[] {
  const value = readCache<unknown>(PENDING_KEY) ?? readCache<unknown>('hooks-store:pending:v1');
  return Array.isArray(value) ? value.filter((p): p is PendingRequest => p && typeof p === 'object' && /^0x[\da-fA-F]{64}$/.test(p.requestId) && CHAINS[p.chainId] && isAddress(p.payer, { strict: false })) : [];
}
export function MyHooks({ data, store }: { data: StoreState; store: LaunchStore }) {
  const { address } = useAccount();
  const queryAddress = new URLSearchParams(location.hash.split('?')[1] ?? location.search).get('address');
  const viewer = address ?? (queryAddress && isAddress(queryAddress, { strict: false }) ? queryAddress : null);
  const [hasDraft, setHasDraft] = useState(() => !!readCache(DRAFT_KEY)), [undo, setUndo] = useState<string | null>(null), [error, setError] = useState('');
  const draft = loadDraft(), rows = data.launches.filter(l => l.payer.toLowerCase() === viewer?.toLowerCase());
  const pending = pendingRequests().filter(p => p.payer.toLowerCase() === viewer?.toLowerCase() && !rows.some(l => l.requestId.toLowerCase() === p.requestId.toLowerCase() && l.intakeChainId === p.chainId));
  return <section className="wrap page mine-page"><h1>My hooks</h1>
    {viewer ? <><p>{address ? 'Launch requests paid by your connected wallet.' : 'Viewing this address. Connect its wallet to use owner controls.'}</p><AddressValue value={viewer} label="viewed wallet address" explorer={store.config.chains.find(c=>c.id===1)!.explorerUrl} /><ReadStatus data={data} retry={store.retry} />
      <div className="mine-list">{rows.map(l => <article className="card mine-row" key={l.id}><div><h2><Text>{l.name}</Text></h2><p className="small muted">{CHAINS[l.chainId]} {l.symbol && <span className="num">· ${l.symbol}</span>}</p>{l.hookPending && <p className="small">hook not deployed yet</p>}</div><span className={`pill status-${l.status}`}>{STATUSES[l.status]}</span><div className="row-actions"><a className="btn tiny" href={hookHref(l)}>View</a>{l.status === 'live' && l.hookAddress && <a className="btn tiny primary" href={`${hookHref(l)}?manage=1`}>Manage</a>}</div>{l.status === 'failed' && <p className="field-error">{l.completion?.reason}</p>}</article>)}</div>
      {pending.map(p => <article className="card pending-request" key={`${p.chainId}:${p.requestId}`}><h2>Pending request</h2><p>Saved in this browser; waiting for its store launch event on {CHAINS[p.chainId]}.</p><AddressValue value={p.requestId} label="pending request id" /><a href={`#hook/${p.chainId}/${p.requestId}`}>View request</a></article>)}
      {!rows.length && !pending.length && <p className="notice">No launch requests from this wallet found yet.</p>}</>
      : <div className="box mine-connect"><p>Your launch requests appear here, read from the chain for the connected wallet.</p><button className="btn primary" onClick={() => document.getElementById('connect')?.click()}>Connect wallet</button>{queryAddress && <p className="field-error">The address query parameter is invalid. Use a full wallet address.</p>}</div>}
    <section className="box saved-draft"><h2>Saved draft</h2>{hasDraft ? <><p><Text>{context(draft).name}</Text> · {draft.type === 'A' ? 'Hook + new token + pool' : draft.type === 'B' ? 'Hook only' : 'Hook for an existing token'}</p><div className="row-actions"><a className="btn" href="#builder">Resume</a><button className="btn" onClick={() => { try { setUndo(localStorage.getItem(DRAFT_KEY)); localStorage.removeItem(DRAFT_KEY); setHasDraft(false); window.dispatchEvent(new Event('hooks:draft')); } catch { setError('Could not discard the draft. Check site storage.'); } }}>Discard</button></div></> : <p>No saved draft. <a href="#builder">Build a hook</a>.</p>}
      {undo && !hasDraft && <p role="status">Draft discarded. <button className="link-button" onClick={() => { try { localStorage.setItem(DRAFT_KEY, undo); setHasDraft(true); setUndo(null); window.dispatchEvent(new Event('hooks:draft')); } catch { setError('Could not restore the draft. Check site storage.'); } }}>Undo discard</button></p>}{error && <p role="alert" className="field-error">{error}</p>}</section>
    <section className="box promotions"><h2>Promotions <span className="pill ad">#AD</span></h2><p><Text>0.1 IMD for 24 hours, ranked by total paid. Top-ups are never refunded; cancelling refunds the unused base.</Text></p><p className="muted">Placements open in phase 2. No promotion contract is configured yet.</p></section>
  </section>;
}
