import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import {
  BLOCKS, BY_ID, CATALOG, CHAIN_NAMES, DEFAULT_STACK, MAX_TEXT, TOKEN_IDS, activeBlocks, addBlock, available, behaviorBlocks, blockedReason,
  body, bodyBytes, cleanText, compose, context, has, isAddress, moveBlock, pairCurrency, removeBlock, setParam, shortOf, validate,
  type BlockDef, type BlockEntry, type Draft, type Issue, type LaunchType, type Mode, type Param, type Settings,
} from '../../src/lib/compose';
import type { SafetyFinding } from '../../src/lib/safety';
import { assetUrl, type SiteConfig } from './config';
import { loadDraft, storeDraft, loadCorrection } from './draft';
import { useOwnCode, useSwarmCheck } from './useSwarmCheck';
import { SwarmPanel } from './SwarmPanel';
import { Text } from './Text';
import { ProvenLine, useProvenSource } from './ProvenLaunches';
import { LAUNCH_WAIT } from '../../src/lib/proven';

const TYPES: [LaunchType, string, string][] = [
  ['A', 'Hook + new token + pool', 'IMD launches your hook, a token and the trading pool together. The simplest path.'],
  ['B', 'Hook only', 'Just the hook contract, no token, no pool. Anyone can open a pool with it later.'],
  ['C', 'Hook for my existing token', 'Deploy the hook, then open a pool for a token that is already live.'],
];
const TYPE_PILL: Record<LaunchType, string> = { A: 'Hook + token + pool', B: 'Hook only', C: 'Hook for my token' };
const EXAMPLES = [
  'Observe swaps without changing them. No owner functions.',
  'Only the owner may pause and unpause swaps through pause(PoolId poolId) and unpause(PoolId poolId); paused(PoolId poolId) reports the current state. No other owner functions.',
  'Publish a time-weighted average price from this pool through twap(PoolId poolId, uint32 secondsAgo), without changing swaps. No owner functions.',
];
const EXAMPLE_LABELS = ['Observe swaps', 'Owner pause controls', 'Price reading'];
const HEADS_UP = 'Heads up: this block is easy to work around or needs care.';
const UNTESTED = 'not yet proven in a live launch';
const WRITTEN_WARNING = 'Written rules are riskier than blocks. If the builder has to stop and ask a question after you pay, the 0.5 IMD is spent. Blocks are checked sentences; words are yours.';
/** SPEC 3.2: one colour per category, used by the shelf swatches, the rule stripes and the card tiles. */
const SHELF: Record<string, string> = { token: 'Token', fees: 'Fees', protection: 'Protection', treasury: 'Treasury', liquidity: 'Liquidity', timing: 'Timing', advanced: 'Advanced', games: 'Games', custom: 'Custom' };
const swatch = (group: string) => ({ '--swatch': `var(--cat-${group})` }) as CSSProperties;
const FEE_IDS = ['swap-fee', 'fee-fade', 'fee-dir', 'fee-size', 'fee-vol', 'fee-split', 'jar', 'pot', 'lp-share', 'lp-fee'];
const STEPS = ['Type', 'How', 'Blocks', 'Settings', 'Check & launch'];

function WrittenRulesNotice() {
  return <div className="notice written-rules">
    <p>{WRITTEN_WARNING}</p>
    <ul><li>Name every address, currency, amount and time.</li><li>Say who may call what, or say there are no owner functions.</li><li>Name no outside pool, token or service unless with its address on the deploy chain.</li></ul>
    <p className="small">A numbered block rule wins over a Custom rule and your description.</p>
  </div>;
}

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

export function WarnSign({ def, tested }: { def: BlockDef; tested: boolean }) {
  if (!def.risk) return null;
  const tip = `${HEADS_UP} ${def.risk}${tested ? '' : ` ${UNTESTED}`}`;
  return <span className="warn" tabIndex={0} role="img" aria-label={tip} data-tip={tip}>!</span>;
}
function BlockName({ def, tested }: { def: BlockDef; tested: boolean }) {
  return <><span className="block-name" title={tested ? 'proven in a live launch' : UNTESTED}>{def.title}{!tested && <span className="sr">, {UNTESTED}</span>}</span><WarnSign def={def} tested={tested} /></>;
}
/** SPEC 3.2: the who-uses-it chip, derived from the block's who line of 4.12. */
function whoChip(def: BlockDef, entry?: BlockEntry): ['RUNS ITSELF' | 'OWNER' | 'ANYONE PRESSES', string] {
  if (/^You \(the owner\)/.test(def.who) || def.id === 'donate' && entry?.p.who === 'only allowlisted addresses') return ['OWNER', 'owner'];
  if (/\banyone\b/i.test(def.who)) return ['ANYONE PRESSES', 'anyone'];
  return ['RUNS ITSELF', 'self'];
}
function manageNote(def: BlockDef, entry?: BlockEntry) {
  const lower = (list?: { label: string }[]) => (list ?? []).map(f => f.label.toLowerCase()).join(', ');
  const owner = def.id === 'donate' && entry?.p.who !== 'only allowlisted addresses' ? undefined : def.owner;
  const bits = [owner && `Owner buttons: ${lower(owner)}`, def.anyone && `Anyone can: ${lower(def.anyone)}`, def.user && `Users get: ${lower(def.user)}`, def.view && `Readings: ${lower(def.view)}`].filter(Boolean);
  return <p className="manage-note"><strong>Who uses it:</strong> {def.who}{bits.length > 0 && <> <strong>On the hook page:</strong> {bits.join('. ')}.</>}</p>;
}
const domId = (field: string) => `err-${field.replace(/[^\w-]/g, '-')}`;
function FieldError({ issues, field }: { issues: Issue[]; field: string }) {
  const mine = issues.filter(i => i.field === field);
  return mine.length ? <p className="field-error" id={domId(field)}>{mine.map(i => i.message).join(' ')}</p> : null;
}
const errId = (issues: Issue[], field: string) => issues.some(i => i.field === field) ? domId(field) : undefined;

