export type CosmeticRules = { classes: Set<string>; ids: Set<string> };
export const PINNED: URL;
export function genericRules(text?: string): CosmeticRules;
export function exportNames(dist: string): CosmeticRules;
export function blockedNames(dist: string, rules?: CosmeticRules): {
  classes: string[];
  ids: string[];
  scanned: { classes: number; ids: number };
};
export function hidingStylesheet(rules?: CosmeticRules): string;
