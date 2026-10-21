# Worker validation — phase 1, job 4

Validated on 2026-10-21 against the production static export. These are worker observations, not independent certification. Job 4 evidence is under `tests/results/job4/`; earlier job reports remain in their original directories.

## Build and interaction checks

| Check | Actual result | Evidence under `tests/results/job4/` |
| --- | --- | --- |
| Dependency install | Existing lockfile installed successfully in an isolated temporary copy; manifests and lockfiles unchanged | Rebuild commands in README |
| TypeScript | Passed | `typecheck.txt` |
| Production build | Passed; complete export copied to root `dist/` | `build.txt` |
| Unit tests | 43 passed, zero failed/skipped | `unit-tests.txt` |
| Launch browser suite, with Robinhood fork | 13 passed | `launch-browser.txt`, `launch-browser-results.json` |
| Builder and Hook regressions | 26 passed; 2 optional Ethereum fork tests skipped | `builder-hook.txt`, `builder-hook-results.json` |
| Store, wallet, pond and live RPC checks | 23 passed, including the real RPC check | `store-wallet-pond-live.txt`, `store-wallet-pond-live-results.json` |
| Pinned design probe | 12 passed; 4 retained visual-spec exceptions, described below | `design-probe-output.json` |
| Final rendered export | No page errors or horizontal overflow at 390, 821 and 1440px; full wordmark visible, Connect 168px | `rendered-export.json`, `store-*.png` |
| Static export and submission budget | Local references/public assets checked; complete source and runtime assets retained | `export-integrity.json`, `submission-budget.json` |

Build commands were `npm --prefix web run typecheck`, `npm --prefix web test`, and `npm --prefix web run build`, executed against the isolated copy. The build retains Vite's advisory that the main JS chunk exceeds 500 kB; it succeeds. Dependencies, caches and browser binaries are outside the submitted repository.

**Final unique Chromium total: 62 passed, 2 optional tests skipped, 0 failed or flaky.** The three completed reports cover all 64 tests. The later screenshot-only repeat is not added to that total.

Chromium checks use the production export under `/preview/`, with the existing static server. Final browser batches use:

```sh
node web/scripts/run-launch-checks.mjs
npm --prefix web run test:e2e -- tests/builder.spec.ts tests/hook.spec.ts
HOOKS_LIVE_RPC=1 npm --prefix web run test:e2e -- tests/store.spec.ts tests/wallet.spec.ts tests/pond.spec.ts tests/live-rpc.spec.ts
```

`PLAYWRIGHT_BROWSERS_PATH` pointed to the temporary browser installation. A longer combined run ended with exit 143; it is not counted as a completed suite. Bounded batches provide the final results. Earlier setup failures included a stale preview, a stopped standalone fork and selecting an already-selected disabled chain field in a refresh test. The preview was rebuilt, the fork is now owned and cleaned up by the check runner, and the refresh fixture only switches when necessary. No passing result is inferred from an interrupted command.

## History corrections and real RPC validation

The refreshed upstream `SPEC.md` is version **1.15**. Ethereum reads, including ENS, use `https://rpc.mevblocker.io`; Robinhood keeps its requested endpoint. Starts are **26164897** and **85300000**, with **100000** and **400000** block windows respectively. Unit tests check the actual configured sizes, inclusive/gap-free ranges, shared Requested/Completed reads, matching a completion encountered before its older request, and splitting arbitrary failures until a window is at most 1,000 blocks. A failed group does not advance its saved cursor. The v2 cache restarts older browser caches at the corrected bounds.

The opt-in Playwright test uses a fresh browser context and real public RPCs, with no log/chain interception. It waits for the exact status **Read from Ethereum and Robinhood Chain**, bounded by 30 seconds including navigation. A completed earlier standalone run took **1,866 ms**, with **2 Ethereum** and **46 Robinhood** log calls. A later run observed **4,704 ms**, including retry calls. The final batch took **2,622 ms**, with **2 Ethereum** and **46 Robinhood** log calls (`store-wallet-pond-live.txt`). These are measurements on this machine, not a latency guarantee. Timestamp, ENS and result-file enrichment run separately from completion of the history scan.

