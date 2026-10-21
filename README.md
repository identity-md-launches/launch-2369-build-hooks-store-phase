# The Hooks Store

Phase 1, jobs 1–5: a static React storefront, block Builder, chain-backed catalog, wallet launch flow, optional IMD relay, Hook management and My hooks. The complete production export is in `dist/`, with relative assets and hash routes for static hosting and IPFS gateway subpaths.

Job 5 refreshes `SPEC.md` to **1.16**, puts **IMD first and selected** in new type A drafts, adds the relay/free check/import flow, names store launches in the pond ticker, reads real job stages, and polishes the monochrome scene. Existing explicit pairing choices in saved drafts are preserved. The job 4 payment flow, RPCs, chain history, header, pool-call calculator and management behavior remain.

## Install, preview and rebuild

Use Node.js 24+ and npm. The existing dependency manifest, lockfile and build configuration are unchanged.

```sh
npm --prefix web ci
npm --prefix web run dev -- --host 127.0.0.1
npm --prefix web run typecheck
npm --prefix web run build
node scripts/serve.mjs --port 4173
# Open http://127.0.0.1:4173/preview/#store
```

`npm --prefix web run preview` also serves the export. Vite uses root `index.html`, `base: './'` and root `dist/`. No route rewrites are needed. Fonts, wallet icons, favicon, share image, configuration and JS/CSS chunks are local. The supplied canonical Open Graph URL remains `https://the-hooks-store.sites.imd.fun/og.png`. This assignment did not publish the site or send a public-chain transaction.

The worker installed dependencies and built in an isolated `/tmp` copy, then copied the complete export back. No dependency installation, cache, package archive or ignore-file change is included. The existing `snapshot` package script is obsolete; it is not part of this build.

## Launch flow

