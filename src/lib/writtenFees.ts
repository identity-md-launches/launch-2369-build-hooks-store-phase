// Shared lexical rules for written fee intent. Unknown amounts remain fee intent:
// they must be clarified, never silently turned into a zero-fee request.
export const feeClauses = (text: string) => text.split(/\n|(?<=[.!?])\s+(?=[A-Z])|;\s*|\s+(?:but|whereas)\s+|\s+and (?=(?:take|charge|collect)\b)/i).map(s => s.trim()).filter(Boolean);

/** Normalize common percentage spellings for comparisons, without rewriting the creator's words. */
export function normalizeFeeAmounts(text: string): string {
  const words: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  return text
    .replace(/\bhalf (?:a |of a )?(?:percent|per cent)\b/gi, '0.5%')
    .replace(/\b(?:a )?quarter (?:of a )?(?:percent|per cent)\b/gi, '0.25%')
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(percent|per cent|basis points?|bps)\b/gi, (_m, word: string, unit: string) => `${words[word.toLowerCase()]} ${unit}`)
    .replace(/\b(\d+(?:\.\d+)?)\s*(basis points?|bps)\b/gi, (_m, value: string) => `${Number(value) / 100}%`)
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:percent|per cent)\b/gi, '$1%');
}

export const isFeeProhibition = (text: string) => /\b(?:(?:no|without(?: charging| taking| collecting)?(?: any)?) (?:hook |swap |buy |sell )?fees?|(?:never|do not) (?:take|charge|collect) (?:a |any )?fees?)\b/i.test(text);

export function writtenFeeClauses(text: string): string[] {
  return feeClauses(text).filter(clause => {
    if (isFeeProhibition(clause)) return false;
    const normalized = normalizeFeeAmounts(clause);
    const amount = /\d+(?:\.\d+)?\s*(?:%|(?:IMD|ETH)\b)/i.test(normalized);
    const fee = /\b(?:fees?|tax(?:es)?|levy|levies|skim|jar|pot)\b/i.test(clause);
    const charging = /\b(?:take|takes|taking|charge|charges|charging|collect|collects|collecting|deduct|deducts|withhold|withholds|levy|levies|skim|skims|skimming|keep|keeps|keeping|retain|retains|retaining)\b/i.test(clause);
    const trade = /\b(?:swaps?|buys?|sells?)\b/i.test(clause);
    const transfer = /\b(?:go(?:es)?|payable|paid|sent|routed)\s+to\b/i.test(clause);
    return amount && (fee || charging || trade && transfer)
      || fee && (charging || /\b(?:use|add|apply|set|enable|include|implement)\b/i.test(clause))
      || charging && trade && /\b(?:share|portion|part|proceeds|revenue)\b/i.test(clause);
  });
}

export type WrittenFeeAmount = { value: number; unit: string; directions: string[] };

/** An amount must describe the charge, not merely a trigger/price/limit in the same sentence. */
export function writtenFeeAmounts(clause: string): WrittenFeeAmount[] {
  const normalized = normalizeFeeAmounts(clause);
  return Array.from(normalized.matchAll(/\b(\d+(?:\.\d+)?)\s*(%|IMD\b|ETH\b)/gi)).flatMap(match => {
    const before = normalized.slice(0, match.index), after = normalized.slice(match.index! + match[0].length);
    const chargeBefore = /\b(?:take|takes|taking|charge|charges|charging|collect|collects|collecting|deduct|deducts|withhold|withholds|levy|levies|skim|skims|skimming|keep|keeps|keeping|retain|retains|retaining)\s+(?:(?:an?|extra|additional)\s+)*$/i.test(before);
    const feeBefore = /\b(?:fees?|tax(?:es)?|levy|skim)(?:\s+rate)?(?:\s+(?:of|is|at)|\s*[:=])?\s*$/i.test(before);
    const feeAfter = /^\s*(?:(?:hook|swap|buy|sell)\s+)?(?:fees?|tax(?:es)?|levy|skim)\b/i.test(after);
    const tradedAmount = /^\s+(?:of|from|on|per)\s+(?:(?:the|its)\s+)?(?:(?:IMD|ETH)(?:\s+\(pair currency\))?\s+side\s+of\s+)?(?:(?:every|each|all|the)\s+)?(?:swaps?|buys?|sells?)\b/i.test(after)
      && (/^\s*(?:also\s+)?$/i.test(before) || /\b(?:go(?:es)?|payable|paid|sent|routed)\s+to\b/i.test(after) || /\band\s*$/i.test(before));
    if (!chargeBefore && !feeBefore && !feeAfter && !tradedAmount) return [];
    const scope = /\b(?:every|each|all|on|for|from|of|per)\s+(?:(?:every|each|all|the)\s+)?(buys?|sells?|swaps?)\b(?:\s+(?:and|or)\s+(buys?|sells?)\b)?/i.exec(after)
      ?? /\b(buy|sell|swap)(?:-only)?\s+(?:fees?|tax)\b/i.exec(normalized);
    const directions = [...new Set((scope ? [scope[1], scope[2]].filter(Boolean) : ['swap']).flatMap(s => /^swap/i.test(s) ? ['buy', 'sell'] : [s.toLowerCase().replace(/s$/, '')]))];
    return [{ value: Number(match[1]), unit: match[2].toUpperCase(), directions }];
  });
}

/** Written charges are additive. Unknown replacement schedules must be clarified, not inferred. */
export function writtenFeeRateTotal(text: string): number {
  const totals: Record<string, number> = { buy: 0, sell: 0 };
  for (const clause of writtenFeeClauses(text)) for (const amount of writtenFeeAmounts(clause)) {
    if (amount.unit === '%') for (const direction of amount.directions) totals[direction] += amount.value;
  }
  return Math.max(totals.buy, totals.sell);
}

/** Only destinations explicitly attached to fee/payment language, never arbitrary addresses. */
export function writtenFeeTargets(text: string): string[] {
  if (!writtenFeeClauses(text).length) return [];
  const pattern = /(?:\b(?:send|sent|pay|paid|payable|route|transfer|forward|remit|distribute)\s+(?:(?:all|the|swap|hook|buy|sell|accrued|collected|charged)\s+)*(?:(?:fees?(?: revenue| proceeds)?|it|them|revenue|proceeds)\s+)?to|\b(?:fee )?(?:recipient|destination)\s*(?:is|:|=)|\b(?:fees?|it|them)\s+(?:(?:must|shall|will)\s+)?go(?:es)?\s+to|\bfee\s+for\s+(?=(?:the )?owner\b|my wallet\b|(?:IMD['’]s )?treasury\b|0x))\s*([^;,.!?]+)/gi;
  const implied = /\b(?:go(?:es)?\s+to|for(?!\s+(?:(?:every|each|all|the)\s+)?(?:swaps?|buys?|sells?)\b))\s+([^;,.!?]+)/gi;
  const matches = [...text.matchAll(pattern), ...writtenFeeClauses(text).flatMap(clause => [...clause.matchAll(implied)])];
  return matches.map(match => {
    const target = match[1].trim();
    return /^(?:0x[\da-fA-F]{40}\b|my wallet\b|(?:the )?owner\b|(?:IMD['’]s )?treasury\b)/i.exec(target)?.[0] ?? target;
  });
}