Read-only checks on both configured chains found code at Intake and the configured PoolManagers. Both IMD contracts returned symbol `IMD`, 18 decimals and launch price `500000000000000000`. The readings are saved in `public-contract-reads.jsonl`. No public transaction was submitted.

## Launch and pool coverage

The guarded fork runner checks loopback URL, Anvil client identity, chain 4663 and the Robinhood fork origin before any mutation. Its final fork block is recorded in `launch-fork-results.json`. It impersonates the public payer from the supplied fixture only inside Anvil, mocks native gas and IMD balance, verifies `balanceOf`, and uses the application's actual approve/request functions against the forked Intake and token contracts. It does not create or replace either contract or use a private key.

Both **type A and type B** run approval and request end to end. The body selects Ethereum deployment while payment occurs on Robinhood. Assertions compare transaction calldata and emitted body bytes to the exact preview, verify callback/asset/amount, and parse the matching `Requested` id. Browser tests additionally check successful approval receipt gating, request receipt gating, pending storage, the done notice, explorer link, pond integration and `#hook/4663/<requestId>` navigation. Delayed receipts keep the next action disabled.

Other checks cover:

- Unsupported payment chain and switching, changed account, rejected signature, zero/excessive price, insufficient allowance, price changes after approval, over-16-KiB bodies and the existing in-progress lock.
- Exact clipboard JSON equality, enabled deploy-chain validation, no duplicate approval after reload, saved transaction receipt recovery, and matching token Approval events for both direct and Smart Wallet-style outer receipts.
- Type C live-page rendering with a **synthetic** result and mocked contract reads, real component input validation, copy-only controls, and six-decimal token conversion. Unit tests cover integer roots, decimal/inverted ratios, v4 bounds, fee/tick-spacing choices, sorted currencies and encoded initialize calldata. No initialize transaction is sent.
- Existing Builder, Store, Hook, wallet and pond behaviors: navigation, search/filter reset, responsive panels, wallet discovery/rejection/disconnect/focus, mobile links, Coinbase choice, draft persistence, management lockouts, risk signs, offline fonts, gateway-subpath assets, motion timing and reduced motion.

The committed `inProgress: true` remains as delivered. Launch review/copy and wallet connection work; live payments stay disabled until the operator removes the banner. The test fixture opens launches only on its local fork. The relay remains absent, with the refused-body fee warning and Copy request action. Pool sending remains phase 2b.

## Better Interface review

The pinned workflow, core principles in all six domains and document-web-design section were applied. Source review covered semantics, tokens, state transitions and copy. Rendered review used Chromium, interaction tests, the provided probe and final screenshots. The 390px Store screenshot was inspected: the product description, input and **Describe it** button are visible without scrolling. The 821px header shows the full wordmark, nav, search and Connect on one row. Launch tables and actions stack on phones. `DESIGN.md` documents the actual final source.

