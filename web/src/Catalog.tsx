import { useEffect, useMemo, useState } from 'react';
import { CHAINS, GROUPS, STATUSES, hookHref, type Launch } from './types';
import { matchesQuery } from './chain/decode';
import { resolveAddress, searchAddress, type ResolvedAddress } from './chain/resolve';
import type { LaunchStore, StoreState } from './chain/store';
import { ReadStatus } from './ReadStatus';
import { AddressValue } from './AddressValue';
import { newDraft, shortAddress } from '../../src/lib/compose';
import { storeDraft } from './draft';
export { matchesQuery } from './chain/decode';
import { useAds } from './Ads';
import { Text } from './Text';

const ALL_GROUPS: string[] = GROUPS.map(([id]) => id), ALL_CHAINS = [4663, 1];
export function Catalog({ query, clearQuery, data, store }: { query: string; clearQuery: () => void; data: StoreState; store: LaunchStore }) {
  const launches = data.launches.filter(l => l.isHook !== false);
  const address = searchAddress(query), known = address ? launches.some(l => matchesQuery(l, address)) : false;
  const [resolution, setResolution] = useState<{ found: ResolvedAddress[]; unavailable: number[] } | null>(null), [resolving, setResolving] = useState(false), [attempt, setAttempt] = useState(0), [error, setError] = useState('');
  useEffect(() => {
    setResolution(null); setResolving(false); setError('');
    if (!address || known) return;
    let active = true;
    setResolving(true);
    const timer = setTimeout(() => { void resolveAddress(store.clients, address).then(value => { if (active) { setResolution(value); setResolving(false); } }); }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [address, known, attempt, store]);
  const buildFor = (token: Extract<ResolvedAddress, { kind: 'token' }>) => {
    const draft = newDraft();
    const saved = storeDraft({ ...draft, type: 'C', settings: { ...draft.settings, chain: token.chainId, token: token.address, tsym: token.symbol } });
    if (saved) location.hash = '#builder'; else setError('Could not save this token to a draft. Allow site storage and try again.');
  };
  const [groups, setGroups] = useState<string[]>(ALL_GROUPS);
  const [chains, setChains] = useState(ALL_CHAINS);
  const [status, setStatus] = useState('all'), [sort, setSort] = useState('newest');
  const filtered = query.trim() !== '' || groups.length !== ALL_GROUPS.length || chains.length !== ALL_CHAINS.length || status !== 'all';
  const rows = useMemo(() => launches.filter(l =>
    chains.includes(l.chainId) && l.groups.some(g => groups.includes(g)) &&
    (status === 'all' || (status === 'progress' ? ['in-progress', 'requested'].includes(l.status) : l.status === 'live')) && matchesQuery(l, query)
  ).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) :
    ((Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0)) * (sort === 'newest' ? -1 : 1) || a.id.localeCompare(b.id)), [launches, chains, groups, status, sort, query]);
  const clear = () => { clearQuery(); setGroups(ALL_GROUPS); setChains(ALL_CHAINS); setStatus('all'); setSort('newest'); };
  return <section className="store" id="catalog" aria-labelledby="catalog-h">
    <aside className="rail panel" aria-label="Catalog filters">
      <fieldset><legend>Block type</legend>{GROUPS.map(([id, name]) => <label key={id}><input type="checkbox" checked={groups.includes(id)} onChange={e => setGroups(e.target.checked ? [...groups, id] : groups.filter(g => g !== id))} />{name}</label>)}</fieldset>
      <fieldset><legend>Chain</legend>{ALL_CHAINS.map(id => <label key={id}><input type="checkbox" checked={chains.includes(id)} onChange={e => setChains(e.target.checked ? [...chains, id] : chains.filter(c => c !== id))} />{CHAINS[id]}</label>)}</fieldset>
      <fieldset><legend>Status</legend>{[['all', 'All'], ['live', 'Live only'], ['progress', 'In progress']].map(([id, name]) => <label key={id}><input type="radio" name="status" checked={status === id} onChange={() => setStatus(id)} />{name}</label>)}</fieldset>
      <label className="sort-label" htmlFor="sort">Sort</label><select id="sort" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option></select>
    </aside>
    <div className="catalog-results">
      <div className="catalog-head"><h2 id="catalog-h">{query.trim() ? <>Results for “<Text>{query.trim()}</Text>”</> : 'On the pond'}</h2><span className="result-count" role="status"><span className="num">{rows.length}</span> {rows.length === 1 ? 'hook' : 'hooks'}</span></div>
      <ReadStatus data={data} retry={store.retry} />
      {address && !known && <div className="address-results" aria-live="polite">
        {resolving && <p>Looking up this address on Robinhood Chain and Ethereum…</p>}
        {resolution?.found.map(found => <article className="card resolved-card" key={found.chainId}><span className="pill chain">{CHAINS[found.chainId]}</span><h3>{found.kind === 'hook' ? 'A v4 hook not launched through this store' : <Text>{`${found.name} (${found.symbol})`}</Text>}</h3><AddressValue value={found.address} label="resolved address" explorer={store.config.chains.find(c => c.id === found.chainId)?.explorerUrl} />{found.kind === 'hook' ? <><p>Managed outside the store</p><p>PoolManager</p><AddressValue value={found.poolManager} label="PoolManager" explorer={store.config.chains.find(c => c.id === found.chainId)?.explorerUrl} /><ul className="permission-list">{found.permissions.map(p => <li key={p}><code>{p}</code></li>)}</ul>{!found.permissions.length && <p>No hook permissions enabled.</p>}</> : <button className="btn primary" onClick={() => buildFor(found)}>Build a hook for this token</button>}</article>)}
        {resolution && !resolution.found.length && !resolution.unavailable.length && <p className="notice">No contract found at this address on Robinhood Chain or Ethereum</p>}
        {!!resolution?.unavailable.length && <p className="notice">Could not resolve this address on {resolution.unavailable.map(id => CHAINS[id]).join(' and ')}. <button className="link-button" onClick={() => setAttempt(n => n + 1)}>Retry address lookup</button></p>}
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>}
      {rows.length === 0 && (!address || known) && (filtered || launches.length > 0
        ? <div className="empty box"><p>No hooks match. <button className="link-button" onClick={clear}>Clear search and filters</button> or <a href="#builder">build the first one</a>.</p></div>
        : <div className="empty-pond box"><h3>Nothing on the pond yet</h3><p>Hooks launched through this store appear here. Be the first to cast.</p><a className="btn primary" href="#builder">Describe a hook</a></div>)}
      <div className="grid">{rows.map(launch => <article className="card" key={launch.id} data-launch-id={launch.id}>
        <div className="card-top"><span className="pill chain"><Text>{CHAINS[launch.chainId] ?? `Chain ${launch.chainId}`}</Text></span><span className={`pill status-${launch.status}`}>{STATUSES[launch.status]}</span></div>
        <h3><Text>{launch.name}</Text>{launch.symbol && <small>${launch.symbol}</small>}</h3>
        <p><Text>{launch.summary}</Text></p>
        <ul className="blocks" aria-label="Request blocks">{launch.blocks.map(label => <li key={label}><Text>{label}</Text></li>)}</ul>
        <div className="card-foot"><span className="muted">{launch.status === 'live' && launch.launchNumber !== null && <>Launch <span className="num">#{launch.launchNumber}</span></>}</span><a href={hookHref(launch)} aria-label={`View ${launch.name}`}>View</a></div>
      </article>)}</div>
    </div>
  </section>;
}
export function Featured() {
  const { ads, errors, enabled, refresh } = useAds();
  if (!enabled) return null;
  const active = ads.filter(p => p.launch);
  const scrolling = active.length > 0;
  return <section className="ads" id="featured" aria-labelledby="featured-h">
    <div className="ads-head"><h2 id="featured-h">Featured <span className="pill ad">#AD</span></h2><p className="muted">Paid placements, <span className="num">0.1 IMD</span> for <span className="num">24</span> hours, ranked by total paid. Managed from My hooks. Not a review or endorsement.</p></div>
    {!!errors.length && <p className="small muted" role="status">{errors.join(' ')} <button className="link-button" onClick={refresh}>Retry placements</button></p>}
    <div className={`marquee ${scrolling ? 'has-placements' : 'slot-only'}`} aria-label="Featured placement slots"><div className="marquee-track">
      {(scrolling ? [false, true] : [false]).map(duplicate => <div key={String(duplicate)} className="marquee-group" aria-hidden={duplicate || undefined}>
        {active.map(p => <a className="adcard" href={hookHref(p.launch!)} key={`${p.chainId}:${p.placement.id}`} tabIndex={duplicate ? -1 : 0}><span className="pill ad">#AD</span><Text>{p.metadata.name}</Text>{p.launch!.symbol && <span className="num">${p.launch!.symbol}</span>}<span>by {p.launch!.creatorName || shortAddress(p.launch!.payer)}</span><span className="num">{Math.ceil((Number(p.placement.endsAt) * 1000 - Date.now()) / 3600000)}h left</span></a>)}
        <a className="adcard slot" href="#mine" tabIndex={duplicate ? -1 : 0}><span className="pill ad">#AD</span><span className="slot-title">Open slot</span><span className="num">0.1 IMD / 24h</span><span>· promote from My hooks</span></a>
      </div>)}
    </div></div>
  </section>;
}
