# The Hooks Store

Phase 1, jobs 1–9: a static React storefront, block Builder, chain-backed catalog, wallet launch flow, optional IMD relay, Hook management and My hooks. The complete production export is in `dist/`, with relative assets and hash routes for static hosting and IPFS gateway subpaths.

Job 9 implements **SPEC 1.34 §4.17** and the open launch/fee corrections. Matching block sets automatically resolve audited source through the relay before reuse. The runtime index is fetched at site load and is never bundled; failed imports compose a complete fresh request. Advanced own-code sources override automatic matching. Both review pages state the typical wait; hook pages retain provenance, offer Copy link and ask once about browser notifications.

Request addresses are lowercase, including checksummed connected wallets and embedded addresses. Structural written-fee analysis resolves named recipients, parses whole amounts and checks the combined 5% cap per direction; ambiguous amounts lock payment. Contracts-only Live requires Completed status 0 plus a live relay launch record. Deployer and hook addresses come from that record and `hook()` independently; zero keeps hook controls locked while Live can be confirmed.

Current evidence is in [tests/results/job9/REVIEW.md](tests/results/job9/REVIEW.md), with the separate read-only [adversarial review](tests/results/job9/ADVERSARIAL-REVIEW.md). Production build/typecheck, **1,155 unit tests and 234 browser tests passed** (revision results in `tests/results/job9/revision/`), with seven optional service/fork cases skipped. Earlier job results remain historical evidence. No paid launch or deployment was made.

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

The owner has read job 5’s reviews. The committed **`inProgress: false`** removes the banner and enables the real Approve/Launch flow with the owner’s deployed relay. A request the swarm has to stop on still spends the fee; the fee table and Launch page explain that these checks exist to make that rare. Job 8 performed four real free checks and **no real approval, payment, launch or deployment**. A successful free check does not test the deployer manifest or contract execution. Confirmed cancelled/replaced or reverted approvals and launches return to a failed, retryable step. Launch replacements first verify whether the exact Requested event exists, so an executed request is completed without paying twice; retry rechecks price and allowance. A repriced approval can still confirm; a genuinely unknown receipt stays pending with **Check confirmation**, preventing duplicate payment.

## Optional relay and free check

[relay/README.md](relay/README.md) includes the operator's one-command Cloudflare deployment and dependency-free worker tests. The committed `relayUrl` names the owner’s deployed HTTPS origin, with no trailing path. An operator can set it to `null` and rebuild to use only public chain reads; that is an optional fallback, not this delivery’s configuration.

With a relay configured, a valid Builder request enables **Check with the swarm (free)**. The site sends `{action: "launch.open", input: <exact composer body>}` to `/check`, then displays **What the swarm understood**: IMD's fact labels and states, plan titles, blockers and suggestions. Blockers lock both Continue and the Launch page's payment controls. Pending/failed checks remain explicit and retryable. Editing a checked request, changing a wallet address that appears in it, or changing its imported source requires a fresh check; old results never certify different bytes. Checks are optional until one is run. A free check does not launch the hook or replace its audit panel.

Own-code requests first use **Resolve repository** in Advanced. `/import` receives `{url, ref, kind: "contracts"}` and must return a valid pinned `source.repoUrl` and `source.baseCommit`. Only that resolved source enters the displayed/composed body when the relay exists. Import failures retain the fields and lock continuation. Editing either source field invalidates resolution. Without the relay, the prior explicit repository/full-commit flow remains available.

Checks and imports use this tab’s `sessionStorage` (`hooks-store:check:v1`, `hooks-store:import:v1`) and module memory. Failed checks, blockers and stale requests require a retry, including after navigation/reload where storage is available. An HTML, proxy or empty reply shows a status-based retry message, never a JSON parser error. A validated import also stays in memory under its relay/repository/ref key, so Builder → Launch works when storage is full. A full page reload still requires storage or a fresh import; memory alone lasts for the current tab document. No private keys or signatures enter the relay.

The Store polls `/launches?limit=100` every 20 seconds. Names come from returned token/hook artifacts, including standalone hooks reported as `other`. Only entries matched by chain and launch id/hook address to a chain-proven store request can appear in its ticker. Initial history does not cast; a newly live matching entry casts once. Reduced motion keeps the canvas still while updating the message. The relative timestamp refreshes at least every minute, independently of cast deduplication. Long names wrap fully. An unavailable relay retains the chain-based ticker and catalog.

