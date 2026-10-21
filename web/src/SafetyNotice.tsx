import type { SafetyFinding } from '../../src/lib/safety';
import { Text } from './Text';

export function SafetyNotice({ findings }: { findings: SafetyFinding[] }) {
  if (!findings.length) return null;
  return <section className="notice bad safety-notice" role="alert" aria-label="Request needs correction">
    <h2>Fix the request before paying</h2>
    <p>Launch is locked. Edit these sentences in the Builder, then check the corrected request.</p>
    <ul>{findings.map((finding, i) => <li key={`${finding.code}:${i}`}><strong><Text>{finding.message}</Text></strong><blockquote><Text>{finding.sentence}</Text></blockquote></li>)}</ul>
  </section>;
}
