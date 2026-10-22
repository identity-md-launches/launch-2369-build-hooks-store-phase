import { useEffect, useRef, useState } from 'react';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { formatEther, parseEther, zeroAddress, type Address, type Hex } from 'viem';
import type { LaunchStore } from './chain/store';
import { CHAINS, hookHref, type Launch } from './types';
import { AddressValue } from './AddressValue';
import { useAds } from './Ads';
import { AD_PRICE, BOOST_TERMS, adError, adsConfig, depositFor, listingIdentity, listingMetadata, placementPosition, placementsAbi, registryAbi, sendAdTransaction, type Ad, type AdsWallet, type Listing, type Metadata } from './chain/ads';
export function Promotions({ launches, store }: { launches: Launch[]; store: LaunchStore }) {
  const { address, chainId } = useAccount(), { data: wallet } = useWalletClient(), { mutateAsync: switchChain } = useSwitchChain();
  const { ads, errors, enabled, refresh } = useAds();
  const hooks = launches.filter(l => l.isHook !== false && l.status === 'live' && l.hookAddress && l.payer.toLowerCase() === address?.toLowerCase() && adsConfig(store.config, l.chainId));
  const [selectedChain, setSelectedChain] = useState(() => chainId && adsConfig(store.config, chainId) ? chainId : store.config.chains.find(c => adsConfig(store.config, c.id))?.id ?? 4663);
  const [selected, setSelected] = useState(''), [flow, setFlow] = useState(false), [step, setStep] = useState(1);
  const [listingId, setListingId] = useState<bigint | null>(null), [revision, setRevision] = useState<bigint | null>(null), [recipient, setRecipient] = useState<Address | null>(null), [metadata, setMetadata] = useState<Metadata | null>(null);
  const [setup, setSetup] = useState<'reading' | 'ready' | 'pending'>('reading');
  const [available, setAvailable] = useState<bigint | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [hash, setHash] = useState<Hex | null>(null);
  const [boostId, setBoostId] = useState(''), [boostAmount, setBoostAmount] = useState(''), [boostConfirmed, setBoostConfirmed] = useState(false), [cancelId, setCancelId] = useState('');
  const [balanceRevision, setBalanceRevision] = useState(0), lock = useRef(false);
  const launch = hooks.find(l => l.id === selected), config = adsConfig(store.config, selectedChain), client = store.clients[selectedChain];
  const wrongChain = !!address && chainId !== selectedChain;
  const ownAds = ads.filter(a => a.placement.payer.toLowerCase() === address?.toLowerCase() && a.chainId === selectedChain);
  const identity = `${address}:${selectedChain}:${selected}`;
  const identityRef = useRef(identity); identityRef.current = identity;
  useEffect(() => {
    if (step <= 1 || !flow) return;
    const frame = requestAnimationFrame(() => document.getElementById(`promo-step-${step}`)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [step, flow]);
  useEffect(() => {
    setAvailable(null); setError(''); setHash(null); setMessage(''); setListingId(null); setRevision(null); setRecipient(null); setMetadata(null); setStep(1);
    setBoostId(''); setCancelId(''); setBoostConfirmed(false);
  }, [identity]);
  useEffect(() => {
    if (!address || !config) return;
    let active = true;
    const read = async () => { try {
      const [configuredToken, configuredRecipient] = await Promise.all([client.readContract({ address: config.placements, abi: placementsAbi, functionName: 'imd' }), client.readContract({ address: config.placements, abi: placementsAbi, functionName: 'proceedsRecipient' })]);
      if (active) setSetup(String(configuredToken).toLowerCase() === store.config.chains.find(c => c.id === selectedChain)!.imdAddress.toLowerCase() && String(configuredRecipient).toLowerCase() !== zeroAddress ? 'ready' : 'pending');
      const value = await client.readContract({ address: config.placements, abi: placementsAbi, functionName: 'available', args: [address] }) as bigint;
      if (active) setAvailable(value);
    } catch { if (active) { setAvailable(null); setError('Could not read your available IMD. Retry the balance reading.'); } } };
    void read(); const timer = setInterval(read, 60000); return () => { active = false; clearInterval(timer); };
  }, [address, client, config?.placements, balanceRevision]);
  const context = (): AdsWallet => {
    if (!wallet || !address || !config || wrongChain) throw new Error('Connect your wallet on the selected promotion chain.');
    return { client, wallet, account: address, chainId: selectedChain, config, imd: store.config.chains.find(c => c.id === selectedChain)!.imdAddress as Address,
      onHash: tx => { setHash(tx); setMessage('Waiting for confirmation…'); } };
  };
  const run = async (label: string, action: (ctx: AdsWallet) => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setHash(null); setMessage(label);
    const started = identity;
    try { await action(context()); if (identityRef.current === started) setMessage('Confirmed on chain.'); }
    catch (e) { if (identityRef.current === started) { setError(adError(e)); setMessage(''); } }
    finally { lock.current = false; setBusy(false); refresh(); setBalanceRevision(v => v + 1); }
  };
  const preparePurchase = async (ctx: AdsWallet, id: bigint) => {
    const [listing, to] = await Promise.all([
      ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'getListing', args: [id] }) as Promise<Listing>,
      ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'proceedsRecipient' }) as Promise<Address>,
    ]);
    if (to === zeroAddress) throw new Error('The proceeds recipient has not been configured. No purchase can be sent.');
    if (!listing.active || listing.owner.toLowerCase() !== ctx.account.toLowerCase()) throw new Error('This listing is inactive or belongs to another wallet.');
    const snapshot = await ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'getMetadata', args: [id, listing.revision] }) as Metadata;
    setRevision(listing.revision); setRecipient(to); setMetadata(snapshot);
  };
  const toggleFlow = () => {
    if (!flow && step === 4) {
      setStep(1); setSelected(''); setListingId(null); setRevision(null);
      setRecipient(null); setMetadata(null); setHash(null);
    }
    setFlow(!flow); setError(''); setMessage('');
  };
  if (!enabled) return null;
  return <section className="box promotions" id="promotions" aria-labelledby="promotions-h"><h2 id="promotions-h">Promotions <span className="pill ad">#AD</span></h2>
    <p>0.1 IMD for 24 hours, ranked by total paid. Top-ups are never refunded; cancelling refunds the unused base.</p>
    <p className="small muted">A paid placement is not a review or endorsement. Prices are in IMD; USD context is unavailable.</p>
    {!address ? <button className="btn primary" onClick={() => document.getElementById('connect')?.click()}>Connect to promote a hook</button> : <>
      <label htmlFor="promotion-chain">Promotion chain</label><select id="promotion-chain" disabled={busy} value={selectedChain} onChange={e => { setSelectedChain(Number(e.target.value)); setSelected(''); setFlow(false); }}>{store.config.chains.filter(c => adsConfig(store.config, c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {wrongChain && <p className="notice">Connect on {CHAINS[selectedChain]} to manage placements. <button className="btn tiny" disabled={busy} onClick={async () => { try { await switchChain({ chainId: selectedChain }); } catch (e) { setError(adError(e)); } }}>Switch to {CHAINS[selectedChain]}</button></p>}
      {setup === 'pending' && <p className="notice" role="status">Promotion payments await contract setup on {CHAINS[selectedChain]}. IMD and the proceeds recipient must be configured by the contract owner. Free listings are available.</p>}
      <div className="promotion-balance"><span>Available balance: <strong className="num">{available === null ? 'Reading…' : `${formatEther(available)} IMD`}</strong></span><button className="link-button" disabled={busy} onClick={() => { refresh(); setBalanceRevision(v => v + 1); }}>Refresh balance</button><button className="btn tiny" disabled={busy || wrongChain || !available} onClick={() => void run('Withdraw available IMD: check your wallet…', async ctx => {
        const value = await ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'available', args: [ctx.account] }) as bigint;
        if (value <= 0n) throw new Error('No available balance to withdraw.');
        await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'withdraw', [value, ctx.account]);
      })}>Withdraw available balance</button></div>
      {!!errors.length && <p className="notice" role="status">{errors.join(' ')} <button className="link-button" onClick={refresh}>Retry placements</button></p>}
      <div className="promotion-list">{ownAds.length ? ownAds.map(ad => {
        const key = String(ad.placement.id), { rank, total: stripCount } = placementPosition(ads, ad);
        const elapsed = BigInt(Math.max(0, Math.floor(Date.now() / 1000) - Number(ad.placement.startsAt))), duration = ad.placement.endsAt - ad.placement.startsAt;
        const refund = AD_PRICE - AD_PRICE * (elapsed < duration ? elapsed : duration) / duration;
        return <article className="promotion-row" key={key} data-placement={key}><div><h3>{ad.launch ? <a href={hookHref(ad.launch)}>{ad.metadata.name}</a> : ad.metadata.name} <span className="pill ad">#AD</span></h3><p className="num">{Math.ceil((Number(ad.placement.endsAt) - Date.now() / 1000) / 3600)}h left · {formatEther(ad.total)} IMD total · {rank ? `Rank ${rank} of ${stripCount}` : 'Not in store strip'}</p><p className="small muted">Listing {String(ad.placement.listingId)} · pinned revision {String(ad.placement.revision)}</p></div>
          <div className="row-actions"><button className="btn tiny" disabled={busy || wrongChain} onClick={() => { setBoostId(boostId === key ? '' : key); setBoostConfirmed(false); setBoostAmount(''); setCancelId(''); }}>Boost</button><button className="btn tiny" disabled={busy || wrongChain} onClick={() => { setCancelId(cancelId === key ? '' : key); setBoostId(''); }}>Cancel placement</button></div>
          {boostId === key && <form className="promotion-confirm" onSubmit={e => { e.preventDefault(); if (!boostConfirmed) { setError('Confirm the boost terms before continuing.'); return; } void run('Approve and deposit the boost if needed: check your wallet…', async ctx => {
            if (!/^\d+(?:\.\d{1,18})?$/.test(boostAmount) || parseEther(boostAmount) <= 0n) throw new Error('Enter a positive IMD amount, with up to 18 decimals.');
            const amount = parseEther(boostAmount); await depositFor(ctx, amount); await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'boost', [ad.placement.id, amount]); setBoostId('');
          }); }}><label htmlFor={`boost-${key}`}>Boost amount (IMD)</label><input id={`boost-${key}`} inputMode="decimal" value={boostAmount} onChange={e => setBoostAmount(e.target.value)} placeholder="e.g. 0.02" disabled={busy} /><p>{BOOST_TERMS}</p><label className="check-label"><input type="checkbox" checked={boostConfirmed} onChange={e => setBoostConfirmed(e.target.checked)} disabled={busy} />I confirm this boost is non-refundable.</label><button className="btn" disabled={busy || wrongChain || !boostConfirmed}>Confirm boost</button></form>}
          {cancelId === key && <div className="promotion-confirm"><p>Cancelling refunds the unused part of the 0.1 IMD base to your available balance, approximately <span className="num">{formatEther(refund)} IMD</span> now. All boosts are forfeited to the pinned proceeds recipient. Withdraw the available balance afterwards.</p><button className="btn" disabled={busy || wrongChain} onClick={() => void run('Cancel this placement: check your wallet…', async ctx => { await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'cancel', [ad.placement.id]); setCancelId(''); })}>Confirm cancellation</button><button className="btn" disabled={busy} onClick={() => setCancelId('')}>Keep placement</button></div>}
        </article>;
      }) : <p className="muted">No active placements from this wallet on {CHAINS[selectedChain]}. Promote a live hook below.</p>}</div>
      <button className="btn primary" disabled={busy} onClick={toggleFlow}>Promote a hook</button>
      {flow && <div className="promotion-flow"><h3>Promote a hook · 0.1 IMD / 24h</h3><ol className="promotion-steps" aria-label="Promotion steps">{['Free listing', 'Approve & deposit', 'Purchase 24 hours', 'Done'].map((title, i) => <li key={title} aria-current={step === i + 1 ? 'step' : undefined} className={step > i + 1 ? 'confirmed' : ''}><span className="num">{i + 1}</span> {title}</li>)}</ol>
        <label htmlFor="promote-hook">Your live hook on {CHAINS[selectedChain]}</label><select id="promote-hook" value={selected} disabled={busy || step === 4} onChange={e => setSelected(e.target.value)}><option value="">Choose a hook you launched</option>{hooks.filter(l => l.chainId === selectedChain).map(l => <option key={l.id} value={l.id}>{l.name}{l.symbol ? ` (${l.symbol})` : ''}</option>)}</select>
        {!hooks.some(l => l.chainId === selectedChain) && <p>No live hooks launched by this wallet on this chain. <a href="#builder">Build a hook</a>.</p>}
        {launch && <>
          <p className="small">Listing creation is free; each wallet transaction costs gas. Approval lets the placement contract take only the missing IMD deposit. A deposit remains yours until purchase or boost.</p>
          {step === 1 && <button className="btn" disabled={busy || wrongChain} onClick={() => void run('Create the free listing: check your wallet…', async ctx => {
            const key = listingIdentity(selectedChain, launch.hookAddress as Address, ctx.account);
            let id = await ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'listingFor', args: [key] }) as bigint;
            if (!id) { await sendAdTransaction(ctx, ctx.config.registry, registryAbi, 'createListing', [BigInt(selectedChain), launch.hookAddress, listingMetadata(launch)]); id = await ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'listingFor', args: [key] }) as bigint; }
            if (!id) throw new Error('The confirmed listing could not be read. Retry the reading.');
            setListingId(id); await preparePurchase(ctx, id); setStep(2);
          })}>1. Create or use free listing</button>}
          {step >= 2 && metadata && <details className="listing-review"><summary>Listing {String(listingId)} · revision {String(revision)} · review metadata</summary><dl className="kv"><div><dt>Name</dt><dd>{metadata.name}</dd></div><div><dt>Callbacks</dt><dd>{metadata.callbackDisclosure} (mask 0x{metadata.callbackMask.toString(16)})</dd></div><div><dt>Fees</dt><dd>{metadata.feeDisclosure}</dd></div><div><dt>Admin</dt><dd>{metadata.adminDisclosure}</dd></div>{(['sourceRef', 'testRef', 'reviewRef', 'auditRef'] as const).map(key => <div key={key}><dt>{key.replace('Ref', '')}</dt><dd>{metadata[key] || 'Not supplied'}</dd></div>)}</dl></details>}
          {step === 2 && <button id="promo-step-2" className="btn" disabled={busy || wrongChain || setup !== 'ready'} onClick={() => void run('Approve and deposit up to 0.1 IMD: check your wallet…', async ctx => { await depositFor(ctx, AD_PRICE); await preparePurchase(ctx, listingId!); setStep(3); })}>2. Approve & deposit 0.1 IMD</button>}
          {step === 3 && <><p>Purchase <span className="num">24 hours for 0.1 IMD</span> at revision {String(revision)}. The purchase expires after 10 minutes if unconfirmed. Cancellation returns the unused base; boosts are never refunded.</p><p className="small">Pinned proceeds recipient:</p><AddressValue value={recipient} label="promotion proceeds recipient" explorer={store.config.chains.find(c => c.id === selectedChain)!.explorerUrl} /><div className="row-actions"><button id="promo-step-3" className="btn primary" disabled={busy || wrongChain || !recipient} onClick={() => void run('Purchase 24 hours: check your wallet…', async ctx => { await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'purchase', [listingId, revision, recipient, BigInt(Math.floor(Date.now() / 1000) + 600)]); setStep(4); })}>3. Purchase 24 hours · 0.1 IMD</button><button className="link-button" disabled={busy} onClick={() => void run('Refreshing purchase terms…', ctx => preparePurchase(ctx, listingId!))}>Refresh purchase terms</button></div></>}
          {step === 4 && <p className="notice" role="status">Your #ad placement is active. <a id="promo-step-4" href="#store?featured=1" onClick={refresh}>View the featured carousel</a>. It uses the listing revision you purchased.</p>}
        </>}
      </div>}
    </>}
    <p className="function-feedback" role="status">{busy ? message || 'Check your wallet…' : message}</p>{error && <p className="field-error" role="alert">{error}</p>}{hash && <AddressValue value={hash} label="promotion transaction" kind="tx" explorer={store.config.chains.find(c => c.id === selectedChain)!.explorerUrl} />}
  </section>;
}
