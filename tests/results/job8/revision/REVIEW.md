# Job 8 revision validation

Checked 2026-10-22 against SPEC 1.31. All seven reopened findings reproduced and are fixed. Full responses, keyed by the supplied IDs, are in [.imd-responses.json](../../../../.imd-responses.json). These are worker observations, not independent certification of a paid launch or deployed contract.

## Scope and reproduced behavior

This revision changes the written-fee analysis, composer, final-request safety check, two Builder examples and relevant catalog limits/exclusions. It preserves the accepted pixel design, existing block sentences, deployed-contract ABIs, wallet/payment flows, relay, chain configuration, dependencies and build configuration.

[before.json](before.json) records the original reproductions: basis-point, percent and word-fraction fees incorrectly received a zero footer; both pool examples passed without PoolId; a written treasury recipient was replaced by the payer in the constructor; an incomplete written fee had no fee facts; the peak fee was counted as 5% instead of 34.9%; and all five reported catalog pairs offered ADD before the safety check rejected them. [after.json](after.json) repeats those cases against the correction.

The fresh specification download was identical to the existing SPEC.md, so its content did not need changing. URL, version and SHA-256 are in [spec-refresh.json](spec-refresh.json).

## Corrections and rechecks

| Severity | Source | Reproduced problem, correction and evidence |
| --- | --- | --- |
| High | `src/lib/writtenFees.ts:6`, `src/lib/compose.ts:217`, `src/lib/safety.ts:159` | Written numeric percent, basis points and half a percent were missed. Fee intent now suppresses the zero default even when its amount needs clarification. Unknown amounts block Check/Continue/Launch with a quoted correction. A mutation that appends the contradictory zero footer is independently rejected. Both editors, all types, pairings and deploy chains are covered. |
| High / medium | `src/lib/compose.ts:219`, `src/lib/compose.ts:237`, `src/lib/safety.ts:168` | Written fees lacked defaults or disagreed with the constructor recipient. They now receive pair-side settlement, a literal recipient, claims handling, actual-traded basis and the partial-fill revert. Explicit destinations resolve once for the deployer and footer; absent destinations use the payer. Recipient clauses may span description and Custom rule. Conflicts, unresolved destinations and constructor-only mutations block. Distinct owner/payer addresses are tested. |
| High | `web/src/Builder.tsx:20`, `src/lib/safety.ts:154` | Pause/price examples omitted a pool argument. All four supplied signatures now take PoolId. B/C descriptions and Custom rules using known pool-dependent functions without that argument are rejected. Browser cases exercise both examples, bad manual signatures and correction at each width. Existing catalog shorthand and legacy ABIs stay intact. |
| Medium | `src/lib/compose.ts:120`, `src/lib/safety.ts:70`, `src/blocks/catalog.json:46` | Fade and volatility were absent from the 5% cap. Both draft validation and the rendered-request check use the highest replacement rate once, then add Whale, jar and pot. The reported draft now totals 34.9%, and a lower fade still exposes 7.9% during volatility. Exact 5% and 5.1% boundaries are tested. Fade defaults to 3% and has a 5% input maximum; imported larger values remain visible and blocked. |
| Low | `src/blocks/catalog.json:119`, `src/blocks/catalog.json:185` | Contradictory catalog pairs had no palette explanation. Exclusion lists now cover the existing unrestricted-sells conflicts and unconditional-liquidity conflicts, including pairs already covered by the accepted safety tests. Both addition orders show REMOVE … FIRST. Imported incompatible pairs fail validation and the final-body guard. |

The zero-fee check distinguishes hook charges from LP fees, fee tiers and distribution shares. The existing no-fee/opposite-trade-direction regressions pass. The three existing byte-for-byte composer fixtures also pass, preserving their deployer/factory sentences and other accepted behavior.

## Actual verification

| Check | Final result | Evidence |
| --- | --- | --- |
| Production build | Passed, exit 0 | `build.txt` |
| Typecheck | Passed, exit 0 | `typecheck.txt` |
| Full Node suite | 1,104 passed; zero failures/skips | `unit.txt` |
| New revision unit groups | 8 passed; zero failures/skips, including matrices and final-body mutations | `regressions.txt`, `tests/job8-revision.test.mjs` |
| Relay worker tests | 9 passed; zero failures/skips | `relay-unit.txt` |
| Full Chromium integration | 202 passed; 7 optional skips; zero failures/flaky cases | `playwright-results.json`, `playwright.txt` |
| Request corpus | 420 cases; all 368 enabled/applicable requests have no findings; disabled applicable requests are refused | `../composed-requests.jsonl`, `../corpus-summary.json` |
| Pinned design probe | 13/16 raw passes; same three established visual-system exceptions | `design-probe.json`, `design-probe-output.json` |
| Export integrity and submission budget | Passed; complete current-tree bundle below 8 MiB with 16 KiB reserved | `export-integrity.json`, `submission-budget.json` |