function ParamField({ param, value, index, issues, onChange, disabled = false }: { param: Param; value: string | number; index: number; issues: Issue[]; onChange: (v: string | number) => void; disabled?: boolean }) {
  const id = `p-${index}-${param.k}`, field = `block:${index}:${param.k}`, invalid = issues.some(i => i.field === field);
  const label = `${param.label}${param.unit ? ` (${param.unit})` : ''}`;
  const common = { id, disabled, 'aria-invalid': invalid || undefined, 'aria-describedby': errId(issues, field) };
  const keptRecipient = param.k === 'to' && isAddress(String(value));
  return <div className="param">
    <label htmlFor={id}>{label}</label>
    {param.type === 'select'
      ? <select {...common} value={String(value)} onChange={e => onChange(e.target.value)}>{keptRecipient && <option value={String(value)}>Keep recipient from request</option>}{param.options!.map(o => <option key={o} value={o}>{o}</option>)}</select>
      : param.type === 'textarea'
        ? <textarea {...common} value={String(value)} maxLength={param.maxLength} onChange={e => onChange(e.target.value)} />
        : <input {...common} type={param.type === 'number' ? 'number' : 'text'} inputMode={param.type === 'number' ? 'decimal' : undefined}
          className={param.type === 'number' || param.type === 'address' || param.type === 'datetime' ? 'mono-input' : undefined}
          min={param.min} max={param.max} step={param.step} spellCheck={false} placeholder={param.type === 'address' ? '0x…' : param.type === 'datetime' ? 'YYYY-MM-DD HH:MM' : undefined}
          value={String(value)} onChange={e => onChange(param.type === 'number' && e.target.value !== '' && Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value)} />}
    {keptRecipient && <p className="small">Recipient from the previous request: <code>{String(value)}</code></p>}
    <FieldError issues={issues} field={field} />
  </div>;
}

/**
 * The few words a consistency finding points at: a placeholder, a short address, a currency phrase. Never the whole sentence.
 * A pattern with a capture group quotes only the group. Codes without an exact faulty span get no excerpt.
 */
const FAULTS: Record<string, RegExp[]> = {
  recipient: [/^Owner (.+?) (?:may only:|is \$owner\.)/, /the paying wallet \(connect to resolve its address\)/i, /\bmy wallet\b/i, /\btreasury address\b/i, /\bthe second address\b/i, /0x…|0x\.\.\./, /\(connect[^)]*\)/i],
  address: [/\b0x(?![\da-fA-F]{40}\b)[\da-z]*/i],
  'address-case': [/0x[\da-fA-F]*[A-F][\da-fA-F]*/],
  'fee-side': [/\b(?:ETH|IMD)(?: \(pair currency\))? side\b/, /% of (?:the )?(?:ETH|IMD)\b/],
  'fee-settlement': [/\b(?:settled|paid|sent|collected) (?:in|as) (?:ETH|IMD)\b/i, /\bin (?:ETH|IMD)\b/],
  'fee-conversion': [/\b(?:convert|sell|swap)\w* [^.;]{0,24}?\b(?:to|for|into) ETH\b/i],
  rates: [/\d+(?:\.\d+)?%/],
  'fee-recipient': [/\b0x[\da-fA-F]{40}\b/],
  'pool-signature': [/\b[A-Za-z_]\w*\([^()]*\)/],
  pairing: [/\bpaired with (?:ETH|IMD)\b/],
  dependency: [/\(choose a chain\)/i],
};
const PLACEHOLDER = /\((?:choose|enter|connect)[^)]{0,48}\)/g;
const MAX_QUOTE = 60;
/** The exact words at fault, or '' when the finding has no span in the composed request. */
export function faultWords(finding: SafetyFinding, text?: string): string {
  const sentence = finding.sentence.split('\n')[0];
  for (const pattern of FAULTS[finding.code] ?? []) {
    const match = pattern.exec(sentence);
    const words = match?.[1] ?? match?.[0];
    if (words && words.length <= MAX_QUOTE && words !== sentence.trim() && (text === undefined || text.includes(words))) return words;
  }
  return '';
}
/** Body findings name a JSON path; these point at the setting that writes it. */
const BODY_FIELDS: [RegExp, string][] = [[/^owner\b/i, 'settings.owner'], [/^remainderTo\b/i, 'settings.rem'], [/^tokenAddress\b/i, 'settings.token'], [/^recipient\b/i, 'settings.owner']];
function findingField(finding: SafetyFinding, mode: Mode | null): string | null {
  const path = BODY_FIELDS.find(([pattern]) => finding.code === 'address-case' && pattern.test(finding.sentence));
  if (path) return path[1];
  if (finding.code === 'recipient' && /^Owner /.test(finding.sentence)) return 'settings.owner';
  if (finding.code === 'dependency' && /deploy chain/.test(finding.message)) return 'settings.chain';
  return mode === 'prompt' ? 'prompt' : null;
}
const escapeRe = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Text split around every highlighted phrase, for the exact-text sheet. data-mark is the phrase's index in `phrases`, its stable identity. */
function marked(text: string, phrases: string[]): ReactNode[] {
  if (!phrases.length) return [text];
  // Longest first, so a phrase inside a longer one does not split it.
  const pattern = new RegExp([...phrases].sort((a, b) => b.length - a.length).map(escapeRe).join('|'), 'g');
  const out: ReactNode[] = []; let from = 0, n = 0;
  for (const m of text.matchAll(pattern)) {
    out.push(text.slice(from, m.index));
    out.push(<mark key={n} data-mark={phrases.indexOf(m[0])}>{m[0]}</mark>);
    from = m.index! + m[0].length; n++;
  }
  out.push(text.slice(from));
  return out;
}

type Finding = { key: string; title: string; quote?: string; tail?: string; jump: () => void };

/** Fees that Share fees with LPs divides (the catalog: "the Swap fee and Whale fee only", with the swap fee's fade and volatility rates). */
const LP_SHARED = ['swap-fee', 'fee-fade', 'fee-vol', 'fee-size'];
/**
 * The card's "where the money goes" line, from the final distribution the request describes:
 * the LP share comes off the shared fees first, then the rest goes to the recipient or through Split the fee.
 * Jar and pot money stays separate. Presentation only; compose() and the economics are untouched.
 */
