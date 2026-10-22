# Job 8 validation and design review

Implemented against refreshed **SPEC 1.31, section 4.16**. Checked 2026-10-21–22. This report records worker observations and a separate agent's read-only review; it does not independently certify behavior, a paid build, or a deployed contract.

## Scope and consequential choices

The existing React/TypeScript/Vite site, pixel visual system, public configuration, wallet connections, payment mechanics and relay remain. Work covers the catalog, composer and safety gates, both Builder modes, deployer address resolution, pool-scoped management and type C pool-call encoding. The existing package manifest, lockfile and build configuration were retained. Dependencies and browser binaries used for verification were installed outside the repository.

Words mode sends its visible description and token choice, without saved behavior blocks. Adding a block visibly switches into the editable stack. Numbered catalog rules outrank prose/Custom. With no fee block, the zero-fee default is emitted unless written rules explicitly charge a fee; this avoids contradicting a complete written percentage or flat fee. Percentage protection prose still receives the zero default. Written owner functions remain permitted by the footer rather than being silently denied.

Current catalog functions use PoolId for pool-dependent state, including type A for consistent management. Legacy request sentences and their original callable signatures are retained separately in `src/blocks/legacy-catalog.json`; they are not silently changed on existing hooks. An unavailable imported block is shown and blocks submission. It is not silently discarded as if it had passed.

Actual successful receipts on both chains confirm that poolBps is basis points of **total supply**. The selector values stay the same; copy now shows the pool share, fixed 10% swarm share, and remaining share correctly. See [pool-allocation-research.md](pool-allocation-research.md).

## Verification

| Check | Actual result | Evidence |
| --- | --- | --- |
| Production build | Passed, exit 0; relative `./` export | `build.txt`, `export-integrity.json` |
| Typecheck | Passed, exit 0 | `typecheck.txt` |
| Full Node unit suite | 1,096 passed, no failures or skips | `unit.txt` |
| Dedicated composer suite | 444 passed, no failures or skips | `composer-unit.txt` |
| Request corpus | 420 cases; 368 enabled/applicable cases have no consistency findings; disabled applicable cases are refused | `composed-requests.jsonl`, `corpus-summary.json` |
| Initial focused Builder browser run | 7 passed across two modes and 320/390/1440 | `builder-playwright.txt`, six `builder-*.webp` files |
| Expanded Builder browser run | 22 passed, including retained interaction/tooltips/reload cases | Final integration report includes all 22 |
| Browser integration | **195 passed, 7 optional skips, no failures/flaky cases** | `playwright.txt`, `playwright-results.json` |
| Relay worker tests | 9 passed, no failures or skips | `relay-unit.txt` |
| Real free checks | A/IMD, A/ETH, B, C: HTTP 200, judged, zero blockers and fixed-fact conflicts | `live-checks/` |
| Design probe | 13/16 raw checks pass; three established visual-system exceptions explained below | `design-probe.json`, `design-probe-output.json` |
| Export and packaging | All referenced local assets present, public assets match, metadata present, no protected edits/caches/submodules | `export-integrity.json`, `submission-budget.json` |
| Independent request review | Completed read-only by a separate agent; four specification-policy findings remain for the next job | [ADVERSARIAL-REVIEW.md](ADVERSARIAL-REVIEW.md) |

Commands were run against a clean temporary copy using the unchanged `web/package-lock.json`: `npm ci`, `npm run typecheck`, `npm run build`, and `npm test` from `web/`; `node --test relay/worker.test.mjs`; `node tests/generate-job8-corpus.mjs`; and Playwright from `web/` against the production `/preview/` export. The final export was copied back completely, replacing stale generated chunks. No source, manifest, lockfile or required runtime asset was omitted to meet the byte budget.

The pinned probe command was run from the repository root with externally installed Playwright: `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline`. Its output is retained here because `.imd/` and `test/scratch/` are removed before submission. The probe serves the export itself and checks 320, 390, 1440 and reduced motion.

A preliminary integration run was stopped after stale pre-job8 fixtures were identified. A subsequent full run recorded 193 passing tests, seven optional skips and two stale failures: the old Yield error text and a type C fixture that supplied a hook directly instead of resolving the deployer. Both tests were repaired without changing product code. The focused repair run passed 2/2, and the final complete rerun passed 195 with seven optional skips and zero failures. The repaired case includes actual zero-hook messaging, locked pending controls, resolved hook reads, exact PoolId call arguments, six-decimal token pricing and dynamic-fee initialize calldata. That run and the initial full run are retained separately; neither is presented as the final integration result.

The four real free checks use an existing public recorded fixture payer solely as input to the free checker. They connected no account and requested no signature, approval, payment or deployment. B/C were checked again after the existing-token burn-revert retention sentence changed; the retained bodies are the checked bytes. Successful checks do not test interactions or confirm that IMD's manifest verifier will accept a deploying constructor.

