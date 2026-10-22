# The Hooks Store

A static React/TypeScript storefront for composing, launching and managing Uniswap v4 hooks. This delivery implements **job 12, the proven lane**, including carry-overs (h)–(m), against the current **SPEC 1.50**. Source, the existing package manifest/lockfile and the production export in `dist/` are included. Hash routes and relative runtime assets support static hosting and IPFS gateway subpaths.

Every launch still uses the swarm, costs 0.5 IMD plus gas and receives its own audit. No factory or instant/free launch option is offered. No public-chain transaction, deployment or publication was performed by this job.

## Install, preview and rebuild

Use Node.js 24+ and npm:

```sh
npm --prefix web ci
npm --prefix web run dev -- --host 127.0.0.1
npm --prefix web run typecheck
npm --prefix web run build
node scripts/serve.mjs --port 4173
```

Open `http://127.0.0.1:4173/preview/#store`. Vite uses the root `index.html`, `base: './'` and root `dist/`. The committed export can be served directly; it needs no server rewrites or secrets. Fonts, icons, favicon and share image are local. Rebuilding replaces `dist/`.

This task installed the unchanged `web/package.json` and `web/package-lock.json` in a temporary checkout for build/test. No existing build configuration, manifest, lockfile, ignore file or dependency directory in this repository was changed.

## Proven launches

The site fetches `evidence/proven-launches.json` from the spec repository's raw URL at runtime; it has no bundled index fallback. Additional index fields do not affect matching.

Exact matches retain their existing request sentence. Otherwise the Builder chooses the launch of the same type with the most shared block ids, breaking ties by newer launch number. At least one shared behavior block is required; token-only and words-only drafts never match. Exact matches require the same chain; a nearest match can adapt to a different chain. Explicit own-code sources override automatic reuse.

The summary names the source, audit date and blocks removed/added. After a successful relay import, the complete request pins that repository and commit and asks for adaptation and a new audit. Failed or unavailable imports keep the existing silent fresh-build fallback. Indexed launches carry a PROVEN pill on catalog and hook pages; Build one like this preloads their blocks without copying the previous owner's wallet or allocation.

The Builder now fills the window minus scaling gutters, up to 1800px. Its desktop card grows from 420px to 520px; reading paragraphs retain their 65ch measure. Press Start 2P remains in its established roles. Reading text uses self-hosted Atkinson Hyperlegible; amounts, addresses, signatures and exact requests use JetBrains Mono, with the existing sizes and line heights. License texts are in `LICENSES/`.

## Promotions and public request pages

My hooks → Promotions uses the promotion chain as **where you pay**. Its hook selector includes the wallet's live store hooks on both chains, labelled with each hook's deployment chain. A free listing on the payment chain records the hook's own chain id and address. Deposit, purchase, boost, cancel and withdrawal use the relevant promotion chain; own-placement rows include both chains and offer switching where needed.

The panel separately reads **In your wallet on …** from the configured IMD token's `balanceOf` and **Deposited for promotions** from the placement contract's `available`. Both refresh after every confirmed transaction, including intermediate approvals/deposits. Wallet balances below 0.1 IMD receive the specified funding note. The featured strip reads both chains, groups by hook chain/address, sums totals and ranks one logical card per hook; its decorative marquee copy is hidden from assistive technology. Hook pages recognize ads paid on either chain.

Public ad-contract request links resolve the Intake's Requested event by request id, then follow its transaction's admission and launch record. Visitors need no wallet to see “Contracts launch 2454, live” or “Contracts launch 2456, live”, the “Not a hook” explanation and IMD explorer link. Direct and history reads serialize enrichment to preserve Live results and retry messages.

The existing configured registries and placement contracts are unchanged. Read-only observations during this job found code, the expected registry, and configured IMD/proceeds recipients on both chains. Contract setup remains checked at runtime. `tests/results/job12/live-ads-read.json` records the observation.

## Validation

```sh
npm --prefix web run typecheck
npm --prefix web run build
node --test --test-concurrency=1 tests/*.test.mjs
node --test relay/worker.test.mjs
cd web
npx playwright install chromium
npx playwright test --workers=3
```

The promotion regression suite also requires `forge`, `anvil`, solc 0.8.26 and access to the configured public Robinhood RPC. It compiles the pinned contract fixtures and sends transactions only to its isolated local fork. The controlled-RPC job 12 suite requires no public RPC or signer: `npx playwright test job12.spec.ts` from `web/`.

Actual results, the six-domain Better Interface review, screenshots, export checks and limitations are recorded in [VALIDATION.md](VALIDATION.md) and [tests/results/job12/validation.md](tests/results/job12/validation.md). Older reports are historical, not claims about this run. [DESIGN.md](DESIGN.md) documents the final implemented system.

Final results: production build and separate typecheck passed; 1,177 unit tests, 9 relay tests and 277 Chromium cases passed, with 7 existing opt-in cases skipped. The design probe passed 13/16 checks; the three retained exceptions follow the required pixel design. Screen readers, physical devices and native zoom were not tested. The supplied browser connector lacked Chrome, so rendered checks used Playwright Chromium. See the linked validation report for the exact skipped cases and review evidence.
