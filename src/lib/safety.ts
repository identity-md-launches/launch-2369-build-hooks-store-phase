import { BLOCKS, BY_ID, IMD_FEE_OPT_OUT, IMD_TREASURY, MAX_ETH_RATE, POOL_MANAGERS, functionsOf, isAddress, type Body, type BlockDef } from './compose.ts';
import { feeClauses as splitFeeClauses, isFeeProhibition, normalizeFeeAmounts, writtenFeeAmounts, writtenFeeClauses, writtenFeeRateTotal, writtenFeeTargets } from './writtenFees.ts';
import knownQuestions from '../blocks/known-questions.json' with { type: 'json' };

export type SafetyFinding = { code: string; sentence: string; message: string };
export const KNOWN_QUESTIONS = knownQuestions;
const addressPattern = '0x[0-9a-fA-F]{40}';
const fullAddress = (value: string) => isAddress(value) && !/^0x0{40}$/i.test(value);
const sentences = (text: string) => text.split(/\n|(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
const numbered = (text: string) => Array.from(text.matchAll(/^\d+\. (.+)$/gm), m => m[1]);
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchesTemplate = (rule: string, template: string, def: BlockDef) => {
  let pattern = '', from = 0;
  for (const match of template.matchAll(/\{(@?)(\w+)(?::(\w+))?\}/g)) {
    pattern += escapePattern(template.slice(from, match.index));
    const param = def.params.find(p => p.k === match[2]);
    if (match[1] && match[2] === 'pair') pattern += '(?:ETH|IMD)';
    else if (match[1] && match[2] === 'feeApplies') pattern += '(?:buy and sell|buy|sell)';
    else if (param?.type === 'number' || match[2] === 'baseRate') pattern += '[+-]?[\\d,]+(?:\\.\\d+)?';
    else if (param?.options) pattern += '(?:' + param.options.map(escapePattern).join('|') + ')';
    else pattern += '[\\s\\S]+?';
    from = match.index! + match[0].length;
  }
  return new RegExp('^' + pattern + escapePattern(template.slice(from)) + '$').test(rule);
};

// Scope a fee assertion to the trade it charges, not a later buyback action.
const feeScope = (text: string): Set<string> => {
  const trade = /\b(?:(?:every|each|all)\s+|(?:on|for|from|of|per)\s+(?:(?:every|each|all|the)\s+)?)(buys?|sells?|swaps?)\b(?:\s+(?:and|or)\s+(buys?|sells?)\b(?!\s+(?:my|the|this|our)\b))?/i.exec(text);
  const label = /\b(buy|sell|swap)(?:-only)? fees?\b|\bfees? (?:on|for) (buys?|sells?|swaps?)\b/i.exec(text);
  const directions = trade ? [trade[1], trade[2]].filter(Boolean) : label ? [label[1] ?? label[2]] : ['swap'];
  return new Set(directions.flatMap(d => /^swap/i.test(d) ? ['buy', 'sell'] : [d.toLowerCase().replace(/s$/, '')]));
};
const chargedScopes = (text: string): Set<string> => {
  text = normalizeFeeAmounts(text);
  const scopes = new Set<string>();
  for (const m of text.matchAll(/\b(?:take|collect|charge|and) ([\d.]+)%([^;]*?)(?=\band [\d.]+%|$)/gi)) {
    if (Number(m[1]) > 0) for (const scope of feeScope(m[2])) scopes.add(scope);
  }
  const rate = /\bpays an extra ([\d.]+)%|\bhook fee\b.*?\bis ([\d.]+)%/i.exec(text);
  if (rate && Number(rate[1] ?? rate[2]) > 0) for (const scope of feeScope(text)) scopes.add(scope);
  if (!scopes.size && writtenFeeClauses(text).length && /\b(?!0+(?:\.0+)?(?:%|\s))\d+(?:\.\d+)?\s*(?:%|IMD\b|ETH\b)/i.test(text)) for (const scope of feeScope(text)) scopes.add(scope);
  return scopes;
};

// An address must immediately identify this dependency (possibly by its role).
// A payee elsewhere in the sentence cannot supply a coordinator/pool/token address.
const externalDependency = /\b(?:Chainlink(?: VRF)?|VRF|Aave|Morpho|Uniswap v[23] (?:pool|router)|(?:another|other|external|conversion|IMD\/ETH|[A-Z][A-Z0-9.-]*\/[A-Z][A-Z0-9.-]*) pool|(?:external|price) feed|lending (?:pool|service)|(?:external|other|another) token)\b/gi;
const namedTokenDependency = /\b[A-Z][A-Z0-9.-]* token\b/g;
const dependencyAddress = new RegExp(`^\\s*(?:(?:with|using)\\s+)?(?:(?:the|a)\\s+)?(?:(?:coordinator|service|contract|deployment|pool|router|feed|token)(?:\\s+address)?\\s*)?(?:address\\s*)?(?:(?:at|is)\\s+|[:=(]\\s*)?(${addressPattern})\\b`, 'i');

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
  const catalogRules = new Map(BLOCKS.map(def => [def.id, rules.find(rule => [def.sentence, ...Object.values(def.optionSentences ?? {})].some(template => matchesTemplate(rule, template, def)))]));
  for (const def of BLOCKS) {
    const rule = catalogRules.get(def.id); if (!rule) continue;
    if (def.disabled) add(def.id === 'yield' ? 'dependency' : 'unavailable', rule, `${def.title}: ${def.disabled}. Remove this block before paying.`);
    if (def.requires && !catalogRules.get(def.requires)) add('dependency', rule, `${def.title} needs ${BY_ID[def.requires].title}.`);
    if (def.requiresAny && !def.requiresAny.some(id => catalogRules.get(id))) add('dependency', rule, `${def.title} needs ${def.requiresAny.map(id => BY_ID[id].title).join(' or ')}.`);
    for (const id of def.excludes ?? []) if (catalogRules.get(id)) add('contradiction', `${rule}\nConflicts with: ${catalogRules.get(id)}`, `${def.title} cannot be combined with ${BY_ID[id].title}.`);
  }
  // Read the rendered rates, independently of draft validation and its numeric inputs.
  const rateIn = (id: string, pattern: RegExp) => Number(pattern.exec(catalogRules.get(id) ?? '')?.[1] ?? 0);
  const buySell = /^Take ([\d.]+)%[^;]*?every buy and ([\d.]+)%/.exec(catalogRules.get('fee-dir') ?? '');
  const peakRate = Math.max(rateIn('swap-fee', /^Take ([\d.]+)%/), Number(buySell?.[1] ?? 0), Number(buySell?.[2] ?? 0),
    rateIn('fee-fade', /rate starts at ([\d.]+)%/), rateIn('fee-vol', /replace the Swap fee's rate with ([\d.]+)%/));
  const totalRate = peakRate + rateIn('fee-size', /pays an extra ([\d.]+)%/) + rateIn('jar', /^Collect ([\d.]+)%/) + rateIn('pot', /^Collect ([\d.]+)%/);
  if (Math.round(totalRate * 1000) > MAX_ETH_RATE * 1000) add('rates', ['swap-fee', 'fee-dir', 'fee-fade', 'fee-vol', 'fee-size', 'jar', 'pot'].map(id => catalogRules.get(id)).filter(Boolean).join('\n'), `The highest simultaneous ${currency}-side hook fees total ${Number(totalRate.toFixed(3))}%. Include fade and volatility replacement rates; the total must stay at or below 5%.`);
  for (const sentence of lines) {
    // Both catalog prose and ordinary custom wording are checked. Explicit negations are exempt.
    const asserted = sentence.replace(/\b(?:do not|never|not)\s+(?:convert|sell|swap|settle|take|collect|charge|pay|paid|distribute|disburse|remit|receive)[^.;]*/gi, '');
    const feeContext = /fee|jar|pot|settle|every buy|every sell|every swap|%/i.test(asserted);
    if (feeContext) {
      const side = [...asserted.matchAll(/(?:of |from |on |whose |its |the )(?:(?:the|its) )?(ETH|IMD)(?: \(pair currency\))? side\b/gi)].map(m => m[1].toUpperCase());
      const settlement = [...asserted.matchAll(/\b(?:settl\w*|paid(?: out)?|payable|payouts?|pay(?:ment)?s?|collect\w*|denominated|distribut\w*|disburs\w*|remit\w*|receiv\w*|sent|send|transferred|transfer)\s+(?:(?:are|is|must be|will be|shall be)\s+)?(?:made\s+)?(?:(?:the|all|any|every|swap|hook|buy|sell)\s+)*(?:(?:fees?|pot|it|them|payments?|payouts?)\s+)?(?:in|as)\s+(ETH|IMD)\b/gi)].map(m => m[1].toUpperCase());
      settlement.push(...[...asserted.matchAll(/\b(?:fee(?: payment)?|settlement|payout) currency (?:is|must be|will be|shall be) (ETH|IMD)\b/gi)].map(m => m[1].toUpperCase()));
      side.push(...[...asserted.matchAll(/% of (?:the )?(ETH|IMD)\b/gi)].map(m => m[1].toUpperCase()));
      if (side.some(value => value !== currency)) add('fee-side', sentence, `The fee side must be ${currency}, the pair currency.`);
      if (settlement.some(value => value !== currency)) add('fee-settlement', sentence, `Settle the fee in ${currency}, the pair currency.`);
      if (currency === 'IMD' && /(?:convert|sell|swap)\w* (?:the |an? |every |any )?(?:IMD[- ]side )?fee[^.;]*\b(?:to|for|into) ETH\b/i.test(asserted)) add('fee-conversion', sentence, 'Keep the fee in IMD. Conversion to ETH needs a different pool and conflicts with this pairing.');
    }
    if (/\b(?:my wallet|treasury address|the second address|connect to resolve|0x…|0x\.\.\.)\b/i.test(sentence)) add('recipient', sentence, 'Replace the recipient with its full address. Connect the paying wallet for “my wallet”.');
    for (const match of sentence.matchAll(/(?:send (?:it|them|the (?:bought |remaining )?tokens|the pot) to|send (?:[\w-]+\s+){0,4}fees?(?: (?:revenue|proceeds|payouts?))? to|\bfees? (?:revenue |proceeds )?(?:(?:must|shall|will) )?go(?:es)? to|remainder goes to|\d+(?:\.\d+)?% to)\s+([^;,.]+(?:\.[^\s]+)?)/gi)) {
      if (/^the (?:fee )?recipient\b/i.test(match[1]) && (new RegExp(`Fee recipient: ${addressPattern}\\.`).test(text) || !!catalogRules.get('fee-split'))) continue;
      const target = /^0x[\da-fA-F]{40}\b/.exec(match[1].trim())?.[0] ?? match[1].trim().split(/\s/)[0];
      if (!fullAddress(target)) add('recipient', sentence, 'Every fee or remainder recipient must be a full, nonzero address.');
    }
    const owner = /^Owner (.+?) (?:may only:|is \$owner\.)/.exec(sentence);
    if (owner && !fullAddress(owner[1])) add('recipient', sentence, 'Connect the paying wallet or enter a full owner address.');
    // Missing or shortened literal addresses never pass as recipients or dependencies.
    for (const match of sentence.matchAll(/\b0x[\da-z]+/gi)) if (match[0] !== '0x800000' && !new RegExp(`^${addressPattern}$`).test(match[0])) add('address', sentence, 'Use a full address on the deploy chain.');
  }
  const chain = String(input.chainId);
  const opening = text.split('\n')[0];
  if (input.onchain === 'univ4_hook' && !opening.includes(`paired with ${currency}.`)) add('pairing', opening, `The request and launch body must both name the ${currency} pairing.`);
  if (!POOL_MANAGERS[Number(input.chainId)]) add('dependency', opening, 'Choose a supported deploy chain with a verified PoolManager.');
  if (input.onchain === 'evm_contracts') {
    const manager = POOL_MANAGERS[Number(input.chainId)];
    if (manager && !opening.toLowerCase().includes(manager.toLowerCase())) add('dependency', opening, 'Name the verified PoolManager address on the deploy chain.');
    const token = /existing token (0x[\da-fA-F]+|\([^)]*\))/.exec(text);
    if (token && !fullAddress(token[1])) add('dependency', opening, 'The existing token needs its full deploy-chain address.');
    if (!/^Deploy one contract, [A-Za-z][A-Za-z0-9]*Deployer,/.test(opening) || !/takes no salt argument/.test(opening) || !/starts at salt 0 and increments/.test(opening) || !/creates .+ in the launch transaction/.test(opening) || !/passing the PoolManager, \$owner and fee recipient unchanged/.test(opening) || !/neither constructor calls any other contract/.test(opening) || !/no deploy function to call afterwards/i.test(opening) || !/hook\(\)/.test(opening)) add('deployer', opening, 'Use a deployer whose constructor mines from salt 0 and creates the hook immediately, forwarding PoolManager, $owner and recipient unchanged, with hook() and no later deploy step.');
    if (/\bfactory\b/i.test(text)) add('factory', lines.find(line => /factory/i.test(line))!, 'Hook-only and existing-token requests must not mention a launch factory.');
    if (!text.includes('Only pools whose currency0 is native ETH may be initialized with this hook; any other initialization reverts.')) add('pool-scope', opening, 'Restrict initialization to pools whose currency0 is native ETH.');
    if (!text.includes("In this hook, the token is the pool's non-ETH currency and its total supply is that token's totalSupply().")) add('token-definition', opening, 'Define the token as the non-ETH currency and use its totalSupply().');
  } else if (input.onchain === 'univ4_hook') {
    if (!text.includes('beforeInitialize accepts only the IMD launch factory, passed as the constructor argument $factory; any other initialization reverts; the hook serves only the pool the factory initializes.')) add('factory', opening, 'Restrict beforeInitialize to the IMD launch factory passed as $factory.');
    const manager = POOL_MANAGERS[Number(input.chainId)];
    if (manager && !text.includes(`PoolManager ${manager}, $owner and $factory.`)) add('factory', opening, 'Constructor arguments must be the deploy-chain PoolManager, $owner and $factory.');
  }
  if (!fullAddress(String(input.owner ?? ''))) add('owner', opening, 'Connect the paying wallet or enter a full owner address; the body always carries owner.');
  else if (!new RegExp(`^Owner ${escapePattern(String(input.owner))} (?:may only:|is \\$owner\\.)`, 'im').test(text)) add('owner', opening, 'The request body owner must match the owner named in the text.');
  if (!Array.isArray(input.references) || !['uniswap-v4-hooks', 'uniswap-v4-security'].every(ref => (input.references as unknown[]).includes(ref))) add('references', opening, 'Include both uniswap-v4-hooks and uniswap-v4-security references.');
  // A service is refused until an address has been verified for this chain. No guessed deployments.
  for (const block of BLOCKS.filter(b => b.dependencies?.length)) {
    for (const sentence of rules.filter(s => /ReHypothecationHook|\blent (?:on|out)\b/i.test(s))) {
      for (const dep of block.dependencies ?? []) if (!fullAddress(dep.addresses[chain] ?? '')) add('dependency', sentence, `${block.title} has no verified service address on this deploy chain. Remove this block or supply a verified deployment in a complete custom request.`);
    }
  }
  for (const sentence of lines.filter(s => /\b(?:use|using|read|via|through|from|on|depends on|convert|conversion)\b/i.test(s))) {
    if (findings.some(f => f.code === 'dependency' && f.sentence.includes(sentence))) continue;
    const dependencyText = sentence.replace(/The hook uses no outside pool, token, price feed or service/gi, '').replace(/\b(?:do not|never|not)\s+(?:use|read|depend on|call|swap through|convert through)[^.;]*/gi, '');
    for (const dependency of [...dependencyText.matchAll(externalDependency), ...dependencyText.matchAll(namedTokenDependency)]) {
      const tail = dependencyText.slice(dependency.index! + dependency[0].length);
      const address = dependencyAddress.exec(tail)?.[1];
      if (!address || !fullAddress(address)) add('dependency', sentence, `Name ${dependency[0]}'s own pool, token or service address on the deploy chain, or remove that dependency. A payout address does not identify the service.`);
    }
  }
  for (const rule of KNOWN_QUESTIONS) {
    if (rule.rule === 'pair-currency-fee' && currency === 'IMD' && rule.requireImdOptOut && !text.toLowerCase().includes(IMD_FEE_OPT_OUT.toLowerCase())) add(rule.id, rules.find(s => /fee|jar|pot/i.test(s)) ?? opening, rule.message);
  }
  const ruleSentences = rules.flatMap(sentences);
  const findRule = (pattern: RegExp) => ruleSentences.find(r => pattern.test(r));
  const conflict = (a: string | undefined, b: string | undefined, message: string) => { if (a && b) add('contradiction', `${a}\nConflicts with: ${b}`, message); };
  conflict(findRule(/^Take [\d.]+% of .* every buy and sell/), findRule(/^Take [\d.]+% of .* every buy and [\d.]+%/), 'Choose Swap fee or Different buy and sell fees.');
  conflict(findRule(/pool uses a dynamic LP fee/), findRule(/fee tier is [\d.]+%/), 'Dynamic LP fees conflict with a fixed Pool rules fee tier.');
  conflict(findRule(/PoolManager[’']s donate/), findRule(/Donations to the pool are allowed from (?:nobody|only the owner|only allowlisted addresses)/), 'LP fee sharing donates from the hook. The donation restriction must explicitly permit that, or be removed.');
  conflict(findRule(/Liquidity added to (?:the pool|a position) is locked/), findRule(/Liquidity can always be removed while paused|Liquidity can still be removed during the pause|Liquidity changes are always allowed/), 'A liquidity lock conflicts with the other rule’s promise that liquidity can always be changed or removed. Remove one rule or compose an explicit compatible exception.');
  const open = /Reject every swap before ([\d-]+ [\d:]+) UTC/.exec(text), sunset = /After ([\d-]+ [\d:]+) UTC every (?:other )?rule/.exec(text);
  if (open && sunset && Date.parse(sunset[1] + 'Z') <= Date.parse(open[1] + 'Z')) add('contradiction', `${open[0]}\nConflicts with: ${sunset[0]}`, 'Sunset must be after the scheduled opening.');
  const description = /<description>([\s\S]*?)<\/description>/.exec(text)?.[1] ?? '';
  const customRules = Array.from(text.matchAll(/<custom>([\s\S]*?)<\/custom>/g), match => match[1]);
  const written = [description, ...customRules].filter(Boolean);
  const userRules = [...rules, ...written].filter(Boolean).flatMap(sentences);
  if (input.onchain === 'evm_contracts') {
    const poolFunctions = new Set(BLOCKS.flatMap(functionsOf).filter(fn => /PoolId/.test(fn.sig)).map(fn => fn.sig.split('(')[0]));
    for (const sentence of written.flatMap(sentences)) for (const signature of sentence.matchAll(/\b([A-Za-z_]\w*)\(([^()]*)\)/g)) {
      if (poolFunctions.has(signature[1]) && !/^\s*(?:PoolId\b|bytes32\b|poolId\b)/i.test(signature[2])) add('pool-signature', sentence, `${signature[1]} is pool-dependent. Use ${signature[1]}(PoolId poolId${signature[2].trim() ? `, ${signature[2].trim()}` : ''}) so each pool is identified.`);
    }
  }
  const writtenCharges = written.flatMap(writtenFeeClauses);
  for (const clause of writtenCharges) {
    const amounts = writtenFeeAmounts(clause);
    if (!amounts.length) add('fee-rate', clause, 'Name an exact fee amount, such as 0.3%, 30 basis points or a flat amount in the pair currency. Attach it to the charge; a price trigger or limit does not name the fee.');
    if (amounts.some(a => a.unit !== '%' && a.unit !== currency)) add('fee-side', clause, `A flat hook fee must be in ${currency}, the pair currency.`);
    const rates = amounts.filter(a => a.unit === '%').map(a => a.value);
    if (rates.some(rate => rate > MAX_ETH_RATE)) add('rates', clause, 'A written hook fee must stay at or below 5%.');
  }
  const combinedRate = totalRate + writtenFeeRateTotal(written.join('\n'));
  if (writtenCharges.length && combinedRate > MAX_ETH_RATE) add('rates', [...['swap-fee', 'fee-dir', 'fee-fade', 'fee-vol', 'fee-size', 'jar', 'pot'].map(id => catalogRules.get(id)).filter(Boolean), ...writtenCharges].join('\n'), `The highest simultaneous ${currency}-side hook fees, including written charges, total ${combinedRate}%. All charges together must stay at or below 5%. Use fee blocks for replacement rates.`);
  const footer = /^Fee recipient: (.+)\.$/m.exec(text)?.[1] ?? /\bFee recipient: ([^.\n]+)\./.exec(text)?.[1];
  if (writtenCharges.length) {
    if (!new RegExp(`\\b${currency}(?: \\(pair currency\\))? side\\b`).test(text)) add('fee-side', writtenCharges[0], `Name the ${currency} fee side, or use a fee block.`);
    if (!new RegExp(`\\bsettled in ${currency}\\b`, 'i').test(text)) add('fee-settlement', writtenCharges[0], `Name settlement in ${currency}, or use a fee block.`);
    if (!catalogRules.get('fee-split') && (!footer || !fullAddress(footer))) add('recipient', writtenCharges[0], 'Name one full fee recipient address, or use a fee block.');
    for (const target of writtenFeeTargets(written.join('\n'))) {
      const source = written.find(rule => rule.toLowerCase().includes(target.toLowerCase())) ?? written.join('\n');
      const resolved = /^(?:the )?owner$/i.test(target) ? String(input.owner ?? '') : /^(?:IMD['’]s )?treasury$/i.test(target) ? IMD_TREASURY : target;
      if (!fullAddress(resolved)) add('recipient', source, 'Name every written fee destination with a full address. Multiple or unresolved destinations must be clarified before paying.');
      else if (footer && resolved.toLowerCase() !== footer.toLowerCase()) add('fee-recipient', source, `The written fee destination ${resolved} disagrees with Fee recipient: ${footer}. Use one destination or a Split the fee block.`);
    }
  }
  if (input.onchain === 'evm_contracts' && footer) {
    const constructorRecipient = /\bfee recipient (0x[\da-fA-F]{40})\b/.exec(opening)?.[1];
    if (!constructorRecipient || constructorRecipient.toLowerCase() !== footer.toLowerCase()) add('fee-recipient', opening, 'The deployer constructor must forward the same fee recipient named by the fee rules.');
  }
  const hookFeeIds = ['swap-fee', 'fee-dir', 'fee-size', 'fee-fade', 'fee-vol', 'jar', 'pot'];
  // LP fees, pool fee tiers and distribution percentages are not hook charges.
  const nonChargingRules = new Set(['lp-fee', 'pool-rules', 'fee-split', 'lp-share'].map(id => catalogRules.get(id)).filter(Boolean));
  const feeClauses = [...rules.filter(rule => !nonChargingRules.has(rule)), ...written].flatMap(splitFeeClauses);
  const zeroFee = lines.find(line => /^Hook fee rate: 0%\.$/.test(line));
  const hookFeeClauses = [...written.flatMap(splitFeeClauses), ...hookFeeIds.map(id => catalogRules.get(id)).filter((rule): rule is string => !!rule)];
  if (zeroFee) conflict(zeroFee, hookFeeClauses.find(s => chargedScopes(s).size > 0 || writtenFeeClauses(s).some(clause => !/\b0+(?:\.0+)?%/.test(normalizeFeeAmounts(clause)))), 'The generated zero-fee rule conflicts with a charging rule. Resolve the written fee before checking or paying.');
  for (const forbidden of feeClauses.filter(isFeeProhibition)) {
    const scope = feeScope(forbidden);
    conflict(forbidden, feeClauses.find(s => [...chargedScopes(s)].some(direction => scope.has(direction))), 'The request both forbids fees and charges a fee on the same trade direction. Remove one rule or give buys and sells compatible fee rules.');
  }
  conflict(userRules.find(s => /\bowner (?:may|can|must)\b/i.test(s) && !/owner may donate/.test(s)), lines.find(line => /^No owner functions/.test(line)), 'The request grants an owner power but its owner sentence forbids all owner functions. Add the matching owner-power block or remove the custom owner power.');
  conflict(userRules.find(s => /\b(?:no|without) owner (?:powers|functions)\b/i.test(s)), userRules.find(s => /\bowner (?:may|can|must)\b/i.test(s)), 'The request both forbids and grants owner powers. Remove one rule.');
  if (text.includes(IMD_FEE_OPT_OUT)) conflict(userRules.find(s => /\b(?:use|swap through|convert through) (?:an? |the )?(?:other|another|external|conversion) pool\b/i.test(s) && !/do not|never/i.test(s)), IMD_FEE_OPT_OUT, 'An IMD-paired request forbids other pools. Remove the external-pool rule.');
  const noOutside = 'The hook uses no outside pool, token, price feed or service; every price it needs comes from its own pool.';
  if (text.includes(noOutside)) conflict(userRules.find(s => {
    if (!/\b(?:use|using|read|via|through|from|on|depends on|convert|conversion)\b/i.test(s) || /\b(?:do not|never|not)\s+(?:use|read|depend on|call)/i.test(s)) return false;
    return new RegExp(externalDependency.source, 'i').test(s) || new RegExp(namedTokenDependency.source).test(s);
  }), noOutside, 'This request expressly forbids outside dependencies. Remove the outside pool, token, feed or service rule, even when it has an address.');
  conflict(userRules.find(s => /\b(?:sells are never blocked|never (?:block|reject) sells)\b/i.test(s)), userRules.find(s => /reject every swap|pause and unpause swaps|reject all others|reject any single swap .* in either direction|wallet must wait .* between its swaps/i.test(s)), 'Unrestricted sells conflict with a rule that can reject sells. Remove one rule or compose an explicit compatible sell exception.');
  // Opposite literal custom rules cannot both be implemented. Do not claim to prove arbitrary prose.
  for (const a of userRules) for (const b of userRules) if (a !== b) {
    const action = /\b(?:never|do not) (pause swaps|block buys|block sells|mint tokens|burn tokens|charge fees)\b/i.exec(a)?.[1];
    if (action && new RegExp(`\\b(?:must|always) ${action}\\b`, 'i').test(b)) conflict(a, b, 'These rules require and forbid the same action. Edit the conflicting sentences.');
  }
  return findings;
}

export type FixedFact = { id: string; label: string; state: string; assumed?: string };
/** Fixed facts describe IMD defaults. An explicit, matching opt-out resolves an overridable default. */
export function fixedFactConflicts(input: Body, facts: FixedFact[], payingWallet?: string): SafetyFinding[] {
  const text = String(input.objective ?? ''), imd = input.onchain === 'univ4_hook' && input.pairWith === 'imd';
  const optedOut = text.toLowerCase().includes(IMD_FEE_OPT_OUT.toLowerCase());
  const conflicts: SafetyFinding[] = [];
  for (const fact of facts.filter(f => f.state === 'fixed')) {
    const factId = fact.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[.!?]\\s+|<(?:description|custom)>)Opt out of fixed fact ${factId}\\.(?:\\s|<|$)`, 'i').test(text)) continue;
    const claim = `${fact.label} ${fact.assumed ?? ''}`;
    if (fact.id === 'token_split' && input.onchain === 'univ4_hook') {
      const legacyAllocation = /^Pool: ([\d.]+)% of my ([\d.]+)% share seeds the pool; the remainder goes to (.+)\.$/m.exec(text);
      const parameterAllocation = /^Pool allocation parameter: poolBps=(\d+); the remainder recipient is (.+)\.$/m.exec(text);
      const totalAllocation = /^Pool: ([\d.]+)% of the total supply seeds the pool; 10% goes to the swarm; the remaining [\d.]+% goes to (0x[\da-fA-F]{40})\./m.exec(text);
      const requested = legacyAllocation ?? (parameterAllocation ? [parameterAllocation[0], String(Number(parameterAllocation[1]) / 100), '', parameterAllocation[2]] : totalAllocation ? [totalAllocation[0], totalAllocation[1], '', totalAllocation[2]] : null);
      const fixedPool = /([\d.]+)% (?:into|to) the pool/i.exec(claim);
      const fixedRecipient = /(?:the rest|the remainder|remainder) (?:goes )?to\s+(.+?)(?:[.;]|$)/i.exec(claim)?.[1].trim();
      const fixedAddress = fixedRecipient && (new RegExp(`^${addressPattern}$`).test(fixedRecipient) ? fixedRecipient : /^(?:your|the paying) wallet$/i.test(fixedRecipient) ? payingWallet : undefined);
      const economics = input.economics as { poolBps?: number; remainderTo?: string } | undefined;
      const poolMismatch = fixedPool && (requested && Number(fixedPool[1]) !== Number(requested[1]) || typeof economics?.poolBps === 'number' && Number(fixedPool[1]) * 100 !== economics.poolBps);
      const recipientMismatch = fixedAddress && (requested && fullAddress(requested[3]) && fixedAddress.toLowerCase() !== requested[3].toLowerCase() || economics?.remainderTo && fixedAddress.toLowerCase() !== economics.remainderTo.toLowerCase());
      if (poolMismatch || recipientMismatch) conflicts.push({ code: `fixed:${fact.id}`, sentence: `${fact.label}\nConflicts with: ${requested?.[0] ?? JSON.stringify(input.economics)}`, message: `The fixed token allocation${poolMismatch ? ` (${fixedPool![1]}% into the pool)` : ''}${recipientMismatch ? ` (remainder to ${fixedAddress})` : ''} conflicts with the exact request. Change the allocation or add “Opt out of fixed fact ${fact.id}.”, then check again.` });
    }
    if (imd && /fee/i.test(claim) && /ETH/i.test(claim) && /(?:sell|sold|convert|taken in|settled in|settle in)/i.test(claim) && !optedOut) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: `IMD's fixed fact conflicts with keeping fees in IMD. Add the explicit opt-out: “${IMD_FEE_OPT_OUT}”.` });
    if (imd && /paired with ETH/i.test(claim)) {
      // pairWith and the explicit first sentence already opt out of the ETH pairing default.
      if (!/paired with IMD\./.test(text)) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: 'Explicitly request the IMD pairing instead of the fixed ETH pairing.' });
    }
    const supply = /Supply: ([\d,]+) with (\d+) decimals/i.exec(claim), requested = /supply ([\d,]+), (\d+) decimals/i.exec(text);
    if (supply && requested && (supply[1] !== requested[1] || supply[2] !== requested[2]) && input.customToken !== true) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: 'The requested supply or decimals conflict with the fixed token supply. Explicitly choose a custom token.' });
    if (/no owner (?:functions|powers)/i.test(claim) && (/^Owner .+ may only:/m.test(text) || /and these block powers:/.test(text) || /<(?:description|custom)>[^<]*\bowner (?:may|can|must)\b/i.test(text))) conflicts.push({ code: `fixed:${fact.id}`, sentence: fact.label, message: `This fixed fact forbids the requested owner powers. Remove them or add “Opt out of fixed fact ${fact.id}.” to the request, then check again.` });
  }
  return conflicts;
}
