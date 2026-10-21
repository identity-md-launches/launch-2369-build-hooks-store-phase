import { BLOCKS, IMD_FEE_OPT_OUT, POOL_MANAGERS, isAddress, type Body } from './compose.ts';
import knownQuestions from '../blocks/known-questions.json' with { type: 'json' };

export type SafetyFinding = { code: string; sentence: string; message: string };
export const KNOWN_QUESTIONS = knownQuestions;
const addressPattern = '0x[0-9a-fA-F]{40}';
const fullAddress = (value: string) => isAddress(value) && !/^0x0{40}$/i.test(value);
const sentences = (text: string) => text.split(/\n|(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
const numbered = (text: string) => Array.from(text.matchAll(/^\d+\. (.+)$/gm), m => m[1]);

/** Inspect the actual request bytes, including words/custom rules, independently of the catalog renderer. */
export function checkConsistency(input: Body): SafetyFinding[] {
  const text = typeof input.objective === 'string' ? input.objective : '';
  const currency = input.onchain === 'univ4_hook' && input.pairWith === 'imd' ? 'IMD' : 'ETH';
  const findings: SafetyFinding[] = [];
  const add = (code: string, sentence: string, message: string) => {
    if (!findings.some(f => f.code === code && f.sentence === sentence)) findings.push({ code, sentence, message });
  };
  if (!text) return [{ code: 'request', sentence: '(empty request)', message: 'Write a complete request before checking or launching.' }];
  const lines = sentences(text), rules = numbered(text);
  for (const sentence of lines) {
    // Both catalog prose and ordinary custom wording are checked. Explicit negations are exempt.
    const asserted = sentence.replace(/\b(?:do not|never|not)\s+(?:convert|sell|swap|settle|take|collect|charge)[^.;]*/gi, '');
    const feeContext = /fee|jar|pot|settle|every buy|every sell|every swap|%/i.test(asserted);
    if (feeContext) {
      const side = [...asserted.matchAll(/(?:of |from |on |whose |its |the )(?:(?:the|its) )?(ETH|IMD)(?: \(pair currency\))? side\b/gi)].map(m => m[1].toUpperCase());
      const settlement = [...asserted.matchAll(/(?:settl\w*|paid out|payout|pay(?:ment)?|collect\w*) (?:(?:the (?:fee|pot)|it|them) )?(?:in|as) (ETH|IMD)\b/gi)].map(m => m[1].toUpperCase());
      side.push(...[...asserted.matchAll(/% of (?:the )?(ETH|IMD)\b/gi)].map(m => m[1].toUpperCase()));
      if (side.some(value => value !== currency)) add('fee-side', sentence, `The fee side must be ${currency}, the pair currency.`);
      if (settlement.some(value => value !== currency)) add('fee-settlement', sentence, `Settle the fee in ${currency}, the pair currency.`);
      if (currency === 'IMD' && /(?:convert|sell|swap)\w* (?:the |an? |every |any )?(?:IMD[- ]side )?fee[^.;]*\b(?:to|for|into) ETH\b/i.test(asserted)) add('fee-conversion', sentence, 'Keep the fee in IMD. Conversion to ETH needs a different pool and conflicts with this pairing.');
    }
    if (/\b(?:my wallet|treasury address|the second address|connect to resolve|0x…|0x\.\.\.)\b/i.test(sentence)) add('recipient', sentence, 'Replace the recipient with its full address. Connect the paying wallet for “my wallet”.');
    for (const match of sentence.matchAll(/(?:send (?:it|them|the (?:bought |remaining )?tokens|the (?:fee|pot)) to|remainder goes to|\d+(?:\.\d+)?% to)\s+([^;,.]+(?:\.[^\s]+)?)/gi)) {
      const target = /^0x[\da-fA-F]{40}\b/.exec(match[1].trim())?.[0] ?? match[1].trim().split(/\s/)[0];
      if (!fullAddress(target)) add('recipient', sentence, 'Every fee or remainder recipient must be a full, nonzero address.');
    }
    const owner = /^Owner (.+?) may only:/.exec(sentence);
    if (owner && !fullAddress(owner[1])) add('recipient', sentence, 'Connect the paying wallet or enter a full owner address.');
    // Missing or shortened literal addresses never pass as recipients or dependencies.
    for (const match of sentence.matchAll(/\b0x[\da-z]+/gi)) if (!new RegExp(`^${addressPattern}$`).test(match[0])) add('address', sentence, 'Use a full address on the deploy chain.');
  }
  const chain = String(input.chainId);
  const opening = text.split('\n')[0];
  if (input.onchain === 'univ4_hook' && !opening.includes(`paired with ${currency}.`)) add('pairing', opening, `The request and launch body must both name the ${currency} pairing.`);
  if (!POOL_MANAGERS[Number(input.chainId)]) add('dependency', opening, 'Choose a supported deploy chain with a verified PoolManager.');
  if (input.onchain === 'evm_contracts') {
    const manager = POOL_MANAGERS[Number(input.chainId)];
    if (manager && !opening.toLowerCase().includes(manager.toLowerCase())) add('dependency', opening, 'Name the verified PoolManager address on the deploy chain.');
    const token = /existing token (\S+)/.exec(opening);
    if (token && !fullAddress(token[1].replace(/[,.]$/, ''))) add('dependency', opening, 'The existing token needs its full deploy-chain address.');
  }
  // A service is refused until an address has been verified for this chain. No guessed deployments.
  for (const block of BLOCKS.filter(b => b.dependencies?.length)) {
    for (const sentence of rules.filter(s => /ReHypothecationHook|\blent (?:on|out)\b/i.test(s))) {
      for (const dep of block.dependencies ?? []) if (!fullAddress(dep.addresses[chain] ?? '')) add('dependency', sentence, `${block.title} has no verified service address on this deploy chain. Remove this block or supply a verified deployment in a complete custom request.`);
    }
  }
  for (const sentence of lines.filter(s => /\b(?:use|using|read|via|through|from|on|depends on|convert|conversion)\b/i.test(s))) {
    if (findings.some(f => f.code === 'dependency' && f.sentence.includes(sentence))) continue;
    const dependencyText = sentence.replace(/\b(?:do not|never|not)\s+(?:use|read|depend on|call|swap through|convert through)[^.;]*/gi, '');
    const external = /\b(?:Chainlink|Aave|Morpho|Uniswap v[23] (?:pool|router)|(?:another|other|external|conversion|IMD\/ETH) pool|(?:external|price) feed|VRF|lending (?:pool|service))\b/i.test(dependencyText);
    const prohibition = /do not use any other pool|do not use another pool|no (?:other|external) pool/i.test(sentence);
    if (external && !prohibition && !new RegExp(addressPattern).test(sentence)) add('dependency', sentence, 'Name the pool, token or service address on the deploy chain, or remove that dependency.');
  }
  for (const rule of KNOWN_QUESTIONS) {
    if (rule.rule === 'pair-currency-fee' && currency === 'IMD' && rule.requireImdOptOut && !text.toLowerCase().includes(IMD_FEE_OPT_OUT.toLowerCase())) add(rule.id, rules.find(s => /fee|jar|pot/i.test(s)) ?? opening, rule.message);
  }
  const findRule = (pattern: RegExp) => rules.find(r => pattern.test(r));
  const conflict = (a: string | undefined, b: string | undefined, message: string) => { if (a && b) add('contradiction', `${a}\nConflicts with: ${b}`, message); };
  conflict(findRule(/^Take [\d.]+% of .* every buy and sell/), findRule(/^Take [\d.]+% of .* every buy and [\d.]+%/), 'Choose Swap fee or Different buy and sell fees.');
  conflict(findRule(/pool uses a dynamic LP fee/), findRule(/fee tier is [\d.]+%/), 'Dynamic LP fees conflict with a fixed Pool rules fee tier.');
  conflict(findRule(/PoolManager’s donate/), findRule(/Donations to the pool are allowed from (?:nobody|only the owner|only allowlisted addresses)/), 'LP fee sharing donates from the hook. The donation restriction must explicitly permit that, or be removed.');
  conflict(findRule(/Liquidity added to the pool is locked/), findRule(/Liquidity can always be removed while paused|Liquidity can still be removed during the pause/), 'A liquidity lock conflicts with the pause rule’s promise that liquidity can still be removed. Remove one rule or make the exception explicit.');
  const open = /Reject every swap before ([\d-]+ [\d:]+) UTC/.exec(text), sunset = /After ([\d-]+ [\d:]+) UTC every rule/.exec(text);
  if (open && sunset && Date.parse(sunset[1] + 'Z') <= Date.parse(open[1] + 'Z')) add('contradiction', `${open[0]}\nConflicts with: ${sunset[0]}`, 'Sunset must be after the scheduled opening.');
  const description = /<description>([\s\S]*?)<\/description>/.exec(text)?.[1] ?? '';
  const userRules = [...rules, description].filter(Boolean);
  conflict(userRules.find(s => /\b(?:(?:no|without(?: charging| taking| collecting)?(?: any)?) (?:hook |swap |buy |sell )?fees?|(?:never|do not) (?:take|charge|collect) (?:a |any )?fees?)\b/i.test(s)), userRules.find(s => /(?:Take|Collect) [\d.]+%|pays an extra [\d.]+%|hook fee .* is [\d.]+%/i.test(s)), 'The request both forbids fees and charges a fee. Remove one rule.');
  conflict(userRules.find(s => /\bowner (?:may|can|must)\b/i.test(s)), /^No owner functions[^\n]*/m.exec(text)?.[0], 'The request grants an owner power but its owner sentence forbids all owner functions. Add the matching owner-power block or remove the custom owner power.');
  conflict(userRules.find(s => /\b(?:no|without) owner (?:powers|functions)\b/i.test(s)), userRules.find(s => /\bowner (?:may|can|must)\b/i.test(s)), 'The request both forbids and grants owner powers. Remove one rule.');
  if (text.includes(IMD_FEE_OPT_OUT)) conflict(userRules.find(s => /\b(?:use|swap through|convert through) (?:an? |the )?(?:other|another|external|conversion) pool\b/i.test(s) && !/do not|never/i.test(s)), IMD_FEE_OPT_OUT, 'An IMD-paired request forbids other pools. Remove the external-pool rule.');
  conflict(userRules.find(s => /\b(?:sells are never blocked|never (?:block|reject) sells)\b/i.test(s)), userRules.find(s => /reject every swap|pause and unpause swaps|reject all others/i.test(s)), 'Unrestricted sells conflict with a rule that can reject all swaps. Clarify which rule applies to sells.');
  // Opposite literal custom rules cannot both be implemented. Do not claim to prove arbitrary prose.
  for (const a of userRules) for (const b of userRules) if (a !== b) {
    const action = /\b(?:never|do not) (pause swaps|block buys|block sells|mint tokens|burn tokens|charge fees)\b/i.exec(a)?.[1];
    if (action && new RegExp(`\\b(?:must|always) ${action}\\b`, 'i').test(b)) conflict(a, b, 'These rules require and forbid the same action. Edit the conflicting sentences.');
  }
  return findings;
}

export type FixedFact = { id: string; label: string; state: string; assumed?: string };
/** Fixed facts describe IMD defaults. An explicit, matching opt-out resolves an overridable default. */
export function fixedFactConflicts(input: Body, facts: FixedFact[]): SafetyFinding[] {
  const text = String(input.objective ?? ''), imd = input.onchain === 'univ4_hook' && input.pairWith === 'imd';
  const optedOut = text.toLowerCase().includes(IMD_FEE_OPT_OUT.toLowerCase());
  const conflicts: SafetyFinding[] = [];
  for (const fact of facts.filter(f => f.state === 'fixed')) {
    const factId = fact.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[.!?]\\s+|<description>)Opt out of fixed fact ${factId}\\.(?:\\s|<|$)`, 'i').test(text)) continue;
    const claim = `${fact.label} ${fact.assumed ?? ''}`;
    if (imd && /fee/i.test(claim) && /ETH/i.test(claim) && /(?:sell|sold|convert|taken in|settled in|settle in)/i.test(claim) && !optedOut) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: `IMD's fixed fact conflicts with keeping fees in IMD. Add the explicit opt-out: “${IMD_FEE_OPT_OUT}”.` });
    if (imd && /paired with ETH/i.test(claim)) {
      // pairWith and the explicit first sentence already opt out of the ETH pairing default.
      if (!/paired with IMD\./.test(text)) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: 'Explicitly request the IMD pairing instead of the fixed ETH pairing.' });
    }
    const supply = /Supply: ([\d,]+) with (\d+) decimals/i.exec(claim), requested = /supply ([\d,]+), (\d+) decimals/i.exec(text);
    if (supply && requested && (supply[1] !== requested[1] || supply[2] !== requested[2]) && input.customToken !== true) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: 'The requested supply or decimals conflict with the fixed token supply. Explicitly choose a custom token.' });
    if (/no owner (?:functions|powers)/i.test(claim) && /^Owner .+ may only:/m.test(text)) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: `This fixed fact forbids the requested owner powers. Remove them or add “Opt out of fixed fact ${fact.id}.” to the request, then check again.` });
  }
  return conflicts;
}
