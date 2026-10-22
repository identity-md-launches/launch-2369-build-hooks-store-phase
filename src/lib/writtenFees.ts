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
    const fee = /\b(?:fees?|jar|pot)\b/i.test(clause);
    const charging = /\b(?:take|takes|taking|charge|charges|charging|collect|collects|collecting|deduct|deducts|withhold|withholds|levy|levies)\b/i.test(clause);
    return amount && (fee || charging) || fee && (charging || /\b(?:use|add|apply|set|enable|include|implement)\b/i.test(clause));
  });
}

/** Only destinations explicitly attached to fee/payment language, never arbitrary addresses. */
export function writtenFeeTargets(text: string): string[] {
  if (!writtenFeeClauses(text).length) return [];
  const pattern = /(?:\b(?:send|sent|pay|paid|route|transfer|forward|remit|distribute)\s+(?:(?:all|the|swap|hook|buy|sell|accrued|collected|charged)\s+)*(?:(?:fees?(?: revenue| proceeds)?|it|them|revenue|proceeds)\s+)?to|\b(?:fee )?(?:recipient|destination)\s*(?:is|:|=)|\b(?:fees?|it|them)\s+(?:(?:must|shall|will)\s+)?go(?:es)?\s+to|\bfee\s+for\s+(?=(?:the )?owner\b|my wallet\b|(?:IMD['’]s )?treasury\b|0x))\s*([^;,.!?]+)/gi;
  return Array.from(text.matchAll(pattern), match => {
    const target = match[1].trim();
    return /^(?:0x[\da-fA-F]{40}\b|my wallet\b|(?:the )?owner\b|(?:IMD['’]s )?treasury\b)/i.exec(target)?.[0] ?? target;
  });
}
