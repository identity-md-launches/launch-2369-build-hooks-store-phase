import content from './learn-content.json';
import { Text } from './Text';
const Source = ({ url, children }: { url: string; children: string }) => <a href={url} target="_blank" rel="noreferrer"><Text>{children}</Text></a>;
const docs = 'https://docs.uniswap.org/contracts/v4/';
export function Learn() {
  return <section className="wrap page learn" aria-labelledby="learn-h">
    <h1 id="learn-h">Learn</h1>
    {content.faqs.map((faq, i) => <details key={faq.question} open={i === 0 ? true : undefined}>
      <summary>{faq.question}</summary><div><p><Text>{faq.answer}</Text></p></div>
    </details>)}
    <h2>Read the sources</h2>
    <div className="box sources">
      <dl className="kv">
        <div><dt>IMD</dt><dd><Source url="https://imd.fun/docs/">IMD docs</Source>: how jobs, launches, payment and the audit panel work.</dd></div>
        <div><dt>Uniswap v<span className="num">4</span></dt><dd><Source url={docs + 'overview'}>v4 overview</Source> · <Source url={docs + 'concepts/hooks'}>What hooks are</Source> · <Source url={docs + 'concepts/PoolManager'}>The PoolManager</Source> · <Source url={docs + 'concepts/dynamic-fees'}>Dynamic fees</Source></dd></div>
        <div><dt>For builders</dt><dd><Source url={docs + 'guides/hooks/your-first-hook'}>Your first hook</Source> · <Source url={docs + 'guides/hooks/hook-deployment'}>Hook deployment and address mining</Source> · <Source url={docs + 'reference/core/libraries/Hooks'}>Hooks library reference</Source></dd></div>
      </dl>
    </div>
    <h2 id="permissions-h">What a hook can do: the <span className="num">14</span> permissions</h2>
    <p>A hook is called by the pool at fixed moments. Each moment is a permission the hook switches on. Everything in the builder maps to one or more of them (from Uniswap&apos;s docs, in plain words).</p>
    <div className="box permissions">
      <table aria-labelledby="permissions-h"><tbody>
        {content.permissions.map(row => <tr key={row.callback}><th scope="row"><code>{row.callback}</code></th><td><Text>{row.description}</Text> <span className="muted">Blocks: <Text>{row.blocks}</Text></span></td></tr>)}
      </tbody></table>
      <p className="muted">A hook&apos;s address encodes which permissions it has, which is why IMD mines a special address before deploying it.</p>
    </div>
  </section>;
}