The unchanged lockfile was installed in an isolated temporary project copy with `npm ci --prefix /tmp/hooks-job8-revision/web --cache /tmp/hooks-job8-npm-cache`. Actual final commands were `npm run typecheck --prefix /tmp/hooks-job8-revision/web` and `npm run build --prefix /tmp/hooks-job8-revision/web`; then `npm test` and `node --test ../relay/worker.test.mjs` from that copy's `web/`. The complete rebuilt dist/ was copied back. No dependency directory was created in the submission.

Chromium was installed under `/tmp/hooks-job8-browsers`. From the temporary copy's `web/`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-job8-browsers npm run test:e2e` served the production export at `/preview/`. The new browser cases check percent/bps/fractional fee wording, actual mocked check bytes, explicit B/C recipients, unclear-fee locks on both routes, PoolId correction, fade/volatility totals and palette exclusions. They assert zero page errors and local HTTP resource failures on the affected flows. Existing integration cases retain navigation, wallet, launch receipt, stale-check, fixed-fact, factory/deployer, pool, tooltip and responsive coverage.

From the actual workspace, `node --test tests/job8-revision.test.mjs` and `node tests/generate-job8-corpus.mjs` also passed. The pinned probe was rerun after the final product build using its explicit temporary Playwright module and browser directory: `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline`. No fallback search of unrelated directories was needed. Intermediate fee-classification regressions were repaired before the final build and full rerun.

## Better Interface coverage

Read and applied the pinned workflow and core principles of all six domains. The product remains a pixel-styled hook Builder; this revision introduces no new visual system.

| Domain | Coverage of affected surfaces | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Existing labeled native controls, named example buttons, aria-pressed mode/type choices, role=alert correction notices and disabled actions with adjacent reasons. Keyboard focus and tooltip coverage in the full suite; manual Tab focus visibly used the 3px pine ring. No screen-reader session or complete accessibility certification. |
| Layout | Checked | Describe it and Stack blocks/Custom at 320, 390 and 1440. Document/control overflow assertions pass. First 390px screen visually inspected: Builder and type/mode actions fit; the manually measured mode action ended at y=760.14 in a 390×844 viewport. No native 200% zoom or RTL session. |
| Writing | Checked | Wording identifies the fee amount or recipient to fix and quotes the offending text. Constructor destination, exact request, fee footer and written rules are compared. Existing risk/checklist and spent-fee copy remain. |
| Typography | Checked | Three local faces loaded: Pixelify Sans, Press Start 2P and VT323. Existing six size tokens retained. Long addresses/signatures/notices wrap in the reviewed screenshots. No native text-enlargement or physical-device test. |
| Colors | Checked | Existing tokens retained. Actual notice ink rgb(21,19,15) on paper-2 rgb(223,211,176) measured 12.440861989686235:1. `browser-manual.json` records the computed pair, loaded faces and focus outline. No new theme or colors. |
| UI | Checked | Unavailable palette pills explain exclusions, the rate notice explains the peak total, and existing Check/Continue/Launch gates recover after correction. Existing disclosures, pending/stale check behavior and input retention remain. No new modal or motion. |

Viewed the 390px first screen, correction notice, keyboard focus state and desktop Custom layout. The six `builder-{prompt,custom}-{320,390,1440}.jpg` files and `uncertain-fee-390.jpg` are actual production captures from the new Playwright cases. `focus-390.jpg` is the manually inspected keyboard focus capture. Screenshots were not synthesized or cropped.

The probe's remaining raw failures are **casing**, **eyebrows** and **chrome**, matching the accepted design review: SPEC 3.0/8 retain the pixel uppercase treatments, mockup eyebrow, ink outlines and offset shadows. No new failure is waived as a style choice. Render, layout, targets, contrast, typography limits, tracking, motion, copy budget, glyphs, repetition and metadata pass. DESIGN.md documents the implemented system and these affected components; attribution/licenses remain.

## Packaging and limits

The final export integrity check verifies title, favicon, description, og:title and og:image; every referenced local HTML/CSS asset; relative asset URLs; and byte equality of public assets. The byte check builds and verifies a standalone Git bundle of every current deliverable file in a temporary bare repository, with no prerequisite commit and 16 KiB reserved for metadata. Both ordinary and dense repacking are measured in `submission-budget.json`. No workspace Git metadata, protected configuration, dependencies, ignore files or submodules were changed. No cache, node_modules or archive is included.

A separate attempt to verify a bundle retaining all ancestor commits could not finish because historical blob objects are absent from the supplied checkout and were not recovered from the public project branch/pull-request refs. The complete current-tree bundle measurement is available; inherited-history packaging is not certified by this worker. No required current source, runtime asset, historical evidence or requested deliverable was removed to fit the limit.

Seven optional integration cases remain skipped because their live-service/Anvil prerequisites were not enabled. Free-check responses in the new interaction tests are fixtures. This revision sent no real free check, signature, approval, payment or deployment; earlier live evidence remains historical. WebKit, native wallet apps, physical devices, screen readers, native zoom and RTL were not exercised in this revision. The existing Vite chunk-size warning remains.

The written-rule guards recognize documented common forms and known pool-dependent interfaces; they are not a proof of arbitrary natural language. The earlier independent policy findings remain for the owner/next job as before. Complete for the stated website revision and its recorded checks, with the limits above.
