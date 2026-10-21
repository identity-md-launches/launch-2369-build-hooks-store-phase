import { useEffect, useState } from 'react';
import type { Launch } from './types';
import { intakeJob, jobStages, relayFetch, type JobStage } from './relay';
import { Text } from './Text';

export function RelayTimeline({ launch, relay }: { launch: Launch; relay: string | null }) {
  const [stages, setStages] = useState<JobStage[] | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const ids = launch.jobIds.join(','), transaction = launch.txHashes[0];
  useEffect(() => {
    setStages(null); setError('');
    if (!relay) return;
    const controller = new AbortController(); let busy = false, jobId = ids.split(',').find(Boolean);
    const poll = async () => {
      if (busy) return; busy = true;
      try {
        if (!jobId && transaction) jobId = intakeJob(await relayFetch(relay, `/intake/${launch.intakeChainId}/${encodeURIComponent(transaction)}`, undefined, controller.signal), launch.requestId) ?? undefined;
        if (!jobId && launch.launchId) {
          const detail = await relayFetch(relay, `/launches/${encodeURIComponent(launch.launchId)}`, undefined, controller.signal) as { jobs?: { id: string }[] };
          jobId = detail.jobs?.[0]?.id;
        }
        if (!jobId) { if (!controller.signal.aborted) setError('IMD has not reported a job for this request yet. Stage details refresh automatically.'); return; }
        if (!/^[\w-]+$/.test(jobId)) throw new Error('Invalid job id');
        const job = await relayFetch(relay, `/jobs/${encodeURIComponent(jobId)}`, undefined, controller.signal) as { id?: string };
        if (job.id !== jobId) throw new Error('Job id mismatch');
        const next = jobStages(job);
        if (!controller.signal.aborted) { setStages(next); setError(''); }
      } catch { if (!controller.signal.aborted) setError('Stage details are unavailable. Chain confirmations still appear below. Retry or wait for the next refresh.'); }
      finally { busy = false; }
    };
    void poll(); const timer = setInterval(() => void poll(), 20000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [relay, launch.id, launch.intakeChainId, launch.requestId, launch.launchId, ids, transaction, retry]);
  const final = launch.status === 'failed' ? 'Failed' : 'Live';
  const terminal = launch.status === 'failed' || launch.status === 'live';
  const items = [
    { title: 'Requested', state: 'complete', detail: 'Seen on chain' },
    ...(stages ?? ['Building', 'Audit panel', 'Deploying'].map(title => ({ title, state: 'pending', detail: relay ? 'Waiting for IMD stage details' : 'No separate chain event' }))),
    { title: final, state: terminal ? 'complete' : 'pending', detail: launch.status === 'live' ? 'Addresses delivered' : launch.status === 'failed' ? 'Intake reported failure' : 'Waiting for chain confirmation' },
  ];
  const current = terminal ? 4 : items.findIndex(i => i.state === 'active' || i.state === 'failed');
  return <>
    <ol className="timeline" aria-label="Launch timeline">{items.map((item, index) => <li key={item.title} className={item.state === 'complete' ? 'confirmed' : item.state === 'active' ? 'active' : item.state === 'failed' ? 'stage-failed' : ''} aria-current={index === current || current === -1 && index === 0 ? 'step' : undefined}>
      <span className="num">{index + 1}</span><strong>{item.title}</strong><small><Text>{item.detail}</Text>{item.state === 'active' && ' · In progress'}{item.state === 'failed' && ' · Needs attention'}</small>
    </li>)}</ol>
    {relay && <p className="small muted relay-stage-note" role="status">{error || 'Building, Audit panel and Deploying come from IMD. Live and Failed are confirmed by chain reads.'} {error && <button className="link-button" onClick={() => setRetry(v => v + 1)}>Retry stage details</button>}</p>}
  </>;
}
