import { loadDraft } from './draft';
import { CHAIN_NAMES, compose, context } from '../../src/lib/compose';
import { Text } from './Text';
export function LaunchReview() {
  const draft = loadDraft(), ctx = context(draft);
  return <section className="wrap page launch-review"><h1>Launch</h1><section className="box"><h2><Text>{ctx.name}</Text></h2><p>{draft.settings.chain ? CHAIN_NAMES[draft.settings.chain] : 'Choose a chain in the Builder.'}</p><div className="notice"><strong>Payment happens on Robinhood Chain or Ethereum, in IMD.</strong> Your hook deploys on the chain you chose in the Builder, which can be the other one.</div><p>Wallet payment and launch submission arrive in job 4.</p><details><summary>Request text</summary><div><pre>{compose(draft)}</pre></div></details><a className="btn primary" href="#builder">Back to Builder</a></section></section>;
}
