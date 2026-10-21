import { useEffect, useLayoutEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Landing } from './Landing';
import { Catalog, Featured } from './Catalog';
import { Learn } from './Learn';
import { Builder } from './Builder';
import { Connect } from './wallet/Connect';
import type { SiteConfig } from './config';

const NAV = [['store', 'Store'], ['builder', 'Builder'], ['mine', 'My hooks'], ['learn', 'Learn']];
function routeName() { const hash = location.hash.slice(1).split('/')[0]; return ['store', 'catalog', 'learn', 'builder', 'launch', 'hook', 'mine'].includes(hash) ? hash : 'store'; }
export function App({ config }: { config: SiteConfig }) {
  const [route, setRoute] = useState(routeName), [query, setQuery] = useState('');
  const { chainId, isConnected } = useAccount();
  const selectedChain = config.chains.find(chain => chain.id === (isConnected ? chainId : config.enabledDeployChains[0]));
  useEffect(() => {
    const changed = () => setRoute(routeName());
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
      <a className="brand" href="#store" aria-label="The Hooks Store, home"><span className="hook-mark" aria-hidden="true">ʃ</span><span className="wordmark">The Hooks Store</span></a>
      <nav className="nav" aria-label="Main">{NAV.map(([id, label]) => <a href={`#${id}`} key={id} aria-current={active === id ? 'page' : undefined}>{label}</a>)}</nav>
      <form className="search" role="search" id="searchform" onSubmit={event => { event.preventDefault(); if (route === 'catalog') document.getElementById('catalog')?.scrollIntoView({ block: 'start' }); else location.hash = '#catalog'; }}>
        <label className="sr" htmlFor="q">Search hooks by name, token, block or request</label>
        <input id="q" name="q" type="search" placeholder="Search name, token, block or request" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); if (!isStore) location.hash = '#catalog'; }} />
      </form>
      <span className="chainpill" title={selectedChain ? `${selectedChain.name}${selectedChain.testnet ? ' · test phase' : ''}` : 'Unsupported wallet network'}>{selectedChain ? `${selectedChain.name.replace(' Chain', '')}${selectedChain.testnet ? ' · test phase' : ''}` : 'Network'}</span>
      <Connect config={config} />
    </div></header>
    {config.inProgress && <div className="progress-banner">This site is being built; launches open when the banner goes away</div>}
    <main id="main" tabIndex={-1}>
      {isStore ? <><Landing config={config} /><div className="wrap"><Featured /><Catalog query={query} clearQuery={() => setQuery('')} /></div></> : route === 'learn' ? <Learn /> : route === 'builder' ? <Builder config={config} /> : <section className="wrap page placeholder" aria-labelledby="placeholder-h"><div className="box"><h1 id="placeholder-h">{route === 'mine' ? 'My hooks' : route[0].toUpperCase() + route.slice(1)}</h1><p>This page arrives in a later job.</p><a className="btn primary" href="#store">Return to Store</a></div></section>}
    </main>
  </>;
}