Hook timelines discover pending jobs from the matching `/intake/<paymentChain>/<requestTx>` entry, or use the delivered job id. They poll `/jobs/:id` for **Building**, **Audit panel** and **Deploying** using the API’s `waiting`, `working`, `accepted` and `failed` node states. A completed job whose launch is not yet live activates Deploying. Type A Live uses chain completion/result reads. Types B/C require Completed status 0 and a matching live launch record; their deployer/hook addresses are read separately and never gate Live. Failed remains the Intake completion status. Missing job data gets a Retry action without inventing progress. The relay caches successful GETs for 30 seconds, so those optional stages and names may lag that cache window.

The scene keeps bank reeds, the distant boat and one or two birds over sparse canopy tiles. The hat overlay is removed; Pepe’s source grids are unchanged. It retains the existing monochrome inks, cell sizes, fish and cast timings.

## Proven source and the wait

`src/lib/proven.ts` fetches the spec repository's `evidence/proven-launches.json` once at site load with no bundled or cached-index fallback. Match type, chain and the set of active block ids; parameters, extra words and Custom rule do not break a match. A matched entry passes through `/import` automatically. Only a successful, matching pin adds `repoUrl`, `baseCommit`, the audited-source instruction after the opening sentence and the single provenance line. Failed, malformed or unavailable imports silently retain the fresh request and its normal wait estimate. Editing the stack/chain invalidates the match. An explicit Advanced source takes precedence and retains its existing manual resolution flow.

Provenance follows the exact request on its Hook page, from the runtime index or the locally saved submitted source. Copy link copies the canonical hash route. The notification prompt is remembered once per browser; an opted-in launch is watched across hash navigation, and one notification is sent when it becomes Live. **The site must remain open**; this static export has no closed-tab push service. Browser permission and platform support still determine delivery.

## Launch safety and corrected requests

`src/lib/safety.ts` checks the actual composed output, including words and custom rules. Builder, the relay client, Launch review and the final signing guard use the same check. Red notices quote the offending sentence; inconsistent requests cannot be checked or paid for. Known question records in `src/blocks/known-questions.json` include the conversion question and launches 3/4’s direct-hook deployment failures. The signing guard checks the final body owner, references, deployer/factory requirements and actual composed sentences.

Every fee template uses IMD for an IMD-paired type A launch and ETH otherwise. IMD requests explicitly say **do not convert the fee to ETH and do not use any other pool**. “My wallet” resolves to the connected paying address; the treasury option names **IMD’s treasury**, `0x3f252e859a277a86A3967c11D4E054B2f07a1F22`, on both chains. A missing recipient requires connecting the paying wallet or choosing IMD’s treasury before the free check. Jar and pot readings also use the pair currency. Fees use actual traded amounts and reject partial fills specified in pair currency. Fade and volatility replace one base rate; Whale shares its destination. LP share runs before Split, and neither redistributes jar or pot funds.

Written fees recognize `%`, `percent`, `per cent`, basis points, bps and common word fractions such as “half a percent”, including “goes to”, “tax”, “skim” and “keep” phrasings. They receive the same pair-side, settlement, recipient, claim and partial-fill facts. Explicit destinations, including “payable to”, feed the B/C constructor and fee footer; without one the request names the paying wallet. Unclear amounts, unresolved destinations and disagreements lock the free check and Launch. A percentage used for a price trigger or limit cannot supply a missing fee rate: the amount must be attached to the charge. The final-body guard also rejects a contradictory generated zero-fee line. A percentage protection limit without a charge still receives `Hook fee rate: 0%.`.

The 5% cap is evaluated separately for buys and sells. Each direction counts its highest base/fade/volatility rate once, then adds applicable Whale, jar, buy-only pot and written charges. Written fees are counted conservatively as additional charges; use the fee blocks for replacement schedules. A 3% Swap fee plus an additional written 4% fee totals 7% and locks submission. Fade starts at 3% by default and its input stops at 5%; combining it with other charges can still exceed the cap. Existing incompatible sell/liquidity promises have palette exclusions in both addition orders. B/C written pool-dependent interfaces must accept PoolId; both supplied pause and price-reading examples include it.

Yield blocks have no verified Aave/Morpho deployment in this project, so they are refused on both deploy chains. Batch auctions is dimmed as not in this version. Other checks cover fee-side/settlement mismatches, missing external addresses, every declared exclusion, base-fee dependencies, fixed/dynamic LP fee conflicts, incompatible opening/sunset dates, owner-power conflicts, unconditional liquidity promises and contradictory swap restrictions. Hook donations are explicitly exempt from Donation rules. Percentage inputs must follow their configured step so displayed rounding cannot evade the fee cap. Arbitrary natural language is not formally proven by these deterministic rules; the free check and audit remain necessary safeguards. No check guarantees that a paid build can finish.

