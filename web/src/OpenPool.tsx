import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import { POOL_MANAGERS } from '../../src/lib/compose';
import type { Launch } from './types';
import type { ReadClient } from './chain/clients';
import { FEE_TIERS, poolCall, poolReadAbi } from './chain/pool';
import { AddressValue } from './AddressValue';
import { Text } from './Text';
export function OpenPool({ launch, client, explorer }: { launch: Launch; client: ReadClient; explorer: string }) {
  const [price, setPrice] = useState(''), [decimals, setDecimals] = useState<number | null>(null), [error, setError] = useState(''), [note, setNote] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true; setDecimals(null); setError('');
    const read = async () => {
      if (!launch.tokenAddress || !launch.hookAddress) throw new Error('The token or hook address is missing from this launch.');
      const [d, manager] = await Promise.all([
        client.readContract({ address: launch.tokenAddress as Address, abi: poolReadAbi, functionName: 'decimals' }),
        client.readContract({ address: launch.hookAddress as Address, abi: poolReadAbi, functionName: 'poolManager' }),
      ]);
      if (manager.toLowerCase() !== POOL_MANAGERS[launch.chainId]?.toLowerCase()) throw new Error('This hook reports a different PoolManager. Check its deployed source before opening a pool.');
      if (live) setDecimals(d);
    };
    void read().catch(e => { if (live) setError(e instanceof Error && /missing|different/.test(e.message) ? e.message : 'Could not verify the token decimals and PoolManager. Retry the reading.'); });
    return () => { live = false; };
  }, [launch.tokenAddress, launch.hookAddress, launch.chainId, client, revision]);
  let call: ReturnType<typeof poolCall> | undefined, priceError = '';
  if (price && decimals !== null) try { call = poolCall(launch.chainId, launch.tokenAddress!, launch.hookAddress!, launch.matchedBlocks, price, decimals); } catch (e) { priceError = (e as Error).message; }
  const tier = String(launch.matchedBlocks.find(b => b.id === 'pool-rules')?.p.tier ?? '0.3'), terms = FEE_TIERS[tier];
  return <section className="box pool-panel" aria-labelledby="pool-h"><h2 id="pool-h">Open the pool</h2><p>Your hook is live. This launch created no pool. Prepare the initialization call below, then send it from a v4 interface on {client.chain?.name}. Sending from this site opens in phase <Text>2b</Text>.</p>
    <dl className="kv"><div><dt>PoolManager</dt><dd><AddressValue label="pool manager" value={POOL_MANAGERS[launch.chainId]} explorer={explorer} /></dd></div>
      <div><dt>Currency <Text>0</Text></dt><dd>Native ETH <code>0x0000000000000000000000000000000000000000</code></dd></div>
      <div><dt>Currency <Text>1</Text></dt><dd><AddressValue label="pool token" value={launch.tokenAddress} explorer={explorer} />{decimals !== null && <span className="small"><Text>{`${decimals} decimals, read on chain`}</Text></span>}</dd></div>
      <div><dt>Hook</dt><dd><AddressValue label="pool hook" value={launch.hookAddress} explorer={explorer} /></dd></div>
      <div><dt>Fee tier</dt><dd><Text>{`${tier}%${terms ? ` (${terms.fee})` : ''}`}</Text></dd></div><div><dt>Tick spacing</dt><dd><Text>{String(terms?.tickSpacing ?? 'Unavailable')}</Text></dd></div>
    </dl><div className="pool-price"><label htmlFor="pool-price"><Text>Starting price · 1 token = x ETH</Text></label><input id="pool-price" className="mono-input" inputMode="decimal" autoComplete="off" placeholder="e.g. 0.001" value={price} maxLength={100} aria-invalid={!!priceError || undefined} aria-describedby="pool-price-help pool-price-error" onChange={e => { setPrice(e.target.value); setNote(''); }} /><p className="small muted" id="pool-price-help">Use the price of one whole token in ETH. Currencies are sorted by address; decimals are applied before conversion.</p><p className="field-error" id="pool-price-error" role="status">{priceError}</p></div>
    {error ? <p className="field-error" role="alert">{error} <button className="link-button" onClick={() => setRevision(v => v + 1)}>Retry pool reading</button></p> : decimals === null && <p role="status">Reading token decimals and PoolManager…</p>}
    {call && <><p>Computed <code>sqrtPriceX96</code>: <code data-testid="sqrt-price">{call.sqrtPriceX96}</code></p><details><summary>PoolManager.initialize call</summary><div><pre data-testid="pool-call">{JSON.stringify(call, null, 2)}</pre></div></details></>}
    <button className="btn primary" disabled={!call} onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(call, null, 2)); setNote('Initialization call copied. Send it from a v4 interface, then add liquidity there.'); } catch { setNote('Copy unavailable. Select the call in the disclosure above.'); } }}>Copy initialize call</button><p role="status" className="copy-status">{note}</p>
    <p className="small muted">Initializing sets the starting price; it does not add liquidity.</p>
  </section>;
}
