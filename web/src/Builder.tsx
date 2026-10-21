import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import {
  BLOCKS, BY_ID, CATALOG, CHAIN_NAMES, DEFAULT_STACK, MAX_TEXT, TOKEN_IDS, activeBlocks, addBlock, available, behaviorBlocks, blockedReason,
  body, bodyBytes, cleanText, compose, context, has, moveBlock, powersOf, removeBlock, setParam, shortOf, validate,
  type BlockDef, type BlockEntry, type Draft, type Issue, type LaunchType, type Mode, type Param, type Settings,
} from '../../src/lib/compose';
import { assetUrl, type SiteConfig } from './config';
import { loadDraft, storeDraft } from './draft';

const TYPES: [LaunchType, string, string][] = [
  ['A', 'Hook + new token + pool', 'IMD launches your hook, a token and the trading pool together. The simplest path.'],
  ['B', 'Hook only', 'Just the hook contract, no token, no pool. Anyone can open a pool with it later.'],
  ['C', 'Hook for my existing token', 'Deploy the hook, then open a pool for a token that is already live.'],
];
const EXAMPLES = [
  'Every time someone buys, 2% of the ETH goes into a prize pot. Once an hour the pot goes to a random buyer from that hour, weighted by how much they bought.',
  'Take 1% of every sell and buy my token back with it, then burn what was bought. No fees on buys.',
  'For the first 10 minutes nobody can buy more than 0.5% of the supply, and each wallet must wait 30 seconds between swaps.',
  'Liquidity is locked for 30 days and anyone who adds and removes liquidity within 10 blocks forfeits their fees.',
];
const EXAMPLE_LABELS = ['Prize pot for buyers', 'Buy back and burn', 'Fair launch limits', 'Locked liquidity'];
const HEADS_UP = 'Heads up: this block is easy to work around or needs care.';
const UNTESTED = 'Not yet tested on Sepolia.';

