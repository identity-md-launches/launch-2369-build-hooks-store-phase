import { useState } from 'react';
import { getAddress, isAddress } from 'viem';
export function AddressValue({ value, label, explorer, kind = 'address' }: { value: string | null; label: string; explorer?: string; kind?: 'address' | 'tx' }) {
  const [message, setMessage] = useState('');
  if (!value) return <span className="muted">unknown until live</span>;
  const text = isAddress(value, { strict: false }) ? getAddress(value.toLowerCase()) : value;
  return <div className="address-value"><code>{explorer ? <a href={`${explorer}/${kind}/${text}`} target="_blank" rel="noreferrer">{text}</a> : text}</code><button className="btn tiny" aria-label={`Copy ${label}`} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setMessage('Copied'); } catch { setMessage('Select the value to copy it.'); }
  }}>Copy</button><span className="copy-status" role="status">{message}</span></div>;
}
