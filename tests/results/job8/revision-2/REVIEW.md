# Job 8 second revision: written fees

This is a narrow repair of the three high findings and the combined-cap advisory. All four reproduced. The catalog, factory/deployer templates, chain configuration, wallet implementation, dependencies and visual system retain the accepted job 8 behavior. `before.json` records 37 reproductions: all previously passed without issues. `after.json` records 30 complete, consistent fee requests, six unclear-rate requests correctly blocked, and the combined 7% request blocked by both validation paths. `.imd-responses.json` answers each finding.

## Confirmed findings and repairs

| Finding | Source | Repair and verification |
| --- | --- | --- |
| High: missing fee vocabulary generated zero | `src/lib/writtenFees.ts:18` | Recognize percentages going to a recipient, tax, skim and keep. All four reported phrasings receive pair-side, settlement, explicit recipient and partial-fill facts. Owner resolves independently of payer. Final-body mutations adding a zero footer, a no-fee prohibition or a 6% rate fail. |
| High: payable destination disagreed with constructor | `src/lib/writtenFees.ts:63` | Recognize `payable to` through the same effective recipient used by the constructor/footer. Unresolved destinations and independently corrupted addresses fail. Mocked check bytes use the treasury unchanged. |
| High: price trigger supplied a missing rate | `src/lib/writtenFees.ts:36`, `src/lib/safety.ts:162` | Extract amounts attached to the charge. The exact vague-fee reproduction now says “Name an exact fee amount” and locks Check, Continue and direct Launch. A precise 0.3% fee clears it. Tests also distinguish bps, currency amounts and a 6% price trigger from the actual charge. |
| Medium: written plus block fees escaped the cap | `src/lib/compose.ts:120`, `src/lib/safety.ts:167` | Add written charges to the block total in draft validation and the rendered-request checker. 3% + 4% fails at 7%; 3% + 2% passes; 5.01% and 5.0001% fail without rounding written rates down. Describe it ignores saved hidden blocks. Written charges are conservatively additive; use the structured blocks for replacement schedules. |

The new unit matrix covers 24 contexts: A/B/C × both pair settings × both chains × both editors. B/C always use ETH as before. The IMD-paired A cases assert that ETH appears only in the required opt-out. Existing byte-for-byte deployment fixtures, fixed-fact comparisons, exclusions and every-block catalog tests remain part of the full suite.

## Actual checks

Dependencies were installed from the unchanged lockfile in an isolated temporary project copy with `npm ci --prefix /tmp/hooks-job8-fees/web --cache /tmp/hooks-job8-fees-npm-cache --no-audit --no-fund`. Only task source, fixtures and configuration were copied into that build. No dependency/cache directory or archive was added to the submission.

| Check | Result | Evidence |
| --- | --- | --- |
| Production build | Passed, exit 0; existing large-chunk warning | `build.txt` |
| Typecheck | Passed, exit 0 | `typecheck.txt` |
| Full Node suite | 1,130 passed, zero failures/skips | `unit.txt` |
| Focused fee unit matrix | 26 groups passed, zero failures/skips | `written-fees.txt`, `tests/job8-written-fees.test.mjs` |
| Related fee/safety regressions | 182 passed, zero failures/skips | `regressions.txt` |
| Relay worker suite | 9 passed, zero failures/skips | `relay-unit.txt` |
| Focused Chromium interactions | 13 passed, zero failures/skips | `focused-playwright.txt`, `focused-playwright-results.json` |
| Full final Chromium integration | 215 passed, 7 optional skips, zero failures/flaky cases | `playwright.txt`, `playwright-results.json`, `summary.json` |
| Pinned design probe | 13/16 raw passes; established visual exceptions below | `design-probe.json`, `design-probe-output.json` |
| Static export and complete snapshot bundle | Passed, relative assets and required public files intact, below 8 MiB | `export-integrity.json`, `submission-budget.json` |

Actual build commands were `npm run typecheck --prefix /tmp/hooks-job8-fees/web` and `npm run build --prefix /tmp/hooks-job8-fees/web`; the complete rebuilt `dist/` replaced the previous export, including removal of its obsolete main chunk. The full unit command was `npm test` from the temporary copy's `web/`. The focused browser command there was `PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-job8-fees-browsers npm run test:e2e -- job8-written-fees.spec.ts`. It serves the production export at `/preview/`, uses only local fixtures for RPC/relay/wallet responses, and validates B/C in Describe it and Custom rule at 320×844, 390×844 and 1440×844. It checks actual mocked POST bodies, stale-check locking, corrective edits, direct Launch guards, document/control reflow, page errors and local resource failures.