/** SPEC 4.14: the spec repository's record first, then the bundled copy. */
async function loadVerified(url: string): Promise<Set<string>> {
  const read = async (from: string) => {
    const response = await fetch(from, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
    if (!response.ok) throw new Error('Unavailable');
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Not a list');
    return new Set(data.filter(e => e && typeof e === 'object' && (e as { passed?: unknown }).passed === true && typeof (e as { block?: unknown }).block === 'string').map(e => (e as { block: string }).block));
  };
  try { return await read(url); } catch { /* Fall back to the copy shipped with the site. */ }
  try { return await read(assetUrl('blocks-verified.json')); } catch { return new Set(); }
}

function WarnSign({ def, tested }: { def: BlockDef; tested: boolean }) {
  if (!def.risk) return null;
  const tip = `${HEADS_UP} ${def.risk}${tested ? '' : ` ${UNTESTED}`}`;
  return <span className="warn" tabIndex={0} role="img" aria-label={tip} data-tip={tip}>!</span>;
}
function BlockName({ def, tested, children }: { def: BlockDef; tested: boolean; children?: ReactNode }) {
  return <><span className="block-name" title={tested ? 'Tested on Sepolia' : UNTESTED}>{children ?? def.title}</span><WarnSign def={def} tested={tested} /></>;
}
function manageNote(def: BlockDef) {
  const lower = (list?: { label: string }[]) => (list ?? []).map(f => f.label.toLowerCase()).join(', ');
  const bits = [def.owner && `Owner buttons: ${lower(def.owner)}`, def.anyone && `Anyone can: ${lower(def.anyone)}`, def.user && `Users get: ${lower(def.user)}`, def.view && `Readings: ${lower(def.view)}`].filter(Boolean);
  return <p className="manage-note"><strong>Who uses it:</strong> {def.who}{bits.length > 0 && <> <strong>On the hook page:</strong> {bits.join('. ')}.</>}</p>;
}
function FieldError({ issues, field }: { issues: Issue[]; field: string }) {
  const mine = issues.filter(i => i.field === field);
  return mine.length ? <p className="field-error" id={`err-${field.replace(/[^\w-]/g, '-')}`}>{mine.map(i => i.message).join(' ')}</p> : null;
}
const errId = (issues: Issue[], field: string) => issues.some(i => i.field === field) ? `err-${field.replace(/[^\w-]/g, '-')}` : undefined;

function ParamField({ param, value, index, issues, onChange }: { param: Param; value: string | number; index: number; issues: Issue[]; onChange: (v: string | number) => void }) {
  const id = `p-${index}-${param.k}`, field = `block:${index}:${param.k}`, invalid = issues.some(i => i.field === field);
  const label = `${param.label}${param.unit ? ` (${param.unit})` : ''}`;
  const common = { id, 'aria-invalid': invalid || undefined, 'aria-describedby': errId(issues, field) };
  return <div className="param">
    <label htmlFor={id}>{label}</label>
    {param.type === 'select'
      ? <select {...common} value={String(value)} onChange={e => onChange(e.target.value)}>{param.options!.map(o => <option key={o} value={o}>{o}</option>)}</select>
      : param.type === 'textarea'
        ? <textarea {...common} value={String(value)} maxLength={param.maxLength} onChange={e => onChange(e.target.value)} />
        : <input {...common} type={param.type === 'number' ? 'number' : 'text'} inputMode={param.type === 'number' ? 'decimal' : undefined}
          className={param.type === 'number' || param.type === 'address' || param.type === 'datetime' ? 'mono-input' : undefined}
          min={param.min} max={param.max} step={param.step} spellCheck={false} placeholder={param.type === 'address' ? '0x…' : param.type === 'datetime' ? 'YYYY-MM-DD HH:MM' : undefined}
          value={String(value)} onChange={e => onChange(param.type === 'number' && e.target.value !== '' && Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value)} />}
    <FieldError issues={issues} field={field} />
  </div>;
}

export function Builder({ config }: { config: SiteConfig & { blocksVerifiedUrl?: string } }) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [storageError, setStorageError] = useState(false);
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<string[]>([]);
  const { address } = useAccount();
  useEffect(() => { setStorageError(!storeDraft(draft)); }, [draft]);
  useEffect(() => {
    let live = true;
    loadVerified(config.blocksVerifiedUrl ?? 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/blocks-verified.json').then(set => { if (live) setVerified(set); });
    return () => { live = false; };
  }, [config.blocksVerifiedUrl]);

  const ctx = context(draft), s = draft.settings;
  const text = useMemo(() => compose(draft, address), [draft, address]);
  const issues = useMemo(() => validate(draft, address), [draft, address]);
  const bytes = useMemo(() => bodyBytes(body(draft, address)), [draft, address]);
  const powers = powersOf(draft), rules = activeBlocks(draft), words = cleanText(draft.prompt);
  const tested = (id: string) => verified.has(id);
  const update = (next: Draft) => setDraft(next);
  const settings = (patch: Partial<Settings>) => update({ ...draft, settings: { ...draft.settings, ...patch } });
  const chooseMode = (mode: Mode) => {
    let next: Draft = { ...draft, mode };
    // The first visit to the stack starts from the reviewed default stack; it never overwrites blocks already chosen.
    if (mode === 'blocks' && !draft.seeded && behaviorBlocks(draft).length === 0) for (const id of DEFAULT_STACK) next = addBlock(next, id);
    update({ ...next, seeded: draft.seeded || mode === 'blocks' });
  };
  const add = (id: string) => update(addBlock(draft, id));
  const remove = (index: number) => {
    const gone = draft.blocks[index], dependants = draft.blocks.filter(b => BY_ID[b.id]?.requires === gone.id).map(b => BY_ID[b.id].title);
    setBlocked(dependants);
    update(removeBlock(draft, index));
  };
  const enabledChains: number[] = config.enabledDeployChains;
  const ruleIssues = issues.filter(i => i.field === 'rates' || i.field === 'rules' || /^block:\d+$/.test(i.field));
  const poolMissing = draft.type === 'A' && s.pool === null;

  const palette = <aside className="palette panel" aria-label="Block palette">
    <h2>Blocks</h2>
    {CATALOG.groups.map((g, gi) => {
      if (g.id === 'token' && draft.type !== 'A') return null;
      const items = BLOCKS.filter(b => b.group === g.id);
      return <details key={g.id} open={gi < 3 || items.some(b => has(draft, b.id) && !b.fixed) || undefined}>
        <summary><span>{g.title}</span><span className="count num" aria-label={`${items.filter(b => has(draft, b.id)).length} of ${items.length} added`}>{items.filter(b => has(draft, b.id)).length}/{items.length}</span></summary>
        <div>{items.map(def => {
          const why = blockedReason(draft, def);
          return <div className={`pal-item${why && why !== 'ADDED' && why !== 'ALWAYS' ? ' off' : ''}`} key={def.id} data-block={def.id}>
            <div className="pal-text"><strong><BlockName def={def} tested={tested(def.id)} /></strong><span className="b">{def.blurb}</span></div>
            {why ? <span className="pill state">{why}</span> : <button className="btn tiny" type="button" onClick={() => add(def.id)} aria-label={`Add ${def.title}`}>Add</button>}
          </div>;
        })}</div>
      </details>;
    })}
  </aside>;

  const tokenCard = (() => {
    if (draft.type !== 'A') return null;
    const index = draft.blocks.findIndex(b => TOKEN_IDS.includes(b.id)), t = draft.blocks[index];
    if (!t) return null;
    const def = BY_ID[t.id];
    return <div className="blk token" data-block={t.id}>
      <div className="blk-head"><h3>Token{tested(t.id) && <span className="tested">✓ tested on Sepolia</span>}</h3>
        <div className="order">{t.id === 'own-token'
          ? <button className="btn tiny" type="button" onClick={() => add('token')}>Use standard token</button>
          : <button className="btn tiny" type="button" onClick={() => add('own-token')}>Bring my own</button>}</div></div>
      <p className="sentence">{shortOf(t, ctx)}</p>
      <div className="params">{def.params.map(x => <ParamField key={x.k} param={x} index={index} value={t.p[x.k]} issues={issues} onChange={v => update(setParam(draft, index, x.k, v))} />)}</div>
    </div>;
  })();

  let n = 0;
  const stack = <div id="stack">
    {tokenCard}
    {behaviorBlocks(draft).length === 0 && <div className="empty">No blocks yet. Add some from the palette, or describe your hook in words.</div>}
    {draft.blocks.map((b, index) => {
      if (TOKEN_IDS.includes(b.id)) return null;
      const def = BY_ID[b.id], off = !available(def, draft.type);
      if (!off) n++;
      return <div className={`blk${off ? ' off' : ''}`} key={b.id} data-block={b.id}>
        <div className="blk-head">
          <h3>{!off && <span className="num">{n}.</span>} <BlockName def={def} tested={tested(def.id)} />{tested(def.id) && <span className="tested">✓ tested on Sepolia</span>}{off && <span className="pill state">Not for this launch type</span>}</h3>
          <div className="order">
            <button className="btn tiny" type="button" onClick={() => update(moveBlock(draft, index, -1))} aria-label={`Move ${def.title} up`}>▲</button>
            <button className="btn tiny" type="button" onClick={() => update(moveBlock(draft, index, 1))} aria-label={`Move ${def.title} down`}>▼</button>
            <button className="btn tiny" type="button" onClick={() => remove(index)} aria-label={`Remove ${def.title}`}>Remove</button>
          </div>
        </div>
        <p className="sentence">{shortOf(b, ctx)}</p>
        {def.params.length > 0 && <div className="params">{def.params.map(x => <ParamField key={x.k} param={x} index={index} value={b.p[x.k]} issues={off ? [] : issues} onChange={v => update(setParam(draft, index, x.k, v))} />)}</div>}
        {manageNote(def)}
        {!off && <FieldError issues={issues} field={`block:${index}`} />}
      </div>;
    })}
  </div>;

  const added = <div className="added" aria-label="Blocks added from the palette">
    {behaviorBlocks(draft).length ? behaviorBlocks(draft).map(b => {
      const def = BY_ID[b.id], off = !available(def, draft.type);
      return <span className={`chip${off ? ' off' : ''}`} key={b.id} data-block={b.id}>{shortOf(b, ctx)}{off && ' (not for this launch type)'}<button type="button" onClick={() => remove(draft.blocks.indexOf(b))} aria-label={`Remove ${def.title}`}>✕</button></span>;
    }) : <span className="muted">No blocks added. Use the palette to add one.</span>}
  </div>;

  const describe = <div className="box editor">
    <label htmlFor="p-text">What should it do? (max <span className="num">3,000</span> characters)</label>
    <textarea id="p-text" maxLength={3000} value={draft.prompt} onChange={e => update({ ...draft, prompt: e.target.value })} aria-describedby="p-count"
      placeholder="Every time someone buys, 2% of the ETH goes into a prize pot. Once an hour the pot goes to a random buyer from that hour, weighted by how much they bought. No team wallet, no pause button." />
    <p className="small muted count-line" id="p-count"><span className="num">{draft.prompt.length.toLocaleString('en-US')}</span> / <span className="num">3,000</span></p>
    <p className="small muted">Try a starting point:</p>
    <div className="chips">{EXAMPLES.map((example, i) => <button className="chip" type="button" key={i} onClick={() => update({ ...draft, prompt: example })}>{EXAMPLE_LABELS[i]}</button>)}</div>
    <h3 className="added-h">Blocks added from the palette</h3>
    <p className="small muted rule-line">Blocks become numbered rules under your words; if your words and a rule disagree, the rule wins.</p>
    {added}
  </div>;

  const setting = (field: keyof Settings, label: ReactNode, input: ReactNode) => <div><label htmlFor={`s-${field}`}>{label}</label>{input}<FieldError issues={issues} field={`settings.${field}`} /></div>;
  const textInput = (field: 'rem' | 'owner' | 'token' | 'tsym' | 'hname' | 'repo' | 'commit', placeholder: string, mono = false) =>
    <input id={`s-${field}`} className={mono ? 'mono-input' : undefined} value={s[field]} placeholder={placeholder} spellCheck={false}
      aria-invalid={issues.some(i => i.field === `settings.${field}`) || undefined} aria-describedby={errId(issues, `settings.${field}`)} onChange={e => settings({ [field]: e.target.value })} />;

  const settingsPanel = <section aria-labelledby="settings-h">
    <h2 id="settings-h">3. Settings</h2>
    <div className="box settings">
      {draft.type === 'C' && <div className="field-row">
        {setting('token', 'Existing token address', textInput('token', '0x…', true))}
        {setting('tsym', 'Its symbol (optional)', textInput('tsym', 'e.g. UNI'))}
      </div>}
      {draft.type !== 'A' && <div className="field-row">{setting('hname', 'Hook name', textInput('hname', 'e.g. PondGuardHook'))}<div /></div>}
      <div className="field-row">
        {setting('chain', 'Deploy on', <select id="s-chain" value={s.chain} onChange={e => settings({ chain: Number(e.target.value) })}>
          {[11155111, 4663, 1].map(id => <option key={id} value={id} disabled={!enabledChains.includes(id)}>{CHAIN_NAMES[id]}{id === 11155111 ? ' (test phase)' : enabledChains.includes(id) ? '' : ' (phase 2)'}</option>)}
        </select>)}
        {draft.type === 'A' && setting('pair', 'Pair with', <select id="s-pair" value={s.pair} onChange={e => settings({ pair: e.target.value as 'eth' | 'imd' })}>
          <option value="eth">ETH</option><option value="imd" disabled>IMD (Robinhood and Ethereum only)</option>
        </select>)}
      </div>
      {draft.type === 'A' && <div className="field-row">
        <div>
          <label htmlFor="s-pool">Pool share of your <span className="num">90%</span> (%) · your choice</label>
          <input id="s-pool" type="number" className="mono-input" min={10} max={90} step={5} placeholder="10 to 90" inputMode="numeric"
            value={s.pool ?? ''} aria-invalid={(s.pool !== null && issues.some(i => i.field === 'settings.pool')) || undefined} aria-describedby="pool-help"
            onChange={e => settings({ pool: e.target.value === '' ? null : Number(e.target.value) })} />
          <p className="small muted" id="pool-help">How much of your share seeds the trading pool. The rest goes to your remainder address. Nothing is chosen for you.</p>
          {s.pool !== null && <FieldError issues={issues} field="settings.pool" />}
        </div>
        {setting('rem', 'Remainder goes to', textInput('rem', 'your connected wallet', true))}
      </div>}
      {setting('owner', 'Owner address (used only if a block adds an owner power)', textInput('owner', 'your connected wallet', true))}
      <details className="advanced" open={!!(s.repo || s.commit) || undefined}>
        <summary>Advanced: start from my own code</summary>
        <div><p className="small">Point the swarm at a public GitHub repository with your hook. It is audited as imported code, adapted to the launch, and reviewed before deploying.</p>
          <div className="field-row">{setting('repo', 'Repository URL', textInput('repo', 'https://github.com/you/your-hook'))}{setting('commit', 'Commit', textInput('commit', '40-character commit id', true))}</div></div>
      </details>
    </div>
  </section>;

  const typeLabel = draft.type === 'A' ? 'Hook + new token + pool' : draft.type === 'B' ? 'Hook only, no token' : `Hook for existing token ${s.token ? s.token.slice(0, 10) + '…' : '(address missing)'}`;
  const preview = <aside className="preview panel" aria-label="Preview">
    <h2>Your hook, in short</h2>
    <ul className="sum">
      <li><b>Type</b><span>{typeLabel}</span></li>
      {draft.type === 'A' ? <li><b>Token</b><span>{ctx.name} (${ctx.symbol}){has(draft, 'own-token') ? ', your own' : ', standard'}</span></li> : <li><b>Hook</b><span>{ctx.name}</span></li>}
      <li><b>Chain</b><span>{CHAIN_NAMES[s.chain]}{draft.type === 'A' ? `, paired with ${s.pair.toUpperCase()}` : ''}</span></li>
      <li><b>Words</b><span className="muted">{words ? `“${words.slice(0, 110)}${words.length > 110 ? '…' : ''}”` : 'none'}</span></li>
      <li><b>Rules</b>{rules.length ? <ol>{rules.map(b => <li key={b.id} data-block={b.id}>{shortOf(b, ctx)}<WarnSign def={BY_ID[b.id]} tested={tested(b.id)} /></li>)}</ol> : <span className="muted">none</span>}</li>
      <li><b>Owner</b><span>{powers.length ? `${s.owner.trim() || address || 'the paying wallet'} may ${powers.join(', ')}` : 'no owner powers'}</span></li>
      {draft.type === 'A' && <li><b>Pool</b><span>{poolMissing ? <span className="pending">Not chosen yet: set the pool share in settings.</span> : <><span className="num">{s.pool}%</span> of your share, rest to {s.rem.trim() || address || 'the paying wallet'}</>}</span></li>}
    </ul>
    <details className="exact"><summary>Exact text the swarm receives</summary><div><pre id="composed">{text}</pre></div></details>
    <div className="cost">
      <div><span>Swarm fee</span><strong>0.5 IMD</strong></div>
      <div><span>Gas</span><strong>2 tx</strong></div>
      <div><span>Length</span><strong className={text.length > MAX_TEXT ? 'over' : undefined}>{text.length.toLocaleString('en-US')} / 7,500</strong></div>
      <div><span>Request body</span><strong>{(bytes / 1024).toFixed(1)} / 16 KiB</strong></div>
    </div>
    <div className="actions">
      <button className="btn" type="button" disabled aria-describedby="check-note">Check with the swarm (free)</button>
      <button className="btn primary" type="button" disabled={issues.length > 0} aria-describedby={issues.length ? 'continue-note' : undefined}
        onClick={() => { if (!issues.length) location.hash = '#launch'; }}>Continue to launch</button>
    </div>
    <p className="small muted" id="check-note">The free check needs the relay, which is not set up yet.</p>
    {issues.length > 0 && <div className="small continue-note" id="continue-note" role="status"><strong>Before you continue:</strong><ul>{[...new Set(issues.map(i => i.message))].slice(0, 6).map(m => <li key={m}>{m}</li>)}</ul></div>}
  </aside>;

  return <section className="wrap page builder-page" aria-labelledby="builder-h">
    <div className="block-head"><h1 id="builder-h">Builder</h1><span className="small muted">Drafts save in this browser. Nothing is sent until you launch.</span></div>
    {storageError && <div className="notice" role="alert">This browser is not saving your draft. Allow site storage to keep it after a reload.</div>}
    <div className="builder">
      {palette}
      <div className="canvas">
        <section aria-labelledby="type-h">
          <h2 id="type-h">1. What are you launching?</h2>
          <div className="types">{TYPES.map(([type, title, line]) => <button key={type} type="button" className={`type${draft.type === type ? ' on' : ''}`} aria-pressed={draft.type === type} onClick={() => update({ ...draft, type })} data-type={type}>
            <strong><span className="type-letter">{type}:</span> {title}</strong><span>{line}</span></button>)}</div>
        </section>
        <section aria-labelledby="mode-h">
          <div className="block-head"><h2 id="mode-h">2. How do you want to build it?</h2>
            <div className="seg" role="group" aria-label="Builder mode">
              <button type="button" className={draft.mode === 'prompt' ? 'on' : undefined} aria-pressed={draft.mode === 'prompt'} onClick={() => chooseMode('prompt')}>Describe it</button>
              <button type="button" className={draft.mode === 'blocks' ? 'on' : undefined} aria-pressed={draft.mode === 'blocks'} onClick={() => chooseMode('blocks')}>Stack blocks</button>
            </div></div>
          {draft.mode === null && <div className="chooser">
            <button className="choice" type="button" onClick={() => chooseMode('prompt')}><h3>Describe it in words</h3><p>Write what your hook should do, the way you would explain it to a friend. The swarm reads it as requirements.</p></button>
            <button className="choice" type="button" onClick={() => chooseMode('blocks')}><h3>Stack blocks</h3><p>Pick reviewed building blocks and set the numbers. The site writes the request for you.</p></button>
          </div>}
          {draft.mode === 'prompt' && <>{tokenCard}{describe}</>}
          {draft.mode === 'blocks' && stack}
          {blocked.length > 0 && <p className="small muted" role="status">Also removed, because they need Swap fee: {blocked.join(', ')}.</p>}
          {ruleIssues.length > 0 && draft.mode !== null && <div className="notice bad" role="alert" id="rule-notice">{[...new Set(ruleIssues.map(i => i.message))].map(m => <p key={m}>{m}</p>)}</div>}
        </section>
        {draft.mode !== null && settingsPanel}
      </div>
      {preview}
    </div>
  </section>;
}
