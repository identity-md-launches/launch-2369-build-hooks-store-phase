# Job 7 launch-safety revision

This is a bounded revision of the accepted SPEC 1.25 implementation. Findings and individual decisions are in `.imd-responses.json`. The earlier delivery evidence remains in this directory; files prefixed `revision-` describe this revision. Results are worker observations, not independent certification. No real signature, approval, payment, launch, deployment or publication was performed.

| Final check | Actual result | Evidence |
| --- | --- | --- |
| Typecheck and production build | Both exit 0; source/export complete; existing large-chunk warning retained | `revision-typecheck.txt`, `revision-build.txt`, `export-integrity.json` |
| Units | 643 passed; zero failures/skips | `revision-unit.txt` |
| Relay Worker | 9 passed; zero failures/skips | `revision-relay-unit.txt` |
| Full Chromium suite | 188 passed, seven optional skips, zero failures/flaky; six completed batches | `revision-playwright-results.json`, `revision-playwright-1.txt` through `-6.txt` |
| Route widths | All seven routes at 320, 390 and 1440 pixels; blocked/correction states also included | `revision-{route}-{width}.jpg`, combined browser report |
| Live public RPC settle | Passed in 8,892ms; three Ethereum and 69 Robinhood log calls; no substituted transports | `revision-live-rpc.json`, `revision-live-rpc.txt` |
| Better Interface probe | 13/16; three preserved pixel-style exceptions described below | `revision-design-probe.json` |

`revision-summary.json` records the same measured totals. All six findings are fixed. Complete for the stated revision scope, with the unperformed optional checks and semantic limits below.

## Reproduction and fixes

Before editing, composed each reported draft with the actual `newDraft`, `entry` and `body` functions and ran the existing safety functions. Both conflicting catalog pairs, the ETH-payment sentence, VRF with an unrelated payee, the named pricing pool, the named fee recipient and the differing token allocation returned no findings. The supplied Buy back and burn example produced a contradiction against its own complete description. The actual pre-edit findings are in `revision-reproduction.json`.

| Finding | Source and correction | Regression evidence |
| --- | --- | --- |
| Catalog contradictions | `src/lib/safety.ts:95`: compare individual rule sentences. Liquidity lock conflicts with Trading hours' unrestricted changes; unrestricted sells conflict with a bidirectional size limit and other sell restrictions. Quote both effects. | `tests/safety-revision.test.mjs`: nine catalog pairs, both orders, A/B/C availability, both pairing settings and both deploy chains; removing either rule clears the finding. Browser cases cover both reported pairs on Builder/direct Launch and removal/recovery at all three widths. |
| Explicit payment currency | `src/lib/safety.ts:50`: recognize paid in, paid out, payable, denominated, sent/distributed and payment-currency assertions. | Composed wrong/matching-currency cases under all type/pair/chain combinations; production serializer and free-check client refuse unsafe bodies. Browser cases exercise both currency directions. |
| Dependency address association | `src/lib/safety.ts:30`: detect named services, currency-pair pools and external/named tokens. Require each dependency's own explicit address, rather than any address in its sentence. | VRF with/without the unrelated winner, multiple dependencies sharing one address, named pricing pools/tokens, addressed controls and prohibitions. Browser cases check the quoted original sentence and repair. |
| Fee recipients | `src/lib/safety.ts:58`: recognize plural/labeled fee clauses and fees-go-to wording; require a full nonzero recipient at the clause. | Bob, ENS-like unresolved text, zero addresses and valid addressed equivalents, across all type/pair/chain combinations; browser refusal and correction. |
| Fixed token allocation | `src/lib/safety.ts:125`: compare fixed `token_split` allocation with the exact objective and economics; compare concrete remainder recipients. `web/src/useSwarmCheck.ts:27` supplies the current payer for “your wallet”. | The unchanged recorded 50% fact versus a 65% request; concrete recipient mismatches; exact positive opt-out versus negative/wrong-id text; stale checks, direct Launch and reload at 320/390/1440. |
| Buy/sell scope | `src/lib/safety.ts:12`: split descriptions into sentences/clauses and preserve the charged/exempt direction. A subsequent token buyback is not a buy fee; a zero buy rate is not a buy charge. | The supplied example and opposite-direction/each/all/per wording pass. Same-direction contradictions still fail with distinct quotes. Browser cases select the real example and complete its free check. |

`web/src/SwarmPanel.tsx:10` now reports that fixed-fact conflicts need resolution instead of showing “No blockers reported for this exact request” beside a conflict. Both returned and requested allocation values appear in the red notice. Its exact opt-out must enter the request, and changed bytes require a fresh check. The existing guard remains shared by Builder, relay client, Launch serialization and the final signing check.

## Checks and commands

Dependencies were installed with the unchanged lockfile in an isolated temporary project copy. No dependency/cache directory, package archive, manifest, lockfile, ignore file or build configuration was changed in the submission.

