import { useEffect, useLayoutEffect, useState } from 'react';
import { Landing } from './Landing';
import { Catalog, Featured } from './Catalog';
import { Learn } from './Learn';
import { Builder } from './Builder';
import { Connect } from './wallet/Connect';
import { Hook } from './Hook';
import { MyHooks } from './MyHooks';
import { LaunchReview } from './LaunchReview';
import { useLaunches } from './chain/store';
import type { SiteConfig } from './config';

const NAV = [['store', 'Store'], ['builder', 'Builder'], ['mine', 'My hooks'], ['learn', 'Learn']];
function routeName() { const hash = location.hash.slice(1).split(/[/?]/)[0]; return ['store', 'catalog', 'learn', 'builder', 'launch', 'hook', 'mine'].includes(hash) ? hash : 'store'; }
export function App({ config }: { config: SiteConfig }) {
  const [route, setRoute] = useState(routeName), [query, setQuery] = useState('');
  const [hash, setHash] = useState(location.hash);
  const data = useLaunches(config);
  useEffect(() => {
    const changed = () => { setRoute(routeName()); setHash(location.hash); };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useLayoutEffect(() => {
    const header = document.querySelector('.top');
    if (!header) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`));
    ro.observe(header); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (route === 'catalog') document.getElementById('catalog')?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    document.title = `${route === 'store' || route === 'catalog' ? '' : `${route === 'mine' ? 'My hooks' : route[0].toUpperCase() + route.slice(1)} · `}The Hooks Store`;
  }, [route]);
  const isStore = route === 'store' || route === 'catalog';
  const active = route === 'catalog' || route === 'hook' ? 'store' : route === 'launch' ? 'builder' : route;
  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
    <header className="top"><div className="wrap top-in">
      <a className="brand" href="#store" aria-label="The Hooks Store, home"><svg className="hook" viewBox="0 0 12 16" width="24" height="32" shapeRendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M7 0h4v1h-4zM6 1h6v1h-6zM6 2h2v1h-2zM10 2h2v1h-2zM6 3h2v1h-2zM10 3h2v1h-2zM6 4h6v1h-6zM7 5h4v1h-4zM7 6h2v1h-2zM7 7h2v1h-2zM7 8h2v1h-2zM3 9h1v1h-1zM7 9h2v1h-2zM2 10h2v1h-2zM7 10h2v1h-2zM2 11h3v1h-3zM7 11h2v1h-2zM2 12h2v1h-2zM7 12h2v1h-2zM2 13h2v1h-2zM7 13h2v1h-2zM3 14h2v1h-2zM6 14h3v1h-3zM4 15h4v1h-4z"/></svg><span className="wordmark">The Hooks Store</span></a>
      <nav className="nav" aria-label="Main">{NAV.map(([id, label]) => <a href={`#${id}`} key={id} aria-current={active === id ? 'page' : undefined}>{label}</a>)}</nav>
      <form className="search" role="search" id="searchform" onSubmit={event => { event.preventDefault(); if (route === 'catalog') document.getElementById('catalog')?.scrollIntoView({ block: 'start' }); else location.hash = '#catalog'; }}>
        <label className="sr" htmlFor="q">Search hooks by name, token, block or request</label>
        <input id="q" name="q" type="search" placeholder="Search name, token, block or request" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); if (!isStore) location.hash = '#catalog'; }} />
      </form>
      <Connect config={config} />
    </div></header>
    {config.inProgress && <div className="progress-banner">This site is being built; launches open when the banner goes away</div>}
    <main id="main" tabIndex={-1}>
      {isStore ? <><Landing config={config} /><div className="wrap"><Featured /><Catalog query={query} clearQuery={() => setQuery('')} data={data} store={data.store} /></div></> : route === 'learn' ? <Learn /> : route === 'builder' ? <Builder config={config} /> : route === 'hook' ? <Hook key={hash} route={hash} data={data} config={config} store={data.store} /> : route === 'mine' ? <MyHooks key={hash} data={data} store={data.store} /> : <LaunchReview config={config} store={data.store} />}

    </main>
  </>;
}
