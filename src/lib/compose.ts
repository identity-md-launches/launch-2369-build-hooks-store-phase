// SPEC 4 and 5: the block catalog, the combination rules of 4.10, the description text of 5.1 and the body of 5.2.
// Pure functions only, so the same code runs in the Builder and in `node --test`.
import catalogJson from '../blocks/catalog.json' with { type: 'json' };

export type LaunchType = 'A' | 'B' | 'C';
export type Mode = 'prompt' | 'blocks';
export type ParamValue = string | number;
export type Fn = { sig: string; label: string };
export type Param = {
  k: string; label: string; type: 'number' | 'text' | 'select' | 'address' | 'datetime' | 'textarea'; default: ParamValue;
  min?: number; max?: number; step?: number; unit?: string; options?: string[]; minLength?: number; maxLength?: number;
  pattern?: string; patternHint?: string; empty?: string;
};
export type BlockDef = {
  id: string; group: string; title: string; blurb: string; types: LaunchType[]; params: Param[]; short: string; sentence: string;
  who: string; fixed?: boolean; ownerPower?: string; requires?: string; excludes?: string; replaces?: string; risk?: string;
  owner?: Fn[]; anyone?: Fn[]; user?: Fn[]; view?: Fn[];
};
export type BlockEntry = { id: string; p: Record<string, ParamValue> };
export type Settings = {
  chain: number | null; pair: 'eth' | 'imd'; pool: number | null; rem: string; owner: string;
  token: string; tsym: string; hname: string; repo: string; commit: string;
};
export type Draft = { v: 2; type: LaunchType; mode: Mode | null; prompt: string; blocks: BlockEntry[]; settings: Settings; seeded: boolean };
export type Issue = { field: string; message: string };

export const CATALOG = catalogJson as { version: number; groups: { id: string; title: string }[]; blocks: BlockDef[] };
export const BLOCKS: BlockDef[] = CATALOG.blocks;
export const BY_ID: Record<string, BlockDef> = Object.fromEntries(BLOCKS.map(b => [b.id, b]));
export const TOKEN_IDS = ['token', 'own-token'];
export const CHAIN_NAMES: Record<number, string> = { 4663: 'Robinhood Chain', 1: 'Ethereum' };
export const POOL_MANAGERS: Record<number, string> = {
  1: '0x000000000004444c5dc75cB358380D2e3dE08A90',
  4663: '0x8366a39CC670B4001A1121B8F6A443A643e40951',
};
export const MAX_TEXT = 7500;
export const MAX_WORDS = 3000;
export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_ETH_RATE = 5;
export const DEFAULT_STACK = ['swap-fee', 'anti-sniper', 'jar'];

export const defaults = (def: BlockDef): Record<string, ParamValue> => Object.fromEntries(def.params.map(x => [x.k, x.default]));
export const entry = (id: string): BlockEntry => ({ id, p: defaults(BY_ID[id]) });
export const emptySettings = (): Settings => ({ chain: null, pair: 'imd', pool: null, rem: '', owner: '', token: '', tsym: '', hname: '', repo: '', commit: '' });
export const newDraft = (): Draft => ({ v: 2, type: 'A', mode: null, prompt: '', blocks: [entry('token')], settings: emptySettings(), seeded: false });

/** Quotes, backslashes, angle brackets and line breaks become spaces (5.1). */
export const cleanText = (s: unknown) => String(s ?? '').replace(/["\\<>\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
const fixed1 = (v: ParamValue) => { const n = Number(v); return Number.isFinite(n) ? n.toFixed(1) : String(v); };
const grouped = (v: ParamValue) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const [whole, frac] = String(Math.abs(n)).split('.');
  return (n < 0 ? '-' : '') + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? '.' + frac : '');
};
export const shortAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a) ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
export const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a.trim());

export type Context = { symbol: string; name: string };
export function tokenEntry(d: Draft) { return d.blocks.find(b => TOKEN_IDS.includes(b.id)); }
export function context(d: Draft): Context {
  const t = tokenEntry(d), s = d.settings;
  if (d.type === 'A' && t) return { symbol: String(t.p.symbol || 'TOKEN'), name: String(t.p.name || 'Untitled') };
  if (d.type === 'C') return { symbol: s.tsym.trim() || 'the token', name: s.hname.trim() || 'Untitled hook' };
  return { symbol: 'the pool’s token', name: s.hname.trim() || 'Untitled hook' };
}

