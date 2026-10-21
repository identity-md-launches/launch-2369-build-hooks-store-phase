# Worker validation — phase 1, job 3

Validated on 2026-10-21 against the production `dist/` export. This is a record of worker checks, not independent certification. Prior-job reports remain under `tests/results/`; current reports are under **`tests/results/job3/`**.

**Known evidence gap:** real Requested/Completed logs were captured on both chains, including a failed completion, and a real successful-build IPFS result was saved. That result and the other inspected launch results contain no deployed addresses. A captured **Live result.json with addresses** was therefore unavailable. Live-schema tests are explicitly synthetic; contract resolution and management transactions were exercised on a real mainnet fork. The application keeps a completed build without addresses In progress.

## Final checks

| Check | Actual result | Delivered evidence |
| --- | --- | --- |
| Install from existing lockfile | `npm --prefix web ci --ignore-scripts` succeeded; existing manifests/lockfile unchanged | Rebuild instructions in README |
| TypeScript | `npm --prefix web run typecheck` passed | `typecheck.txt` |
| Production build | `npm --prefix web run build` passed; includes `tsc --noEmit` | `build.txt`, complete root `dist/` |
| Unit tests | `npm --prefix web test`: **29 passed**, none failed/skipped | `unit.txt` |
| Builder browser suite | **12 passed**, plus **3 risk-tooltip tests passed** | `e2e-builder-final.txt`, `e2e-risk-final.txt` |
| Store, wallet and pond browser suites | **22 passed** (16 Store, 2 wallet, 4 pond) | `e2e-store-wallet-pond-final.txt`, `cast-frames.json` |
| Hook browser suite, with local fork | **13 passed**, including the two optional fork tests | `e2e-hook-final.txt`, `fork-results.json` |
| Total Playwright | **50 passed**, 0 failed, 0 skipped, 0 flaky | `playwright-results.json` |
| Pinned design probe | Measured all 16 checks: **12 passed**, 4 mockup-related flags reviewed below | `design-probe.json`, `design-probe-390.png` |
| Export integrity and path/size review | Local references, public assets, metadata and bundle size checked | `export-integrity.json`, `submission-budget.json` |

Reports in the table are relative to `tests/results/job3/`. Playwright used Chromium headless shell and the static preview under `/preview/`, not a development server. All suites ran after the final application-source change. The large JS entry produces Vite's advisory >500 kB chunk warning; the build succeeds and required wallet/runtime chunks remain included.

