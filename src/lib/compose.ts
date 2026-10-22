// SPEC 4 and 5: the block catalog, the combination rules of 4.10, the description text of 5.1 and the body of 5.2.
// Pure functions only, so the same code runs in the Builder and in `node --test`.
import catalogJson from '../blocks/catalog.json' with { type: 'json' };
import { writtenFeeClauses, writtenFeeRateTotal, writtenFeeTargets } from './writtenFees.ts';

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
  who: string; fixed?: boolean; ownerPower?: string; requires?: string; requiresAny?: string[]; excludes?: string[]; replaces?: string; risk?: string;
  disabled?: string; optionSentences?: Record<string, string>;
  owner?: Fn[]; anyone?: Fn[]; user?: Fn[]; view?: Fn[];
  dependencies?: { name: string; addresses: Record<string, string> }[];
  legacySentences?: string[];
};
export type BlockEntry = { id: string; p: Record<string, ParamValue>; legacy?: boolean };
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

export const IMD_TREASURY = '0x3f252e859a277a86A3967c11D4E054B2f07a1F22';
export const IMD_FEE_OPT_OUT = 'do not convert the fee to ETH and do not use any other pool';
export const pairCurrency = (d: Draft) => d.type === 'A' && d.settings.pair === 'imd' ? 'IMD' : 'ETH';
export type Context = { symbol: string; name: string; pair?: string; wallet?: string; destination?: string; jarAction?: string; feeBasis?: string; walletLimit?: string; baseRate?: string; feeApplies?: string; type?: LaunchType };
export function tokenEntry(d: Draft) { return d.blocks.find(b => TOKEN_IDS.includes(b.id)); }
export function context(d: Draft, wallet?: string): Context {
  const t = tokenEntry(d), s = d.settings;
  const c: Context = d.type === 'A' && t ? { symbol: String(t.p.symbol || 'TOKEN'), name: String(t.p.name || 'Untitled') }
    : d.type === 'C' ? { symbol: s.tsym.trim() || 'the token', name: s.hname.trim() || 'Untitled hook' }
    : { symbol: 'the pool’s token', name: s.hname.trim() || 'Untitled hook' };
  const payingWallet = wallet && isAddress(wallet) ? wallet : 'the paying wallet (connect to resolve its address)';
  const fee = activeBlocks(d).find(b => b.id === 'swap-fee' || b.id === 'fee-dir');
  const to = String(fee?.p.to ?? 'my wallet');
  const pair = pairCurrency(d);
  return { ...c, type: d.type, pair, wallet: payingWallet,
    destination: activeBlocks(d).some(b => b.id === 'fee-split') ? 'distribute it as specified by Split the fee'
      : `send it to ${to === "IMD's treasury" || to === 'treasury address' ? IMD_TREASURY : to === 'my wallet' ? payingWallet : to}`,
    feeBasis: `Fees are computed on the amount actually traded; when the swap specifies its ${pair} amount and the pool fills only part of it, the swap reverts rather than overpaying.`,
    walletLimit: 'A wallet means tx.origin; several wallets or a shared relayer can defeat the limit.',
    baseRate: fixed1(fee?.p.rate ?? 0), feeApplies: String(fee?.p.applies ?? 'buy and sell'),
    jarAction: d.type === 'A' ? t?.id === 'own-token' ? "burn the bought tokens with the token's burn(uint256)" : 'keep the bought tokens in the hook forever; no function can move them'
      : "attempt to burn with the token's burn(uint256); if it has none, or the burn call reverts, keep them in the hook forever; no function can move retained tokens",
  };
}

