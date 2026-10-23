# The Hooks Store

A static React/TypeScript storefront for composing, launching and managing Uniswap v4 hooks. Job 14 implements **SPEC 1.56, decision 49** and carry-overs **u, v, r, s, t**: the public pond rule, Checking status, runtime launch-record fallback, bounded RPC scans and grouped Builder findings. Source, the existing manifest/lockfile, production `dist/` and actual results in `tests/results/job14/` (also copied to `artifacts/job14/`) are included. Hash routes and relative runtime assets support static hosting and IPFS gateway subpaths.

Every launch still uses the swarm, costs 0.5 IMD plus gas and receives its own audit. No factory or instant/free launch option is offered. No public-chain transaction, deployment or publication was performed by this job.

## Install, preview and rebuild

Use Node.js 24+ and npm:

```sh
npm --prefix web ci
npm --prefix web run dev -- --host 127.0.0.1
npm --prefix web run typecheck
node scripts/refresh-easylist.mjs
npm --prefix web run build
node scripts/serve.mjs --port 4173
```

Open `http://127.0.0.1:4173/preview/#store`. Vite uses the root `index.html`, `base: './'` and root `dist/`. The committed export can be served directly; it needs no server rewrites or secrets. Fonts, icons, favicon and share image are local. Rebuilding replaces `dist/`.

Install dependencies from the existing lockfile. Build tool configuration, package manifests and lockfiles remain unchanged; generated dependencies and caches are excluded from the delivery. `public/site-config.json` is the application's public runtime configuration.

## Proven launches

The site fetches `evidence/proven-launches.json` from the spec repository's raw URL at runtime; it has no bundled index fallback. Additional index fields do not affect matching.

Exact same-chain matches retain their existing request sentence. Otherwise the Builder chooses the launch of the same type with the most shared block ids, breaking ties by newer launch number. At least one shared behavior block is required; token-only and words-only drafts never match. Explicit own-code sources override automatic reuse. An identical stack before choosing a chain says “Built from a proven launch”; selecting the other chain changes it to “the same blocks, redeployed on <chain>”, and the request names that chain's PoolManager. Nearest stacks still name their actual block changes.

The summary names the source, audit date and blocks removed/added. After a successful relay import, the complete request pins that repository and commit and asks for adaptation and a new audit. Failed or unavailable imports keep the existing silent fresh-build fallback. Indexed launches carry a PROVEN pill on catalog and hook pages; Build one like this preloads their blocks without copying the previous owner's wallet or allocation.

The Builder now fills the window minus scaling gutters, up to 1800px. Its desktop card grows from 420px to 520px; reading paragraphs retain their 65ch measure. Press Start 2P remains in its established roles. Reading text uses self-hosted Atkinson Hyperlegible; amounts, addresses, signatures and exact requests use JetBrains Mono, with the existing sizes and line heights. License texts are in `LICENSES/`.

## Promotions and public request pages

My hooks → Promotions uses the promotion chain as **where you pay**. After the terms, chain and balances, a typed DEPOSIT amount moves IMD from the wallet to the placements contract, approving only when the allowance is short. Each live hook on either chain has its own labelled row. PROMOTE silently creates a free listing first if needed, then buys 24 hours from the deposit. Below 0.1 IMD deposited it is disabled with its funding note. BOOST spends a typed amount from the deposit after confirmation; CANCEL explains the unused-base refund and forfeited boosts first. WITHDRAW returns the unspent deposit; recipient proceeds have a separate balance and withdrawal. Every transaction is simulated first.

The panel separately reads **In your wallet on …** from the configured IMD token's `balanceOf` and **Deposited for promotions** from the placement contract's `available`. Both refresh after every confirmed transaction, including intermediate approvals/deposits. Wallet balances below 0.1 IMD receive the specified funding note. The featured strip reads both chains, groups by hook chain/address, sums totals and ranks one logical card per hook; its decorative marquee copy is hidden from assistive technology. Hook pages recognize ads paid on either chain.

Public ad-contract request links resolve the Intake's Requested event by request id, then follow its transaction's admission and launch record. Visitors need no wallet to see “Contracts launch 2454, live” or “Contracts launch 2456, live”, the “Not a hook” explanation and IMD explorer link. Direct and history reads serialize enrichment to preserve Live results and retry messages.

