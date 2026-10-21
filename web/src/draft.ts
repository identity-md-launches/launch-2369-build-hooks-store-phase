export const DRAFT_KEY = 'hooks-store:draft:v2';
export function saveDraft(patch: { prompt?: string; mode: 'prompt' | 'blocks' }) {
  let existing: Record<string, unknown> = {};
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) existing = stored;
  } catch { /* An invalid old draft is replaced by the new explicit input. */ }
  // Preserve blocks, launch type and settings owned by later jobs.
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...patch }));
}