Fixed facts are compared with the request. Conflicts remain visible under **What the swarm understood** and lock both continuation and payment, even after navigation/reload. IMD’s conversion default is resolved by the composer’s explicit opt-out. Other supported conflicts show the exact request opt-out to add and require a fresh check. A check for different bytes never unlocks the changed request.

The job 7 revision also checks the fixed `token_split` pool allocation and remainder address, resolving “your wallet” from the connected payer. It catches the liquidity-lock/trading-hours and unrestricted-sells/swap-limit conflicts, ordinary “paid in” settlement wording, plural fee recipients, and named service/pool dependencies whose own address is missing. An unrelated payout address cannot identify a service. Fee prohibitions retain their buy/sell scope, while the written examples now state complete no-fee observer, pause and price-reading rules. These are deterministic checks of request wording and explicit addresses, not certification of user-entered contracts.

After confirmation, the full draft and request are saved by payment chain and request id in this browser. A blocked Hook page reads `blockedReason` and failed nodes’ `failureReason` through relay `GET /jobs/:id`, displaying their text unchanged. **Fix in Builder** restores the submitted draft beside those questions and retains the old request in a disclosure. Older launches recover their token, blocks, words, pairing, pool share, recipient, owner and source from the on-chain request. Unknown rules remain editable and are never silently dropped; oversized custom text must be shortened before continuing. A corrected relaunch is a new paid request, not an answer sent to the stopped job. Stored drafts are local to this browser; the chain request remains available without local storage.

## Type C: open the pool

A live type C Hook page shows **Open the pool**. It reads the token's decimals and verifies the hook's `poolManager()`, sorts native ETH and the existing token by address, selects the Pool rules fee tier (default 0.3%) or the dynamic-fee flag `0x800000`, and matching tick spacing (500/10, 3000/60, 10000/200), and accepts **1 token = x ETH**.

`web/src/chain/pool.ts` uses integer rational arithmetic and integer square root, including token decimals and the inversion required by sorted ETH/token currencies. It floors the Q64.96 value and rejects zero, malformed and out-of-range prices. The panel copies the full `PoolManager.initialize` parameters and encoded calldata. **It does not send a transaction.** Visitors send it from a v4 interface and add liquidity there; sending here is phase 2b. No pool or token is created by the type C launch itself.

## Chain reads and configuration

`public/site-config.json` is the single runtime configuration. Rebuild after changing it; the export also reads its own copy on load. Defaults remain available if loading fails.

| Chain | ID | RPC | Intake start | Log window |
| --- | --- | --- | --- | --- |
| Ethereum | 1 | `https://rpc.mevblocker.io` | 26164897 | 100000 |
| Robinhood Chain | 4663 | `https://rpc.mainnet.chain.robinhood.com` | 85300000 | 400000 |

Every Ethereum application read, including ENS, uses the configured mevblocker transport. The Intake is `0xa43e6f75ee006411f79ac1c84120606c2330de82` on both chains. IMD is `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7` on Ethereum and `0x5f7bb59365ce557c26dbcaa4ee9d39a4b95b7127` on Robinhood. Both tokens reported IMD, 18 decimals and a live 0.5 IMD launch price during read-only validation. The existing ABI is retained in `src/abi/intake.json`.

The reader fetches Requested and Completed once for each shared window, matches completions by request id, and remembers completions encountered before older requests. Four historical windows run concurrently. Any failed window is halved until it is at most 1,000 blocks before the chain is reported unreadable. Failed groups never advance the history cursor. A 20-second head poll overlaps twelve blocks and reconciles cached events against successful canonical rereads. Removed/absent requests disappear from records, catalog and saved pending cards; removed completions also discard their derived result and Live status. Cached event block hashes are checked on refresh, including events older than the overlap. A failed read preserves cached data with an error. Late IPFS responses cannot restore an orphaned completion. Optional timestamps, ENS and IPFS result files do not delay the chain-read status.

Contracts-only result files may predate deployment. The reader obtains `GET /launches/:id` through the relay, matches its id and deploy chain, identifies deployers using artifact/attestation names, and reads `hook()` on the deploy chain. A missing result can discover the launch via the matching Intake admission and job. Cached relay/hook data is invalidated with an orphaned completion.

Only `univ4_hook` / `evm_contracts` bodies ending in this store's fixed composer marker become cards. Other IMD launches remain absent from the catalog. Address resolution describes an external hook as **A v4 hook not launched through this store**. There is no bundled launch snapshot. Completion failures, missing results and unavailable RPCs remain explicit and retryable.