The existing configured registries and placement contracts are unchanged. Earlier job 12 read-only observations are retained in `tests/results/job12/live-ads-read.json`; contract setup remains checked at runtime. Each chain client uses the public `rpcUrls` list in `public/site-config.json`, with viem fallback and one retry before surfacing errors. The featured strip and panel use placement/featured/promotion class names. Refresh the pinned EasyList generic rules before building; the unit suite checks class and id names in the finished export.

## Public pond and resilient reads

`web/src/chain/visibility.ts` supplies one rule for the catalog, count, search, status rail, landing and featured lookup. Live launches and recorded running/deploying jobs are public. Requested launches are public for less than 24 hours from the Requested block timestamp, unless a stopped record is known. Failed completions (1/2), blocked/cancelled/failed/superseded jobs, needs_input reasons and parked/failed launches take precedence. The age rule works without the relay. Unknown timestamps wait for the block read rather than assuming a request is young.

All payer requests remain in My hooks, newest first. Stopped requests keep Requested with Needs attention and Fix in Builder; failed requests read Failed. A direct link retains its page and adds the specified Not on the pond sentence. A live type A launch reads Checking… until its on-chain code read succeeds; Checking belongs to the In progress filter.

At every load the site fetches the configured `launchRecordsUrl` from the public spec repository. This file is never bundled. The exact UTF-8 objective SHA-256, payer, kind and deploy chain must match the chain request, as must a previously known launch id. Relay reads remain first; a failure or timeout uses the matching snapshot's states, addresses, source and pool. Code checks and deployer `hook()` reads still run on chain. A successful relay job response overrides snapshot job state. New requests continue to come from Intake logs. The captured snapshot and real stopped-job/chain fixtures are documented in `tests/fixtures/job14/README.md`.

`rpcLogRanges` sets each endpoint's maximum inclusive range: 10,000 for publicnode, 100,000 for mevblocker and 400,000 for the Robinhood primary. Splitting happens for the endpoint actually used, including a fallback with a smaller cap. `rpcLogLookbacks` additionally records known public-history restrictions: Ethereum publicnode is eligible within a conservative 9,000-block lookback; Robinhood publicnode does not serve public Intake logs (`0`) and remains a fallback for other reads. A history window outside those limits skips that endpoint without a failed HTTP call. These are public endpoint capabilities, not credentials. Recheck them with the read-only scan when changing providers.

Each chain permits at most two active log scans shared by normal history and direct-link readers. Rate-limited reads wait 2, 4 and 8 seconds; the shared cooldown precedes failover to another endpoint after a 429. Outages and archive refusals do not recursively fan out. Only range/result caps subdivide. Polling cancels outstanding record/result fetches when the store stops.

Missing chain and missing owner each produce one Builder cause. Independent malformed addresses, fee destinations and deployer instructions remain findings once their prerequisite is supplied. A constructor recipient for a hook with no fee uses the explicit owner, allowing a complete unsigned draft.

## Validation

```sh
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test
node web/scripts/check-job14-rpc.mjs
cd web
npx playwright install chromium
npx playwright test job14.spec.ts job12.spec.ts store.spec.ts wallet.spec.ts builder.spec.ts hook.spec.ts pond.spec.ts
```

The RPC check needs `curl`, sends read-only calls and writes `artifacts/job14/rpc-scan.json`. Its default scans both complete Intake histories through the production transport and counts every failed HTTP, JSON-RPC and transport call. `--probe-endpoints` additionally diagnoses individual providers; a diagnostic may fail even when the production fallback completes. The initial diagnostic is retained beside the final scan.

[VALIDATION.md](VALIDATION.md) and [tests/results/job14/validation.md](tests/results/job14/validation.md) record actual commands, results, repairs, six-domain Better Interface coverage and limitations. [DESIGN.md](DESIGN.md) documents the implemented tokens, typography, components and responsive behavior. Historical reports in `tests/results/` describe their own earlier runs.

Final results: build/typecheck passed; 1,228 unit tests passed; Chromium 105 passed, two optional fork cases skipped, no failures. The final full-history RPC scan reports zero failed calls and at most two log scans in flight. The pinned entry probe passes 13/16, retaining the specified pixel-design exceptions. WebKit could not launch; no WebKit or real-chain transaction results are claimed.