The complete final browser command was `PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-job8-fees-browsers npm run test:e2e` from that `web/`, with Playwright managing the preview. All 215 enabled cases passed after the precision correction, including the new 5.0001% interaction. The seven optional live RPC/relay/fork cases were skipped because their opt-in prerequisites were not enabled. Existing navigation, storage, fixed-fact, factory/deployer, pool, wallet and receipt tests passed. `build-copy-check.json` confirms the submitted source/configuration and full export match the build copy. The packaging check uses the existing delivery checker with only its output/root paths adjusted in `test/scratch/`, explicitly includes `.imd-responses.json`, and makes no workspace Git writes.

An initial workspace-wide Node invocation could not resolve dependencies intentionally installed only in the temporary copy; running the suite from that complete copy passed. Its first typecheck also exposed missing copied evidence fixtures, which were copied unchanged before the successful check. An initial broader Playwright run reused a 180-second manual preview that expired; it was interrupted and repeated with Playwright managing its own preview. `playwright-interrupted.json` records that unsuccessful attempt rather than counting it as validation.

## Better Interface review

The product remains a retro-pixel hook storefront, with the pond and hard rectangular controls carrying the existing visual idea. The repair reuses the existing Builder and `SafetyNotice`; it adds no new surface or visual token. Source review and rendered inspection cover the changed notices and their correction flow.

| Domain | Coverage and outcome |
| --- | --- |
| Accessibility | Checked native editors/buttons, labels, `role=alert`, disabled states and keyboard correction. At 390px, Tab from the description reaches Observe swaps with a visible 3px pine outline. Screen-reader and forced-colors sessions were not performed. |
| Layout | Both editors and B/C checked at 320/390/1440. No horizontal document/control overflow in the automated cases. Inspected new screenshots at 320 and 1440 and the 390px notice; long addresses wrap and the correction text remains scrollable. Native zoom, RTL and pseudo-localization were not exercised. |
| Writing | `src/lib/safety.ts:162` explains the missing fact and how to supply it, quotes the actual sentence, and distinguishes a price trigger from the charging rate. `src/lib/compose.ts:308` now names written charges in the cap notice. Both routes retain the instruction to edit before paying. |
| Typography | Existing scale/fonts retained. Browser inspection confirmed all three local font families loaded. The description editor uses Pixelify Sans at 16px; numbers/addresses within notices retain `Text` formatting. No clipped critical value was observed. |
| Colors | Existing tokens retained. The rendered 390px editor is ink `rgb(21,19,15)` on paper-3 `rgb(243,236,216)`, measured 15.73:1. `browser-manual.json` records the calculation and state. The probe passes measured solid-background contrast; canvas/glow backgrounds remain outside its measurement. |
| UI | Existing hard borders, shadows, disclosure and focus treatments retained. Correcting the vague rate removes the notice and enables Check; fixture checks then enable Continue. Oversized totals lock both routes. No new motion was introduced; the probe passes reduced-motion checks. |

The pinned probe was run on the final export with an explicitly installed temporary Playwright module: `IMD_PLAYWRIGHT=/tmp/hooks-job8-fees/web/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-job8-fees-browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline`. Its three raw failures are the established uppercase pixel labels, label/heading heuristics and deliberate border-plus-hard-shadow system, preserved by the revision requirement and SPEC/mockup. They are unchanged from the accepted review; no new related surface was added. The probe passes rendering, reflow, targets, measured contrast, tracking, type scale/families, glyphs, slogans, repetition, copy budget, motion and metadata.

Manual Chromium inspection used the current workspace export under `/preview/`. It reproduced the fee-rate notice, corrected it with the exact payable-to sentence, verified the treasury in the composed constructor/footer, inspected keyboard focus, and viewed the Store's 390px first screen. `first-screen-390.jpg` shows the product explanation and Describe it action. Automated screenshot evidence is `fee-rate-{prompt,custom}-{320,390,1440}.jpg`. No manual check, approval, signature, payment or deployment was sent.

## Scope and limits

Upstream now serves SPEC 1.32, whose change concerns job 9 live-address resolution. Section 4.16 is byte-for-byte unchanged. `spec-check.json` records the comparison; this revision retains the accepted 1.31 file and job 8 scope.

WebKit was installed and a launch attempted but could not start because required runtime libraries are unavailable; `webkit.json` records the limitation. Physical wallets/devices, screen readers, native zoom and an actual paid launch were not exercised. Fixture checks are not a live swarm audit. The lexical guards cover the tested common forms and conservatively count recognized written charges; they do not prove arbitrary natural language or certify a generated contract. The independent different-seat review remains the network's next step; this report makes no independent-review claim.

Complete for the stated revision and its recorded checks, subject to those limits. No protected build/dependency file, ignore rule or wallet/chain configuration changed.
