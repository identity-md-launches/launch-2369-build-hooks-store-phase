import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { formatUnits, keccak256, stringToHex, type Hex, type TransactionReceipt } from 'viem';
import { loadDraft, saveSubmittedDraft, clearCorrection } from './draft';
import { BY_ID, CHAIN_NAMES, activeBlocks, body, cleanText, compose, context, powersOf, sentenceOf, shortOf } from '../../src/lib/compose';
import { Text } from './Text';
import { WarnSign } from './Builder';
import { AddressValue } from './AddressValue';
import type { SiteConfig } from './config';
import type { LaunchStore } from './chain/store';
import type { RawLog } from './chain/decode';
import { launchBody, approveLaunch, requestLaunch, readLaunchPrice, requestedId, verifyApprovalReceipt, launchError, type LaunchContext } from './chain/launch';
import { PENDING_KEY, pendingRequests } from './MyHooks';
import { cast } from '../../src/scene/cast';
import { useOwnCode, useSwarmCheck } from './useSwarmCheck';
import { SwarmPanel } from './SwarmPanel';
import { SafetyNotice } from './SafetyNotice';
import { ProvenLine, useProvenSource } from './ProvenLaunches';
import { LAUNCH_WAIT } from '../../src/lib/proven';

type Step = { hash?: Hex; phase: 'idle' | 'wallet' | 'pending' | 'success' | 'failed'; error?: string; price?: bigint; replacement?: boolean };
const idle: Step = { phase: 'idle' };
const TYPES = { A: 'Hook + new token + pool', B: 'Hook only', C: 'Hook for my existing token' };
export function LaunchReview({ config, store }: { config: SiteConfig; store: LaunchStore }) {
  const [draft] = useState(loadDraft);
  const { address, chainId, isConnected } = useAccount(), { data: wallet } = useWalletClient();
  const ctx = context(draft, address);
  const ownCode = useOwnCode(draft, config.relayUrl);
  const automatic = useProvenSource(draft, config.relayUrl);
  const prepared = ownCode.prepared && (ownCode.needed ? ownCode.prepared : automatic.prepared);
  const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
  const [paymentChain, setPaymentChain] = useState(() => chainId && config.paymentChains.includes(chainId) ? chainId : config.paymentChains[0]);
  const [price, setPrice] = useState<bigint | null>(null), [priceError, setPriceError] = useState(''), [revision, setRevision] = useState(0);
  const [approval, setApproval] = useState<Step>(idle), [launch, setLaunch] = useState<Step>(idle), [copyNote, setCopyNote] = useState(''), [switchError, setSwitchError] = useState('');
  const flight = useRef(false);
  const client = store.clients[paymentChain], payment = config.chains.find(c => c.id === paymentChain)!;
  const preview = useMemo(() => { try {
    if (!prepared) throw new Error('Resolve your repository in the Builder before launching.');
    if (!automatic.ready) return { json: '', bytes: '0x' as Hex, error: 'Preparing request…' };
    return { ...launchBody(prepared, config, address), error: '' };
  } catch (e) { return { json: '', bytes: '0x' as Hex, error: launchError(e) }; } }, [prepared, automatic.ready, config, address]);
  const check = useSwarmCheck(config.relayUrl, prepared && automatic.ready ? JSON.stringify(body(prepared, address)) : null, address);
  const identity = `${address}:${paymentChain}:${preview.bytes}`;
  const attemptKey = `hooks-store:launch-tx:${keccak256(stringToHex(identity))}`;
  const [storageNote, setStorageNote] = useState('');
  const latestIdentity = useRef(identity); latestIdentity.current = identity;
  const busy = approval.phase === 'wallet' || approval.phase === 'pending' || launch.phase === 'wallet' || launch.phase === 'pending';
  const connected = isConnected && !!address && chainId === paymentChain;
  useEffect(() => {
    setApproval(idle); setLaunch(idle); setStorageNote('');
    try {
      const saved = JSON.parse(localStorage.getItem(attemptKey) ?? 'null');
      if (!saved) return;
      const restore = (value: { hash?: Hex; price?: string; phase?: string; replacement?: boolean; error?: string } | undefined): Step => value?.hash && /^0x[\da-f]{64}$/i.test(value.hash) && /^\d+$/.test(value.price ?? '')
        ? { hash: value.hash, price: BigInt(value.price!), phase: value.phase === 'failed' ? 'failed' : 'pending', replacement: value.replacement === true, error: value.phase === 'failed' ? value.error : 'A submitted transaction is saved. Check its confirmation to continue.' } : idle;
      setApproval(restore(saved.approval)); setLaunch(restore(saved.launch));
    } catch { /* A corrupt or unavailable cache never unlocks payments. */ }
  }, [attemptKey]);
  const saveStep = (key: string, kind: 'approve' | 'launch', step: Step) => {
    if (!step.hash) return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(key, JSON.stringify({ ...saved, [kind === 'approve' ? 'approval' : 'launch']: { ...step, price: step.price?.toString() } }));
    } catch { setStorageNote('Browser storage is unavailable. Keep this page open until confirmation and copy each transaction hash.'); }
  };
  useEffect(() => {
    let live = true; setPrice(null); setPriceError('');
    readLaunchPrice(client, config, paymentChain).then(value => { if (live) setPrice(value); }).catch(e => { if (live) setPriceError(launchError(e)); });
    return () => { live = false; };
  }, [client, config, paymentChain, revision]);
  const copy = async () => { try { await navigator.clipboard.writeText(preview.json); setCopyNote('Request copied.'); } catch { setCopyNote('Copy unavailable. Select the JSON in Exact request below.'); } };
  const finish = (receipt: TransactionReceipt, operation: LaunchContext, paid: bigint) => {
    const id = requestedId(receipt, operation, paid);
    clearCorrection();
    if (!saveSubmittedDraft(operation.chainId, id, prepared ?? draft, compose(prepared ?? draft, operation.account))) setStorageNote('The launch is confirmed, but this browser could not save its draft. The original request is still available on the Hook page.');
    const pending = { requestId: id, chainId: operation.chainId, payer: operation.account, txHash: receipt.transactionHash, createdAt: new Date().toISOString() };
    let saved = true;
    try { localStorage.setItem(PENDING_KEY, JSON.stringify([...pendingRequests().filter(p => p.requestId !== id || p.chainId !== operation.chainId), pending])); } catch { saved = false; }
    store.acceptReceipt(operation.chainId, receipt.logs.map(log => ({ ...log, blockNumber: String(log.blockNumber), logIndex: log.logIndex ?? undefined })) as RawLog[]);
    // The notice survives hash navigation, including when browser storage is unavailable.
    storeLaunchNotice({ ...pending, saved });
    cast(`${ctx.name} was requested on ${CHAIN_NAMES[draft.settings.chain!]}`);
    location.hash = `#hook/${operation.chainId}/${id}`;
  };
  const run = async (kind: 'approve' | 'launch') => {
    if (flight.current || !connected || !wallet || !address || preview.error || config.inProgress || check.gate) return;
    if (kind === 'launch' && (approval.phase !== 'success' || !approval.price)) return;
    flight.current = true;
    const operation: LaunchContext = { config, chainId: paymentChain, account: address, client, wallet, bytes: preview.bytes };
    const key = identity, savedKey = attemptKey, set = kind === 'approve' ? setApproval : setLaunch;
    let hash: Hex | undefined, paid = approval.price, terminalFailure = false;
    const update = (step: Step) => { saveStep(savedKey, kind, step); if (latestIdentity.current === key) set(step); };
    update({ phase: 'wallet' });
    try {
      if (kind === 'approve') { const sent = await approveLaunch(operation); hash = sent.hash; paid = sent.price; setPrice(sent.price); }
      else hash = await requestLaunch(operation, paid!);
      update({ phase: 'pending', hash, price: paid });
      let replacementReason: string | undefined;
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180000, onReplaced: replacement => {
        hash = replacement.transactionReceipt.transactionHash;
        replacementReason = replacement.reason;
        update({ phase: 'pending', hash, price: paid, replacement: replacement.reason === 'cancelled' || replacement.reason === 'replaced' });
      } });
      if (receipt.status !== 'success') { terminalFailure = true; throw new Error('The transaction reverted. You can retry this step.'); }
      if (replacementReason === 'cancelled' || replacementReason === 'replaced') {
        // A confirmed nonce cannot execute twice. First verify whether this
        // replacement created the exact request before allowing another payment.
        terminalFailure = true;
        if (kind === 'approve') throw new Error('The transaction was cancelled or replaced. You can retry this step.');
        try { requestedId(receipt, operation, paid!); }
        catch { throw new Error('The launch transaction was cancelled or replaced without this request. You can retry Launch; price and allowance will be checked again.'); }
      }
      if (kind === 'approve') {
        // A confirmed transaction without this approval cannot authorize the launch.
        terminalFailure = true;
        await verifyApprovalReceipt(receipt, operation, paid!);
      }
      update({ phase: 'success', hash: receipt.transactionHash, price: paid });
      if (kind === 'launch') { finish(receipt, operation, paid!); try { localStorage.removeItem(savedKey); } catch { /* The request id is already displayed. */ } }
    } catch (e) { update({ phase: hash && !terminalFailure ? 'pending' : 'failed', hash, price: paid, replacement: terminalFailure, error: launchError(e) }); }
    finally { flight.current = false; }
  };
  const checkReceipt = async (kind: 'approve' | 'launch') => {
    const step = kind === 'approve' ? approval : launch, set = kind === 'approve' ? setApproval : setLaunch;
    if (!step.hash || !address || !wallet || flight.current) return;
    flight.current = true;
    const key = identity, savedKey = attemptKey, operation = { config, chainId: paymentChain, account: address, client, wallet, bytes: preview.bytes };
    const update = (next: Step) => { saveStep(savedKey, kind, next); if (latestIdentity.current === key) set(next); };
    let confirmedApproval = false;
    try {
      const receipt = await client.getTransactionReceipt({ hash: step.hash });
      if (receipt.status !== 'success') { update({ ...step, phase: 'failed', error: 'The transaction reverted. You can retry this step.' }); return; }
      if (kind === 'approve') { confirmedApproval = true; await verifyApprovalReceipt(receipt, operation, step.price!); }
      update({ ...step, phase: 'success', error: undefined });
      if (kind === 'launch') { finish(receipt, operation, step.price!); try { localStorage.removeItem(savedKey); } catch { /* Already confirmed. */ } }
    } catch (e) { update({ ...step, phase: confirmedApproval || step.replacement ? 'failed' : step.phase, error: step.replacement ? 'The confirmed replacement did not create this request. You can retry Launch; price and allowance will be checked again.' : launchError(e) }); }
    finally { flight.current = false; }
  };
  const feedback = (step: Step, kind: 'approve' | 'launch') => <>
    <p role="status" className="step-feedback">{step.phase === 'wallet' ? 'Check your wallet and confirm the transaction.' : step.phase === 'pending' ? 'Waiting for a successful receipt…' : step.phase === 'success' ? 'Confirmed on chain.' : ''}</p>
    {step.hash && <AddressValue label={`${kind === 'approve' ? 'approval' : 'launch'} transaction`} value={step.hash} explorer={payment.explorerUrl} kind="tx" />}
    {step.error && <p className="field-error" role="alert">{step.error}</p>}
    {step.phase === 'pending' && step.error && <button className="btn tiny" onClick={() => void checkReceipt(kind)}>Check confirmation</button>}
  </>;
  const rows = [
    ['Type', TYPES[draft.type]], [draft.type === 'A' ? 'Token' : 'Hook', `${ctx.name}${draft.type === 'A' ? ` (${ctx.symbol})` : ''}`],
    ...(draft.type === 'C' ? [['Existing token', draft.settings.token]] : []), ['Deploy chain', CHAIN_NAMES[draft.settings.chain!] ?? 'Choose in the Builder'],
    ...(draft.type === 'A' ? [['Pairing', draft.settings.pair.toUpperCase()], ['Pool', draft.settings.pool === null ? 'Not chosen' : `${draft.settings.pool}% of total supply in the pool; 10% swarm; ${90 - draft.settings.pool}% remainder to ${draft.settings.rem || address || 'the paying wallet'}`]] : []),
    ['Owner', powersOf(draft).length || cleanText(draft.prompt) || activeBlocks(draft).some(block => block.id === 'custom') ? draft.settings.owner || address || 'The paying wallet' : 'No owner powers'],
    ['Words', cleanText(draft.prompt) || 'none'],
    ['Description length', `${compose(prepared ?? draft, address).length} / 7,500 characters`],
  ];
  const summaryOf = (block: ReturnType<typeof activeBlocks>[number]) => block.id === 'custom' ? sentenceOf(block, ctx)
    : activeBlocks(draft).some(rule => rule.id === 'fee-split') && ['swap-fee', 'fee-dir'].includes(block.id) ? shortOf(block, ctx).replace(/→ .+$/, '→ Split the fee distribution') : shortOf(block, ctx);
  return <section className="wrap page launch-review"><div className="detail-head"><div><h1>Review your launch</h1><p>Check the request, then pay the swarm to build it.</p></div><a className="btn" href="#builder">Edit in Builder</a></div>
    <ProvenLine entry={automatic.proven} />
    <p className="launch-wait">{LAUNCH_WAIT}</p>
    <div className="launch-columns"><section className="box"><h2>Your hook, in short</h2><table className="review-table"><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td><Text>{value}</Text></td></tr>)}<tr><th scope="row">Rules</th><td>{activeBlocks(draft).length ? <ol>{activeBlocks(draft).map((b, i) => <li key={b.id}><Text>{`${i + 1}. ${summaryOf(b)}`}</Text><WarnSign def={BY_ID[b.id]} tested={false} /></li>)}</ol> : 'No block rules; the description above applies.'}</td></tr></tbody></table>{activeBlocks(draft).length > 6 && <p className="notice">Every extra rule is more for the audit panel to refuse. The contract has a <Text>24 KB</Text> size limit.</p>}</section>
    <section className="box"><h2>What you pay</h2><table className="review-table fee-table"><tbody>
      <tr><th scope="row">Swarm + audit panel</th><td><Text>{`${price === null ? '0.5' : formatUnits(price, 18)} IMD once`}</Text>{price === null && <span className="small muted"> · maximum; {priceError ? 'live price unavailable' : 'checking live price'}</span>}</td></tr>
      <tr><th scope="row">Wallet gas</th><td><Text>2 transactions, paid in ETH</Text></td></tr>
      {draft.type === 'A' ? <><tr><th scope="row">Token supply</th><td><Text>{draft.settings.pool === null ? '10% swarm; choose the pool allocation in the Builder.' : `${draft.settings.pool}% pool / 10% swarm / ${90 - draft.settings.pool}% remainder`}</Text></td></tr><tr><th scope="row">Pool trading fee</th><td><Text>1.25% (1% to you, 0.25% network) plus the hook’s own fee</Text></td></tr></> : <tr><th scope="row">Token and pool</th><td>None created. The swarm builds and reviews the hook contract.</td></tr>}
      {draft.type === 'C' && <tr><th scope="row">Opening the pool</th><td>One more transaction from your wallet after the hook is live, prepared by the site.</td></tr>}
      <tr><th scope="row">Deployment</th><td>Paid by IMD</td></tr>
    </tbody></table><p className="small">A request the swarm has to stop on still spends the fee. These checks exist to make that rare.</p><p className="small muted">USD context is unavailable. Gas is estimated by your wallet.</p></section></div>
    <p className="notice"><strong>Payment happens on Robinhood Chain or Ethereum, in IMD.</strong> Your hook deploys on the chain you chose in the Builder, which can be the other one.</p>
    {draft.type === 'C' && <p>The site prepares the pool-opening call after your hook is live. Copy it into a v4 interface; sending it here opens in phase <Text>2b</Text>.</p>}
    {!config.relayUrl && <div className="notice"><strong>A refused request still spends the fee.</strong><p>The free check is unavailable without the relay. Read the exact request before paying.</p><button className="btn" disabled={!!preview.error} onClick={() => void copy()}>Copy request</button><span role="status" className="copy-status">{copyNote}</span></div>}
    <SafetyNotice findings={check.consistency} />
    {config.relayUrl && <section className="box launch-check"><h2>Check before paying</h2><p>A refused request still spends the fee. A request the swarm has to stop on also spends the fee. These checks exist to make that rare. A free check does not guarantee acceptance or replace the audit panel.</p><button className="btn" disabled={!!preview.error || check.busy || busy || check.consistency.length > 0} onClick={() => void check.run()}>{check.busy ? 'Checking with the swarm…' : 'Check with the swarm (free)'}</button><p role="status" className="small">{check.gate || (check.result ? 'The check matches the exact request below.' : 'You can check this request with IMD before paying.')}</p>{check.error && <p role="alert" className="field-error">{check.error}</p>}{check.result && <SwarmPanel result={check.result} conflicts={check.conflicts} objective={compose(prepared ?? draft, address)} />}</section>}
    <details className="box exact-launch"><summary>Exact request the swarm receives</summary><div><pre data-testid="launch-json">{preview.json || (!ownCode.ready ? 'Resolve your repository in the Builder to compose the request from its pinned source.' : compose(draft, address))}</pre></div></details>
    {preview.error && <p className="form-error" role="alert">{preview.error} <a href="#builder">Edit in Builder</a></p>}
    {config.inProgress && <p className="notice">Launches open when the site banner goes away. You can review and copy your request now.</p>}
    {storageNote && <p className="notice" role="status">{storageNote}</p>}
    <ol className="launch-steps">
      <li className="box"><h2><span className="num">1.</span> Connect</h2><label htmlFor="payment-chain">Pay from</label><select id="payment-chain" value={paymentChain} disabled={busy} onChange={e => { setPaymentChain(Number(e.target.value)); setSwitchError(''); }}>{config.chains.filter(c => config.paymentChains.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <p className="small">Deploy on {CHAIN_NAMES[draft.settings.chain!] ?? 'the chain chosen in the Builder'}. Pay on {payment.name}.</p>
        {!isConnected ? <button className="btn primary" onClick={() => document.getElementById('connect')?.click()}>Connect wallet</button> : !connected ? <button className="btn primary" disabled={switching || busy} onClick={async () => { setSwitchError(''); try { await switchChain({ chainId: paymentChain }); } catch (e) { setSwitchError(launchError(e)); } }}>{switching ? 'Switching…' : `Switch to ${payment.name}`}</button> : <p className="success-note">Connected on {payment.name}.</p>}
        {address && <AddressValue label="paying wallet" value={address} explorer={payment.explorerUrl} />}{switchError && <p className="field-error" role="alert">{switchError}</p>}<p className="small muted">Connecting needs no transaction or gas.</p>
      </li>
      <li className="box"><h2><span className="num">2.</span> Approve IMD</h2><p>Allow Intake to spend exactly the current launch price.</p>
        <button className="btn primary" disabled={!connected || busy || approval.phase === 'success' || price === null || !!preview.error || config.inProgress || !!check.gate} onClick={() => void run('approve')}>{approval.phase === 'wallet' || approval.phase === 'pending' ? 'Approving…' : approval.phase === 'success' ? 'Approved' : <Text>{`Approve ${price === null ? 'IMD' : `${formatUnits(price, 18)} IMD`}`}</Text>}</button>
        {!connected && <p className="small muted">Connect on your payment chain first.</p>}{priceError && <p className="field-error" role="alert">{priceError} <button className="link-button" onClick={() => setRevision(v => v + 1)}>Retry price</button></p>}
        {feedback(approval, 'approve')}
      </li>
      <li className="box"><h2><span className="num">3.</span> Launch</h2><p>Send this request and pay the swarm. The audit panel is included.</p><button className="btn primary" disabled={!connected || busy || approval.phase !== 'success' || launch.phase === 'success' || !!preview.error || config.inProgress || !!check.gate} onClick={() => void run('launch')}>{launch.phase === 'wallet' || launch.phase === 'pending' ? 'Launching…' : 'Launch hook'}</button>
        {approval.phase !== 'success' && <p className="small muted">Wait for the approval receipt before launching.</p>}{feedback(launch, 'launch')}
        {launch.phase === 'failed' && /price changed|approval is no longer/i.test(launch.error ?? '') && <button className="link-button" onClick={() => { setApproval(idle); setLaunch(idle); setRevision(v => v + 1); }}>Review price and approve again</button>}
      </li>
    </ol>
  </section>;
}
export type LaunchNotice = { requestId: Hex; chainId: number; payer: string; txHash: Hex; saved: boolean };
let launchNotice: LaunchNotice | undefined;
function storeLaunchNotice(notice: LaunchNotice) { launchNotice = notice; }
export function getLaunchNotice(chainId: number, requestId: string) { return launchNotice?.chainId === chainId && launchNotice.requestId.toLowerCase() === requestId.toLowerCase() ? launchNotice : undefined; }