## All 30 numbered rules

| 4.16 item | Implementation and validation |
| --- | --- |
| 1 | B/C open with a constructor-only deployer: no salt argument, mining from zero, immediate CREATE2 deployment, unchanged forwarded arguments, no later deploy call, hook(). Zero hook stays pending in Hook/My hooks. |
| 2 | A beforeInitialize factory-only gate and exact PoolManager/$owner/$factory constructor arguments. |
| 3 | Native-ETH currency0 restriction, C's exact token, token/supply definition, PoolId-scoped state and management arguments. |
| 4 | Pair currency in fee sides, settlement, thresholds and units; IMD conversion opt-out and both currency orders. |
| 5 | No-outside-dependency sentence without Yield; both references on every launch kind. Conflicting written outside dependencies remain blocked. |
| 6 | Factory liquidity/zero-change collection exception only for A; no factory in B/C requests. |
| 7 | Body owner always present and equal to the text's resolved address; unresolved owners cannot pass the guard. |
| 8 | Actual-traded fee basis and pair-amount partial-fill revert in every charging block. |
| 9 | Explicit zero hook fee without a charging rule, including percentage protection prose. Complete written fees are preserved. |
| 10 | Whale prerequisites and shared destination; fade to base rate; volatility's same direction and higher-rate rule; LP share before Split; jar/pot excluded; removed fee burn choices; literal payer/treasury. |
| 11 | Explicit buyback call only, 3% bound, retained unspent funds; standard token permanent retention, own-token public burn, existing-token absent/reverting burn retention. |
| 12 | No-in-range-liquidity fallback follows the same recipient distribution, including Split. |
| 13 | Pull-based claimPrize, empty-period roll-forward, latest complete period and bounded weighted lookup. Remaining policy gaps are in the separate review. |
| 14 | Both swap directions capped by block opening price; difference donated to LPs. |
| 15 | Windows and prize periods start at first swap. |
| 16 | tx.origin wallet identity and several-wallet/shared-relayer limitation in all affected blocks. |
| 17 | Seconds of block timestamp for volatility/breaker/JIT; chain-local block number and ArbSys for anti-sandwich. |
| 18 | Token-specified amounts only, own token decimals; pair-specified swaps exempt from this cap. |
| 19 | Position sender/ticks/salt keys and PoolId isolation; own hook positions exempt; position-key unlock view. |
| 20 | Sunset covers every other rule independent of ordering and preserves withdrawals of collected funds. |
| 21 | Option-specific Donation sentences, only allowlisted option exposes setDonor, hook donations always exempt. |
| 22 | Exclusion lists, symmetric palette enforcement and independent composed-text checks; every edge tested in all shared contexts. |
| 23 | Batch auctions dimmed as not in this version and imported drafts refused. |
| 24 | Dynamic-fee flag and deterministic linear mapping; Pool rules exclusion; type C calldata encodes 0x800000. |
| 25 | Yield remains unavailable on every chain, B/C-only, with future custody/address requirements recorded. |
| 26 | Warning/checklist, visible stack, complete summary, preserved written owner grants and numbered-rule precedence. |
| 27 | More than six behavior blocks triggers audit-refusal/24 KB notice. |
| 28 | mulDiv requirement, token supply cap, validated fractional steps to prevent rendered fee rounding bypass. |
| 29 | Total-supply denominator verified from successful receipts on both chains; Builder, summary and request copy corrected. |
| 30 | Known actual questions from launches 2/3/4 recorded. Further audit/policy findings handed to owner. Real post-fix launches remain an owner follow-up; this job sends none. |

## Better Interface: six-domain coverage

The pinned workflow and all six core domains were read and applied. Existing deliberate pixel styling remains authoritative. Attribution is retained in `THIRD_PARTY.md` and `LICENSES/`.

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native controls/labels, aria-pressed mode/type states, inline errors, warning focus, keyboard tooltip paths, a Tab/focus spot-check and reduced-motion probe. No screen-reader or complete keyboard-only session. |
| Layout | Checked | Both modes at 320/390/1440; primary interactions, long exact text/addresses, state panels and overflow checks. First 390×844 screen inspected: type choices start at y=331.59 and mode action ends at y=760.14. No native zoom/RTL/localization test. |
| Writing | Checked | Exact paid-request rules, risk warning/checklist, explicit pending/error/zero-hook text, hidden-stack explanation and owner summary. Separate sentence review documents unresolved prescribed policies. |
| Typography | Checked | Established six size tokens and three loaded local faces; wrapped numbers/addresses/functions; both mode screenshots inspected. Native font enlargement and physical-device rendering unperformed. |
| Colors | Checked | Existing tokens retained. Actual written-warning and safety-notice ink/paper-2 measured 12.44086:1. Probe's solid text pairs pass; 20 canvas/gradient text backgrounds are unmeasured. |
| UI | Checked | Native disclosures, disabled states with reasons, field retention, split replacement, loading/retry, deployer pending/live states and shared PoolId controls. No new theme, modal or animation was introduced. |