export function moneyFlow(rules: BlockEntry[], ctx: ReturnType<typeof context>, type: LaunchType): string[] {
  const rate = (b: BlockEntry) => ['swap-fee', 'fee-dir'].includes(b.id) ? shortOf(b, ctx).replace(/ → [^→]*$/, '') : shortOf(b, ctx);
  const feeRule = rules.find(b => b.id === 'swap-fee' || b.id === 'fee-dir');
  const to = String(feeRule?.p.to ?? 'my wallet');
  const split = rules.find(b => b.id === 'fee-split'), share = rules.find(b => b.id === 'lp-share');
  const recipient = split ? `the split (${shortOf(split, ctx)})` : to === "IMD's treasury" ? "IMD's treasury" : isAddress(to) ? `${to.slice(0, 6)}…${to.slice(-4)}` : 'my wallet';
  const hook = rules.filter(b => ['swap-fee', 'fee-dir', 'fee-fade', 'fee-vol', 'fee-size'].includes(b.id));
  const shared = share ? hook.filter(b => LP_SHARED.includes(b.id)) : [];
  const own = hook.filter(b => !shared.includes(b));
  const out: string[] = [];
  if (shared.length) {
    const pct = Math.min(100, Math.max(0, Number(share!.p.pct) || 0));
    const where = pct >= 100 ? `all to in-range LPs, 0% left for ${recipient}` : pct <= 0 ? recipient : `${pct}% to in-range LPs, ${100 - pct}% to ${recipient}`;
    out.push(`${shared.map(rate).join(' + ')} → ${where}`);
  }
  if (own.length) out.push(`${own.map(rate).join(' + ')} → ${recipient}`);
  for (const b of rules) {
    if (b.id === 'jar') out.push(`${shortOf(b, ctx)}, spent on ${ctx.symbol}`);
    if (b.id === 'pot') out.push(shortOf(b, ctx));
    if (b.id === 'lp-fee') out.push(shortOf(b, ctx));
  }
  if (shared.length && Number(share!.p.pct) > 0) out.push(`if no liquidity is in range, the whole fee goes to ${recipient}`);
  out.push(type === 'A' ? 'pool fee 1.25% (1% to you, 0.25% network) → liquidity' : rules.some(b => b.id === 'lp-fee') ? '' : 'pool fee set by whoever opens the pool');
  return out.filter(Boolean);
}

