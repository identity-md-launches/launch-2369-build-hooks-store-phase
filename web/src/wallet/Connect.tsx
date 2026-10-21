import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { getAddress } from 'viem';
import { assetUrl, type SiteConfig } from '../config';
import { OPEN_IN } from './open-in';

function WalletIcon({ icon }: { icon?: string }) {
  return icon ? <img className="wallet-icon" width="28" height="28" src={icon} alt="" /> : <svg className="wallet-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 7h20v17H3V7Zm2 0V4h18v3M18 13h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" /><path d="M21 16h1v1h-1z" fill="currentColor" /></svg>;
}
export function Connect({ config }: { config: SiteConfig }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, mutate: connect, isPending, variables, error, reset } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: switchChain, isPending: switching, error: switchError, reset: resetSwitch } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const named = connectors.some(c => c.type === 'injected' && c.id !== 'injected');
  const hasBrowserWallet = named || !!(window as Window & { ethereum?: unknown }).ethereum;
  const needsSwitch = isConnected && !config.chains.some(chain => chain.id === chainId);
  const shortened = address ? `${getAddress(address).slice(0, 7)}…${getAddress(address).slice(-4)}` : '';
  const listed = [...connectors.filter(c => c.type === 'injected'), ...connectors.filter(c => c.type !== 'injected')].filter(c => !(c.id === 'injected' && named) && !(mobile && !hasBrowserWallet && c.type === 'injected'));
  const label = (c: Connector) => c.id === 'injected' ? 'Browser wallet' : c.id === 'coinbaseWalletSDK' ? (mobile ? 'Coinbase Smart Wallet' : 'Coinbase Wallet') : c.name;
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else { dialog.current?.close(); }
  }, [open]);
  useEffect(() => { if (isConnected) setOpen(false); }, [isConnected]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <>
    <button ref={trigger} id="connect" type="button" className={`btn connect ${isConnected && !needsSwitch ? 'address' : ''}`} title={isConnected ? `Disconnect ${address}` : 'Connect a wallet'} disabled={switching} onClick={() => {
      if (needsSwitch) { resetSwitch(); switchChain({ chainId: config.enabledDeployChains[0] }); }
      else if (isConnected) disconnect();
      else { reset(); setOpen(true); }
    }}>{switching ? 'Switching…' : needsSwitch ? 'Switch to Sepolia' : shortened || 'Connect'}</button>
    {switchError && <div className="wallet-switch-error notice" role="alert">Could not switch networks. Try again in your wallet.<button className="link-button" onClick={() => resetSwitch()}>Dismiss</button></div>}
    <dialog ref={dialog} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} className="wallet-sheet" aria-labelledby="wallet-title" onCancel={close} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
      <div className="sheet-head"><h2 id="wallet-title">Connect a wallet</h2><button className="close-button" type="button" aria-label="Close wallet picker" onClick={close}>×</button></div>
      <p>Choose a wallet to connect. Browsing is open to everyone.</p>
      {mobile && !hasBrowserWallet && OPEN_IN.map(wallet => <a className="wallet-row" key={wallet.name} href={wallet.href(location.href)}><WalletIcon icon={assetUrl(`wallets/${wallet.icon}.svg`)} /><span>Open in {wallet.name}</span></a>)}
      {listed.map(connector => <button className="wallet-row" key={connector.uid} disabled={isPending} onClick={() => connect({ connector })}>
        <WalletIcon icon={connector.icon ?? (connector.id === 'coinbaseWalletSDK' ? assetUrl('wallets/coinbaseWallet.svg') : undefined)} />
        <span>{label(connector)}{isPending && variables?.connector === connector ? ' · opening…' : ''}</span>
      </button>)}
      <p role="status" className="wallet-message">{error ? /reject|denied|cancel/i.test(error.message) ? 'Connection cancelled. Choose a wallet to try again.' : 'Could not connect. Open your wallet and try again.' : ''}</p>
    </dialog>
  </>;
}