Browser commands were split into bounded batches, preserving one complete result per batch:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers npm --prefix web run test:e2e -- tests/builder.spec.ts --grep-invert 'risk tooltips'
PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers npm --prefix web run test:e2e -- tests/builder.spec.ts --grep 'risk tooltips'
PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers npm --prefix web run test:e2e -- tests/store.spec.ts tests/wallet.spec.ts tests/pond.spec.ts
HOOKS_FORK_URL=http://127.0.0.1:8545 PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers npm --prefix web run test:e2e -- tests/hook.spec.ts
```

Some earlier long-running tool sessions ended with exit 143. They are not counted as completed checks. Final batches above completed with exit 0. Intermediate test failures exposed a missing keyword match, result-retry delay and fixture/setup mistakes; these were repaired and the affected suites rerun. No passing result is inferred from an interrupted command.

## Functional coverage

- Real ABI decoding: at least two original Requested and two original Completed log objects from each RPC; action/body parsing, both exact terminal store markers, rejection of unrelated launches and malformed data. The Robinhood fixture also contains a real status-2 failure with no supplied reason. A synthetic nonempty bytes32 reason verifies ASCII decoding.
- Every catalog sentence round-trips through template matching with its parameters; unfamiliar prose remains Custom and cannot introduce owner controls. Payment-chain request IDs and deployment-chain contracts stay distinct.
- 40-hex matching covers hook, token, distributor and pool currencies; 64-hex matching covers IDs and hashes. Keywords include block titles as well as short labels and prose. Unknown-address lookup runs on both supported chains and distinguishes an unavailable RPC from no matching contract.
- Inclusive backward ranges are gap-free and no larger than 10,000 blocks. Poll tests cover new store requests, unrelated requests, deduplication, cached restarts and queued head polling while a read is in flight. Only a newly observed matching request casts. ENS reverse names and expiry are tested with an isolated client/storage fixture.
- Successful-result parsing preserves UUID launch IDs for evidence links independently of numeric launch labels; it never manufactures addresses. Unsupported result URIs and mismatched-chain results stay unusable; an unavailable result has a working immediate retry. The real IPFS result with null launch details stays In progress.
- Hook pages render at **320, 390 and 1440px**, with no horizontal overflow or page errors. Tests exercise risk-sign focus, address copying, matched-block cloning, owner lockout, query-param read-only viewing, per-argument validation, public controls, and a simulated 20-second reading refresh.
- My hooks filters the real request payer from the test event, links Live hooks to Manage, scrolls to the panel, and supports draft discard/undo. A query parameter never grants owner privileges.
- Wallet tests cover EIP-6963 discovery, rejection recovery, connection/disconnection, focus trap/Escape/restore, mobile wallet-browser choices and Coinbase. A wallet on an unsupported chain switches to Ethereum; an already supported chain stays connected. No relay project ID is used.
- Job-2 regressions cover Builder modes/types/fields, chain and allocation requirements, composition, dependency removal, risk signs, verified-mark fallback, layout, navigation, offline fonts, gateway-subpath URLs, metrics failure, storage failure, first-screen action, scene timings and reduced motion.

## Fork evidence

The final local fork used the requested Ethereum public RPC, with chain ID 1 and fork block **26241048**. Anvil received the only transactions. `tests/fork/ControlHook.sol` was compiled with Solidity 0.8.26 and deployed locally at `0x1f23570d3abdc47512f9718b923a7e236e7a4bbc`; deployment block 26241049 and transaction hash are recorded in `fork-results.json`. The mock was not deployed to Ethereum or Robinhood.

`node web/scripts/check-fork.mjs` used the application's actual resolver to identify the real Hamster Hour hook `0x82f636a92364d13754d7b3e72d460f0be20a28cc`, its canonical PoolManager and six enabled permission flags. It identified token `0x8e7c7936b4f2d4475dc4bacd174dc228d4d24e86` as Hamster Hour / HAMSTER. The browser also resolved those contracts and handed the token into Builder type C. The management test connected the mock's local owner, sent `pause()`, waited for a successful receipt, observed `paused() == true`, then unpaused and observed false.

Fixture provenance, including the distinction between captured data and synthetic store-marked events, is documented in `tests/fixtures/chain/README.md`. The captured logs are never imported by production pages. No private key or public-chain transaction was used.

## Better Interface review

The pinned Better Interface workflow, the core principles of all six domains, and document-web-design guidance were applied. Source inspection covered semantics, tokens, interaction states and copy. Rendered coverage used the actual export in Chromium, the probe, screenshots and keyboard/pointer interaction tests. The final 390px first-screen screenshot was inspected: the product explanation, describe input and **DESCRIBE IT** action are visible without scrolling. Hook header and management screenshots were also inspected at mobile and desktop widths.

| Domain | Coverage and final implementation | Findings and repairs |
| --- | --- | --- |
| Accessibility | Native labeled fields, fieldsets, semantic regions, named copy actions, polite reading/transaction feedback, keyboard-focusable risk signs, wallet focus behavior. `web/src/AddressValue.tsx:7`, `web/src/Management.tsx:60`, `web/src/App.tsx:41`. | Empty argument fields originally showed red errors immediately. `Management.tsx:71` now gives neutral guidance until values are entered. Invalid entered addresses remain explicit. Owner lockout is enforced by address equality at `Management.tsx:86`; the query parameter is never used there. |
| Layout | Sticky shared bar, wrapping hashes, five-stage timeline, two management columns and mobile stacking. `web/src/styles.css:389`, `:403`, `:439`. No overflow at 320/390/1440. | Duplicate open-slot content and unwanted animation were removed at `web/src/Catalog.tsx:77`; only actual placements enable the loop. Manage links now scroll with sticky-header clearance at `web/src/Hook.tsx:37`. |
| Writing | Exact empty-pond line and payment notice; plain function labels; explicit Unknown, In progress, Failed and retry states. `web/src/Catalog.tsx:60`, `web/src/LaunchReview.tsx:8`, `web/src/Hook.tsx:53`. | Completed build files without addresses no longer imply Live (`web/src/chain/decode.ts:119`). Intermediate timeline stages make no invented claim. Practice copy no longer says chain reads belong to a future job. |
| Typography | Self-hosted Press Start 2P / Pixelify Sans / VT323. Addresses, signatures, quantities and readings use the terminal face. Six shared tokens plus the specified bar/eyebrow exceptions are documented in DESIGN.md. | The unsupported character logo was replaced with the exact pixel SVG at `web/src/App.tsx:43`; the 10px gap and wordmark remain. No remote font request was needed by the export. |
| Colors | Existing paper/ink/pine palette, status text alongside color, visible focus, no new decorative palette. Prior token-pair calculations remain in `tests/results/contrast.json`; the new probe measured rendered solid backgrounds. | All measured solid-background text passed the probe threshold. The 34 boxes over canvas/gradients were not numerically certified; they were visually inspected. New pages use opaque paper panels. |
| UI | Explicit chain choice, disabled invalid actions, owner gating, simulated writes, receipt states, immediate retry, retained inputs and reversible draft discard. `web/src/Builder.tsx:205`, `web/src/Management.tsx:40`, `web/src/MyHooks.tsx:30`. | Keyword search now includes catalog block titles (`web/src/chain/decode.ts:152`). Retry clears the result delay (`web/src/chain/store.ts:84`). Successful partial history is cached even after a later RPC failure (`store.ts:115`), and a pending head poll takes precedence (`store.ts:117`). Cloning uses complete rule matching so unfamiliar rules are not dropped (`Hook.tsx:17`). |

The review also caught and removed a stray rendered `0` next to a successful completion and restored the existing compact-button style instead of overriding it globally. The final source uses the existing warning component for Hook-page risks and retains the job-2 visual direction.

### Probe result and retained mockup exceptions

The exact required probe was run from the repository root, with its supplied script and scratch output:

```sh
IMD_PLAYWRIGHT="$PWD/web/node_modules/playwright/index.mjs" PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

