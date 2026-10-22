import { useEffect, useRef, useState } from 'react';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { formatEther, zeroAddress, type Address, type Hex } from 'viem';
import type { LaunchStore } from './chain/store';
import { CHAINS, hookHref, type Launch } from './types';
import { AddressValue } from './AddressValue';
import { useAds } from './Ads';
import { AD_PRICE, BOOST_TERMS, adError, adsConfig, boostState, depositAmount, depositState, listingIdentity, listingMetadata, placementPosition, promoteState, readEarnedProceeds, readPromotionBalances, placementsAbi, registryAbi, sendAdTransaction, type Ad, type AdsWallet, type Listing } from './chain/ads';

const imd = (value: bigint | null) => value === null ? 'Reading…' : `${formatEther(value)} IMD`;
const sameHook = (ad: Ad, launch: Launch) => Number(ad.listing.chainId) === launch.chainId && ad.listing.hook.toLowerCase() === launch.hookAddress?.toLowerCase();

/** Promotions (SPEC 3.5, decision 44): the balance first, then one row per live hook. */
export function Promotions({ launches, store }: { launches: Launch[]; store: LaunchStore }) {
  const { address, chainId } = useAccount(), { data: wallet } = useWalletClient(), { mutateAsync: switchChain } = useSwitchChain();
  const { ads, errors, enabled, refresh } = useAds();
  const hooks = launches.filter(l => l.isHook !== false && l.status === 'live' && l.hookAddress && l.payer.toLowerCase() === address?.toLowerCase());
  const [selectedChain, setSelectedChain] = useState(() => chainId && adsConfig(store.config, chainId) ? chainId : store.config.chains.find(c => adsConfig(store.config, c.id))?.id ?? 4663);
  const [setup, setSetup] = useState<'reading' | 'ready' | 'pending'>('reading');
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null), [available, setAvailable] = useState<bigint | null>(null);
  const [earned, setEarned] = useState<{ isRecipient: boolean; proceeds: bigint } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [hash, setHash] = useState<Hex | null>(null), [hashChain, setHashChain] = useState(selectedChain);
  const [depositText, setDepositText] = useState(''), [boostId, setBoostId] = useState(''), [boostText, setBoostText] = useState(''), [boostConfirmed, setBoostConfirmed] = useState(false), [cancelId, setCancelId] = useState('');
  const [balanceRevision, setBalanceRevision] = useState(0), lock = useRef(false);
  const config = adsConfig(store.config, selectedChain), client = store.clients[selectedChain], chainName = CHAINS[selectedChain];
  const imdAddress = store.config.chains.find(c => c.id === selectedChain)!.imdAddress as Address;
  const wrongChain = !!address && chainId !== selectedChain;
  const ownAds = ads.filter(a => a.placement.payer.toLowerCase() === address?.toLowerCase());
  const identity = `${address}:${selectedChain}`;
  const identityRef = useRef(identity); identityRef.current = identity;
  useEffect(() => {
    setAvailable(null); setWalletBalance(null); setEarned(null); setSetup('reading'); setError(''); setHash(null); setMessage('');
    setBoostId(''); setCancelId(''); setBoostConfirmed(false); setDepositText('');
  }, [identity]);
  useEffect(() => {
    if (!address || !config) return;
    let active = true;
    const read = async () => { try {
      const [configuredToken, configuredRecipient] = await Promise.all([client.readContract({ address: config.placements, abi: placementsAbi, functionName: 'imd' }), client.readContract({ address: config.placements, abi: placementsAbi, functionName: 'proceedsRecipient' })]);
      if (active) setSetup(String(configuredToken).toLowerCase() === imdAddress.toLowerCase() && String(configuredRecipient).toLowerCase() !== zeroAddress ? 'ready' : 'pending');
      const [balances, proceeds] = await Promise.all([readPromotionBalances(client, config, imdAddress, address), readEarnedProceeds(client, config, address)]);
      if (active) { setAvailable(balances.deposited); setWalletBalance(balances.wallet); setEarned(proceeds); }
    } catch { if (active) { setAvailable(null); setWalletBalance(null); setEarned(null); setSetup('reading'); setError(`Could not read your IMD on ${chainName}. Refresh balances to retry.`); } } };
    void read(); const timer = setInterval(read, 60000); return () => { active = false; clearInterval(timer); };
  }, [address, client, config?.placements, balanceRevision]);
  const context = (): AdsWallet => {
    if (!wallet || !address || !config || chainId !== selectedChain) throw new Error('Connect your wallet on the selected promotion chain.');
    const paymentChain = selectedChain;
    return { client, wallet, account: address, chainId: paymentChain, config, imd: imdAddress,
      onHash: tx => { setHash(tx); setHashChain(paymentChain); setMessage('Waiting for confirmation…'); }, onConfirmed: () => { refresh(); setBalanceRevision(v => v + 1); } };
  };
  /** Every transaction is simulated in sendAdTransaction; every confirmation re-reads all balances. */
  const run = async (label: string, done: string, action: (ctx: AdsWallet) => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setHash(null); setMessage(label);
    const started = identity;
    try { await action(context()); if (identityRef.current === started) setMessage(done); }
    catch (e) { if (identityRef.current === started) { setError(adError(e)); setMessage(''); } }
    finally { lock.current = false; setBusy(false); refresh(); setBalanceRevision(v => v + 1); }
  };
  const promote = (launch: Launch) => run(`Promote ${launch.name}: check your wallet…`, `${launch.name} is promoted for 24 hours.`, async ctx => {
    const key = listingIdentity(launch.chainId, launch.hookAddress as Address, ctx.account);
    let id = await ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'listingFor', args: [key] }) as bigint;
    // The free listing is created first and silently when the hook has none on this chain.
    if (!id) { await sendAdTransaction(ctx, ctx.config.registry, registryAbi, 'createListing', [BigInt(launch.chainId), launch.hookAddress, listingMetadata(launch)]); id = await ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'listingFor', args: [key] }) as bigint; }
    if (!id) throw new Error('The confirmed listing could not be read. Retry PROMOTE.');
    const [listing, recipient, deposited] = await Promise.all([
      ctx.client.readContract({ address: ctx.config.registry, abi: registryAbi, functionName: 'getListing', args: [id] }) as Promise<Listing>,
      ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'proceedsRecipient' }) as Promise<Address>,
      ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'available', args: [ctx.account] }) as Promise<bigint>,
    ]);
    if (recipient === zeroAddress) throw new Error('The proceeds recipient has not been configured. No purchase can be sent.');
    if (!listing.active || listing.owner.toLowerCase() !== ctx.account.toLowerCase()) throw new Error('This listing is inactive or belongs to another wallet.');
    if (deposited < AD_PRICE) throw new Error('Deposit at least 0.1 IMD first.');
    await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'purchase', [id, listing.revision, recipient, BigInt(Math.floor(Date.now() / 1000) + 600)]);
  });
  if (!enabled) return null;
  const deposit = depositState(depositText, walletBalance), boost = boostState(boostText, available);
  const promotion = promoteState(available, { ready: setup === 'ready', wrongChain, busy });
  const showEarned = !!earned && (earned.isRecipient || earned.proceeds > 0n);
  const rows: { key: string; launch?: Launch; placements: Ad[] }[] = [
    ...hooks.map(l => ({ key: l.id, launch: l, placements: ownAds.filter(a => sameHook(a, l)) })),
    ...ownAds.filter(a => !hooks.some(l => sameHook(a, l))).map(a => ({ key: `${a.chainId}:${a.placement.id}`, placements: [a] })),
  ];
  const placementRow = (ad: Ad) => {
    const key = `${ad.chainId}:${ad.placement.id}`, here = ad.chainId === selectedChain, { rank, total: stripCount } = placementPosition(ads, ad);
    const elapsed = BigInt(Math.max(0, Math.floor(Date.now() / 1000) - Number(ad.placement.startsAt))), duration = ad.placement.endsAt - ad.placement.startsAt;
    const refund = AD_PRICE - AD_PRICE * (elapsed < duration ? elapsed : duration) / duration;
    const hoursLeft = Math.max(0, Math.ceil((Number(ad.placement.endsAt) - Date.now() / 1000) / 3600));
    return <div className="placement-running" key={key} data-placement={key}>
      <p className="num">{hoursLeft}h left · {formatEther(ad.total)} IMD total paid · {rank ? `Rank ${rank} of ${stripCount}` : 'Not in store strip'}</p>
      <p className="small muted">Paid on {CHAINS[ad.chainId]} · Listing {String(ad.placement.listingId)} · pinned revision {String(ad.placement.revision)}</p>
      {here ? <div className="row-actions">
        <button className="btn tiny" disabled={busy || wrongChain} aria-expanded={boostId === key} onClick={() => { setBoostId(boostId === key ? '' : key); setBoostConfirmed(false); setBoostText(''); setCancelId(''); }}>Boost</button>
        <button className="btn tiny" disabled={busy || wrongChain} aria-expanded={cancelId === key} onClick={() => { setCancelId(cancelId === key ? '' : key); setBoostId(''); }}>Cancel</button>
      </div> : <button className="btn tiny" disabled={busy} onClick={() => setSelectedChain(ad.chainId)}>Manage on {CHAINS[ad.chainId]}</button>}
      {boostId === key && here && <form className="promotion-confirm" onSubmit={e => { e.preventDefault(); if (!boost.amount || !boostConfirmed) return; const amount = boost.amount; void run('Boost this placement: check your wallet…', `Boosted by ${formatEther(amount)} IMD.`, async ctx => { await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'boost', [ad.placement.id, amount]); setBoostId(''); }); }}>
        <label htmlFor={`boost-${key}`}>Boost amount (IMD), from your deposit</label>
        <input id={`boost-${key}`} className="num" inputMode="decimal" autoComplete="off" value={boostText} onChange={e => setBoostText(e.target.value)} placeholder="0.05" disabled={busy} aria-describedby={`boost-${key}-note`} aria-invalid={!!boost.error || undefined} />
        <p id={`boost-${key}-note`} className={boost.error ? 'field-error' : 'small muted'}>{boost.error || `Deposited: ${imd(available)}`}</p>
        <p>{BOOST_TERMS}.</p>
        <label className="check-label"><input type="checkbox" checked={boostConfirmed} onChange={e => setBoostConfirmed(e.target.checked)} disabled={busy} />I confirm this boost is non-refundable.</label>
        <button className="btn" disabled={busy || wrongChain || !boostConfirmed || !boost.amount}>Confirm boost</button>
      </form>}
      {cancelId === key && here && <div className="promotion-confirm"><p>Cancelling refunds the unused part of the 0.1 IMD base to your deposit, about <span className="num">{formatEther(refund)} IMD</span> now. All boosts are forfeited to the pinned proceeds recipient. Withdraw the deposit afterwards if you want it back in your wallet.</p>
        <button className="btn" disabled={busy || wrongChain} onClick={() => void run('Cancel this placement: check your wallet…', 'Placement cancelled; the refund is in your deposit.', async ctx => { await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'cancel', [ad.placement.id]); setCancelId(''); })}>Confirm cancellation</button>
        <button className="btn" disabled={busy} onClick={() => setCancelId('')}>Keep placement</button></div>}
    </div>;
  };
  return <section className="box promotion-panel" id="promotions" aria-labelledby="promotions-h"><h2 id="promotions-h">Promotions <span className="pill paid-tag">#AD</span></h2>
    <p>0.1 IMD for 24 hours, ranked by total paid. Top-ups are never refunded; cancelling refunds the unused base.</p>
    <p className="small muted">A paid placement is not a review or endorsement. Prices are in IMD; USD context is unavailable.</p>
    {!address ? <button className="btn primary" onClick={() => document.getElementById('connect')?.click()}>Connect to promote a hook</button> : <>
      <label htmlFor="promotion-chain">Promotion chain</label><p className="small muted" id="promotion-chain-note">Where your wallet pays. You can promote your live hooks from either chain.</p>
      <select id="promotion-chain" aria-describedby="promotion-chain-note" disabled={busy} value={selectedChain} onChange={e => setSelectedChain(Number(e.target.value))}>{store.config.chains.filter(c => adsConfig(store.config, c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {wrongChain && <p className="notice">Your wallet is not on {chainName}. <button className="btn tiny" disabled={busy} onClick={async () => { try { await switchChain({ chainId: selectedChain }); } catch (e) { setError(adError(e)); } }}>Switch to {chainName}</button></p>}
      {setup === 'pending' && <p className="notice" role="status">Promotion payments await contract setup on {chainName}. IMD and the proceeds recipient must be configured by the contract owner.</p>}
      <div className="promotion-balance" aria-live="polite">
        <p className="wallet-imd">In your wallet on {chainName}: <strong className="num">{imd(walletBalance)}</strong></p>
        {walletBalance !== null && walletBalance < AD_PRICE && <p className="small low-imd">Not enough IMD on {chainName} for a placement; the pay page and bridges are outside the store</p>}
        <p className="deposited-imd">Deposited for promotions: <strong className="num">{imd(available)}</strong></p>
        <p className="small muted">Deposits are pulled from your wallet when you promote or boost and stay yours until spent; withdraw any unspent deposit here.</p>
        {showEarned && <p className="earned-imd">Earned as recipient: <strong className="num">{formatEther(earned!.proceeds)} IMD</strong></p>}
        <div className="row-actions">
          <button className="btn tiny" disabled={busy || wrongChain || !available} onClick={() => void run('Withdraw your unspent deposit: check your wallet…', 'Deposit withdrawn to your wallet.', async ctx => {
            const value = await ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'available', args: [ctx.account] }) as bigint;
            if (value <= 0n) throw new Error('No deposit to withdraw.');
            await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'withdraw', [value, ctx.account]);
          })}>Withdraw</button>
          {showEarned && <button className="btn tiny" disabled={busy || wrongChain || !earned!.proceeds} onClick={() => void run('Withdraw proceeds: check your wallet…', 'Proceeds withdrawn to your wallet.', async ctx => {
            const value = await ctx.client.readContract({ address: ctx.config.placements, abi: placementsAbi, functionName: 'proceeds', args: [ctx.account] }) as bigint;
            if (value <= 0n) throw new Error('No proceeds to withdraw.');
            await sendAdTransaction(ctx, ctx.config.placements, placementsAbi, 'withdrawProceeds', [value, ctx.account]);
          })}>Withdraw proceeds</button>}
          <button className="link-button" disabled={busy} onClick={() => { refresh(); setBalanceRevision(v => v + 1); }}>Refresh balances</button>
        </div>
      </div>
      <form className="deposit-box" onSubmit={e => { e.preventDefault(); if (!deposit.amount) return; const amount = deposit.amount; void run('Deposit IMD: check your wallet…', `Deposited ${formatEther(amount)} IMD.`, async ctx => { await depositAmount(ctx, amount); setDepositText(''); }); }}>
        <label htmlFor="deposit-amount">Deposit IMD</label>
        <div className="deposit-row"><input id="deposit-amount" className="num" inputMode="decimal" autoComplete="off" placeholder="0.25" value={depositText} disabled={busy} onChange={e => setDepositText(e.target.value)} aria-describedby="deposit-note" aria-invalid={!!deposit.error || undefined} />
          <button className="btn" disabled={busy || wrongChain || setup !== 'ready' || !deposit.amount}>Deposit</button></div>
        <p id="deposit-note" className={deposit.error ? 'field-error' : 'small muted'}>{deposit.error || 'Your wallet asks for an approval only when the allowance is short, then one deposit.'}</p>
      </form>
      {!!errors.length && <p className="notice" role="status">{errors.join(' ')} <button className="link-button" onClick={refresh}>Retry placements</button></p>}
      <h3 className="promotion-hooks-h">Your live hooks</h3>
      <div className="promotion-list">{rows.length ? rows.map(row => {
        const running = row.placements.find(a => a.chainId === selectedChain), name = row.launch?.name ?? row.placements[0].metadata.name;
        const hookChain = row.launch?.chainId ?? Number(row.placements[0].listing.chainId);
        return <article className="promotion-row" key={row.key} data-hook={row.key}>
          <p className="promotion-hook">{row.launch ? <a href={hookHref(row.launch)}>{name}</a> : name}{row.launch?.symbol && <span className="num"> (${row.launch.symbol})</span>} <span className="pill chain">{CHAINS[hookChain]}</span></p>
          {row.placements.map(placementRow)}
          {!running && row.launch && <div className="promote-action">
            <button className="btn primary" disabled={promotion.disabled} aria-describedby={promotion.note ? `promote-note-${row.key}` : undefined} onClick={() => void promote(row.launch!)}>Promote · 0.1 IMD / 24h</button>
            {promotion.note && <p className="small muted promote-note" id={`promote-note-${row.key}`}>{promotion.note}</p>}
          </div>}
        </article>;
      }) : <p>No live hooks launched by this wallet on either chain. <a href="#builder">Build a hook</a>.</p>}</div>
    </>}
    <p className="function-feedback" role="status">{busy ? message || 'Check your wallet…' : message}</p>{error && <p className="field-error" role="alert">{error}</p>}{hash && <AddressValue value={hash} label="promotion transaction" kind="tx" explorer={store.config.chains.find(c => c.id === hashChain)!.explorerUrl} />}
  </section>;
}