/** Renders a catalog template: {k} raw, {k:1} one decimal, {k:n} digit groups, {k:rest} 100 minus k, {@symbol} from the launch. */
export function fill(template: string, def: BlockDef, p: Record<string, ParamValue>, ctx: Context) {
  return template.replace(/\{(@?)(\w+)(?::(\w+))?\}/g, (_m, at: string, k: string, fmt?: string) => {
    if (at) return ctx[k as keyof Context] ?? '';
    const param = def.params.find(x => x.k === k);
    const v = p[k] ?? param?.default ?? '';
    if (String(v).trim() === '' && fmt !== 'rest') return param?.empty ?? '';
    switch (fmt) {
      case '1': return fixed1(v);
      case 'n': return grouped(v);
      case 'rest': return String(100 - (Number(v) || 0));
      case 'short': return shortAddress(String(v));
      case 'act': return String(v).startsWith('burn') ? 'burn' : 'to treasury';
      case 'clean': return cleanText(v);
      case 'clip': { const c = cleanText(v); return c.length > 48 ? c.slice(0, 48) + '…' : c; }
      default: return String(v);
    }
  });
}
export const sentenceOf = (b: BlockEntry, ctx: Context) => fill(BY_ID[b.id].sentence, BY_ID[b.id], b.p, ctx);
export const shortOf = (b: BlockEntry, ctx: Context) => fill(BY_ID[b.id].short, BY_ID[b.id], b.p, ctx);
export const functionsOf = (def: BlockDef) => [...(def.owner ?? []), ...(def.anyone ?? []), ...(def.user ?? []), ...(def.view ?? [])];

export const available = (def: BlockDef, type: LaunchType) => def.types.includes(type);
export const has = (d: Draft, id: string) => d.blocks.some(b => b.id === id);
export const behaviorBlocks = (d: Draft) => d.blocks.filter(b => !TOKEN_IDS.includes(b.id) && BY_ID[b.id]);
/** Blocks that go into the request: allowed by the launch type, in stack order. */
export const activeBlocks = (d: Draft) => behaviorBlocks(d).filter(b => available(BY_ID[b.id], d.type));
export const powersOf = (d: Draft) => activeBlocks(d).map(b => BY_ID[b.id].ownerPower).filter((x): x is string => !!x);
const walletOr = (v: string, wallet?: string) => v.trim() || wallet || 'the paying wallet';

/** Section 4.10: the ETH-side rates that must add up to at most 5%. */
export function rateTotal(d: Draft) {
  let total = 0;
  for (const b of activeBlocks(d)) {
    if (b.id === 'swap-fee' || b.id === 'jar' || b.id === 'pot') total += Number(b.p.rate) || 0;
    if (b.id === 'fee-size') total += Number(b.p.extra) || 0;
    if (b.id === 'fee-dir') total += Math.max(Number(b.p.buy) || 0, Number(b.p.sell) || 0);
  }
  return Math.round(total * 1000) / 1000;
}

/** Why a palette entry cannot be added right now, as its grey state pill; null when ADD is offered. */
export function blockedReason(d: Draft, def: BlockDef): string | null {
  if (def.fixed && d.type === 'A' && has(d, def.id)) return 'ALWAYS';
  if (has(d, def.id)) return 'ADDED';
  if (!available(def, d.type)) return def.group === 'token' ? 'TOKEN LAUNCH ONLY' : 'OWN POOLS ONLY';
  if (def.requires && !has(d, def.requires)) return `NEEDS ${BY_ID[def.requires].title.toUpperCase()}`;
  if (def.excludes && has(d, def.excludes)) return `REMOVE ${BY_ID[def.excludes].title.toUpperCase()} FIRST`;
  return null;
}

export function addBlock(d: Draft, id: string): Draft {
  const def = BY_ID[id];
  if (!def || blockedReason(d, def)) return d;
  if (TOKEN_IDS.includes(id)) {
    const old = tokenEntry(d);
    const next = { id, p: { ...defaults(def), ...(old ? { name: old.p.name, symbol: old.p.symbol } : {}) } };
    return { ...d, blocks: old ? d.blocks.map(b => b === old ? next : b) : [next, ...d.blocks] };
  }
  return { ...d, blocks: [...d.blocks, entry(id)] };
}
/** Removing a block also removes the blocks that need it (Swap fee takes Fee that fades, Split the fee and Share fees with LPs). */
export function removeBlock(d: Draft, index: number): Draft {
  const gone = d.blocks[index];
  if (!gone || TOKEN_IDS.includes(gone.id)) return d;
  return { ...d, blocks: d.blocks.filter((b, i) => i !== index && BY_ID[b.id]?.requires !== gone.id) };
}
export function moveBlock(d: Draft, index: number, delta: -1 | 1): Draft {
  const order = d.blocks.map((b, i) => ({ b, i })).filter(x => !TOKEN_IDS.includes(x.b.id));
  const at = order.findIndex(x => x.i === index), to = at + delta;
  if (at < 0 || to < 0 || to >= order.length) return d;
  const blocks = [...d.blocks];
  [blocks[order[at].i], blocks[order[to].i]] = [blocks[order[to].i], blocks[order[at].i]];
  return { ...d, blocks };
}
export function setParam(d: Draft, index: number, k: string, v: ParamValue): Draft {
  return { ...d, blocks: d.blocks.map((b, i) => i === index ? { ...b, p: { ...b.p, [k]: v } } : b) };
}

