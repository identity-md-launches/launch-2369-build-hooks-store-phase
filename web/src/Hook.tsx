import { useEffect, useState } from 'react';
import { BY_ID, entry, newDraft, type Draft } from '../../src/lib/compose';
import { CHAINS, STATUSES, type Launch } from './types';
import type { SiteConfig } from './config';
import type { LaunchStore, StoreState } from './chain/store';
import { matchRule, safeUrl } from './chain/decode';
import { storeDraft } from './draft';
import { WarnSign } from './Builder';
import { Text } from './Text';
import { AddressValue } from './AddressValue';
import { Management } from './Management';
import { ReadStatus } from './ReadStatus';

export function copyLaunchDraft(launch: Launch): Draft {
  const draft = newDraft(), words = /<description>([\s\S]*?)<\/description>/.exec(launch.request)?.[1] ?? '';
  const token = entry('token'); token.p.name = launch.name; token.p.symbol = launch.symbol ?? 'TOKEN';
  const unknownRules = Array.from(launch.request.matchAll(/^\d+\. (.+)$/gm), m => m[1]).filter(rule =>
    !matchRule(rule, { name: launch.name, symbol: launch.symbol ?? (launch.type === 'C' ? 'the token' : 'the pool’s token') }));
  const blocks = [token, ...launch.matchedBlocks.map(b => ({ id: b.id, p: { ...b.p } }))];
  if (unknownRules.length) blocks.push({ id: 'custom', p: { text: unknownRules.join(' ') } });
  return { ...draft, type: launch.type, mode: words ? 'prompt' : 'blocks', prompt: words, blocks, seeded: true,
    settings: { ...draft.settings, chain: launch.chainId, hname: launch.type === 'A' ? '' : launch.name,
      token: launch.type === 'C' ? launch.tokenAddress ?? '' : '', tsym: launch.symbol ?? '',
      pair: /paired with IMD/.test(launch.request) ? 'imd' : 'eth',
      // The new creator explicitly chooses their allocation and owner; no previous wallet is copied.
      pool: null,
    },
  };
}
export function Hook({ route, data, config, store }: { route: string; data: StoreState; config: SiteConfig; store: LaunchStore }) {
  const parts = route.replace(/^#/, '').split('?')[0].split('/'), chain = Number(parts[1]), id = parts[2]?.toLowerCase();
  const launch = data.launches.find(l => l.intakeChainId === chain && l.requestId.toLowerCase() === id);
  const [error, setError] = useState('');
  const manage = new URLSearchParams(route.split('?')[1] ?? '').get('manage') === '1';
  useEffect(() => {
    if (!launch || !manage) return;
    const frame = requestAnimationFrame(() => document.getElementById('manage')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [launch?.id, manage]);
  if (!CHAINS[chain] || !/^0x[\da-f]{64}$/.test(id ?? '')) return <section className="wrap page"><h1>Hook not found</h1><p>This link needs a supported chain and a full request id.</p><a href="#catalog">Browse hooks</a></section>;
  if (!launch) {
    const checking = data.chains.some(c => c.chainId === chain && (c.loading || c.backfilling));
    return <section className="wrap page"><h1>{checking ? 'Looking for this hook' : 'Hook not found'}</h1><ReadStatus data={data} retry={store.retry} /><p>{checking ? 'Reading launch history. This page will open when the request is found.' : 'This request was not found among launches made through this store.'}</p><AddressValue value={id} label="request id" /><a href="#catalog">Browse hooks</a></section>;
  }
  const deployment = config.chains.find(c => c.id === launch.chainId)!, payment = config.chains.find(c => c.id === launch.intakeChainId)!;
  const templates = config.tradeUrlTemplates as Record<string, string>;
  const trade = templates[String(launch.chainId)];
  const tradeUrl = trade ? safeUrl(trade.replaceAll('{hook}', launch.hookAddress ?? '').replaceAll('{token}', launch.tokenAddress ?? '').replaceAll('{poolId}', launch.poolId ?? '').replaceAll('{chainId}', String(launch.chainId))) : null;
  const final = launch.status === 'failed' ? 'Failed' : 'Live';
  return <section className="wrap page hook-page" aria-labelledby="hook-h">
    <div className="detail-head"><div><div className="detail-pills"><span className="pill chain">{CHAINS[launch.chainId]}</span><span className={`pill status-${launch.status}`}>{STATUSES[launch.status]}</span>{launch.launchNumber && <span className="num">Launch #{launch.launchNumber}</span>}</div>
      <h1 id="hook-h"><Text>{launch.name}</Text></h1>{launch.symbol && <p className="hook-symbol num">${launch.symbol}</p>}
      <p className="small creator">by {launch.creatorName ? <span>{launch.creatorName}</span> : <code>{launch.payer}</code>}</p>
    </div><button className="btn primary" onClick={() => { if (storeDraft(copyLaunchDraft(launch))) location.hash = '#builder'; else setError('Could not save the new draft. Allow site storage and try again.'); }}>Build one like this</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <ol className="timeline" aria-label="Launch timeline">{['Requested', 'Building', 'Audit panel', 'Deploying', final].map((step, index) => <li key={step} className={index === 0 || index === 4 && ['live', 'failed'].includes(launch.status) ? 'confirmed' : ''} aria-current={index === 4 && ['live','failed'].includes(launch.status) ? 'step' : index === 0 && launch.status === 'requested' ? 'step' : undefined}><span className="num">{index + 1}</span><strong>{step}</strong><small>{index === 0 ? 'Seen on chain' : index === 4 && launch.status === 'live' ? 'Addresses delivered' : index === 4 && launch.status === 'failed' ? 'Intake reported failure' : 'No separate chain event'}</small></li>)}</ol>
    {launch.status === 'in-progress' && <p className="notice">{launch.resultLoaded ? 'The build result is available, but it does not yet report a deployed hook address.' : 'Intake completed the request. Reading its result file…'}</p>}
    {!!launch.completion?.status && <p className="notice" role="status">Failed: <code>{launch.completion.reason}</code></p>}
    {launch.resultError && <p className="notice" role="status">{launch.resultError} <button className="link-button" onClick={store.retry}>Retry result</button></p>}
    <div className="detail-data"><section className="box addresses" aria-labelledby="addresses-h"><h2 id="addresses-h">Addresses</h2><dl className="kv">
      {([['Hook', launch.hookAddress], ['Token', launch.tokenAddress], ['Distributor', launch.distributorAddress], ['Pool id', launch.poolId]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{launch.type === 'B' && label !== 'Hook' && !value ? <span className="muted">Not created by this launch</span> : <AddressValue value={value} label={label.toLowerCase()} explorer={label === 'Pool id' ? undefined : deployment.explorerUrl} />}</dd></div>)}
      <div><dt>Creator</dt><dd><AddressValue value={launch.payer} label="creator address" explorer={payment.explorerUrl} /></dd></div>
    </dl></section>
    <section className="box evidence" aria-labelledby="evidence-h"><h2 id="evidence-h">Evidence</h2><ul>
      {launch.jobIds.map(job => <li key={job}><a href={`https://explorer.imd.fun/jobs/${encodeURIComponent(job)}`} target="_blank" rel="noreferrer">Source job</a></li>)}
      {launch.sourceRepoUrl && <li><a href={launch.sourceRepoUrl} target="_blank" rel="noreferrer">Source repository</a></li>}
      <li>{launch.auditUrl ? <a href={launch.auditUrl} target="_blank" rel="noreferrer">Audit</a> : 'Audit link not supplied in the result'}</li>
      {(launch.launchId || launch.launchNumber) && <li><a href={`https://explorer.imd.fun/launches/${encodeURIComponent(launch.launchId ?? String(launch.launchNumber))}`} target="_blank" rel="noreferrer">Launch page</a></li>}
      {launch.resultUrl && <li><a href={launch.resultUrl} target="_blank" rel="noreferrer">Result JSON</a></li>}
      <li>{tradeUrl && launch.status === 'live' ? <a href={tradeUrl} target="_blank" rel="noreferrer">Trade</a> : 'Trade link not configured'}</li>
    </ul><h3>Request</h3><AddressValue value={launch.requestId} label="request id" /><p className="small muted">Paid on {CHAINS[launch.intakeChainId]}</p>
      {launch.txHashes.slice(0,2).map((tx,i) => <AddressValue key={tx} value={tx} label={i ? 'completion transaction' : 'request transaction'} explorer={payment.explorerUrl} kind="tx" />)}
    </section></div>
    <Management launch={launch} client={store.clients[launch.chainId]} explorer={deployment.explorerUrl} />
    <section className="box hook-request"><h2>Blocks in this hook</h2><ul className="blocks hook-blocks">{launch.blocks.map((label,index) => {
      const match = launch.matchedBlocks.find(b => BY_ID[b.id] && label === shortLabel(b, launch));
      return <li key={`${index}:${label}`}><Text>{label}</Text>{match && <WarnSign def={BY_ID[match.id]} tested={true} />}</li>;
    })}</ul>{!launch.blocks.length && <p>This hook was described in words.</p>}<details><summary>Request text as sent</summary><div><pre>{launch.request}</pre></div></details></section>
    {launch.type === 'C' && launch.status === 'live' && <section className="box pool-panel"><h2>Open the pool</h2><p>Pool opening arrives in phase 2b. This launch deploys the hook only; no pool has been created by the store.</p></section>}
  </section>;
}
import { shortOf } from '../../src/lib/compose';
const shortLabel = (block: Launch['matchedBlocks'][number], launch: Launch) => shortOf(block, { name: launch.name, symbol: launch.symbol ?? (launch.type === 'C' ? 'the token' : 'the pool’s token') });
