// Written amounts are first classified by structure. An amount near a trade
// cannot silently become a zero fee merely because its verb is unfamiliar.
export const feeClauses = (text: string) => text.split(/\n|(?<=[.!?])\s+(?=[A-Z])|;\s*|\s+(?:but|whereas)\s+|,?\s+(?:and|or)\s+(?=(?:no|without)\s+(?:(?:hook|swap|buy|sell)\s+)?fees?\b|(?:never|do not)\s+(?:take|charge|collect)\b)|,?\s+and\s+(?=(?:(?:the\s+)?owner\s+)?(?:take|takes|charge|charges|collect|collects|receive|receives|route|divert|accrue|accrues)\b)/i).flatMap(clause => {
  // A comma after a direction prefix belongs to the charge; a comma before or
  // after a prohibition separates its scope from the positive charge.
  const comma = clause.indexOf(',');
  return comma >= 0 && (isFeeProhibition(clause.slice(0, comma)) || /^\s*(?:(?:and|or)\s+)?(?:no|without|never|do not)\b/i.test(clause.slice(comma + 1)) && isFeeProhibition(clause.slice(comma + 1))) ? [clause.slice(0, comma), clause.slice(comma + 1)] : [clause];
}).map(s => s.trim()).filter(Boolean);

const small: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const divisors: Record<string, number> = { half: 2, halve: 2, quarter: 4, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, hundredth: 100, thousandth: 1000 };
function cardinal(text: string): number | null {
  text = text.trim().replace(/(?<=\d),(?=\d)/g, '').replace(/\band\b/g, '').replace(/\s+/g, ' ').trim();
  if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return Number(text);
  if (/^(?:a|an)$/.test(text)) return 1;
  for (const [word, factor] of [['billion', 1e9], ['million', 1e6], ['thousand', 1000], ['hundred', 100]] as const) {
    const parts = text.split(` ${word}`);
    if (parts.length === 2) {
      const high = cardinal(parts[0]), low = parts[1].trim() ? cardinal(parts[1]) : 0;
      return high !== null && high > 0 && low !== null && low < factor ? high * factor + low : null;
    }
  }
  const tokens = text.split(' ');
  if (tokens.length === 1) return small[tokens[0]] ?? ({ hundred: 100, thousand: 1000 }[tokens[0]] ?? null);
  if (tokens.length === 2 && small[tokens[0]] >= 20 && small[tokens[0]] % 10 === 0 && small[tokens[1]] > 0 && small[tokens[1]] < 10) return small[tokens[0]] + small[tokens[1]];
  return null;
}
function fraction(text: string): number | null {
  text = text.trim().replace(/(?: of)? a$/, '').trim();
  const tokens = text.split(' '), denominator = tokens.pop()!.replace(/s$/, '');
  const divisor = divisors[denominator];
  if (!divisor) return null;
  const numerator = tokens.length ? cardinal(tokens.join(' ')) : 1;
  return numerator === null ? null : numerator / divisor;
}
function spelledAmount(text: string): number | null {
  text = text.replace(/-/g, ' ').replace(/^of /, '').trim();
  text = text.replace(new RegExp(`^(?:a|an) (?=\\d|(?:${Object.keys(small).join('|')})\\b)`), '');
  const mixed = /^(.*?) and ((?:a|an|one|two|three|four) \w+)$/.exec(text);
  if (mixed && fraction(mixed[2]) !== null) {
    const whole = cardinal(mixed[1]); return whole === null ? null : whole + fraction(mixed[2])!;
  }
  const decimal = text.split(' point ');
  if (decimal.length === 2) {
    const whole = cardinal(decimal[0]), digits = decimal[1].split(' ').map(t => small[t]);
    return whole !== null && digits.every(n => n !== undefined && n < 10) ? Number(`${whole}.${digits.join('')}`) : null;
  }
  return fraction(text) ?? cardinal(text);
}
const amountWords = [...Object.keys(small), ...Object.keys(divisors).flatMap(s => [s, s + 's']), 'a', 'an', 'and', 'of', 'point', 'hundred', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'].join('|');
const amountAtom = `(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?|\\.\\d+|${amountWords})`;
/** Parse a whole amount phrase. Never turn the suffix of a mixed number into its rate. */
export function normalizeFeeAmounts(text: string): string {
  return text.toLowerCase()
    .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_m, a, b) => Number(b) > 0 ? `${Number(a) / Number(b) * 100}%` : 'unresolved-amount')
    .replace(new RegExp(`\\b(${amountAtom})\\s+(?:in(?: every)?|out of)\\s+(?:a |an |every )?(${amountAtom})\\b`, 'g'), (_m, a, b) => {
      const n = spelledAmount(a), d = spelledAmount(b);
      return n !== null && d !== null && d > 0 ? `${n / d * 100}%` : 'unresolved-amount';
    })
    .replace(new RegExp(`(?<![\\w.,])(${amountAtom}(?:[ -]+${amountAtom})*)\\s*(percent|per cent|pct\.?|basis points?|bps|%)(?![a-z])`, 'g'), (_m, phrase: string, unit: string) => {
      const value = spelledAmount(phrase);
      return value === null ? 'unresolved-amount' : `${/basis|bps/.test(unit) ? value / 100 : value}%`;
    })
    .replace(new RegExp(`\\b(${amountAtom}(?:[ -]+${amountAtom})*)\\s+of(?=\\s+(?:(?:the|each|every|all)\\s+)?(?:swaps?|trades?|buys?|sells?)\\b)`, 'g'), (original, phrase: string) => {
      const value = fraction(phrase.replace(/-/g, ' '));
      return value === null ? original : `${value * 100}% of`;
    });
}
export const isFeeProhibition = (text: string) => /\b(?:(?:no|without(?: charging| taking| collecting)?(?: any)?) (?:hook |swap |buy |sell )?fees?|(?:never|do not) (?:take|charge|collect) (?:a |any )?fees?)\b/i.test(text);
const amountPattern = /(?<![\w.,])(\d+(?:\.\d+)?|\.\d+)\s*(%|IMD\b|ETH\b)/gi;
const tradePattern = /\b(?:swaps?|swapp(?:ed|ing|ers?)|trades?|trad(?:ed|ing|ers?)|buys?|buy(?:ing|ers?)|bought|sells?|sell(?:ing|ers?)|sold|volume)\b/i;
const feePattern = /\b(?:fees?|tax(?:es)?|levy|levies|skim|jar|pot|commission|toll)\b/i;
const chargePattern = /\b(?:take|takes|taking|charge|charges|charging|collect|collects|collecting|deduct|deducts|withhold|withholds|levy|levies|skim|skims|skimming|keep|keeps|keeping|retain|retains|retaining|route|routes|routing|divert|diverts|diverting|accrues?|receives?|gets?|earns?|pay|pays|paid|paying)\b/i;
// Trigger/limit amounts are not charges. A separate fee in the same clause still needs a rate.
const nonChargeBefore = /\b(?:at most|at least|up to|limit(?:ed)?(?: to)?|maximum|minimum|larger than|smaller than|above|below|exceeds?|moves?(?: by)?|drops?(?: by)?|rises?(?: by)?)\s*$/i;
const nonChargeAfter = /^\s*(?:of (?:the |its )?(?:total )?supply|(?:price )?(?:move|drop|rise|threshold|limit)\b)/i;
function amountMatches(clause: string) { return [...normalizeFeeAmounts(clause).matchAll(amountPattern)]; }
function thresholdOnly(clause: string) {
  const normalized = normalizeFeeAmounts(clause);
  const amounts = amountMatches(clause);
  return amounts.length > 0 && amounts.every(m => nonChargeBefore.test(normalized.slice(0, m.index)) || nonChargeAfter.test(normalized.slice(m.index! + m[0].length)));
}
export function writtenFeeClauses(text: string): string[] {
  return feeClauses(text).filter(clause => {
    if (isFeeProhibition(clause)) return false;
    const amounts = amountMatches(clause), fee = feePattern.test(clause), charge = chargePattern.test(clause), trade = tradePattern.test(clause);
    if (fee) return true;
    const writtenAmount = amounts.length > 0 || /%|unresolved-amount|\b(?:percent(?:age)?|per cent|pct|basis points?|bps|(?:half|quarter|third|[a-z]+ths?) of)\b/i.test(normalizeFeeAmounts(clause));
    if (writtenAmount && (charge || trade) && !thresholdOnly(clause)) return true;
    return charge && trade && !/\b(?:record|records|logs?|statistics|counts?|events?|information|data)\b/i.test(clause);
  });
}
export type WrittenFeeAmount = { value: number; unit: string; directions: string[] };
const directionsOf = (text: string): string[] | null => {
  const scope = /\b(?:every|each|all|on|for|from|of|per)\s+(?:(?:every|each|all|the)\s+)?(buys?|sells?|swaps?|trades?)\b(?:\s+(?:and|or)\s+(buys?|sells?)\b(?!\s+(?:my|the|this|our)\b))?/i.exec(text)
    ?? /\b(buy|sell|swap|trade)(?:-only)?\s+(?:fees?|tax|commission|toll)\b/i.exec(text);
  return scope ? scopeDirections(scope) : null;
};
const scopeDirections = (scope: RegExpExecArray) => [...new Set([scope[1], scope[2]].filter(Boolean).flatMap(s => /^(?:swap|trad)/i.test(s) ? ['buy', 'sell'] : [s.toLowerCase().replace(/(?:er)?s?$/, '')]))];
// The paying party names the direction of the amount that follows it: 'Buyers pay 2% and sellers pay 1%'.
const payerOf = (before: string): string[] | null => {
  const party = [...before.matchAll(/\b(buyers?|sellers?|swappers?|traders?)\b(?:\s+(?:and|or)\s+(buyers?|sellers?)\b)?/gi)].pop();
  return party ? scopeDirections(party) : null;
};
/** Attach rates to charges, never to a price trigger or supply limit in the same clause. */
export function writtenFeeAnalysis(clause: string): { amounts: WrittenFeeAmount[]; unattached: string[] } {
  const normalized = normalizeFeeAmounts(clause), matches = amountMatches(clause);
  const unattached: string[] = normalized.includes('unresolved-amount') ? ['unresolved amount'] : [];
  const amounts = matches.flatMap((match, index) => {
    const before = normalized.slice(index ? matches[index - 1].index! + matches[index - 1][0].length : 0, match.index);
    const after = normalized.slice(match.index! + match[0].length, matches[index + 1]?.index).split(/(?<=[.!?])\s/)[0];
    if (nonChargeBefore.test(before) || nonChargeAfter.test(after)) return [];
    const chargeBefore = new RegExp(`${chargePattern.source}\\s+(?:(?:an?|extra|additional)\\s+)*$`, 'i').test(before);
    const feeBefore = new RegExp(`${feePattern.source}(?:\\s+rate)?(?:\\s+(?:of|is|at)|\\s*[:=])?\\s*$`, 'i').test(before);
    const feeAfter = new RegExp(`^\\s*(?:(?:hook|swap|trade|buy|sell)\\s+)?${feePattern.source}`, 'i').test(after);
    const tradedAmount = /^\s+(?:of|from|on|per)\s+(?:(?:the|its)\s+)?(?:(?:imd|eth)(?:\s+\(pair currency\))?\s+side\s+of\s+)?(?:(?:every|each|all|the)\s+)?(?:swaps?|trades?|buys?|sells?)\b/i.test(after);
    const accrual = /^\s+(?:accrues?|is (?:routed|diverted|collected|charged|paid))\s+(?:on|from|for|per)\s+(?:(?:each|every|the|all)\s+)?(?:swaps?|trades?|buys?|sells?)\b/i.test(after);
    if (!chargeBefore && !feeBefore && !feeAfter && !tradedAmount && !accrual) { unattached.push(match[0]); return []; }
    const directions = directionsOf(after) ?? directionsOf(before) ?? payerOf(before) ?? ['buy', 'sell'];
    return [{ value: Number(match[1]), unit: match[2].toUpperCase(), directions }];
  });
  return { amounts, unattached };
}
export const writtenFeeAmounts = (clause: string): WrittenFeeAmount[] => writtenFeeAnalysis(clause).amounts;
export function writtenFeeRates(text: string): { buy: number; sell: number } {
  const totals = { buy: 0, sell: 0 };
  for (const clause of writtenFeeClauses(text)) for (const amount of writtenFeeAmounts(clause)) {
    if (amount.unit === '%') for (const direction of amount.directions) totals[direction as keyof typeof totals] += amount.value;
  }
  return totals;
}
export function writtenFeeRateTotal(text: string): number {
  const rates = writtenFeeRates(text); return Math.max(rates.buy, rates.sell);
}
/** Only explicit payment destinations, including possessive/typographic apostrophes. */
export function writtenFeeTargets(text: string): string[] {
  if (!writtenFeeClauses(text).length) return [];
  const pattern = /(?:\b(?:send|sent|pay|paid|payable|route|transfer|forward|remit|distribute)\s+(?:(?:all|the|swap|hook|buy|sell|accrued|collected|charged)\s+)*(?:(?:fees?(?: revenue| proceeds)?|it|them|revenue|proceeds)\s+)?to|\b(?:fee )?(?:recipient|destination)\s*(?:is|:|=)|\b(?:fees?|it|them)\s+(?:(?:must|shall|will)\s+)?go(?:es)?\s+to|\bfee\s+for\s+(?=(?:the )?owner\b|my wallet\b|(?:(?:the|IMD['’]s) )?treasury\b|0x))\s*([^;,.!?]+)/gi;
  const implied = /\b(?:go(?:es)?\s+to|for(?!\s+(?:(?:every|each|all|the)\s+)?(?:swaps?|trades?|buys?|sells?)\b))\s+([^;,.!?]+)/gi;
  const ownerReceives = /\b((?:the )?owner|my wallet|(?:(?:the|IMD['’]s) )?treasury|0x[\da-fA-F]{40})\s+(?:(?:(?:is|are|will be|shall be|gets?)\s+)?(?:paid|credited|owed|given|sent)(?!\s+(?:to|by|in|as|out)\b)|receives?|accrues?|gets?|earns?|takes?|keeps?|collects?)\b/gi;
  // A receiving payee can follow a trade introduction or comma, as well as start
  // a clause. Keep unknown names unresolved so the request asks for an address.
  const passivePayee = /(?:^|,)\s*(?:then\s+)?(?:(?:on|for|from|after|before|during)\s+(?:(?:each|every|all|the)\s+)?(?:swaps?|trades?|buys?|sells?)\s*,?\s*)?((?:(?:the|my|our)\s+)?[a-z][\w'’-]*(?:\s+[a-z][\w'’-]*){0,2}|0x[\da-fA-F]{40})\s+(?:(?:is|are|will be|shall be|gets?)\s+(?:paid|credited|owed|given|sent)|receives?|accrues?|gets?|earns?|keeps?|collects?)\b(?!\s+(?:to|by|in|as|out)\b)/gi;
  const notPayee = /\b(?:fees?|tax(?:es)?|levy|levies|commission|toll|amount|rate|it|they|them|this|that|swappers?|traders?|buyers?|sellers?|swaps?|trades?|hook|pool|pot|jar|remainder|rest|revenue|proceeds)\b|%/i;
  const explicitTarget = /\b(?:to|for)\s+((?:the )?owner|my wallet|(?:(?:the|IMD['’]s) )?treasury|0x[\da-fA-F]{40})\b/gi;
  const payTarget = /\b(?:pay|paying|credit|reward)\s+(0x[\da-f]{40}|[^\d%;,.!?]+?)\s+(?=\d+(?:\.\d+)?\s*(?:%|imd\b|eth\b))/gi;
  const namedBeforeAmount = /\b((?:the )?owner|my wallet|(?:(?:the|IMD['’]s) )?treasury|0x[\da-f]{40})\s+(?=\d+(?:\.\d+)?\s*(?:%|imd\b|eth\b))/gi;
  const matches = [...normalizeFeeAmounts(text).matchAll(payTarget), ...normalizeFeeAmounts(text).matchAll(namedBeforeAmount), ...text.matchAll(pattern), ...writtenFeeClauses(text).flatMap(clause => [...clause.matchAll(implied), ...clause.matchAll(ownerReceives), ...clause.matchAll(explicitTarget), ...[...clause.matchAll(passivePayee)].filter(m => !notPayee.test(m[1]) && !new RegExp(ownerReceives.source, 'i').test(m[0]))])];
  // 'for IMD's treasury and the owner' names two destinations, never one.
  const known = /^(?:0x[\da-fA-F]{40}\b|my wallet\b|(?:the )?owner\b|(?:(?:the|IMD['’]s) )?treasury\b)/i;
  return matches.flatMap(match => {
    const [head, ...tail] = match[1].trim().split(/\s+(?:and|&|plus)\s+(?:(?:to|for)\s+)?/i);
    return [head, ...tail.filter(part => known.test(part))].map(target => known.exec(target)?.[0] ?? target);
  });
}