/** Section 5.1, line for line. */
export function compose(d: Draft, wallet?: string): string {
  const c = context(d), s = d.settings, chain = (s.chain ? CHAIN_NAMES[s.chain] : null) ?? '(choose a chain)', pm = s.chain ? POOL_MANAGERS[s.chain] ?? '' : '';
  const rules = activeBlocks(d).map(b => sentenceOf(b, c)), powers = powersOf(d);
  const words = cleanText(d.prompt).slice(0, MAX_WORDS), lines: string[] = [];
  if (d.type === 'A') {
    lines.push(`Launch ${c.name} (${c.symbol}) with a Uniswap v4 hook on ${chain}, paired with ${s.pair.toUpperCase()}.`);
    const t = tokenEntry(d) ?? entry('token');
    lines.push(sentenceOf(t, c));
  } else if (d.type === 'B') {
    lines.push(`Deploy one contract: ${c.name}, a standalone Uniswap v4 hook with no token and no pool of its own, on ${chain}. It must be usable by anyone initializing a new pool with it on the PoolManager passed as a constructor argument (${chain} PoolManager ${pm}).`);
  } else {
    lines.push(`Deploy one contract on ${chain}: ${c.name}, a Uniswap v4 hook for the existing token ${s.token.trim() || '0x…'}${s.tsym.trim() ? ` (${s.tsym.trim()})` : ''}, paired with ETH. No new token and no pool created by the launch; the creator will initialize the pool with this hook afterwards on the PoolManager passed as a constructor argument (${pm}).`);
  }
  if (words && rules.length) lines.push('The hook does exactly what the creator describes, plus the numbered rules, and nothing else. If the description and a numbered rule disagree, the numbered rule wins.');
  else if (words) lines.push('The hook does exactly what the creator describes below, and nothing else.');
  else lines.push('The hook does exactly the following, and nothing else:');
  if (words) lines.push(`In the creator’s own words: <description>${words}</description>`);
  rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  if (!words && !rules.length) lines.push('1. No swap-time behavior: the hook only implements the callback the launch factory requires and observes swaps.');
  lines.push(powers.length
    ? `Owner ${walletOr(s.owner, wallet)} may only: ${powers.join(', ')}, through the functions named above. No other admin function, no backend signer, no upgrade path.`
    : 'No owner functions, no backend signer, no upgrade path.');
  lines.push(`Fees are always taken from the ETH (pair currency) side, never from ${c.symbol}; a fee the PoolManager cannot pay directly is minted as a claim the recipient can redeem.`);
  if (d.type === 'A') {
    lines.push('Enable beforeInitialize (required by the IMD launch factory) and only the callbacks the behavior above needs. Take the PoolManager as a constructor argument. Owner, if any, is $owner.');
    if (s.pool !== null) lines.push(`Pool: ${s.pool}% of my 90% share seeds the pool; the remainder goes to ${walletOr(s.rem, wallet)}.`);
  } else {
    lines.push('Take the PoolManager as a constructor argument and enable only the callbacks the behavior above needs. The deployed address must carry the correct hook permission bits (mine a CREATE2 salt). Owner, if any, is $owner.');
  }
  if (s.repo.trim()) lines.push(`Start from the creator’s own source at ${s.repo.trim()}${s.commit.trim() ? ` commit ${s.commit.trim()}` : ''}: audit it as imported code, adapt it to this launch, and keep its behavior.`);
  lines.push(`Keep the function names exactly as written so the storefront can show them. Composed with The Hooks Store${rules.length ? ' block builder' : ''}.`);
  return lines.join('\n');
}