export function Builder({ config }: { config: SiteConfig & { blocksVerifiedUrl?: string } }) {
  // The first visit starts on Stack blocks with the reviewed default stack; the two-card chooser is gone (SPEC 3.2).
  const [draft, setDraft] = useState<Draft>(() => {
    const loaded = loadDraft();
    if (loaded.mode !== null) return loaded;
    let next: Draft = { ...loaded, mode: 'blocks', seeded: true };
    if (!loaded.seeded && behaviorBlocks(loaded).length === 0) for (const id of DEFAULT_STACK) next = addBlock(next, id);
    return next;
  });
  const [storageError, setStorageError] = useState(false);
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<{ source: string; titles: string[] } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<string>(() => draft.type === 'A' ? 'fees' : 'fees');
  const [ownCodeOn, setOwnCodeOn] = useState(() => !!(draft.settings.repo || draft.settings.commit));
  const stashed = useRef({ repo: '', commit: '' });
  const [sheet, setSheet] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const { address } = useAccount();
  const ownCode = useOwnCode(draft, config.relayUrl);
  useEffect(() => { setStorageError(!storeDraft(draft)); }, [draft]);
  useEffect(() => {
    let live = true;
    loadVerified(config.blocksVerifiedUrl ?? 'https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/blocks-verified.json').then(set => { if (live) setVerified(set); });
    return () => { live = false; };
  }, [config.blocksVerifiedUrl]);

  const ctx = context(draft, address), s = draft.settings;
  const automatic = useProvenSource(draft, config.relayUrl);
  const prepared = ownCode.prepared && (ownCode.needed ? ownCode.prepared : automatic.prepared);
  const sourceReady = ownCode.ready && automatic.ready;
  const [correction] = useState(loadCorrection);
  const text = prepared ? compose(prepared, address) : 'Resolve your repository in step 2 to compose the request from its pinned source.';
  const requestJson = prepared && sourceReady ? JSON.stringify(body(prepared, address)) : null;
  const check = useSwarmCheck(config.relayUrl, requestJson, address);
  const issues = useMemo(() => {
    const found: Issue[] = [...validate(prepared ?? draft, address), ...(draft.settings.chain && !config.enabledDeployChains.includes(draft.settings.chain) ? [{ field: 'settings.chain', message: 'This deploy chain is disabled. Choose an enabled chain.' }] : [])];
    // FROM MY OWN CODE is a starting point of its own: it needs a repository, a full commit and a resolved source before launch.
    // validate() only checks these once one is typed, so the empty case is added here; the composer is untouched.
    if (ownCodeOn) {
      const st = draft.settings;
      if (!st.repo.trim() && !found.some(i => i.field === 'settings.repo')) found.push({ field: 'settings.repo', message: 'Repository: enter the public https://github.com/owner/name URL of your hook.' });
      if (!st.commit.trim() && !found.some(i => i.field === 'settings.commit')) found.push({ field: 'settings.commit', message: 'Commit: enter the full 40-character commit id.' });
      if (ownCode.needed && !ownCode.ready && !found.some(i => i.field === 'settings.repo' || i.field === 'settings.commit')) found.push({ field: 'settings.resolve', message: 'Resolve your repository in step 2.' });
    }
    return found;
  }, [prepared, draft, address, config.enabledDeployChains, ownCodeOn, ownCode.needed, ownCode.ready]);
  const bytes = prepared ? bodyBytes(body(prepared, address)) : 0;
  const rules = activeBlocks(draft), words = cleanText(draft.prompt);
  const splitDestination = rules.some(block => block.id === 'fee-split');
  const summaryOf = (block: BlockEntry) => splitDestination && ['swap-fee', 'fee-dir'].includes(block.id) ? shortOf(block, ctx).replace(/→ .+$/, '→ Split the fee distribution') : shortOf(block, ctx);
  const tested = (id: string) => verified.has(id);
  const update = (next: Draft) => { setBlocked(null); setDraft(next); };
  const settings = (patch: Partial<Settings>) => update({ ...draft, settings: { ...draft.settings, ...patch } });
  const chooseMode = (mode: Mode) => {
    let next: Draft = { ...draft, mode };
    // The first visit to the stack starts from the reviewed default stack; it never overwrites blocks already chosen.
    if (mode === 'blocks' && !draft.seeded && behaviorBlocks(draft).length === 0) for (const id of DEFAULT_STACK) next = addBlock(next, id);
    update({ ...next, seeded: draft.seeded || mode === 'blocks' });
  };
  const toggle = (id: string, on?: boolean) => setOpen(prev => { const next = new Set(prev); if (on ?? !next.has(id)) next.add(id); else next.delete(id); return next; });
  // A shelf addition always reveals the stack that will be composed, and the new rule opens.
  const add = (id: string) => {
    update(TOKEN_IDS.includes(id) ? addBlock(draft, id) : { ...addBlock(draft, id), mode: 'blocks', seeded: true });
    if (!TOKEN_IDS.includes(id)) toggle(id, true);
  };
  const remove = (index: number) => {
    const gone = draft.blocks[index], next = removeBlock(draft, index);
    const dependants = draft.blocks.filter(b => b !== gone && !next.blocks.includes(b)).map(b => BY_ID[b.id].title);
    update(next);
    setBlocked(dependants.length ? { source: BY_ID[gone.id].title, titles: dependants } : null);
  };
  const chooseStart = (own: boolean) => {
    setOwnCodeOn(own);
    // The pinned source is only part of the request while own code is chosen; switching back restores what was typed.
    if (own) { if (!s.repo && !s.commit && (stashed.current.repo || stashed.current.commit)) settings(stashed.current); }
    else if (s.repo || s.commit) { stashed.current = { repo: s.repo, commit: s.commit }; settings({ repo: '', commit: '' }); }
  };
  const enabledChains: number[] = config.enabledDeployChains;
  const ruleIssues = issues.filter(i => i.field === 'rates' || i.field === 'rules' || /^block:\d+$/.test(i.field));
  const settingFields = ['settings.chain', 'settings.pair', 'settings.pool', 'settings.rem', 'settings.owner', 'settings.token', 'settings.tsym', 'settings.hname'];
  const settingsMissing = new Set(issues.filter(i => settingFields.includes(i.field)).map(i => i.field)).size;

  // Focus a field, open a rule, or scroll to a step, after React has rendered the change.
  useEffect(() => {
    const id = pendingFocus.current; if (!id) return;
    pendingFocus.current = null;
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }
  });
  const jump = (field: string) => {
    const block = /^block:(\d+)(?::(.+))?$/.exec(field);
    if (block) {
      const entry = draft.blocks[Number(block[1])];
      // Row 0 (the token) opens under its own key, whichever token block it holds.
      const rowId = entry && TOKEN_IDS.includes(entry.id) ? 'token-row' : entry?.id;
      if (rowId) toggle(rowId, true);
      if (entry && draft.mode !== 'blocks' && !TOKEN_IDS.includes(entry.id)) chooseMode('blocks');
      pendingFocus.current = block[2] ? `p-${block[1]}-${block[2]}` : `rule-${rowId}`;
    } else if (field.startsWith('settings.')) {
      const key = field.slice(9);
      if ((key === 'repo' || key === 'commit') && !ownCodeOn) setOwnCodeOn(true);
      pendingFocus.current = `s-${key}`;
    } else if (field === 'prompt') { if (draft.mode !== 'prompt') chooseMode('prompt'); pendingFocus.current = 'p-text'; }
    else if (field === 'length') { openSheet(null); return; }
    else pendingFocus.current = 'stack-h';
    setOpen(prev => new Set(prev)); // render once so the pending focus runs even when nothing else changed
  };
  const openSheet = (mark: number | null) => {
    setSheet(mark ?? -1); setCopied('');
    if (!dialog.current?.open) dialog.current?.showModal();
  };
  useEffect(() => {
    if (sheet === null || sheet < 0) return;
    // A phrase inside a longer highlighted phrase has no mark of its own; the longer mark holds its words.
    const marks = [...dialog.current?.querySelectorAll<HTMLElement>('mark') ?? []];
    const target = marks.find(m => m.dataset.mark === String(sheet)) ?? marks.find(m => m.textContent?.includes(phrases[sheet]));
    target?.scrollIntoView({ block: 'center' });
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  // SPEC 3.2: the card never exceeds the viewport. Its details scroll inside it, sized so that at load the whole card,
  // actions included, fits below the page head; it never shrinks the details below a few lines.
  const cardRef = useRef<HTMLDivElement>(null);
  const loadDetails = useRef({ viewport: '', height: 0 });
  useLayoutEffect(() => {
    let frame = 0;
    const fit = () => {
      const card = cardRef.current, scroller = card?.querySelector<HTMLElement>('.hc-scroll');
      if (!card || !scroller) return;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
      const fixed = card.offsetHeight - scroller.offsetHeight;
      const top = card.getBoundingClientRect().top;
      const desktop = innerWidth >= 1100;
      const viewport = `${innerWidth}:${innerHeight}`;
      const available = innerHeight - header - 32 - fixed;
      const room = innerHeight - Math.max(desktop ? header + 16 : 0, top) - 16 - fixed;
      const floor = innerWidth < 720 ? innerHeight * .4 : desktop ? Math.min(140, available) : 140;
      let size = Math.max(24, floor, Math.floor(room));
      if (desktop && top <= header + 17 && loadDetails.current.viewport === viewport) {
        size = Math.max(size, Math.min(loadDetails.current.height, available));
      }
      card.style.setProperty('--scroll-room', `${size}px`);
      if (loadDetails.current.viewport !== viewport) loadDetails.current = { viewport, height: scroller.clientHeight };
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    fit();
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); };
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied('Copied.'); } catch { setCopied('Copy failed. Select the text and copy it by hand.'); }
  };

  // Findings: one line each (SPEC 3.2). Validation findings jump to their field; text findings open the sheet at their words.
  const textFindings = [...check.consistency, ...check.conflicts];
  const placeholders = [...new Set(text.match(PLACEHOLDER) ?? [])];
  // One canonical list: a finding's index here is the data-mark of its words in the sheet.
  const quotes = textFindings.map(finding => faultWords(finding, text));
  const phrases = [...new Set([...quotes, ...placeholders].filter(Boolean))];
  const seen = new Set<string>();
  const findings: Finding[] = [];
  for (const issue of issues) {
    const key = `${issue.field}:${issue.message}`; if (seen.has(key)) continue; seen.add(key);
    const placeholder = issue.field === 'settings.chain' ? placeholders.find(p => /chain/.test(p)) : issue.field === 'settings.token' ? placeholders.find(p => /token/.test(p)) : undefined;
    findings.push({ key, title: issue.message, quote: placeholder, tail: undefined, jump: () => jump(issue.field) });
  }
  textFindings.forEach((finding, i) => {
    const words = quotes[i], field = words ? null : findingField(finding, draft.mode);
    findings.push({ key: `text:${finding.code}:${i}`, title: finding.message, quote: words || undefined, tail: undefined,
      jump: () => field ? jump(field) : openSheet(words ? phrases.indexOf(words) : null) });
  });

  // The card's "where the money goes" line.
  const pair = pairCurrency(draft);
  const money = moneyFlow(rules, ctx, draft.type);
  const hasFees = rules.some(b => FEE_IDS.slice(0, 8).includes(b.id) && b.id !== 'fee-split');

  const ready = issues.length === 0 && sourceReady && !check.gate;
  const done = [true, draft.mode !== null && (!ownCodeOn || !issues.some(i => /^settings\.(?:repo|commit|resolve)$/.test(i.field))), draft.mode === 'prompt' ? !!words : rules.length > 0 && ruleIssues.length === 0, settingsMissing === 0, ready];
  const now = done.findIndex(d => !d);

  const step = (n: number, title: string, state: ReactNode, children: ReactNode, stateClass = '') =>
    <section className="step" id={`step-${n}`} aria-labelledby={`s${n}`}>
      <div className="step-head"><span className="n" aria-hidden="true">{n}</span><h2 id={`s${n}`}><span className="sr">Step {n}: </span>{title}</h2>{state && <span className={`state ${stateClass}`}>{state}</span>}</div>
      {children}
    </section>;

  // Step 1
  const typeStep = step(1, 'What are you launching?', TYPES.find(t => t[0] === draft.type)![1],
    <div className="types">{TYPES.map(([type, title, line]) => <button key={type} type="button" className={`type${draft.type === type ? ' on' : ''}`} aria-pressed={draft.type === type} onClick={() => update({ ...draft, type })} data-type={type}>
      <strong><span className="type-letter">{type}:</span> {title}</strong><span>{line}</span></button>)}</div>);

  // Step 2
  const textInput = (field: 'rem' | 'owner' | 'token' | 'tsym' | 'hname' | 'repo' | 'commit', placeholder: string, mono = false) =>
    <input id={`s-${field}`} className={mono ? 'mono-input' : undefined} value={s[field]} placeholder={placeholder} spellCheck={false}
      aria-invalid={issues.some(i => i.field === `settings.${field}`) || undefined} aria-describedby={errId(issues, `settings.${field}`)} onChange={e => settings({ [field]: e.target.value })} />;
  const setting = (field: keyof Settings, label: ReactNode, input: ReactNode, wide = false) => <div className={wide ? 'wide' : undefined}><label htmlFor={`s-${field}`}>{label}</label>{input}<FieldError issues={issues} field={`settings.${field}`} /></div>;
  const tokenRow = (() => {
    if (draft.type !== 'A') return null;
    const index = draft.blocks.findIndex(b => TOKEN_IDS.includes(b.id)), t = draft.blocks[index];
    if (!t) return null;
    const def = BY_ID[t.id], isOpen = open.has('token-row');
    return <article className={`rule token${isOpen ? ' open' : ''}`} style={swatch('token')} id="rule-token-row" data-block={t.id} tabIndex={-1}>
      <div className="row"><span className="n">0</span>
        <div className="txt"><strong>{def.title}</strong><span>{shortOf(t, ctx)}</span></div>
        <span className="chip">{t.id === 'own-token' ? 'MY OWN' : 'STANDARD'}</span>
        <div className="tools"><button type="button" className="edit" aria-expanded={isOpen} aria-controls="rule-body-token" onClick={() => toggle('token-row')}>{isOpen ? 'Close' : 'Edit'}<span className="sr"> token</span></button></div>
      </div>
      {isOpen && <div className="body" id="rule-body-token">
        <div className="seg small-seg" role="group" aria-label="Token kind">
          <button type="button" className={t.id === 'token' ? 'on' : undefined} aria-pressed={t.id === 'token'} onClick={() => add('token')}>Standard</button>
          <button type="button" className={t.id === 'own-token' ? 'on' : undefined} aria-pressed={t.id === 'own-token'} onClick={() => add('own-token')}>My own</button>
        </div>
        <div className="params">{def.params.map(x => <ParamField key={x.k} param={x} index={index} value={t.p[x.k]} issues={issues} onChange={v => update(setParam(draft, index, x.k, v))} />)}</div>
        {t.id === 'own-token' && <p className="small muted">Supply is capped at <span className="num">1,000,000,000,000</span> whole tokens.</p>}
        {tested(t.id) && <p className="tested">✓ proven in a live launch</p>}
        {manageNote(def, t)}
      </div>}
    </article>;
  })();

  const describe = <div className="describe">
    <WrittenRulesNotice />
    <label htmlFor="p-text">What should it do? (max <span className="num">3,000</span> characters)</label>
    <textarea id="p-text" maxLength={3000} value={draft.prompt} onChange={e => update({ ...draft, prompt: e.target.value })} aria-describedby="p-count"
      placeholder="Describe every rule, its units and timing, and who may call each function." />
    <p className="small muted count-line" id="p-count"><span className="num">{draft.prompt.length.toLocaleString('en-US')}</span> / <span className="num">3,000</span></p>
    <p className="small muted">Try a starting point:</p>
    <div className="chips">{EXAMPLES.map((example, i) => <button className="chip" type="button" key={i} onClick={() => update({ ...draft, prompt: example })}>{EXAMPLE_LABELS[i]}</button>)}</div>
    {behaviorBlocks(draft).length > 0 && <>
      <h3 className="added-h">Saved stack, not included</h3>
      <p className="small muted rule-line">Describe it sends only your words and token choice. Switch to Stack blocks to include and edit these saved rules.</p>
      <div className="added" aria-label="Saved blocks, not included in Describe it mode">{behaviorBlocks(draft).map(b => {
        const def = BY_ID[b.id], off = !available(def, draft.type);
        return <span className={`chip${off ? ' off' : ''}`} key={b.id} data-block={b.id}>{shortOf(b, ctx)}{off && ' (not for this launch type)'}<button type="button" onClick={() => remove(draft.blocks.indexOf(b))} aria-label={`Remove ${def.title}`}>✕</button></span>;
      })}</div>
      <button className="btn tiny" type="button" onClick={() => chooseMode('blocks')}>Use saved stack</button>
    </>}
  </div>;

  const howStep = step(2, 'How do you want to build it?', null, <>
    <h3 className="sub">Starting point</h3>
    <div className="start" role="group" aria-label="Starting point">
      <button className={`type${!ownCodeOn ? ' on' : ''}`} type="button" aria-pressed={!ownCodeOn} data-start="scratch" onClick={() => chooseStart(false)}><strong>From scratch</strong><span>The swarm writes the hook from your blocks or your words. Best for a first hook.</span></button>
      <button className={`type${ownCodeOn ? ' on' : ''}`} type="button" aria-pressed={ownCodeOn} data-start="own" onClick={() => chooseStart(true)}><strong>From my own code</strong><span>A public GitHub repository with your hook. It is audited as imported code, then adapted to the rules you add below, and reviewed before deploying.</span></button>
    </div>
    {ownCodeOn && <div className="own" role="group" aria-label="Own code fields">
      <p className="small muted">The request pins this exact commit. Your blocks and words become the changes the swarm makes to it.</p>
      <div className="fields">{setting('repo', 'Repository URL', textInput('repo', 'https://github.com/you/your-hook'))}{setting('commit', 'Commit', textInput('commit', '40-character commit id', true))}</div>
      {ownCode.needed && <div className="own-resolve"><button className="btn tiny" type="button" id="s-resolve" disabled={ownCode.busy || !s.repo.trim() || !s.commit.trim()} onClick={() => void ownCode.resolve()}>{ownCode.busy ? 'Resolving repository…' : ownCode.ready ? 'Resolve repository again' : 'Resolve repository'}</button><p className="small muted" role="status">{ownCode.ready ? <>Pinned source: <span className="mono">{ownCode.source?.repoUrl} · {ownCode.source?.baseCommit}</span></> : 'Resolve this public Foundry repository before composing or checking your request.'}</p></div>}
      {ownCode.error && <p className="field-error" role="alert">{ownCode.error}</p>}
    </div>}
    <h3 className="sub">How you describe the rules</h3>
    <div className="seg" role="group" aria-label="Builder mode">
      <button type="button" className={draft.mode === 'prompt' ? 'on' : undefined} aria-pressed={draft.mode === 'prompt'} onClick={() => chooseMode('prompt')}>Describe it</button>
      <button type="button" className={draft.mode === 'blocks' ? 'on' : undefined} aria-pressed={draft.mode === 'blocks'} onClick={() => chooseMode('blocks')}>Stack blocks</button>
    </div>
    <p className="mode-note">Blocks are checked sentences the swarm already knows. Words are yours and riskier. Switching never loses anything: blocks stay as numbered rules under your words.</p>
    {draft.mode === 'prompt' && describe}
  </>);

  // Step 3
  const groups = CATALOG.groups.filter(g => g.id !== 'token' || draft.type === 'A');
  const current = groups.some(g => g.id === tab) ? tab : groups[0].id;
  const shelfItems = BLOCKS.filter(b => b.group === current);
  const shelf = <>
    <div className="shelf-tabs" role="tablist" aria-label="Block categories">{groups.map(g => {
      const items = BLOCKS.filter(b => b.group === g.id), count = items.filter(b => has(draft, b.id)).length;
      return <button key={g.id} role="tab" type="button" id={`tab-${g.id}`} aria-selected={current === g.id} aria-controls="shelf" className={current === g.id ? 'on' : undefined} style={swatch(g.id)} onClick={() => setTab(g.id)}>
        <i aria-hidden="true" />{SHELF[g.id] ?? g.title} <span className="c" aria-label={`${count} of ${items.length} added`}>{count}/{items.length}</span></button>;
    })}</div>
    <div className="shelf" id="shelf" role="tabpanel" aria-labelledby={`tab-${current}`} style={swatch(current)}>
      {shelfItems.map(def => {
        const why = blockedReason(draft, def);
        return <div className={`bcard${why ? ' added' : ''}`} key={def.id} data-block={def.id}>
          <strong><BlockName def={def} tested={tested(def.id)} /></strong><p>{def.blurb}</p>
          <div className="foot">{why ? <span className="pill state">{draft.mode === 'prompt' && why === 'ADDED' ? 'SAVED IN STACK' : why}</span> : <button className="btn tiny" type="button" onClick={() => add(def.id)} aria-label={`Add ${def.title}`}>Add</button>}</div>
        </div>;
      })}
    </div>
  </>;
  let n = 0;
  const behaviour = draft.blocks.map((b, index) => ({ b, index })).filter(x => !TOKEN_IDS.includes(x.b.id) && BY_ID[x.b.id]);
  const allIds = [...(tokenRow ? ['token-row'] : []), ...behaviour.map(x => x.b.id)];
  const allOpen = allIds.length > 0 && allIds.every(id => open.has(id));
  const stack = <div id="stack">
    {tokenRow}
    {behaviour.length === 0 && <div className="empty">No blocks yet. Add some from the shelf above, or describe your hook in words in step 2.</div>}
    {behaviour.map(({ b, index }) => {
      const def = BY_ID[b.id], off = !available(def, draft.type) || !!def.disabled, isOpen = open.has(b.id);
      if (!off) n++;
      const [chip, chipClass] = whoChip(def, b);
      const blockIssues = issues.some(i => i.field === `block:${index}` || i.field.startsWith(`block:${index}:`));
      return <article className={`rule${isOpen ? ' open' : ''}${off ? ' off' : ''}${blockIssues && !off ? ' bad' : ''}`} key={b.id} data-block={b.id} id={`rule-${b.id}`} tabIndex={-1} style={swatch(def.group)}>
        <div className="row">
          <span className="n">{off ? '–' : n}</span>
          <div className="txt"><strong><BlockName def={def} tested={tested(def.id)} /></strong><span>{summaryOf(b)}</span>{off && <span className="pill state">{def.disabled ?? 'Not for this launch type'}</span>}</div>
          <span className={`chip ${chipClass}`}>{chip}</span>
          <div className="tools">
            <button type="button" onClick={() => update(moveBlock(draft, index, -1))} aria-label={`Move ${def.title} up`}>↑</button>
            <button type="button" onClick={() => update(moveBlock(draft, index, 1))} aria-label={`Move ${def.title} down`}>↓</button>
            <button type="button" onClick={() => remove(index)} aria-label={`Remove ${def.title}`}>×</button>
            <button type="button" className="edit" aria-expanded={isOpen} aria-controls={`rule-body-${b.id}`} onClick={() => toggle(b.id)}>{isOpen ? 'Close' : 'Edit'}<span className="sr"> {def.title}</span></button>
          </div>
        </div>
        {isOpen && <div className="body" id={`rule-body-${b.id}`}>
          {b.id === 'custom' && <WrittenRulesNotice />}
          {def.params.length > 0 && <div className="params">{def.params.map(x => <ParamField key={x.k} param={{ ...x, unit: x.unit?.replace('{@pair}', ctx.pair!) }} index={index} value={b.p[x.k]} issues={off ? [] : issues} disabled={splitDestination && ['swap-fee', 'fee-dir'].includes(b.id) && x.k === 'to'} onChange={v => update(setParam(draft, index, x.k, v))} />)}</div>}
          {splitDestination && ['swap-fee', 'fee-dir'].includes(b.id) && <p className="small">Split the fee replaces this destination. The saved choice applies again if you remove Split the fee.</p>}
          {def.params.some(x => x.options?.some(o => o.includes("IMD's treasury"))) && <p className="small treasury-note">IMD's treasury: <code>0x3f252e859a277a86A3967c11D4E054B2f07a1F22</code> on both chains.</p>}
          {tested(def.id) && <p className="tested">✓ proven in a live launch</p>}
          {manageNote(def, b)}
        </div>}
        {!off && <FieldError issues={issues} field={`block:${index}`} />}
      </article>;
    })}
  </div>;
  const blocksStep = step(3, 'Stack your blocks', draft.mode === 'prompt' ? 'Saved, not sent while you describe it' : `${rules.length} added${rules.length >= 6 ? ' · 6 is plenty' : ''}`, <>
    {shelf}
    <div className="stack-head"><h3 id="stack-h" tabIndex={-1}>Your stack</h3><span className="small muted">One line per rule. Open a rule to change its numbers. <button className="link" type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(allIds))}>{allOpen ? 'Close all' : 'Open all'}</button></span></div>
    {draft.mode === 'prompt' && <p className="small muted">Describe it sends only your words and the token. Adding a block switches to Stack blocks.</p>}
    {stack}
    {blocked && <p className="small muted" role="status">Also removed, because they need {blocked.source}: {blocked.titles.join(', ')}.</p>}
    {ruleIssues.length > 0 && <div className="notice bad" role="alert" id="rule-notice">{[...new Set(ruleIssues.map(i => i.message))].map(m => <p key={m}>{m}</p>)}</div>}
    {rules.length > 6 && <p className="notice block-count" role="status">Every extra rule is more for the audit panel to refuse. The contract has a <span className="num">24 KB</span> size limit. Keep the stack to six blocks when possible.</p>}
  </>);

  // Step 4
  const settingsStep = step(4, 'Settings', settingsMissing ? `${settingsMissing} to fill in` : 'All set', <div className="fields">
    {draft.type === 'C' && <>{setting('token', 'Existing token address', textInput('token', '0x…', true))}{setting('tsym', 'Its symbol (optional)', textInput('tsym', 'e.g. UNI'))}</>}
    {draft.type !== 'A' && setting('hname', 'Hook name', textInput('hname', 'e.g. PondGuardHook'), true)}
    {setting('chain', 'Deploy on', <select id="s-chain" value={s.chain ?? ''} aria-invalid={issues.some(i => i.field === 'settings.chain') || undefined} aria-describedby={errId(issues, 'settings.chain')} onChange={e => settings({ chain: e.target.value === '' ? null : Number(e.target.value) })}>
      <option value="">Choose a chain</option>{[4663, 1].filter(id => enabledChains.includes(id)).map(id => <option key={id} value={id}>{CHAIN_NAMES[id]}</option>)}
    </select>)}
    {draft.type === 'A' && setting('pair', 'Pair with', <select id="s-pair" value={s.pair} onChange={e => settings({ pair: e.target.value as 'eth' | 'imd' })}>
      <option value="imd">IMD</option><option value="eth">ETH</option>
    </select>)}
    {draft.type === 'A' && <>
      <div>
        <label htmlFor="s-pool">Pool share of total supply (%) · your choice</label>
        <input id="s-pool" type="number" className="mono-input" min={10} max={90} step={5} placeholder="10 to 90" inputMode="numeric"
          value={s.pool ?? ''} aria-invalid={(s.pool !== null && issues.some(i => i.field === 'settings.pool')) || undefined} aria-describedby="pool-help"
          onChange={e => settings({ pool: e.target.value === '' ? null : Number(e.target.value) })} />
        <p className="small muted" id="pool-help">This percentage of the total supply seeds the pool. The swarm receives <span className="num">10%</span>; the remaining <span className="num">{s.pool === null ? '90 minus your choice' : 90 - s.pool}%</span> goes to your remainder address. Nothing is chosen for you.</p>
        {s.pool !== null && <FieldError issues={issues} field="settings.pool" />}
      </div>
      {setting('rem', 'Remainder goes to', textInput('rem', 'your connected wallet', true))}
    </>}
    {setting('owner', 'Owner address', <>{textInput('owner', 'your connected wallet', true)}<p className="small muted">Leave empty to use the wallet that pays. Typed addresses are sent in lowercase.</p></>, true)}
  </div>, settingsMissing ? 'bad' : '');

  // The hook card
  const tiles = <div className="tiles" id="tiles">
    {draft.type === 'A' && (() => { const t = draft.blocks.find(b => TOKEN_IDS.includes(b.id)); return t ? <div className="tile base" style={swatch('token')}><i aria-hidden="true" /><div className="t"><strong>Token</strong><span>{shortOf(t, ctx)}</span></div></div> : null; })()}
    {draft.mode === 'prompt' && <div className="tile" style={swatch('custom')}><i aria-hidden="true" /><div className="t"><strong>Your words</strong><span>{words ? (words.length > 90 ? `${words.slice(0, 90)}…` : words) : 'none yet'}</span></div></div>}
    {rules.map(b => <div className="tile" key={b.id} style={swatch(BY_ID[b.id].group)} data-block={b.id}><i aria-hidden="true" /><div className="t"><strong>{BY_ID[b.id].title}</strong><span>{summaryOf(b)}</span></div></div>)}
    {draft.mode !== 'prompt' && !rules.length && <div className="tile empty"><div className="t">No rules yet. Add blocks in step 3.</div></div>}
  </div>;
  const readyList = <ul className="ready" aria-label="Before you can launch">
    <li><span>{TYPE_PILL[draft.type]} chosen</span></li>
    {s.chain && !issues.some(i => i.field === 'settings.chain') && <li><span>Deploys on {CHAIN_NAMES[s.chain]}{draft.type === 'A' ? `, paired with ${pair}` : ''}</span></li>}
    {draft.type === 'A' && s.pool !== null && !issues.some(i => i.field === 'settings.pool') && <li><span>Pool share <span className="num">{s.pool}%</span></span></li>}
    {draft.mode === 'blocks' && rules.length > 0 && !ruleIssues.length && !issues.some(i => i.field.startsWith('block:')) && <li><span>{rules.length} block{rules.length === 1 ? '' : 's'}, all allowed for this type</span></li>}
    {draft.mode === 'prompt' && words && !issues.some(i => i.field === 'prompt') && <li><span>Your words are written</span></li>}
    {findings.filter(f => !f.key.startsWith('text:')).map(f => <li className="todo" key={f.key}><span>{f.title} · <button type="button" onClick={f.jump}>fill it in</button></span></li>)}
  </ul>;
  const card = <div className="hookcard" ref={cardRef} aria-labelledby="hc-name">
    <div className="hc-top">
      <span className="eyebrow">Your hook, as it stands</span>
      <h2 id="hc-name">{ctx.name}{draft.type === 'A' && <> <span className="sym">${ctx.symbol}</span></>}</h2>
      <div className="hc-pills">
        <span className="pill">{TYPE_PILL[draft.type]}</span>
        <span className="pill">{s.chain ? CHAIN_NAMES[s.chain] : 'No chain yet'}</span>
        <span className="pill">{draft.type === 'A' ? `Paired with ${pair}` : draft.type === 'C' ? `${s.tsym.trim() || 'Your token'} / ETH` : 'Any pool'}</span>
      </div>
    </div>
    {/* SPEC 3.2: the card never exceeds the viewport; its details scroll inside it and the actions stay in reach. */}
    <div className="hc-scroll" tabIndex={0} role="region" aria-label="Rules, money and readiness">
      <ProvenLine entry={automatic.proven} draft={draft} />
      {tiles}
      <div className="flow"><b>Where the money goes</b><span>{money.join(' · ')}</span>{hasFees && <span className="muted">Fees are taken on the {pair} side and settled in {pair}.</span>}</div>
      {readyList}
      <p className="small muted check-note" id="check-note" role="status">{!config.relayUrl ? 'The free check needs the relay, which is not set up yet.' : !ownCode.ready ? 'Resolve your repository in step 2 before continuing.' : check.gate || (issues.length ? 'Fill in what is missing above to unlock the launch.' : 'The free check sends this request to IMD. No wallet, payment or launch.')}</p>
    </div>
    <div className="hc-foot">
    <div className="cost"><span>Swarm fee <strong>0.5 IMD</strong></span><span>Gas <strong>2 tx</strong></span></div>
    <p className="launch-wait">{LAUNCH_WAIT}{automatic.proven && <span className="audited-stack">This stack starts from audited code.</span>}</p>
    <div className="hc-actions">
      <button className="btn" type="button" disabled={!config.relayUrl || check.busy || !sourceReady || issues.length > 0 || check.consistency.length > 0} aria-describedby="check-note" onClick={() => void check.run()}>{check.busy ? 'Checking with the swarm…' : 'Check with the swarm (free)'}</button>
      <button className="btn primary" type="button" disabled={!ready} aria-describedby="check-note"
        onClick={() => { if (ready) location.hash = '#launch'; }}>Continue to launch</button>
    </div>
    {check.error && <p className="field-error" role="alert">{check.error}</p>}
    <div className="exact"><span>The request the swarm receives, <span className={`num${text.length > MAX_TEXT ? ' over' : ''}`}>{text.length.toLocaleString('en-US')}</span> characters · <span className="num">{(bytes / 1024).toFixed(1)}</span> / 16 KiB</span><button className="btn tiny" type="button" onClick={() => openSheet(null)} aria-haspopup="dialog">Show exact text</button></div>
    </div>
  </div>;
  const findingsBox = <section className={`findings${findings.length ? '' : ' ok'}`} aria-labelledby="fx" id="findings">
    <h3 id="fx">{findings.length ? <>Fix before paying · <span className="num">{findings.length}</span></> : 'Nothing to fix'}</h3>
    {findings.length
      ? <><p className="small muted">Launch is locked until these are fixed. One line each.</p>
        <div className="list" tabIndex={0} aria-label="Findings">{findings.map(f => <div className="finding" key={f.key}>
          <strong>{f.title}</strong><button className="btn tiny" type="button" onClick={f.jump}>Jump to it<span className="sr">: {f.title}</span></button>
          {f.quote && <em>The request says <q>{f.quote}</q>.</em>}
        </div>)}</div></>
      : <p className="small">Nothing to fix. The request is consistent.</p>}
  </section>;

  return <section className="wrap page builder-page" aria-labelledby="builder-h">
    <div className="head">
      <div><h1 id="builder-h">Builder</h1><p className="muted">Drafts save in this browser. Nothing is sent until you launch.</p></div>
      <nav className="progress" aria-label="Progress">{STEPS.map((label, i) => <a key={label} href={`#builder`} className={i === now ? 'now' : done[i] ? 'done' : undefined} aria-current={i === now ? 'step' : undefined}
        onClick={e => { e.preventDefault(); document.getElementById(i === 4 ? 'hookcol' : `step-${i + 1}`)?.scrollIntoView({ block: 'start' }); }}><span className="num">{i + 1}</span> {label}</a>)}</nav>
    </div>
    {storageError && <div className="notice" role="alert">This browser is not saving your draft. Allow site storage to keep it after a reload.</div>}
    {correction && <section className="notice correction" aria-labelledby="correction-h"><h2 id="correction-h">Needs attention</h2><p>IMD stopped the previous request with this question. Edit the draft below before relaunching; a new launch spends a new fee.</p>{correction.questions.map((question, i) => <blockquote key={i}><Text>{question}</Text></blockquote>)}<details><summary>Previous request as sent</summary><pre>{correction.request}</pre></details><a href={correction.hookRoute}>Return to the original launch</a></section>}
    <div className="b2">
      <div className="steps">{typeStep}{howStep}{blocksStep}{settingsStep}</div>
      <aside className="hookcol" id="hookcol" aria-label="The hook you are building">
        {card}
        {findingsBox}
        {check.result && <div className="understood">{<SwarmPanel result={check.result} conflicts={check.conflicts} objective={text} />}</div>}
      </aside>
    </div>
    <dialog ref={dialog} className="sheet" aria-labelledby="sheet-h" onClose={() => setSheet(null)}>
      <div className="sheet-head"><h2 id="sheet-h">Exact text the swarm receives</h2><div className="sheet-tools"><button className="btn tiny" type="button" onClick={() => void copy()}>Copy</button><button className="btn tiny" type="button" onClick={() => dialog.current?.close()}>Close</button></div></div>
      <p className="small muted copied" role="status">{copied}</p>
      <pre id="composed">{marked(text, phrases)}</pre>
    </dialog>
  </section>;
}
