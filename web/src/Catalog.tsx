import { useMemo, useState } from 'react';
import { CHAINS, GROUPS, type Launch } from './types';
import { Text } from './Text';

export function matchesQuery(launch: Launch, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [launch.name, launch.symbol, CHAINS[launch.chainId], launch.summary, ...launch.blocks, launch.request].join(' ').toLowerCase();
  return words.every(word => haystack.includes(word));
}
const STATUSES = { live: 'Live', requested: 'Requested', 'in-progress': 'In progress', failed: 'Failed' };
const ALL_GROUPS: string[] = GROUPS.map(([id]) => id), ALL_CHAINS = [11155111, 4663, 1];
/** Only hooks launched through this site belong here (SPEC 3.1). Job 3 reads them from the Intake logs on chain; until then the list is empty. */
const LAUNCHES: Launch[] = [];
export function Catalog({ query, clearQuery, launches = LAUNCHES }: { query: string; clearQuery: () => void; launches?: Launch[] }) {
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
      {rows.length === 0 && (filtered || launches.length > 0
        ? <div className="empty box"><p>No hooks match. <button className="link-button" onClick={clear}>Clear search and filters</button> or <a href="#builder">build the first one</a>.</p></div>
        : <div className="empty-pond box"><h3>Nothing on the pond yet</h3><p>Hooks launched through this site show up here once the swarm has them.</p><a className="btn primary" href="#builder">Describe a hook</a></div>)}
      <div className="grid">{rows.map(launch => <article className="card" key={launch.id} data-launch-id={launch.id}>
        <div className="card-top"><span className="pill chain"><Text>{CHAINS[launch.chainId] ?? `Chain ${launch.chainId}`}</Text></span><span className={`pill status-${launch.status}`}>{STATUSES[launch.status]}</span></div>
        <h3><Text>{launch.name}</Text>{launch.symbol && <small>${launch.symbol}</small>}</h3>
        <p><Text>{launch.summary}</Text></p>
        <ul className="blocks" aria-label="Request blocks">{launch.blocks.map(label => <li key={label}><Text>{label}</Text></li>)}</ul>
        {launch.builtHere && <span className="built-here">Built here</span>}
        <div className="card-foot"><span className="muted">{launch.status === 'live' && launch.launchNumber !== null && <>Launch <span className="num">#{launch.launchNumber}</span></>}</span><a href={`#hook/${launch.chainId}/${launch.requestId ?? launch.id}`} aria-label={`View ${launch.name}`}>View</a></div>
      </article>)}</div>
    </div>
  </section>;
}
export function Featured() {
  return <section className="ads" aria-labelledby="featured-h">
    <div className="ads-head"><h2 id="featured-h">Featured <span className="pill ad">#AD</span></h2><p className="muted">Paid placements, <span className="num">0.1 IMD</span> for <span className="num">24</span> hours, ranked by total paid. Managed from My hooks. Not a review or endorsement.</p></div>
    <div className="marquee" aria-label="Featured placement slots"><div className="marquee-track">
      {[false, true].map(duplicate => <div key={String(duplicate)} className="marquee-group" aria-hidden={duplicate || undefined}>
        <a className="adcard slot" href="#mine" tabIndex={duplicate ? -1 : 0}><span className="pill ad">#AD</span><span className="slot-title">Open slot</span><span className="num">0.1 IMD / 24h</span><span>· promote from My hooks</span></a>
      </div>)}
    </div></div>
  </section>;
}