export type Body = Record<string, unknown>;
/** Section 5.2: univ4_hook for type A, evm_contracts for B and C. */
export function body(d: Draft, wallet?: string): Body {
  const s = d.settings, b: Body = { objective: compose(d, wallet) };
  if (d.type === 'A') {
    Object.assign(b, { shape: 'chain', references: ['uniswap-v4-hooks', 'uniswap-v4-security'], steps: [{ skill: 'build-contract-project' }, { skill: 'adversarial-review' }], onchain: 'univ4_hook', chainId: s.chain, pairWith: s.pair });
    if (s.owner.trim()) b.owner = s.owner.trim().toLowerCase();
    if (s.pool !== null) b.economics = { poolBps: s.pool * 100, ...(s.rem.trim() ? { remainderTo: s.rem.trim().toLowerCase() } : {}) };
    if (has(d, 'own-token')) b.customToken = true;
  } else {
    Object.assign(b, { onchain: 'evm_contracts', chainId: s.chain });
    if (s.owner.trim()) b.owner = s.owner.trim().toLowerCase();
  }
  if (s.repo.trim() && s.commit.trim()) { b.repoUrl = s.repo.trim(); b.baseCommit = s.commit.trim(); }
  b.github = true;
  return b;
}
export const bodyBytes = (b: Body) => new TextEncoder().encode(JSON.stringify(b)).length;

const validPool = (n: number | null) => n !== null && Number.isInteger(n) && n >= 10 && n <= 90 && n % 5 === 0;
/** Every rule of 4.10 plus field limits. Each issue names the field it belongs to so the form can show it inline. */
export function validate(d: Draft, wallet?: string): Issue[] {
  const issues: Issue[] = [], s = d.settings;
  d.blocks.forEach((b, i) => {
    const def = BY_ID[b.id];
    if (!def || (TOKEN_IDS.includes(b.id) ? d.type !== 'A' : !available(def, d.type))) return;
    for (const x of def.params) {
      const v = b.p[x.k], f = `block:${i}:${x.k}`, str = String(v ?? '').trim();
      if (x.type === 'number') {
        const n = Number(v);
        if (str === '' || !Number.isFinite(n)) issues.push({ field: f, message: `${x.label}: enter a number.` });
        else if ((x.min !== undefined && n < x.min) || (x.max !== undefined && n > x.max)) issues.push({ field: f, message: `${x.label}: use ${x.min} to ${x.max}${x.unit ? ' ' + x.unit : ''}.` });
        else if (x.step === 1 && !Number.isInteger(n)) issues.push({ field: f, message: `${x.label}: use a whole number.` });
      } else if (x.type === 'address') {
        if (!isAddress(str)) issues.push({ field: f, message: `${x.label}: enter a full 0x address (40 hex characters).` });
      } else if (x.type === 'datetime') {
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(str) || Number.isNaN(Date.parse(str.replace(' ', 'T') + ':00Z'))) issues.push({ field: f, message: `${x.label}: write it as YYYY-MM-DD HH:MM in UTC.` });
      } else {
        if (b.id === 'custom' && !cleanText(v)) issues.push({ field: f, message: 'Write the custom rule, or remove the block.' });
        if (x.minLength !== undefined && str.length < x.minLength) issues.push({ field: f, message: `${x.label}: required.` });
        if (x.maxLength !== undefined && str.length > x.maxLength) issues.push({ field: f, message: `${x.label}: at most ${x.maxLength} characters.` });
        if (x.pattern && !new RegExp(x.pattern).test(str)) issues.push({ field: f, message: `${x.label}: ${x.patternHint}.` });
      }
    }
    if (b.id === 'fee-fade' && Number(b.p.end) >= Number(b.p.start)) issues.push({ field: `block:${i}:end`, message: 'End: must be lower than the start rate.' });
    if (b.id === 'lp-fee' && Number(b.p.lo) >= Number(b.p.hi)) issues.push({ field: `block:${i}:hi`, message: 'High: must be above the low rate.' });
    if (b.id === 'hours' && Number(b.p.from) === Number(b.p.to)) issues.push({ field: `block:${i}:to`, message: 'To: must differ from the opening hour.' });
    if (def.requires && !has(d, def.requires)) issues.push({ field: `block:${i}`, message: `${def.title} needs ${BY_ID[def.requires].title}.` });
    if (def.excludes && has(d, def.excludes)) issues.push({ field: `block:${i}`, message: `${def.title} cannot be combined with ${BY_ID[def.excludes].title}.` });
  });
  if (s.chain === null || !CHAIN_NAMES[s.chain]) issues.push({ field: 'settings.chain', message: 'Choose a deploy chain: Robinhood Chain or Ethereum.' });
  const ids = d.blocks.map(b => b.id);
  if (new Set(ids).size !== ids.length) issues.push({ field: 'rules', message: 'Each block can be added once.' });
  const rate = rateTotal(d);
  if (rate > MAX_ETH_RATE) issues.push({ field: 'rates', message: `Fees total ${fixed1(rate)}%. All ETH-side fees together (swap fee or the larger buy/sell fee, whale fee, buyback jar, prize pot) must stay at or below 5%.` });
  if (d.type !== 'A' && !cleanText(d.prompt) && !activeBlocks(d).length) issues.push({ field: 'rules', message: 'Describe your hook or add at least one block.' });
  if (d.prompt.length > MAX_WORDS) issues.push({ field: 'prompt', message: 'Your description is longer than 3,000 characters.' });
  if (d.type === 'A') {
    if (!validPool(s.pool)) issues.push({ field: 'settings.pool', message: 'Choose the pool share: 10 to 90, in steps of 5.' });
    if (s.rem.trim() && !isAddress(s.rem)) issues.push({ field: 'settings.rem', message: 'Remainder: enter a full 0x address, or leave it empty for the paying wallet.' });
  } else {
    if (!/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(s.hname.trim())) issues.push({ field: 'settings.hname', message: 'Hook name: letters and digits, starting with a letter, up to 40.' });
  }
  if (d.type === 'C') {
    if (!isAddress(s.token)) issues.push({ field: 'settings.token', message: 'Existing token: enter its full 0x address.' });
    if (s.tsym.trim() && !/^[A-Za-z0-9.$-]{1,11}$/.test(s.tsym.trim())) issues.push({ field: 'settings.tsym', message: 'Symbol: up to 11 letters or digits.' });
  }
  if (s.owner.trim() && !isAddress(s.owner)) issues.push({ field: 'settings.owner', message: 'Owner: enter a full 0x address, or leave it empty for the paying wallet.' });
  if (s.repo.trim() || s.commit.trim()) {
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(s.repo.trim())) issues.push({ field: 'settings.repo', message: 'Repository: a public https://github.com/owner/name URL.' });
    if (!/^[0-9a-f]{40}$/.test(s.commit.trim())) issues.push({ field: 'settings.commit', message: 'Commit: the full 40-character commit id.' });
  }
  const text = compose(d, wallet);
  if (text.length > MAX_TEXT) issues.push({ field: 'length', message: `The request is ${grouped(text.length)} characters; the limit is 7,500.` });
  if (bodyBytes(body(d, wallet)) >= MAX_BODY_BYTES) issues.push({ field: 'length', message: 'The request body is over 16 KiB.' });
  return issues;
}

