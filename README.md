# The Hooks Store

A static React/TypeScript storefront for describing, launching and managing Uniswap v4 hooks. This delivery implements **SPEC 1.43, job 10**: the carry-overs, free listings and paid #AD placements. Source, the existing dependency lockfile and the production export in `dist/` are included. Relative assets and hash routing support static hosting and IPFS gateway subpaths.

The existing pond, pixel design, Builder v2, launch/payment safety and wallet connectors are retained. Current verification is in [VALIDATION.md](VALIDATION.md), [artifacts/validation.md](artifacts/validation.md) and the test reports under `artifacts/`. Older results under `tests/results/` are historical.

## Install, preview and rebuild

Use Node.js 24+ and npm:

```sh
npm --prefix web ci
npm --prefix web run dev -- --host 127.0.0.1
npm --prefix web run typecheck
npm --prefix web run build
node scripts/serve.mjs --port 4173
# Open http://127.0.0.1:4173/preview/#store
```

Vite uses root `index.html`, `base: './'` and root `dist/`. No route rewrites or backend credentials are needed. Fonts, wallet icons, favicon and share image are local. The existing canonical Open Graph image URL is retained. This job did not publish the site or send a public-chain transaction.

For this task, dependencies were installed in an isolated temporary directory from the **unchanged** `web/package.json` and `web/package-lock.json`. An isolated copy of the source used those dependencies for build/test, and its `dist/` was copied back. No package manifest, lockfile, existing build configuration, ignore file or dependency directory was changed in the repository.

## Free listings and advertisements

`public/site-config.json` contains an `ads` map by chain id:

| Chain | Registry | Placements | Launch |
| --- | --- | --- | --- |
| Robinhood Chain (4663) | `0x366c84a2971713fc8fa24d3d4b8abd2f4f085625` | `0x63b59cbf5b535e46815ae5d4cf126bf409dba69c` | 2454 |
| Ethereum (1) | `0xff8b7110525c1ec39d6df825880890e7d9184f06` | `0x1da6f19ee08365813651de6420603fea4fbcdc9a` | 2456 |

The map also pins each source commit. Generated ABIs and their provenance are under `src/abi/`; both pinned sources compile to identical ABI arrays. Missing addresses hide the strip and Promotions panel for that chain.

The Store scans `featured(1,100)` and subsequent pages, then checks every candidate with `getPlacement`. Cancelled and expired placements are excluded even when featured returns them, and empty pages do not end the scan. Reads use one block per chain for consistent ranking. `rankOf` supplies each total; descending totals and ascending placement id determine order. `getMetadata(listingId, purchasedRevision)` supplies the card name. Editing a listing cannot change an existing ad. Only hooks associated with this store's chain-proven requests enter its featured strip. The open slot is last; refresh is every 60 seconds. Hover/focus pauses the marquee and reduced motion uses a scrollable row.

**My hooks → Promotions** is the only spending surface for ads. Select the hook's chain and a live hook launched by the connected wallet, then:

1. Create or reuse a free listing. Its name, source/audit evidence, callback mask, fee disclosures and admin disclosures come from the hook page. Listing creation costs gas, with no listing fee.
2. Approve and deposit the missing part of 0.1 IMD. Existing available balance is used first; approval is limited to the missing deposit.
3. Review the listing revision and live proceeds recipient; purchase 24 hours for 0.1 IMD with a ten-minute transaction deadline.
4. Open the carousel from the done state. The hook page also shows its active #AD state.

Placement rows show hours left, total paid and rank across the same combined store-only strip on both chains. BOOST asks for a positive IMD amount and explicit acceptance of its non-refundable, no-deadline terms before deposit/boost. CANCEL explains the pro-rata base refund and forfeited boosts before confirmation. Refunds return to available balance; Withdraw sends that balance to the connected wallet. Every write checks chain/account, simulates first, waits for a successful receipt and exposes its transaction hash. A rejected step remains retryable.

**Live setup limitation:** read-only checks found code at both placement addresses and the expected registry, but both `imd()` and `proceedsRecipient()` were still unset. The UI displays that setup state and disables deposits/purchases until the contract owner configures them. It never guesses a recipient or changes live contract state. Free listing creation remains available. `artifacts/live-ads-read.json` records those reads. All payment checks ran on a local Anvil fork.

## Carry-over fixes

