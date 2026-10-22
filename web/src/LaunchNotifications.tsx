import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { pendingRequests } from './MyHooks';
import { submittedDraft } from './draft';
import { hookHref, type Launch } from './types';

const CHOICE = 'hooks-store:notification-choice:v1', WATCH = 'hooks-store:notification-watch:v1';
let choice = false;
const watching = new Map<string, string>();
function hasChoice() { try { return choice || !!localStorage.getItem(CHOICE); } catch { return choice; } }
function rememberChoice() { choice = true; try { localStorage.setItem(CHOICE, 'asked'); } catch { /* This document remembers. */ } }
function saveWatch() { try { localStorage.setItem(WATCH, JSON.stringify([...watching])); } catch { /* This document remembers. */ } }
function watch(launch: Launch) { watching.set(launch.id, hookHref(launch)); saveWatch(); }

export function LaunchNotifications({ launch }: { launch: Launch }) {
  const { address } = useAccount();
  const own = address?.toLowerCase() === launch.payer.toLowerCase() || !!submittedDraft(launch.intakeChainId, launch.requestId, launch.request) || pendingRequests().some(p => p.chainId === launch.intakeChainId && p.requestId.toLowerCase() === launch.requestId.toLowerCase());
  const supported = typeof Notification !== 'undefined' && window.isSecureContext;
  const [asked, setAsked] = useState(hasChoice), [note, setNote] = useState('');
  useEffect(() => {
    if (own && supported && Notification.permission === 'granted' && launch.status !== 'live' && launch.status !== 'failed') watch(launch);
  }, [own, supported, launch.id, launch.status]);
  if (!own || !supported || asked || Notification.permission !== 'default' || launch.status === 'live' || launch.status === 'failed') return note ? <p role="status">{note}</p> : null;
  return <div className="notice notification-prompt"><p>Let this browser notify you when your launch goes live? Keep the site open to receive it.</p><div className="actions">
    <button className="btn" onClick={async () => {
      rememberChoice(); setAsked(true);
      try { const permission = await Notification.requestPermission(); if (permission === 'granted') { watch(launch); setNote('Notifications enabled. Keep the site open while the swarm works.'); } }
      catch { setNote('Browser notifications are unavailable. You can return using this page’s link.'); }
    }}>Enable notification</button>
    <button className="btn" onClick={() => { rememberChoice(); setAsked(true); }}>Dismiss</button>
  </div></div>;
}

/** Runs throughout hash navigation. No service worker or closed-tab delivery is promised. */
export function LaunchNotificationDelivery({ launches }: { launches: Launch[] }) {
  const { address } = useAccount();
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCH) ?? '[]');
      if (Array.isArray(saved)) for (const pair of saved) if (Array.isArray(pair) && typeof pair[0] === 'string' && /^#hook\/(1|4663)\/0x[\da-f]{64}$/i.test(pair[1])) watching.set(pair[0], pair[1]);
    } catch { /* A fresh tab can still opt in. */ }
  }, []);
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    for (const launch of launches) if (watching.has(launch.id) && (launch.payer.toLowerCase() === address?.toLowerCase() || !!submittedDraft(launch.intakeChainId, launch.requestId, launch.request) || pendingRequests().some(p => p.chainId === launch.intakeChainId && p.requestId.toLowerCase() === launch.requestId.toLowerCase())) && ['live', 'failed'].includes(launch.status)) {
      const route = watching.get(launch.id)!; watching.delete(launch.id); saveWatch();
      if (launch.status === 'live') {
        try {
          const notification = new Notification(`${launch.name} is live`, { body: 'Your launch is confirmed. Open its hook page for addresses and controls.', tag: launch.id });
          notification.onclick = () => { window.focus(); location.hash = route; notification.close(); };
        } catch { /* Some mobile browsers require a service worker; the hook page still updates. */ }
      }
    }
  }, [launches, address]);
  return null;
}