/** Accepts any stored value (including job 1's `{ prompt, mode }`) and returns a complete draft. */
export function normalizeDraft(raw: unknown): Draft {
  const d = newDraft();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  if (r.type === 'A' || r.type === 'B' || r.type === 'C') d.type = r.type;
  if (r.mode === 'prompt' || r.mode === 'blocks') d.mode = r.mode;
  if (typeof r.prompt === 'string') d.prompt = r.prompt.slice(0, MAX_WORDS);
  if (typeof r.seeded === 'boolean') d.seeded = r.seeded;
  if (Array.isArray(r.blocks)) {
    const seen = new Set<string>(), blocks: BlockEntry[] = [];
    for (const item of r.blocks) {
      const id = item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined;
      if (typeof id !== 'string' || !BY_ID[id] || seen.has(id) || (TOKEN_IDS.includes(id) && blocks.some(b => TOKEN_IDS.includes(b.id)))) continue;
      seen.add(id);
      const p = (item as { p?: unknown }).p, given = p && typeof p === 'object' ? p as Record<string, unknown> : {};
      const values = defaults(BY_ID[id]);
      for (const x of BY_ID[id].params) if (typeof given[x.k] === 'string' || typeof given[x.k] === 'number') values[x.k] = given[x.k] as ParamValue;
      blocks.push({ id, p: values });
    }
    if (!blocks.some(b => TOKEN_IDS.includes(b.id))) blocks.unshift(entry('token'));
    else blocks.sort((a, b) => Number(TOKEN_IDS.includes(b.id)) - Number(TOKEN_IDS.includes(a.id)));
    d.blocks = blocks;
  }
  const s = r.settings && typeof r.settings === 'object' ? r.settings as Record<string, unknown> : {};
  if (typeof s.chain === 'number' && CHAIN_NAMES[s.chain]) d.settings.chain = s.chain;
  if (s.pair === 'eth' || s.pair === 'imd') d.settings.pair = s.pair;
  if (typeof s.pool === 'number' && Number.isFinite(s.pool)) d.settings.pool = s.pool;
  for (const k of ['rem', 'owner', 'token', 'tsym', 'hname', 'repo', 'commit'] as const) if (typeof s[k] === 'string') d.settings[k] = s[k] as string;
  return d;
}
