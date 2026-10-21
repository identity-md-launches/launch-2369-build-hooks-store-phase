import type { StoreState } from './chain/store';
import { CHAINS } from './types';
export function ReadStatus({ data, retry }: { data: StoreState; retry: () => void }) {
  const errors = data.chains.filter(c => c.error), checking = data.chains.filter(c => c.loading || c.backfilling);
  return <div className="read-status" role="status">
    {errors.length ? <p>{errors.map(c => c.error).join(' ')} <button className="link-button" onClick={retry}>Retry chain reads</button></p>
      : checking.length ? <p>Reading {checking.map(c => CHAINS[c.chainId]).join(' and ')} launch history. Results appear as they are found.</p> : <p>Read from Ethereum and Robinhood Chain. Refreshes every <span className="num">20</span> seconds.</p>}
  </div>;
}
