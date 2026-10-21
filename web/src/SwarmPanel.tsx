import type { CheckResult } from './relay';
import { Text } from './Text';
export function SwarmPanel({ result }: { result: CheckResult }) {
  return <section className="swarm-panel" aria-labelledby="swarm-understood-h">
    <h2 id="swarm-understood-h">What the swarm understood</h2>
    <p className="small" role="status">{result.blockers.length ? `${result.blockers.length} blocker${result.blockers.length === 1 ? '' : 's'} to resolve before launch.` : 'No blockers reported for this exact request.'}</p>
    <h3>Facts</h3>
    {result.facts.length ? <dl className="swarm-facts">{result.facts.map((fact, i) => <div key={`${fact.id}:${i}`}><dt><Text>{fact.label}</Text></dt><dd><span className="pill state">{fact.state}</span>{fact.required && <span className="small"> Required</span>}{fact.state !== 'stated' && fact.assumed && <p className="small muted"><Text>{fact.assumed}</Text></p>}</dd></div>)}</dl> : <p className="small muted">No facts returned.</p>}
    <h3>Plan</h3>{result.plan.length ? <ol>{result.plan.map((step, i) => <li key={i}><Text>{step.title}</Text></li>)}</ol> : <p className="small muted">No plan returned.</p>}
    <h3>Blockers</h3>{result.blockers.length ? <ul className="swarm-blockers">{result.blockers.map((text, i) => <li key={i}><Text>{text}</Text></li>)}</ul> : <p className="small muted">None.</p>}
    <h3>Suggestions</h3>{result.suggestions.length ? <ul>{result.suggestions.map((text, i) => <li key={i}><Text>{text}</Text></li>)}</ul> : <p className="small muted">None.</p>}
    <p className="small muted">A free check does not launch or audit your hook.</p>
  </section>;
}
