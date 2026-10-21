import { normalizeDraft, type Draft } from '../../src/lib/compose';

export const DRAFT_KEY = 'hooks-store:draft:v2';
export function saveDraft(patch: { prompt?: string; mode: 'prompt' | 'blocks' }) {
  let existing: Record<string, unknown> = {};
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) existing = stored;
  } catch { /* An invalid old draft is replaced by the new explicit input. */ }
  // Preserve the launch type, blocks and settings the Builder saved.
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...patch }));
  if (patch.prompt !== undefined && patch.prompt !== existing.prompt) clearCorrection();
}
/** The Builder's draft (type, mode, words, blocks, settings); job 1's `{ prompt, mode }` opens in the describe editor. */
export function loadDraft(): Draft {
  try { return normalizeDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')); } catch { return normalizeDraft(null); }
}
export function storeDraft(draft: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); window.dispatchEvent(new Event('hooks:draft')); return true; } catch { return false; }
}

export type SubmittedDraft = { draft: Draft; request: string };
export type Correction = { request: string; questions: string[]; hookRoute: string };
const submitted = new Map<string, SubmittedDraft>();
let correction: Correction | null = null;
export function clearCorrection() {
  correction = null;
  try { sessionStorage.removeItem('hooks-store:correction'); } catch { /* Memory is cleared too. */ }
}
const draftKey = (chain: number, id: string) => `hooks-store:submitted:${chain}:${id.toLowerCase()}`;
export function saveSubmittedDraft(chain: number, id: string, draft: Draft, request: string) {
  const key = draftKey(chain, id), value = { draft, request };
  submitted.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function submittedDraft(chain: number, id: string, request: string): Draft | null {
  try {
    const value = submitted.get(draftKey(chain, id)) ?? JSON.parse(localStorage.getItem(draftKey(chain, id)) ?? 'null');
    return value?.request === request ? normalizeDraft(value.draft) : null;
  } catch { return null; }
}
export function loadCorrection(): Correction | null {
  if (correction) return correction;
  try {
    const value = JSON.parse(sessionStorage.getItem('hooks-store:correction') ?? 'null');
    return typeof value?.request === 'string' && Array.isArray(value.questions) && value.questions.every((q: unknown) => typeof q === 'string') && /^#hook\/(1|4663)\/0x[\da-f]{64}$/i.test(value.hookRoute) ? value : null;
  } catch { return null; }
}
export function openCorrection(draft: Draft, context: Correction) {
  if (!storeDraft(draft)) return false;
  correction = context;
  try { sessionStorage.setItem('hooks-store:correction', JSON.stringify(context)); } catch { /* Retain it in memory. */ }
  location.hash = '#builder'; return true;
}