It completed with no script errors or missing local files. Layout, target spacing, measured contrast, tracking, font families, glyphs, slogans, repetition, copy budget, motion and sharing checks passed. The open-slot duplication flag from the previous delivery is resolved.

Four flags remain because the assignment explicitly retains the mockup and the rest of job 2:

1. **Casing:** the pixel headings, navigation and actions use the mockup's capitals. The probe reports 14 content boxes. Body text remains sentence case.
2. **Eyebrows:** the requested landing eyebrow is retained. Other reported examples include actual fieldset legends, the brand, action labels and the featured section rather than newly added ornamental labels.
3. **Type sizes:** the site uses six common tokens, while the exact 9px desktop navigation/eyebrow and 12px wordmark produce seven repeated sizes at desktop and eight total including one-offs. These dimensions are explicitly requested; the new Hook UI reuses existing tokens.
4. **Chrome:** three first-screen controls have both an ink border and a hard shadow, matching SPEC 8. Removing those would change the requested pixel treatment.

These are recorded exceptions, not claimed passes. All 27 first-screen controls meet the probe's 24px-or-spacing rule; 20 are below the 44px comfort target. The compact mockup controls are retained. There is no new first-screen obstruction, overflow or missing main action.

## Remaining limitations

- **Real Live fixture:** unavailable as explained above. The real captured build result's deployment fields are null. Synthetic schema coverage and real fork transactions are reported separately.
- **Public RPC history:** the requested Ethereum endpoint returned “Archive requests require a personal token” for older log windows. Historical-state requests used while finding deployment/fork blocks also returned unavailable state. Some secondary public endpoints returned pruned history. Recent logs and final live-head fork reads worked. A complete historical scan could not be established; the UI shows partial/cached data and a retry action without silently skipping rejected ranges. No deployment start block, key or alternate backend was invented.
- **Result/timeline data:** immutable result files can lack deployment details even when other IMD services later show a live launch. This job does not substitute the browser-restricted API for the required chain/IPFS source. Building, audit and deployment milestones remain unknown without the later relay. Missing audit/trade links are explicit; empty operator templates are not guessed.
- **Later scope:** payment/launch submission, pool opening and promotion contracts remain later jobs. The review page has the requested payment notice; no pretend wallet payment is implemented.
- **Browser/accessibility coverage:** Chromium screenshots, keyboard interactions and the fork fixture were exercised. A WebKit binary was downloaded but could not launch because required shared libraries were absent. Safari/Firefox, actual mobile wallet apps, hardware wallets, screen-reader output, forced-colors rendering and real public-wallet transactions were not tested. No Lighthouse score or formal accessibility certification is claimed.
- The hosting name and Open Graph image URL are configured from the brief. Publication and the live domain were outside this task.

The export and source remain complete. Existing dependency/build configuration and prohibited paths were not edited; no ignore file was changed, no dependency archive or git submodule is included, and temporary installations were removed from the repository after verification. See `submission-budget.json` for the final byte accounting against 8 MiB.