| Browser key | Content |
| --- | --- |
| `hooks-store:draft:v2` | Builder draft |
| `hooks-store:intake:v2:<chainId>` | Head, history cursor, matching requests, completions and results; v1 reads restart using the corrected bounds |
| `hooks-store:ens:v1:<payer>` | Name or negative lookup, one-day expiry |
| `hooks-store:launch-tx:<digest>` | Submitted hashes and price, scoped to account, payment chain and exact body; receipts are reverified after reload |
| `hooks-store:pending` | `{requestId, chainId, payer, txHash, createdAt}` array; `chainId` is the payment chain |

Hook management and My hooks retain the delivered ownership gates: owner reads gate privileged functions, public functions and views derive from matched catalog rules, unknown addresses stay unknown, and query-param wallet viewing never authorizes writes. Current pool-dependent controls pass a selected PoolId. Earlier requests use the retained legacy catalog signatures; they are not silently changed. Featured placements remain phase 2.

## Validation

Job 9 used an isolated `/tmp` dependency installation with the unchanged lockfile. Current results are in `tests/results/job9/`; the final production export is in `dist/`.

```sh
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test
npm --prefix web run test:e2e
node scripts/check-delivery.mjs --out tests/results/job9
```

The Playwright suite serves the production export under `/preview/`, with deterministic relay/RPC fixtures. Seven live-service/local-fork cases require explicit opt-in. The final run passed 234 tests and skipped those seven; the job-specific tests cover proven matching/fallback at 320/390/1440, own-source override, checksummed wallets, Live with a zero hook, Copy link and notification deduplication. Accessibility checks on five rendered surfaces found zero WCAG A/AA violations; the design probe passed 13/16, with its remaining flags matching the prescribed pixel style. See the review for manual coverage and limitations.

Required source and runtime assets are complete. Representative screenshots use compact WebP evidence. Historical PNG evidence was repacked losslessly to meet the 8 MiB bundle cap; `historical-png-packing.json` records matching decoded RGBA hashes, and no historical screenshot was removed. No ignore files, existing build configuration, dependency manifests, lockfiles or submodules changed.

The following commands and results are retained from earlier jobs:


```sh
npm --prefix web test
npm --prefix web run typecheck
npm --prefix web run build
web/node_modules/.bin/playwright install chromium
npm --prefix web run test:e2e
cp artifacts/playwright-results.json tests/results/job8/playwright-results.json
node --test relay/worker.test.mjs
node scripts/check-delivery.mjs
# Job 8 composer corpus and focused browser checks:
node tests/generate-job8-corpus.mjs
node --test tests/job8-revision.test.mjs
npm --prefix web run test:e2e -- tests/job8-revision.spec.ts
npm --prefix web run test:e2e -- tests/job8.spec.ts tests/builder.spec.ts
# Launch-safety cases and retained regressions:
npm --prefix web run test:e2e -- tests/job5.spec.ts tests/job6.spec.ts tests/job7.spec.ts
# Review regressions, including corrected requests at all three widths:
npm --prefix web run test:e2e -- tests/job7-revision.spec.ts
# One real free check from the production export; no wallet/transaction:
HOOKS_LIVE_RELAY=1 npm --prefix web run test:e2e -- tests/live-relay.spec.ts
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

Historical job 7 results, free checks, RPC timing and route screenshots remain in [VALIDATION.md](VALIDATION.md) and [tests/results/job7](tests/results/job7/). [DESIGN.md](DESIGN.md) documents the final implementation. Earlier evidence remains under `tests/results/job6/`, `job5/`, `job4/` and prior directories. Results are worker observations, not independent certification.

Historical job 7 revision findings and corrections are recorded in [REVISION.md](tests/results/job7/REVISION.md). That evidence uses the `revision-` prefix under `tests/results/job7/` and is distinct from the original delivery.

The final export must stay with source and `web/package-lock.json`. No private keys, contracts deployed by this job, live payments, vendored registry, dependency caches or submodules are required.

Job 8 verifies `poolBps` against successful deployment receipts on both chains: it is basis points of **total supply**, not a share of the creator’s 90%. Evidence is in [pool-allocation-research.md](tests/results/job8/pool-allocation-research.md). The fixed 10% swarm share and selected parameter are unchanged. Standard-token buybacks retain bought tokens forever; own tokens expose public `burn(uint256)`; an existing-token burn that is absent or reverts retains the tokens. Buybacks run only in the explicit function, with the specified 3% spot-relative bound.

The checked 420-case request corpus is [composed-requests.jsonl](tests/results/job8/composed-requests.jsonl). It includes disabled and inapplicable cases explicitly and sends nothing to the network. The separate review records remaining specification-level risks for the next job; no safety guarantee or on-chain launch proof is claimed.