The **Connect** control reuses the wallet layer from [the requested upstream commit](https://github.com/identity-md-launches/launch-2254-build-hooks-store-polished/tree/11f246fd8751b48cee018f8d5aa1c6a282e40e0e/src/wallet), adapted to wagmi 3 and both configured chains. It lists EIP-6963 wallets, Coinbase Wallet / Smart Wallet, and four mobile wallet-browser links. No WalletConnect relay or project ID is required. The control stays 168px wide and displays a twelve-character checksummed address when connected.

1. Build and review a valid type A, B or C request. The deploy selector offers only `enabledDeployChains` and has no default. Launch shows the summary, type-specific fee table, exact compact JSON and payment/deployment distinction.
2. Connect and choose where to **pay**: Ethereum or Robinhood Chain. The hook deploys on the Builder's chain, which may differ.
3. Approve the current price, read from `Intake.priceOf(launch.open@launch-1, imd)`. Zero and prices over `500000000000000000` are refused. The approval is for the exact price; IMD balance and wallet account/network are checked. A successful receipt must contain the matching IMD `Approval` event. Event verification supports direct transactions and Smart Wallet receipts.
4. Launch becomes available only after approval confirms. The site rechecks price and allowance, simulates, and calls `request(actionId, bodyBytes, (zero address, 0x00000000), imd, price)`. The bytes are exactly the displayed UTF-8 JSON, capped at 16 KiB. A price change requires another explicit approval.
5. The confirmed `Requested` event must match the Intake, payer, action, body, asset and amount. Its request id is saved under `hooks-store:pending`, immediately added to the chain store, and shown on `#hook/<paymentChainId>/<requestId>`. A done notice, IMD explorer link and pond cast accompany confirmation.

Wallet review, receipt wait, confirmation and errors are separate states. Submitted hashes survive reload under a body/account/payment-chain-specific key. **Check confirmation** rereads the receipt without sending another transaction. A rejected signature unlocks retry; an uncertain submitted transaction keeps the next step locked. Changing wallets or payment chains invalidates approval state. Storage failures retain the current flow in memory and tell the visitor to keep the page open and copy hashes.

The committed `inProgress: true` is preserved: the banner stays visible and payments stay locked. **No real launch happens before the owner reads the separate, read-only adversarial review by a different seat.** Review, copy, browsing and wallet connection work now. Tests disable the flag only in local fixtures. `relayUrl` remains null; Launch warns that a refused body spends the fee and offers **Copy request**. This delivery does not deploy the relay or any contract.

## Optional relay and free check

[relay/README.md](relay/README.md) includes the operator's one-command Cloudflare deployment and dependency-free worker tests. Set `relayUrl` in `public/site-config.json` to the deployed HTTPS origin and rebuild. Keep the default `null` to use the site entirely through public chain reads.

With a relay configured, a valid Builder request enables **Check with the swarm (free)**. The site sends `{action: "launch.open", input: <exact composer body>}` to `/check`, then displays **What the swarm understood**: IMD's fact labels and states, plan titles, blockers and suggestions. Blockers lock both Continue and the Launch page's payment controls. Pending/failed checks remain explicit and retryable. Editing a checked request, changing a wallet address that appears in it, or changing its imported source requires a fresh check; old results never certify different bytes. Checks are optional until one is run. A free check does not launch the hook or replace its audit panel.

Own-code requests first use **Resolve repository** in Advanced. `/import` receives `{url, ref, kind: "contracts"}` and must return a valid pinned `source.repoUrl` and `source.baseCommit`. Only that resolved source enters the displayed/composed body when the relay exists. Import failures retain the fields and lock continuation. Editing either source field invalidates resolution. Without the relay, the prior explicit repository/full-commit flow remains available.

The last check and import are cached in this tab's `sessionStorage` (`hooks-store:check:v1`, `hooks-store:import:v1`). Blockers survive reloads; successful results match the exact JSON and relay URL. No private keys or signatures enter the relay.

The Store polls `/launches?limit=100` every 20 seconds. Names come from returned token/hook artifacts, including standalone hooks reported as `other`. Only entries matched by chain and launch id/hook address to a chain-proven store request can appear in its ticker. Initial history does not cast; a newly live matching entry casts once. Reduced motion keeps the canvas still while updating the message. Long names wrap fully. An unavailable relay retains the chain-based ticker and catalog.

Hook timelines discover pending jobs from the matching `/intake/<paymentChain>/<requestTx>` entry, or use the delivered job id. They poll `/jobs/:id` for **Building**, **Audit panel** and **Deploying**. Live/Failed still depend on chain completion/result reads. Missing job data gets a Retry action without inventing progress. The relay caches successful GETs for 30 seconds, so those optional stages and names may lag that cache window.

The scene adds bank reeds, a hat drawn above the unchanged Pepe data, a distant boat and one or two birds over sparse canopy tiles. It retains the existing monochrome inks, cell sizes, fish and cast timings.

## Type C: open the pool

A live type C Hook page shows **Open the pool**. It reads the token's decimals and verifies the hook's `poolManager()`, sorts native ETH and the existing token by address, selects the Pool rules fee tier (default 0.3%) and matching tick spacing (500/10, 3000/60, 10000/200), and accepts **1 token = x ETH**.

`web/src/chain/pool.ts` uses integer rational arithmetic and integer square root, including token decimals and the inversion required by sorted ETH/token currencies. It floors the Q64.96 value and rejects zero, malformed and out-of-range prices. The panel copies the full `PoolManager.initialize` parameters and encoded calldata. **It does not send a transaction.** Visitors send it from a v4 interface and add liquidity there; sending here is phase 2b. No pool or token is created by the type C launch itself.

## Chain reads and configuration

`public/site-config.json` is the single runtime configuration. Rebuild after changing it; the export also reads its own copy on load. Defaults remain available if loading fails.

| Chain | ID | RPC | Intake start | Log window |
| --- | --- | --- | --- | --- |
| Ethereum | 1 | `https://rpc.mevblocker.io` | 26164897 | 100000 |
| Robinhood Chain | 4663 | `https://rpc.mainnet.chain.robinhood.com` | 85300000 | 400000 |

Every Ethereum application read, including ENS, uses the configured mevblocker transport. The Intake is `0xa43e6f75ee006411f79ac1c84120606c2330de82` on both chains. IMD is `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7` on Ethereum and `0x5f7bb59365ce557c26dbcaa4ee9d39a4b95b7127` on Robinhood. Both tokens reported IMD, 18 decimals and a live 0.5 IMD launch price during read-only validation. The existing ABI is retained in `src/abi/intake.json`.

The reader fetches Requested and Completed once for each shared window, matches completions by request id, and remembers completions encountered before older requests. Four historical windows run concurrently. Any failed window is halved until it is at most 1,000 blocks before the chain is reported unreadable. Failed groups never advance the history cursor. A 20-second head poll overlaps twelve blocks and deduplicates events. Optional timestamps, ENS and IPFS result files do not delay the chain-read status.

Only `univ4_hook` / `evm_contracts` bodies ending in this store's fixed composer marker become cards. Other IMD launches remain absent from the catalog. Address resolution describes an external hook as **A v4 hook not launched through this store**. There is no bundled launch snapshot. Completion failures, missing results and unavailable RPCs remain explicit and retryable.

| Browser key | Content |
| --- | --- |
| `hooks-store:draft:v2` | Builder draft |
| `hooks-store:intake:v2:<chainId>` | Head, history cursor, matching requests, completions and results; v1 reads restart using the corrected bounds |
| `hooks-store:ens:v1:<payer>` | Name or negative lookup, one-day expiry |
| `hooks-store:launch-tx:<digest>` | Submitted hashes and price, scoped to account, payment chain and exact body; receipts are reverified after reload |
| `hooks-store:pending` | `{requestId, chainId, payer, txHash, createdAt}` array; `chainId` is the payment chain |

Hook management and My hooks retain job 3's behavior: owner reads gate privileged functions, public functions and views derive from matched catalog rules, unknown addresses stay unknown, and query-param wallet viewing never authorizes writes. Featured placements remain phase 2.

## Validation

```sh
npm --prefix web test
npm --prefix web run typecheck
npm --prefix web run build
web/node_modules/.bin/playwright install chromium
npm --prefix web run test:e2e
node --test relay/worker.test.mjs
node scripts/check-delivery.mjs
# Job 5 routes/relay interactions at 320, 390 and 1440px:
npm --prefix web run test:e2e -- tests/job5.spec.ts
# Tool-only accessibility dependencies, kept outside the project:
npm install --prefix /tmp/hooks-a11y lighthouse puppeteer-core
HOOKS_A11Y_TOOLS=/tmp/hooks-a11y node web/scripts/check-accessibility.mjs
# Read-only public RPC test:
HOOKS_LIVE_RPC=1 npm --prefix web run test:e2e -- tests/live-rpc.spec.ts
# Requires Anvil on PATH. Starts/stops its own guarded local Robinhood fork:
node web/scripts/run-launch-checks.mjs
# Full Chromium regression suite, including the read-only live RPC test:
node web/scripts/run-launch-checks.mjs --all --live
```

The fork runner uses a public fixture payer, impersonated only inside loopback Anvil. It mocks that account's IMD balance with `anvil_setStorageAt`, verifies `balanceOf`, and runs type A and B approvals/requests against the forked real contracts. It asserts exact preview bytes, cross-chain deployment selection and parsed request ids. Browser tests cover receipt gating, wrong chain, signature rejection, zero price, refresh recovery, copy, pool conversion and responsive layouts. The default browser suite skips network-dependent cases unless enabled. Two older Ethereum-management fork checks remain separately optional; their setup is in `web/scripts/fork-setup.mjs` and `check-fork.mjs`.

Actual job 5 results, Lighthouse reports, measured timings, six-domain Better Interface coverage and limitations are in [VALIDATION.md](VALIDATION.md) and [tests/results/job5](tests/results/job5/). Lighthouse accessibility is **100** on Store, Builder and its checked-response panel. Chromium covers every route at 320, 390 and 1440px. WebKit could not start because this runtime lacks its system libraries; no Safari result is claimed. [DESIGN.md](DESIGN.md) documents the final system. Earlier evidence remains under `tests/results/job4/` and prior directories. Results are worker observations, not independent certification.

The next seat's review scope and reproducible entry points are in [the money-path review handoff](tests/results/job5/REVIEW-HANDOFF.md). Its read-only review is a separate step; this build does not certify its own money path.

The final export must stay with source and `web/package-lock.json`. No private keys, contracts deployed by this job, live payments, vendored registry, dependency caches or submodules are required.