### Applicable findings repaired

| Severity | Source | Finding, correction and recheck |
| --- | --- | --- |
| High | `web/src/Builder.tsx:275` | Expanded safety findings preceded the type/mode choices and hid the primary action on the first phone screen. Moved the panel beside request review/Continue. Rechecked 390×844: both mode actions visible, no overflow; screenshot `first-screen-390.webp`. |
| High | `src/lib/compose.ts:113`, `web/src/Builder.tsx:214` | Hidden saved blocks were composed in Describe mode. Active behavior blocks now require visible stack mode; saved chips explicitly say they are excluded and palette additions reveal the stack. Unit, mode/reload and viewport regressions pass. |
| High | `src/lib/compose.ts`, `web/src/Builder.tsx` | Footer and summary denied written owner grants. Written powers remain permitted, fixed-fact conflicts still lock payment, and unknown written ABI controls point to the verified contract. Rechecked composer and both modes. |
| Medium | `web/src/Builder.tsx`, `web/src/chain/manage.ts` | Inoperative Split destination and Donation setDonor controls looked usable. Replaced destination field is disabled/explained; setDonor exists only for the allowlisted option. UI/unit checks pass. |
| Medium | `web/src/Management.tsx:105`, `web/src/chain/pool.ts:6` | New pool-scoped functions and dynamic pool initialization required explicit UI arguments. A shared labeled PoolId feeds ABI bytes32 values; dynamic initialize uses 0x800000. Unit and rendered type C regression verify actual call bytes. |

### Probe classification

The raw probe passes render, layout, targets, contrast, tracking, type sizes/faces, glyphs, slogans, repetition, copy budget, motion and share metadata. Three raw failures are retained under the brief's existing visual direction:

- **Casing:** SPEC 3.0/8 explicitly retain the pixel bar, heading/button/pill typography and the mockup's uppercase landing eyebrow. These pre-existing labels are not a new job8 style regression.
- **Eyebrows:** the measured list mainly consists of controls, filter legends and featured-card labels near headings. The mockup's required eyebrow remains; no new kicker system was introduced.
- **Chrome:** SPEC 8 requires “hard 4 px offset shadows” and “3 px ink outlines.” The three measured border/shadow combinations preserve that explicit system. New warning/pool components reuse existing treatments.

No failed required overflow, resource, contrast, first-screen or interaction check is waived as a style preference. See the actual probe details rather than interpreting 13/16 as a universal accessibility score.

## Limitations and follow-up

- WebKit could not launch because host libraries are missing; `webkit-attempt.txt` contains the actual error. Chromium emulation is not Safari or a physical phone.
- Seven opt-in browser cases require live RPC/relay flags or Anvil; they remain reported as skipped. Four real free-check cases were independently exercised over HTTP. No live approval, paid launch or contract deployment was attempted.
- No screen-reader, native zoom, native wallet-app or physical-device session was performed. The keyboard check was a spot-check plus automated tooltip/navigation coverage.
- Vite reports the existing main chunk above 500 KB. The build passes; dependencies/build configuration were intentionally not changed.
- The separate review records four concrete specification-level risks for the next job. The free check does not establish that a paid launch can finish, and arbitrary prose is not formally proven by these guards.

The source, static export, required documentation and worker checks are complete for this website job. The four specified-policy follow-ups and authorized real launches remain with the owner as the brief requests.

## Evidence encoding and byte budget

The final Builder interactions were rerun with lossless PNG capture (7/7 passed). Seven screenshots, including a fresh 390×844 first screen, are delivered as lossless WebP. `screenshot-encoding.json` verifies identical dimensions and every decoded RGBA pixel against each captured PNG; there was no resizing, cropping, synthesized content or lossy re-encoding. Redundant JPEG encodings were removed. This preserves the requested evidence while reducing the complete Git bundle.

The optional encoder is `tests/encode-job8-screenshots.mjs`; it accepts an external sharp entry point plus captured PNG paths. App builds and browser tests do not depend on sharp. The worker installed sharp 0.35.5 in a temporary directory; no image-tool dependency/cache or archive is included. The browser test itself captures ordinary PNGs and needs no extra dependency.

`submission-budget.json` measures the complete current snapshot. The additional conservative check in `parent-bundle-budget.json` includes all prior Git history: a standalone bundle after ordinary default-setting repacking measured 8,352,701 bytes, leaving 19,523 bytes after a 16 KiB reserve. Repacking and bundle creation occurred only in temporary repositories. Reusing the fetched historical pack layout without repacking exceeded the cap; the upload service's packing method was not independently established. All required files and prior evidence remain included.