- Builder details use viewport geometry, requestAnimationFrame scroll updates and resize handling; the sticky card retains its load details height. Below 720px its details have a 40vh floor. The two desktop scroll/type cases and both phone sizes are covered.
- All six previously ignored job 7–9 browser specs use v2 controls and selectors. `testIgnore` is removed; no spec file is excluded. Findings quote a short faulty phrase without the redundant “in the request.” suffix.
- Type A reads launch-record artifacts by role, verifies hook code and computes the seeded PoolKey id with ABI encoding and keccak256. The recorded 2448 fixture yields `0xccab6575b5cdd5798731f62f9299c442f954366e91b9513386d83e249cb99843` and preselects it.
- Type C owner reads rerun when the deployer resolves the hook. Its distributor row is absent, an uncreated pool is named plainly, and Open the pool remains available. Sending pool initialization from the site remains phase 2b; this panel prepares/copies the call.
- Non-hook ad-contract launches are excluded from catalog/pond hook activity and appear as a plain contracts row linking to the build job in My hooks. Direct old hook links also reach that contracts row.
- Post-payment and evidence links use Intake admission job ids, with the explorer root until admission; unsupported `/launches/` links and the redundant Hook page link are removed.
- Range-order wording adds the appropriate liquidity gate and beforeAddLiquidity callback to timed rules. Max buy/swap and Cooldown state the one-sided-liquidity limitation. The consistency checker scopes that exemption to liquidity, preserving swap fees. Conflicting liquidity-lock combinations are refused.
- Fee sentences include exact-input/exact-output mulDiv formulas. Requests without Dynamic LP fee reject the dynamic-fee flag. Written fees accept pct and ratio phrasing, flag unreadable amounts and require addresses for unknown active payees.
- Proven-source imports normalize case, trailing slash and `.git`; mocks use IMD's returned `.git` shape. Notifications watch own requests only. The wait line says 30–90 minutes, sometimes up to three hours.
- Pool-dependent controls wait without attempting a read, offer Initialize-event pools plus a typed id, and simulate Send with plain action errors. The source artifact ABI at the launch commit overrides catalog signatures by function name. A pinned control ABI excerpt keeps launch 2424's global pause/claimFees usable when its unpublished raw `out/` artifact returns 404; other missing artifacts fall back to catalog signatures.

## Wallets and reads

The existing single Connect control supports EIP-6963 browser wallets, wallet-browser deep links on phones and Coinbase Smart Wallet. There is no WalletConnect relay or project id. Query-address viewing never authorizes a transaction; owner actions require the current `owner()` wallet.

The configured public RPCs are `https://rpc.mainnet.chain.robinhood.com` and `https://rpc.mevblocker.io`. The existing Intake reader walks inclusive ranges, reconciles canonical logs/reorgs and polls the head every 20 seconds. The optional relay provides admission, launch records, stage details, source import and free checks; failure remains visible and retryable. It never receives private keys or wallet signatures. [relay/README.md](relay/README.md) documents that existing worker.

Launches still cost 0.5 IMD and gas. The Builder and final signing guard check the exact request; fixed-fact conflicts and unresolved inputs lock payment. Arbitrary prose and external contract code are not formally proven by those checks. Locally submitted drafts and watch choices stay in browser storage; notifications require keeping the site open.

## Run the checks

```sh
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test
node --test relay/worker.test.mjs
cd web
npx playwright install chromium
npx playwright test --workers=3
```

The new promotion suite automatically starts and stops an isolated Anvil fork and compiles the pinned contracts. It requires `forge`, `anvil`, solc 0.8.26 and access to the configured public Robinhood RPC. Compiler flags match both pinned repositories: Cancun, optimizer 200, no CBOR/bytecode hash metadata. Fork-only impersonation and balance overrides never reach a public RPC. To run just its contract checks, use `node web/scripts/check-ads-fork.mjs` from the repository root; add `--with-browser` for its three-width browser flow. Pin details are in [src/abi/PROVENANCE.md](src/abi/PROVENANCE.md).

Actual results: typecheck/build passed; **1,166 unit tests**, **9 relay tests**, and **249 Chromium cases** passed. Seven older optional live RPC/relay or additional fork cases were skipped under their existing opt-in guards; every spec was collected. The new ad fork and its real wallet flows at 320, 390 and 1440 ran. The exhaustive pair sweep covers 1,221 enabled pairs: 1,156 accepted cleanly and 65 refused before payment. These are worker observations, not independent certification.

[DESIGN.md](DESIGN.md) describes the implemented tokens, typography, layout and components. `artifacts/packaging.json` records compaction of old Lighthouse diagnostic details and retirement of four redundant historical screenshots to meet the submission budget. Current source, runtime assets, pinned evidence and current test results remain complete. No ignore file was changed.