/** Renders a catalog template: {k} raw, {k:1} one decimal, {k:n} digit groups, {k:rest} 100 minus k, {@symbol} from the launch. */
export function fill(template: string, def: BlockDef, p: Record<string, ParamValue>, ctx: Context) {
  return template.replace(/\{(@?)(\w+)(?::(\w+))?\}/g, (_m, at: string, k: string, fmt?: string) => {
    if (at) return ctx[k as keyof Context] ?? (k === 'pair' ? 'ETH' : '');
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
export const sentenceOf = (b: BlockEntry, ctx: Context) => fill(BY_ID[b.id].optionSentences?.[String(b.p.who)] ?? BY_ID[b.id].sentence, BY_ID[b.id], b.p, ctx);
export const shortOf = (b: BlockEntry, ctx: Context) => fill(BY_ID[b.id].short, BY_ID[b.id], b.p, ctx);
export const functionsOf = (def: BlockDef) => [...(def.owner ?? []), ...(def.anyone ?? []), ...(def.user ?? []), ...(def.view ?? [])];

export const available = (def: BlockDef, type: LaunchType) => def.types.includes(type);
export const has = (d: Draft, id: string) => d.blocks.some(b => b.id === id);
export const behaviorBlocks = (d: Draft) => d.blocks.filter(b => !TOKEN_IDS.includes(b.id) && BY_ID[b.id]);
/** Blocks that go into the request: allowed by the launch type, in stack order. */
export const activeBlocks = (d: Draft) => d.mode === 'prompt' ? [] : behaviorBlocks(d).filter(b => available(BY_ID[b.id], d.type));
export const powersOf = (d: Draft) => activeBlocks(d).map(b => b.id === 'donate' && b.p.who !== 'only allowlisted addresses' ? undefined : BY_ID[b.id].ownerPower).filter((x): x is string => !!x);
const walletOr = (v: string, wallet?: string) => v.trim() || wallet || 'the paying wallet';

/** Section 4.10: the highest simultaneous pair-side rate, including replacement schedules. */
export function rateTotal(d: Draft) {
  let total = 0, base = 0;
  for (const b of activeBlocks(d)) {
    if (b.id === 'swap-fee') base = Math.max(base, Number(b.p.rate) || 0);
    if (b.id === 'fee-fade') base = Math.max(base, Number(b.p.start) || 0);
    if (b.id === 'fee-vol') base = Math.max(base, Number(b.p.fee) || 0);
    if (b.id === 'jar' || b.id === 'pot') total += Number(b.p.rate) || 0;
    if (b.id === 'fee-size') total += Number(b.p.extra) || 0;
    if (b.id === 'fee-dir') base = Math.max(base, Number(b.p.buy) || 0, Number(b.p.sell) || 0);
  }
  return Math.round((total + base) * 1000) / 1000 + writtenFeeRateTotal(writtenRules(d).join('\n'));
}

/** Why a palette entry cannot be added right now, as its grey state pill; null when ADD is offered. */
export function blockedReason(d: Draft, def: BlockDef): string | null {
  if (def.fixed && d.type === 'A' && has(d, def.id)) return 'ALWAYS';
  if (has(d, def.id)) return 'ADDED';
  if (def.disabled) return def.disabled;
  if (!available(def, d.type)) return def.group === 'token' ? 'TOKEN LAUNCH ONLY' : 'OWN POOLS ONLY';
  if (d.settings.chain && def.dependencies?.some(dep => !isAddress(dep.addresses[String(d.settings.chain)] ?? ''))) return 'NO VERIFIED DEPLOYMENT';
  if (def.requires && !has(d, def.requires)) return `NEEDS ${BY_ID[def.requires].title.toUpperCase()}`;
  if (def.requiresAny && !def.requiresAny.some(id => has(d, id))) return `NEEDS ${def.requiresAny.map(id => BY_ID[id].title.toUpperCase()).join(' OR ')}`;
  const excluded = d.blocks.find(b => def.excludes?.includes(b.id) || BY_ID[b.id]?.excludes?.includes(def.id));
  if (excluded) return `REMOVE ${BY_ID[excluded.id].title.toUpperCase()} FIRST`;
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
  let blocks = d.blocks.filter((_, i) => i !== index);
  let previous;
  do { previous = blocks.length; blocks = blocks.filter(b => {
    const def = BY_ID[b.id];
    return !def || (!def.requires || blocks.some(x => x.id === def.requires)) && (!def.requiresAny || def.requiresAny.some(id => blocks.some(x => x.id === id)));
  }); } while (blocks.length !== previous);
  return { ...d, blocks };
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

const writtenRules = (d: Draft) => [cleanText(d.prompt).slice(0, MAX_WORDS), ...activeBlocks(d).filter(b => b.id === 'custom').map(b => cleanText(b.p.text))].filter(Boolean);

/** SPEC 4.16 overrides the older section 5 templates. */
export function compose(d: Draft, wallet?: string): string {
  const c = context(d, wallet), s = d.settings, chain = (s.chain ? CHAIN_NAMES[s.chain] : null) ?? '(choose a chain)', pm = s.chain ? POOL_MANAGERS[s.chain] ?? '' : '';
  const blocks = activeBlocks(d), powers = powersOf(d);
  // Custom prose never outranks a numbered catalog rule, even when reordered.
  const rules = blocks.filter(b => b.id !== 'custom').map(b => sentenceOf(b, c));
  const custom = blocks.filter(b => b.id === 'custom').map(b => cleanText(b.p.text)).filter(Boolean);
  const words = cleanText(d.prompt).slice(0, MAX_WORDS), written = [words, ...custom].filter(Boolean), lines: string[] = [];
  const owner = walletOr(s.owner, wallet), recipient = feeRecipient(d, wallet);
  if (d.type === 'A') {
    lines.push(`Launch ${c.name} (${c.symbol}) with a Uniswap v4 hook on ${chain}, paired with ${s.pair.toUpperCase()}.`);
    const t = tokenEntry(d) ?? entry('token');
    lines.push(sentenceOf(t, c));
    lines.push(`beforeInitialize accepts only the IMD launch factory, passed as the constructor argument $factory; any other initialization reverts; the hook serves only the pool the factory initializes. Constructor arguments: the ${chain} PoolManager ${pm}, $owner and $factory.`);
  } else {
    lines.push(`Deploy one contract, ${c.name}Deployer, on ${chain}: its constructor takes the ${chain} PoolManager ${pm}, $owner and the fee recipient ${recipient}, takes no salt argument, starts at salt 0 and increments until the CREATE2 address carries the hook's permission flags, then creates ${c.name} in the launch transaction, passing the PoolManager, $owner and fee recipient unchanged to the hook constructor; neither constructor calls any other contract (apart from the deployer creating the hook). There is no deploy function to call afterwards; hook() returns the hook's address. Enable only the callbacks the behavior below needs.`);
    if (d.type === 'B') lines.push(`${c.name} is a standalone Uniswap v4 hook with no new token and no pool of its own; anyone may initialize an eligible pool with it.`);
    else lines.push(`${c.name} is a Uniswap v4 hook for the existing token ${s.token.trim() || '(enter the token address)'}${s.tsym.trim() ? ` (${s.tsym.trim()})` : ''}; only pools of native ETH and ${s.token.trim() || '(enter the token address)'} may use it. No new token and no pool created by the launch; the creator initializes the pool afterwards.`);
    lines.push('Only pools whose currency0 is native ETH may be initialized with this hook; any other initialization reverts.');
    lines.push("In this hook, the token is the pool's non-ETH currency and its total supply is that token's totalSupply().");
  }
  if (d.type === 'A') lines.push(`In this hook, the token is ${c.name} (${c.symbol}), the launch token; its total supply is that token's totalSupply().`);
  lines.push('Every pool-dependent view, state, window and limit is keyed by PoolId and isolated per pool; pass the pool id to each pool-dependent function.');
  if (written.length && rules.length) lines.push('The hook does exactly what the creator describes, plus the numbered rules, and nothing else. If the description and a numbered rule disagree, the numbered rule wins. A numbered block rule also wins over the Custom rule.');
  else if (written.length) lines.push('The hook does exactly what the creator describes below, and nothing else.');
  else lines.push('The hook does exactly the following, and nothing else:');
  if (words) lines.push(`In the creator’s own words: <description>${words}</description>`);
  custom.forEach(text => lines.push(`Custom rule: <custom>${text}</custom>`));
  rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  if (!written.length && !rules.length) lines.push('1. No swap-time behavior; enable only the callbacks needed for initialization.');
  lines.push(written.length
    ? `Owner ${owner} is $owner. Permit only the owner functions expressly granted by the written rules${powers.length ? ` and these block powers: ${powers.join(', ')}` : ''}; a numbered block rule wins on conflict. No backend signer, no upgrade path.`
    : powers.length ? `Owner ${owner} may only: ${powers.join(', ')}, through the functions named above. No other admin function, no backend signer, no upgrade path.`
    : `Owner ${owner} is $owner. No owner functions, no backend signer, no upgrade path.`);
  const hasWrittenFees = written.some(text => writtenFeeClauses(text).length);
  const hasFees = hasWrittenFees || blocks.some(b => ['swap-fee', 'fee-dir', 'fee-size', 'fee-fade', 'fee-vol', 'jar', 'pot'].includes(b.id));
  if (hasFees) lines.push(`Fees are always taken from the ${pairCurrency(d)} (pair currency) side, never from ${c.symbol};${hasWrittenFees ? ` settled in ${pairCurrency(d)};` : ''} a fee the PoolManager cannot pay directly is minted as a claim the recipient can redeem. ${blocks.some(b => b.id === 'fee-split') ? 'Fee recipients are exactly the addresses in Split the fee; all claims and no-liquidity fallbacks follow that split.' : `Fee recipient: ${recipient}.`}`);
  else lines.push('Hook fee rate: 0%.');
  if (hasWrittenFees) lines.push(c.feeBasis!);
  if (pairCurrency(d) === 'IMD') {
    lines.push(`Keep every hook fee in IMD: ${IMD_FEE_OPT_OUT}.`);
    lines.push('The launch token may be currency0 or currency1; handle both orders.');
  }
  if (!blocks.some(b => b.id === 'yield')) lines.push('The hook uses no outside pool, token, price feed or service; every price it needs comes from its own pool.');
  lines.push('Use mulDiv for every percentage calculation, including fees, shares, limits and price moves, to avoid intermediate multiplication overflow.');
  if (d.type === 'A') {
    lines.push('The launch factory ($factory) may always add liquidity and collect fees with a zero-change modify. Enable beforeInitialize and only the callbacks the behavior above needs.');
    if (s.pool !== null) lines.push(`Pool: ${s.pool}% of the total supply seeds the pool; 10% goes to the swarm; the remaining ${90 - s.pool}% goes to ${walletOr(s.rem, wallet)}. economics.poolBps=${s.pool * 100}, in basis points of the total supply.`);
  }
  if (s.repo.trim()) lines.push(`Start from the creator’s own source at ${s.repo.trim()}${s.commit.trim() ? ` commit ${s.commit.trim()}` : ''}: audit it as imported code, adapt it to this launch, and keep its behavior.`);
  lines.push(`Keep the function names exactly as written so the storefront can show them. Composed with The Hooks Store${blocks.length ? ' block builder' : ''}.`);
  return lines.join('\n');
}

export const feeRecipient = (d: Draft, wallet?: string): string => {
  if (activeBlocks(d).some(b => b.id === 'fee-split')) return walletOr('', wallet);
  const fee = activeBlocks(d).find(b => b.id === 'swap-fee' || b.id === 'fee-dir');
  if (!fee) {
    const targets = [...new Map(writtenFeeTargets(writtenRules(d).join('\n')).map(target => {
      const resolved =
      /^(?:the )?owner$/i.test(target) ? walletOr(d.settings.owner, wallet)
        : /^(?:IMD['’]s )?treasury$/i.test(target) ? IMD_TREASURY
        : /^my wallet$/i.test(target) ? walletOr('', wallet) : target;
      return [resolved.toLowerCase(), resolved];
    })).values()];
    if (targets.length === 1) return targets[0];
    if (targets.length > 1) return 'the unresolved written fee recipient';
  }
  const choice = String(fee?.p.to ?? 'my wallet');
  return choice === "IMD's treasury" || choice === 'treasury address' ? IMD_TREASURY : choice === 'my wallet' ? walletOr('', wallet) : choice;
};
export type Body = Record<string, unknown>;
/** Section 5.2, with references and an explicit owner for every launch kind. */
export function body(d: Draft, wallet?: string): Body {
  const s = d.settings, b: Body = { objective: compose(d, wallet), references: ['uniswap-v4-hooks', 'uniswap-v4-security'], owner: s.owner.trim() || wallet || '' };
  if (d.type === 'A') {
    Object.assign(b, { shape: 'chain', steps: [{ skill: 'build-contract-project' }, { skill: 'adversarial-review' }], onchain: 'univ4_hook', chainId: s.chain, pairWith: s.pair });
    if (s.pool !== null) b.economics = { poolBps: s.pool * 100, ...(s.rem.trim() ? { remainderTo: s.rem.trim().toLowerCase() } : {}) };
    if (tokenEntry(d)?.id === 'own-token') b.customToken = true;
  } else Object.assign(b, { onchain: 'evm_contracts', chainId: s.chain });
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
    if (!def || (TOKEN_IDS.includes(b.id) ? d.type !== 'A' : d.mode === 'prompt' || !available(def, d.type))) return;
    if (def.disabled) issues.push({ field: `block:${i}`, message: `${def.title}: ${def.disabled}. Remove it before continuing.` });
    for (const x of def.params) {
      const v = b.p[x.k], f = `block:${i}:${x.k}`, str = String(v ?? '').trim();
      if (x.type === 'number') {
        const n = Number(v);
        if (str === '' || !Number.isFinite(n)) issues.push({ field: f, message: `${x.label}: enter a number.` });
        else if ((x.min !== undefined && n < x.min) || (x.max !== undefined && n > x.max)) issues.push({ field: f, message: `${x.label}: use ${x.min} to ${x.max}${x.unit ? ' ' + x.unit.replace('{@pair}', pairCurrency(d)) : ''}.` });
        else if (x.step === 1 && !Number.isInteger(n)) issues.push({ field: f, message: `${x.label}: use a whole number.` });
        else if (x.step && Math.abs((n - (x.min ?? 0)) / x.step - Math.round((n - (x.min ?? 0)) / x.step)) > 1e-7) issues.push({ field: f, message: `${x.label}: use increments of ${x.step}.` });
      } else if (x.type === 'address') {
        if (!isAddress(str)) issues.push({ field: f, message: `${x.label}: enter a full 0x address (40 hex characters).` });
      } else if (x.type === 'datetime') {
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(str) || Number.isNaN(Date.parse(str.replace(' ', 'T') + ':00Z'))) issues.push({ field: f, message: `${x.label}: write it as YYYY-MM-DD HH:MM in UTC.` });
      } else {
        if (b.id === 'custom' && !cleanText(v)) issues.push({ field: f, message: 'Write the custom rule, or remove the block.' });
        if (x.minLength !== undefined && str.length < x.minLength) issues.push({ field: f, message: `${x.label}: required.` });
        if (x.maxLength !== undefined && str.length > x.maxLength) issues.push({ field: f, message: `${x.label}: at most ${x.maxLength} characters.` });
        if (x.pattern && !new RegExp(x.pattern).test(str)) issues.push({ field: f, message: `${x.label}: ${x.patternHint}.` });
        if (x.options && !x.options.includes(str)) issues.push({ field: f, message: `${x.label}: choose one of the available options.` });
      }
    }
    if (b.id === 'fee-fade' && Number(b.p.start) <= Number(activeBlocks(d).find(x => x.id === 'swap-fee')?.p.rate ?? 0)) issues.push({ field: `block:${i}:start`, message: 'Start: must be above the Swap fee rate it fades to.' });
    if (b.id === 'lp-fee' && Number(b.p.lo) >= Number(b.p.hi)) issues.push({ field: `block:${i}:hi`, message: 'High: must be above the low rate.' });
    if (b.id === 'hours' && Number(b.p.from) === Number(b.p.to)) issues.push({ field: `block:${i}:to`, message: 'To: must differ from the opening hour.' });
    if (def.requires && !has(d, def.requires)) issues.push({ field: `block:${i}`, message: `${def.title} needs ${BY_ID[def.requires].title}.` });
    if (def.requiresAny && !def.requiresAny.some(id => has(d, id))) issues.push({ field: `block:${i}`, message: `${def.title} needs ${def.requiresAny.map(id => BY_ID[id].title).join(' or ')}.` });
    for (const excluded of def.excludes ?? []) if (has(d, excluded)) issues.push({ field: `block:${i}`, message: `${def.title} cannot be combined with ${BY_ID[excluded].title}.` });
  });
  if (s.chain === null || !CHAIN_NAMES[s.chain]) issues.push({ field: 'settings.chain', message: 'Choose a deploy chain: Robinhood Chain or Ethereum.' });
  const ids = d.blocks.map(b => b.id);
  if (new Set(ids).size !== ids.length) issues.push({ field: 'rules', message: 'Each block can be added once.' });
  const rate = rateTotal(d);
  if (rate > MAX_ETH_RATE) issues.push({ field: 'rates', message: `Fees total ${fixed1(rate)}%. All ${pairCurrency(d)}-side fees together (the highest swap, fade, volatility or buy/sell rate, plus whale fee, buyback jar, prize pot and written charges) must stay at or below 5%.` });
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
      for (const x of BY_ID[id].params) if (typeof given[x.k] === 'string' || typeof given[x.k] === 'number') {
        const value = given[x.k];
        values[x.k] = typeof value === 'string' ? x.options?.includes("IMD's treasury") && /treasury/.test(value) ? "IMD's treasury" : value.replace('treasury address', "IMD's treasury") : value as number;
      }
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
