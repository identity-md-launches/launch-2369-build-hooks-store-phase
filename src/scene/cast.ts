/** Stable integration point for later chain-read and launch jobs. */
export type CastListener = (message?: string) => void;
const listeners = new Set<CastListener>();
export function cast(message?: string): void {
  for (const listener of listeners) listener(message);
}
export function subscribeToCasts(listener: CastListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
