import type { CheckResult } from './relay';
import { Text } from './Text';
import { IMD_FEE_OPT_OUT } from '../../src/lib/compose';
import type { SafetyFinding } from '../../src/lib/safety';
export function SwarmPanel({ result, conflicts = [], objective = '' }: { result: CheckResult; conflicts?: SafetyFinding[]; objective?: string }) {
  return <section className="swarm-panel" aria-labelledby="swarm-understood-h">
    <h2 id="swarm-understood-h">What the swarm understood</h2>
    {conflicts.length > 0 && <div className="notice bad" role="alert"><strong>Fixed facts conflict with your request. Launch is locked.</strong><ul>{conflicts.map((conflict, i) => <li key={i}><blockquote><Text>{conflict.sentence}</Text></blockquote><Text>{conflict.message}</Text></li>)}</ul><p>Edit the request to opt out explicitly, then run the free check again.</p></div>}
    {objective.includes(IMD_FEE_OPT_OUT) && result.facts.some(f => f.state === 'fixed' && /fee/i.test(f.label) && /ETH/i.test(f.label)) && <p className="notice">Your request explicitly opts out of IMD’s ETH fee default: keep the fee in IMD; {IMD_FEE_OPT_OUT}.</p>}
    <p className="small" role="status">{result.blockers.length ? `${result.blockers.length} blocker${result.blockers.length === 1 ? '' : 's'} to resolve before launch.` : 'No blockers reported for this exact request.'}</p>
    <h3>Facts</h3>
    {result.facts.length ? <dl className="swarm-facts">{result.facts.map((fact, i) => <div key={`${fact.id}:${i}`}><dt><Text>{fact.label}</Text></dt><dd><span className="pill state">{fact.state}</span>{fact.required && <span className="small"> Required</span>}{fact.state !== 'stated' && fact.assumed && <p className="small muted"><Text>{fact.assumed}</Text></p>}</dd></div>)}</dl> : <p className="small muted">No facts returned.</p>}
    <h3>Plan</h3>{result.plan.length ? <ol>{result.plan.map((step, i) => <li key={i}><Text>{step.title}</Text></li>)}</ol> : <p className="small muted">No plan returned.</p>}
    <h3>Blockers</h3>{result.blockers.length ? <ul className="swarm-blockers">{result.blockers.map((text, i) => <li key={i}><Text>{text}</Text></li>)}</ul> : <p className="small muted">None.</p>}
    <h3>Suggestions</h3>{result.suggestions.length ? <ul>{result.suggestions.map((text, i) => <li key={i}><Text>{text}</Text></li>)}</ul> : <p className="small muted">None.</p>}
    <p className="small muted">A free check does not launch or audit your hook.</p>
  </section>;
}
