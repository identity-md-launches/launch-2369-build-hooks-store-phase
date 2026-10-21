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
}
/** The Builder's draft (type, mode, words, blocks, settings); job 1's `{ prompt, mode }` opens in the describe editor. */
export function loadDraft(): Draft {
  try { return normalizeDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')); } catch { return normalizeDraft(null); }
}
export function storeDraft(draft: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); return true; } catch { return false; }
}
