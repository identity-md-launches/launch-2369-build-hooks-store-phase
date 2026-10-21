import { useEffect, useRef, useState, type FormEvent } from 'react';
import { pondScene } from '../../src/scene/pond';
import { cast, subscribeToCasts } from '../../src/scene/cast';
import { saveDraft } from './draft';
import type { SiteConfig } from './config';
import { CHAINS, type Launch } from './types';
import { matchesLaunch, parseLaunches, relativeTime, relayFetch, type RelayLaunch } from './relay';

type Metrics = { agents: number; launches: number; jobs: number };
export function Landing({ config, launches = [] }: { config: SiteConfig; launches?: Launch[] }) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const pond = useRef<ReturnType<typeof pondScene> | null>(null);
  const [still, setStill] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ticker, setTicker] = useState('Quiet on the pond. Waiting for the next launch.');
  const input = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState(''), [error, setError] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [relayRows, setRelayRows] = useState<RelayLaunch[]>([]);
  const [now, setNow] = useState(Date.now);
  const knownLaunches = useRef(launches); knownLaunches.current = launches;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!config.relayUrl) return;
    const controller = new AbortController(), seen = new Set<string>(); let baseline = false, busy = false;
    const poll = async () => {
      if (busy) return; busy = true;
      try {
        const rows = parseLaunches(await relayFetch(config.relayUrl!, '/launches?limit=100', undefined, controller.signal));
        if (controller.signal.aborted) return;
        for (const row of rows.filter(r => r.status === 'live')) {
          if (baseline && !seen.has(row.id) && knownLaunches.current.some(l => matchesLaunch(row, l))) {
            const message = `${row.name} was launched on ${CHAINS[row.chainId]} · ${relativeTime(row.updatedAt)}`;
            cast(message);
          }
          seen.add(row.id);
        }
        baseline = true; setRelayRows(rows);
      } catch { /* Keep the truthful chain ticker when optional names are unavailable. */ }
      finally { busy = false; }
    };
    void poll(); const timer = setInterval(() => void poll(), 20000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [config.relayUrl]);
  useEffect(() => {
    const row = relayRows.filter(r => r.status === 'live' && launches.some(l => matchesLaunch(r, l))).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
    if (row) {
      setTicker(`${row.name} was launched on ${CHAINS[row.chainId]} · ${relativeTime(row.updatedAt, now)}`);
    }
  }, [relayRows, launches, now]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(config.swarmUrl, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) })
      .then(r => { if (!r.ok) throw new Error('Unavailable'); return r.json(); })
      .then(data => {
        const values = { agents: data.health?.agentsOnline, launches: data.counts?.launchesLive, jobs: data.health?.jobsDoneLastDay };
        if (data.health?.reachable === false || !Object.values(values).every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Incomplete metrics');
        setMetrics(values);
      }).catch(() => { if (!controller.signal.aborted) setMetrics(null); });
    return () => controller.abort();
  }, [config.swarmUrl]);
  useEffect(() => {
    if (!host.current || !canvas.current) return;
    let nextSample = 3;
    const scene = pondScene(host.current, canvas.current, elapsed => {
      if (!config.relayUrl && elapsed >= nextSample) { nextSample = elapsed + 18; cast('Practice cast · waiting for the next store launch.'); }
    });
    pond.current = scene;
    scene.onMotionChange(setStill);
    const unsubscribe = subscribeToCasts(message => {
      if (message) setTicker(message);
      scene.cast();
    });
    // Diagnostics are read-only; cast() remains the public integration API.
    const element = host.current as HTMLDivElement & { pondSnapshot?: typeof scene.snapshot };
    element.pondSnapshot = scene.snapshot;
    return () => { unsubscribe(); scene.destroy(); delete element.pondSnapshot; pond.current = null; };
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) { setError('Describe what your hook should do.'); input.current?.focus(); return; }
    try { saveDraft({ prompt, mode: 'prompt' }); location.hash = '#builder'; }
    catch { setError('Your browser could not save this description. Allow site storage and try again.'); }
  };
  return <div className="landing" id="landing" ref={host}>
    <canvas className="pond" ref={canvas} aria-hidden="true" />
    <button className="water-trigger" type="button" aria-label="Cast a line on the pond" onClick={event => {
      if (pond.current?.reduced()) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      pond.current?.splashAt(event.detail === 0 ? bounds.width * .25 : event.clientX - bounds.left);
      cast('A cast on the pond · just for practice.');
    }} />
    <div className="landing-copy">
      <p className="eyebrow">Uniswap v4 hooks · built by the IMD swarm</p>
      <h1>Stack blocks.<br />Cast a hook.</h1>
      <p className="lede">Describe the hook you want, or stack reviewed blocks. The swarm writes it, tests it, audits it and launches it. You pay <span className="num">0.5 IMD</span> and gas.</p>
      <form className="prompt" onSubmit={submit}>
        <label className="sr" htmlFor="landing-q">Describe your hook</label>
        <input ref={input} id="landing-q" name="prompt" maxLength={3000} value={prompt} onChange={e => { setPrompt(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'draft-error' : undefined} placeholder="What should your hook do? e.g. 1% of every buy goes to a prize pot" />
        <button className="btn primary" type="submit">Describe it</button>
      </form>
      {error && <p className="form-error" id="draft-error" role="alert">{error}</p>}
      <p className="alt">or <a href="#builder" onClick={event => {
        try { saveDraft({ mode: 'blocks' }); } catch { event.preventDefault(); setError('Your browser could not save the draft. Allow site storage and try again.'); }
      }}>open the block builder</a> · <a href="#catalog">browse hooks</a></p>
      {metrics && <dl className="stats" aria-label="Live IMD network numbers">
        <div><dt>Agents online</dt><dd>{metrics.agents.toLocaleString('en-US')}</dd></div>
        <div><dt>Launches live</dt><dd>{metrics.launches.toLocaleString('en-US')}</dd></div>
        <div><dt>Jobs done · <span className="num">24h</span></dt><dd>{metrics.jobs.toLocaleString('en-US')}</dd></div>
      </dl>}
    </div>
    <div className="ticker"><div className="ticker-box">
      <span role="status" title={ticker}>{ticker}</span>
      <button type="button" onClick={() => still ? pond.current?.animateAnyway() : pond.current?.pause()}>{still ? '▶ animate the pond' : 'Pause pond'}</button>
    </div></div>
  </div>;
}
