import { useEffect, useId, useMemo, useState } from 'react';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import type { Address } from 'viem';
import { type Launch, CHAINS } from './types';
import type { ReadClient } from './chain/clients';
import { argumentValues, contractError, formatReading, managementFunctions, ownerAbi, type ManagementFn } from './chain/manage';
import { Text } from './Text';
import { AddressValue } from './AddressValue';

function FunctionRow({ fn, launch, client, ownerAllowed, owner, refresh, revision, explorer, poolId }: {
  fn: ManagementFn; launch: Launch; client: ReadClient; ownerAllowed: boolean; owner: string | null; refresh: () => void; revision: number; explorer: string; poolId: string;
}) {
  const id = useId(), { address, chainId, isConnected } = useAccount();
  const { data: wallet } = useWalletClient(), { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
  const view = fn.access === 'view';
  const [open, setOpen] = useState(view && fn.abi.inputs.some(p => p.name !== 'poolId'));
  const [values, setValues] = useState<string[]>(fn.abi.inputs.map(p => p.name === 'poolId' ? poolId : p.type === 'address' ? address ?? '' : p.type === 'bool' ? '' : fn.abi.name === 'twap' ? '300' : ''));
  const [reading, setReading] = useState<string | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [hash, setHash] = useState<string | null>(null);
  const live = launch.status === 'live' && !!launch.hookAddress;
  let inputError = '';
  try { argumentValues(fn.abi, values); } catch (e) { inputError = (e as Error).message; }
  const argsKey = JSON.stringify(values);
  useEffect(() => { if (address) setValues(old => old.map((v, i) => !v && fn.abi.inputs[i].type === 'address' ? address : v)); }, [address]);
  useEffect(() => { setValues(old => old.map((v, i) => fn.abi.inputs[i].name === 'poolId' ? poolId : v)); }, [poolId, fn.sig]);
  useEffect(() => {
    if (!view || !live || inputError) { setReading(null); return; }
    let active = true, running = false;
    const read = async () => {
      if (running) return; running = true;
      try {
        const value = await client.readContract({ address: launch.hookAddress as Address, abi: [fn.abi], functionName: fn.abi.name, args: argumentValues(fn.abi, values) });
        if (active) { setReading(formatReading(fn.abi.name, value, launch.type === 'A' && /paired with IMD\./.test(launch.request) ? 'IMD' : 'ETH')); setError(''); }
      } catch { if (active) { setReading(null); setError('Reading unavailable. Retry or check the contract on the explorer.'); } }
      finally { running = false; }
    };
    void read(); const timer = setInterval(read, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [view, live, client, launch.hookAddress, launch.request, fn.sig, argsKey, revision]);
  const allowed = fn.access !== 'owner' || ownerAllowed;
  const needsSwitch = isConnected && chainId !== launch.chainId;
  const send = async () => {
    if (busy || !live || !allowed || !wallet || !address || inputError) return;
    setBusy(true); setError(''); setMessage('Check your wallet…'); setHash(null);
    try {
      if (fn.access === 'owner') {
        const current = await client.readContract({ address: launch.hookAddress as Address, abi: ownerAbi, functionName: 'owner' });
        if (String(current).toLowerCase() !== address.toLowerCase() || owner?.toLowerCase() !== address.toLowerCase()) throw new Error('Owner changed');
      }
      const { request } = await client.simulateContract({ address: launch.hookAddress as Address, abi: [fn.abi], functionName: fn.abi.name, args: argumentValues(fn.abi, values), account: address });
      const tx = await wallet.writeContract({ ...request, chain: client.chain });
      setHash(tx); setMessage('Waiting for confirmation…');
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== 'success') throw new Error('Transaction reverted');
      setMessage('Confirmed on chain.'); refresh();
    } catch (e) { setError(/Owner changed/.test(String(e)) ? 'The owner has changed. Reconnect the current owner wallet.' : contractError(e)); setMessage(''); }
    finally { setBusy(false); }
  };
  return <div className="function-row" data-function={fn.abi.name}>
    <div className="function-head"><div><strong>{fn.label}</strong><code>{fn.sig}</code></div>
      {view ? <output className="reading" aria-live="polite">{reading ?? (live ? inputError ? 'Enter arguments' : error ? 'Unavailable' : 'Reading…' : 'Unknown until live')}</output>
        : <button className="btn tiny" disabled={!live || !allowed || busy || switching || (!isConnected && fn.access === 'owner')} onClick={async () => {
          if (!isConnected) { document.getElementById('connect')?.click(); return; }
          if (needsSwitch) { try { await switchChain({ chainId: launch.chainId }); } catch (e) { setError(contractError(e)); } return; }
          if (fn.abi.inputs.length) setOpen(!open); else void send();
        }}>{busy ? 'Sending…' : !isConnected && allowed ? 'Connect wallet' : needsSwitch && allowed ? `Switch to ${CHAINS[launch.chainId]}` : fn.abi.inputs.length ? open ? 'Close form' : 'Open form' : 'Send'}</button>}
    </div>
    {open && <form className="function-form" onSubmit={event => { event.preventDefault(); if (view) refresh(); else void send(); }}>
      {fn.abi.inputs.map((input, index) => input.name === 'poolId' ? <p key={index} className="small muted">Pool id comes from the pool selection above.</p> : <div key={index}><label htmlFor={`${id}-${index}`}>{input.name || (input.type === 'address' ? 'Wallet address' : /bytes\d+/.test(input.type) ? 'Position key' : `Argument ${index + 1}`)} <code>({input.type})</code></label>
        {input.type === 'bool' ? <select id={`${id}-${index}`} value={values[index]} onChange={e => setValues(old => old.map((v, i) => i === index ? e.target.value : v))}><option value="">Choose a value</option><option value="true">true · allow</option><option value="false">false · disallow</option></select>
          : <input id={`${id}-${index}`} className="mono-input" spellCheck={false} value={values[index]} placeholder={input.type === 'address[]' ? '0x… , 0x…' : input.type === 'address' || /bytes\d+/.test(input.type) ? '0x…' : 'Whole number'} aria-invalid={values[index] !== '' && !!inputError || undefined} aria-describedby={inputError ? `${id}-error` : undefined} onChange={e => setValues(old => old.map((v, i) => i === index ? e.target.value : v))} />}
      </div>)}
      {inputError && <p id={`${id}-error`} className={values.some(value => value.trim()) ? "field-error" : "small muted"}>{values.some(value => value.trim()) ? inputError : "Fill in each argument to continue."}</p>}
      {fn.abi.inputs.some(i => /int/.test(i.type)) && <p className="small muted">Whole numbers in the contract’s units.{fn.abi.name === 'placeOrder' ? ' Amount is in token base units; tick is the pool price tick.' : ''}</p>}
      <button className="btn tiny" type="submit" disabled={!!inputError || !live || busy || (!view && (!isConnected || needsSwitch || !allowed))}>{view ? 'Read now' : busy ? 'Sending…' : 'Send'}</button>
    </form>}
    {view && error && !open && <button className="link-button" onClick={refresh}>Retry reading</button>}
    <p className="function-feedback" role="status">{message}</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    {hash && <AddressValue label={`${fn.abi.name} transaction`} value={hash} explorer={explorer} kind="tx" />}
  </div>;
}
export function Management({ launch, client, explorer }: { launch: Launch; client: ReadClient; explorer: string }) {
  const { address, isConnected } = useAccount();
  const [owner, setOwner] = useState<string | null>(null), [ownerError, setOwnerError] = useState(''), [revision, setRevision] = useState(0);
  const [poolId, setPoolId] = useState(launch.poolId ?? '');
  const poolInput = useId();
  const functions = useMemo(() => managementFunctions(launch.matchedBlocks), [launch.request]);
  const needsPool = functions.some(fn => fn.abi.inputs.some(input => input.name === 'poolId'));
  const poolValid = /^0x[\da-fA-F]{64}$/.test(poolId);
  useEffect(() => { setPoolId(launch.poolId ?? ''); }, [launch.id, launch.poolId]);
  const owners = functions.filter(f => f.access === 'owner'), publicRows = functions.filter(f => f.access !== 'owner');
  const ownerAllowed = isConnected && !!owner && owner.toLowerCase() === address?.toLowerCase();
  useEffect(() => {
    setOwner(null); setOwnerError('');
    if (!owners.length || launch.status !== 'live' || !launch.hookAddress) return;
    let active = true, running = false;
    const read = async () => { if (running) return; running = true; try {
      const value = await client.readContract({ address: launch.hookAddress as Address, abi: ownerAbi, functionName: 'owner' });
      if (active) { setOwner(String(value)); setOwnerError(''); }
    } catch { if (active) { setOwner(null); setOwnerError('Owner could not be read. Controls stay locked; retry the reading.'); } } finally { running = false; } };
    void read(); const timer = setInterval(read, 20000); return () => { active = false; clearInterval(timer); };
  }, [client, launch.hookAddress, launch.status, launch.request, revision]);
  const rows = (list: ManagementFn[]) => list.map(fn => <FunctionRow key={fn.sig} fn={fn} launch={launch} client={client} ownerAllowed={ownerAllowed} owner={owner} refresh={() => setRevision(v => v + 1)} revision={revision} explorer={explorer} poolId={poolId} />);
  return <div id="manage">
    {needsPool && <div className="box management-pool"><label htmlFor={poolInput}>Pool id for these controls</label><input id={poolInput} className="mono-input" spellCheck={false} value={poolId} placeholder="0x… (32 bytes)" aria-describedby={`${poolInput}-help`} aria-invalid={!!poolId && !poolValid || undefined} onChange={event => setPoolId(event.target.value.trim())} /><p id={`${poolInput}-help`} className={poolId && !poolValid ? 'field-error' : 'small muted'}>{poolId && !poolValid ? 'Enter a full 32-byte pool id.' : 'Every pool-dependent reading and action below uses this pool id. Select the pool you intend to manage.'}</p></div>}
    <div className="management-grid">
    <section className="box management-panel" aria-labelledby="owner-h"><h2 id="owner-h">Owner controls</h2>
      {owners.length ? <><p className="small">{ownerAllowed ? 'Connected as the owner. Changes require a wallet transaction.' : 'Connect the owner wallet to use these'}</p>{!isConnected && <button className="link-button" onClick={() => document.getElementById('connect')?.click()}>Connect owner wallet</button>}
        {owner && <div className="owner-address"><span className="small muted">Owner on chain</span><AddressValue value={owner} label="owner address" explorer={explorer} /></div>}
        {ownerError && <p className="field-error" role="status">{ownerError} <button className="link-button" onClick={() => setRevision(v => v + 1)}>Retry owner</button></p>}{rows(owners)}</>
        : <p>{launch.request.includes('No owner functions') || launch.matchedBlocks.length && !launch.matchedBlocks.some(block => block.id === 'custom') && !launch.request.includes('<description>') ? 'No owner powers. This hook runs itself.' : 'Written owner functions are managed outside the store. Check the verified contract.'}</p>}
    </section>
    <section className="box management-panel" aria-labelledby="public-h"><h2 id="public-h">Traders, anyone, and readings</h2><p className="small muted">Readings refresh every <Text>20</Text> seconds. Public actions need a connected wallet.</p>
      {publicRows.length ? rows(publicRows) : <p>No public buttons or readings are defined by these blocks.</p>}
    </section>
    </div>
  </div>;
}