```sh
npm --prefix web run typecheck
npm --prefix web run build
node --test --test-reporter=tap tests/*.test.mjs
node --test --test-reporter=tap relay/worker.test.mjs
npm --prefix web run test:e2e -- tests/job7-revision.spec.ts
# Run each batch to completion, sequentially; N = 1 through 6:
npm --prefix web run test:e2e -- --fully-parallel --workers=1 --shard=N/6
HOOKS_LIVE_RPC=1 npm --prefix web run test:e2e -- tests/live-rpc.spec.ts
IMD_PLAYWRIGHT=/path/to/playwright/index.mjs node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
node scripts/check-delivery.mjs
```

The production export is served at `/preview/` for browser checks. The suite includes Store, Catalog, Builder, Launch, Hook, My hooks and Learn at 320, 390 and 1440 pixels, with actual control interactions, request bytes, resource checks and overflow assertions. The original blocked-job correction, transaction replacement/retry and reorg regressions remain included. The revision adds 28 browser cases. JSON report paths are normalized to repository-relative paths; results are otherwise retained.

The initial full browser command was interrupted with exit 143 after 23 passes; it is not counted as a completed run. The retained interrupted log is separate. Bounded batches rerun the complete suite. An initial unit attempt lacked the unchanged mockup in the isolated copy; including that test input resolved the two ENOENT failures. Neither event required changing production behavior. The separate focused revision run passed all 28 cases before the final broader wording assertions were included in the complete suite.

## Better Interface review

The pinned workflow and all six domain cores were applied to the changed notices and correction flows. The product's existing pixel style, six size tokens, fonts, colors, breakpoints and components are preserved; there is no unrelated redesign.

| Domain | Checked coverage and findings | Limits |
| --- | --- | --- |
| Accessibility | `SafetyNotice` retains a named `role=alert`, semantic quotes, explicit locked-state text and native disabled buttons with adjacent recovery guidance. Fixed conflicts announce the problem in the understood panel. Browser assertions inspect names/states; the MCP keyboard sample reached the skip link with a solid 3px focus outline. | No screen-reader session, full manual keyboard audit, native zoom, physical-device or Safari/WebKit run in this revision. |
| Layout | Rendered all route/width combinations and new correction states. Inspected 390px Store, catalog-pair conflict and fixed-allocation conflict screenshots. Product and Describe it action fit on the Store's first screen. Both offending sentences and full recipients wrap within the panel. | CSS viewport emulation is not a physical phone test. |
| Writing | `src/lib/safety.ts:101` and `:114` name the incompatible effects and recovery; fixed-fact guidance names the exact opt-out and another check. `SwarmPanel.tsx:10` removes the misleading clean status during a conflict. | Deterministic wording checks cannot prove arbitrary prose. |
| Typography | Existing Press Start 2P, Pixelify Sans, VT323, `Text` number/address formatting and pre-wrapped quotes remain. Actual long allocation/recipient text was inspected at 390px; narrow-width assertions also pass. | Established small pixel-nav/wordmark sizes are preserved. |
| Colors | Reused `--bad` stripe and ink/paper-2 notice surface. MCP-computed notice colors were rgb(21,19,15) on rgb(223,211,176): calculated WCAG contrast 12.44:1. The lock is also stated in words. | Canvas/gradient and every transient native control color are not numerically certified. |
| UI | Disabled pre-check/payment, direct navigation, corrected-rule recovery, checked/stale/reload/opt-out states exercised. Existing native disclosures and controls remain; no new animation or token. | Transaction tests use local fixtures. No real wallet signature, Smart Wallet creation or native wallet-app handoff. |

The final offline taste probe passes 13/16 checks. The inherited casing, eyebrow and border-plus-shadow flags match the established SPEC 8/9 pixel style and earlier owner decisions; those surfaces were not redesigned. Rendering, reflow, targets, solid-background contrast, font/size counts, motion and metadata pass. `revision-design-probe.json` retains the measurements. A favicon fetch during the interrupted preview failed after its server stopped; a fresh preview returned HTTP 200 (`image/svg+xml`) and zero console errors.

## Practical boundaries

The added dependency guard checks explicit address association in the request. It does not certify contract code, VRF subscriptions or arbitrary external-service configuration. Catalog services lacking verified chain deployments remain unavailable. A fixed “your wallet” recipient can be compared with a literal requested recipient once a payer is connected; the comparison is recomputed with that wallet before payment. Fixed literal recipients and pool allocations are compared without a wallet. No address or service deployment was invented.

The earlier real free-check record remains historical evidence; this revision does not claim a new real free-check call. Optional Anvil/fork checks and separately opted-in network checks are identified as skipped in the ordinary browser reports. The live-RPC result is recorded separately. Vite's inherited main-chunk-over-500-kB advisory remains; it is not suppressed through configuration or dependency changes.

SPEC.md remains the accepted job 7 version, 1.25. The [current upstream page](https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/SPEC.md) was read and now describes later job 8 work (1.29); those later catalog/deployer changes are outside this revision.
