# The Hooks Store

A static React/TypeScript storefront for composing, launching and managing Uniswap v4 hooks. This delivery revises **job 13**, against **SPEC 1.54**: balance-first promotions, public RPC fallbacks, EasyList-safe markup and cross-chain proven-launch wording. Source, the existing package manifest/lockfile, production export in `dist/` and actual test results in `tests/results/job13/` are included. Hash routes and relative runtime assets support static hosting and IPFS gateway subpaths.

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

This task installed the unchanged `web/package.json` and `web/package-lock.json` in a temporary checkout for build/test. No existing build configuration, manifest, lockfile, ignore file or dependency directory in this repository was changed.

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

## Validation

```sh
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test
cd web
npx playwright install chromium
npx playwright test job12.spec.ts --grep 'job 13 promotions panel|two labelled balances' --reporter=list
npx playwright test job12.spec.ts --grep-invert 'job 13 promotions panel|two labelled balances' --reporter=list
npx playwright test store.spec.ts --grep 'Store and Learn fit|keyboard focus reaches main action|export works offline' --reporter=list
```

The promotion regression suite also requires `forge`, `anvil`, solc 0.8.26 and access to the configured public Robinhood RPC. It compiles the pinned contract fixtures and sends transactions only to its isolated local fork. The controlled-RPC job 12 suite requires no public RPC or signer: `npx playwright test job12.spec.ts` from `web/`.

Actual results, reproduction evidence, the six-domain Better Interface review, screenshots, export checks and limitations are recorded in [VALIDATION.md](VALIDATION.md) and [tests/results/job13/validation.md](tests/results/job13/validation.md). `unit-results.txt` and the three `*playwright*.txt` files contain the actual command output; `featured-easylist-390.jpg` and `promotions-balances-390.jpg` record the affected mobile views. Screenshot paths resolve relative to the test file, so they remain inside this repository regardless of the command's working directory. Older reports are historical, not claims about this run. [DESIGN.md](DESIGN.md) documents the final implemented system.

Revision results: production build and separate typecheck passed; 1,192 unit tests and 37 Chromium cases passed, with no failures or skips in those runs. The design probe passed 13/16 checks; the three retained exceptions follow the required pixel design. Rendered checks used Playwright Chromium against the production export. WebKit, screen readers, physical devices, native zoom, the full historical browser suite and the Anvil fork were not rerun in this focused revision.