| Domain | Coverage | Findings and fixes |
| --- | --- | --- |
| Accessibility | Semantic summary/fee tables with row headers, labeled selects/price input, native disclosures, status/alert feedback, named hash/address copying and existing keyboard wallet modal. | Disabled later steps now explain their prerequisite (`web/src/LaunchReview.tsx:150`). Invalid pool input is connected through `aria-describedby` and `aria-invalid` (`web/src/OpenPool.tsx:34`). Risk signs reuse the keyboard-accessible Builder component. |
| Layout | Launch summary/fee columns and three steps stack at 820px; long JSON/hashes wrap. Rendered checks at 320/390/821/1440 for Launch and 821/1024/1440 for the bar. | Removed the chain pill and its state (`web/src/App.tsx:38`); removed its CSS and the intermediate-width wordmark hiding rule (`web/src/styles.css:208`). Measured 821px header has 180px wordmark, 120px search and 168px Connect. |
| Writing | Explicit deploy/pay distinction, type-specific fees, refused-body warning, receipt states, retry guidance and copy-only pool explanation. | External hook copy now says “A v4 hook not launched through this store” (`web/src/Catalog.tsx:53`). A proposed transaction-specific IMD explorer path returned 404; the done notice uses the verified explorer home instead (`web/src/Hook.tsx:58`). |
| Typography | Existing self-hosted Press Start 2P / Pixelify Sans / VT323 and six shared size tokens. Numerical amounts, addresses, tiers and computed prices use terminal text. | New tables and controls reuse existing typography; row headers use the existing variable body face at 600. No new font assets or size system. See `web/src/styles.css:449` and `web/src/OpenPool.tsx:29`. |
| Colors | Existing paper/ink/pine palette and opaque panels. State meaning is expressed in text as well as color. | Probe-measured solid-background text passes contrast thresholds. No new decorative colors. Canvas/gradient text is visually reviewed but not numerically certified. |
| UI | Distinct wallet/pending/success/error states, rechecked wallet identity and price, receipt-gated actions, preserved inputs and recovery after refresh. | Approval verification now uses the matching token event so Smart Wallet receipts are supported (`web/src/chain/launch.ts:66`). Submitted hashes are saved and reverified after reload (`web/src/LaunchReview.tsx:31`). Failed history windows split and retry without silently advancing (`web/src/chain/store.ts:22`). |

The review retained job 3's requested visual direction. The new launch/pool UI uses existing tokens, panels, warning signs and controls. No unrequested palette or navigation redesign was introduced.

### Required probe and exceptions

Run from the repository root, using the supplied script:

```sh
IMD_PLAYWRIGHT=/tmp/hooks-job4/web/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The probe completed all **16 checks**: **12 passed**, **4 flagged**. No script errors, missing local files, horizontal overflow, text overlap, obstructing floating controls or clipped text were found at 320/390/1440. All 26 measured controls meet the 24px-or-spacing rule; 19 are below the 44px comfort size. The specified compact existing controls are retained; new launch actions are at least 44px high. All measured solid-background text meets 4.5:1 (3:1 for large text); 34 canvas/gradient boxes were not measured. Sharing metadata, tracking, font families, glyphs, copy budget and reduced motion pass.

Four retained exceptions follow the explicit visual specification and “everything else stays as delivered” scope:

1. **Casing:** the specified pixel headings and actions remain uppercase (14 reported content boxes).
2. **Eyebrows:** the existing landing eyebrow remains. Other reported items include functional fieldset legends, action labels and section labels rather than newly introduced decorative text.
3. **Type sizes:** six shared tokens plus the explicitly specified wordmark/nav/eyebrow values produce seven repeated sizes at desktop and eight with one-offs. New Launch UI reuses shared tokens.
4. **Chrome:** three existing first-screen controls combine an ink border and hard shadow, as required by SPEC section 8.

These are recorded exceptions, not passing checks. The supplied probe and screenshot evidence are not a formal accessibility audit.

## Limitations and delivery integrity

- Chromium is the completed browser target. WebKit was installed and its missing libraries investigated in temporary directories, but the runtime stopped at **“Could not create EGL display: no supported platform available”**. WebKit/Safari, Firefox, physical phones, hardware wallets, real Coinbase passkey approval, screen-reader output and forced-colors rendering were not exercised. Smart Wallet event handling and the connector UI are tested; no live wallet payment is claimed.
- Type C live results and selected management fixtures remain synthetic where captured job-3 result files lack deployment addresses. Live public chain history and local fork payment tests are distinct evidence. The two optional older Ethereum management-fork browser tests are skipped in this job's final batches; their prior job-3 results remain available.
- Public RPC and IPFS availability can change. Failed readings retain cached data and retry controls. Unknown addresses or missing build/result stages are not invented. The fee/receipt checks do not certify that the eventual swarm deployment succeeds.
- `inProgress` remains enabled, no relay is configured, and initialize is copy-only. Hosting/publication and phase-2 behavior are outside this delivery.
- Final source, existing lockfile and complete `dist/` are retained. No protected dependency/build configuration, `.git/`, `.github/`, `.env`, ignore file or submodule was changed. No dependency/cache directory, registry mirror or archive is part of the submission. Final byte accounting is in `submission-budget.json`.
