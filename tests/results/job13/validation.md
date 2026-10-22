# Job 13 revision checks

Complete for the stated revision scope. Checked SPEC 1.54, decisions 43–47 and the current “Carry-overs for job 13”. Build configuration, dependency manifests, lockfiles and ignore rules are unchanged. Dependencies were installed from the existing lockfile in a temporary copy of the task source; no dependency/cache directory is delivered. The resulting export was copied to root `dist/`, removing superseded hashed assets.

## Reproductions and corrections

`reproduction.json` records the three baseline findings; `.imd-responses.json` supplies their verdicts.

- **Results/path, `web/tests/job12.spec.ts:16`:** job 13 results were absent; screenshots depended on the working directory. Paths now resolve from `import.meta.url`. This directory retains unit/typecheck/build/list-reporter output and the required `featured-easylist-390.jpg`. The optional cancellation inspection frame is anchored in `test/scratch/job13/` to preserve bundle space. Older results are unchanged.
- **Deposit copy, `web/src/Promotions.tsx:120–122`:** the previous 390px browser cases asserted the misleading note while showing wallet IMD fall from 2 to 1.75 on DEPOSIT, before PROMOTE. The replacement explains the actual wallet → deposit → purchase/boost flow and unspent withdrawal. Funding guidance now names the selected chain and next action. Final tests assert both chains' wording; see `promotions-balances-390.jpg`.
- **Proven line, `src/lib/proven.ts:24`:** type B with swap-fee/anti-sniper/jar/pause and chain null matched PondsideGuard but said “removes none and adds none”. An identical stack before chain selection now says “Built from a proven launch”. Unit regressions cover proven entries on both chains and a nearest stack with no chain; the mobile Builder case then chooses Ethereum and Robinhood Chain. Existing cross-chain request assertions pass.
- **Validation repairs:** strict TypeScript exposed the missing EasyList helper declaration; `scripts/easylist-check.d.mts:1` supplies its types without changing runtime behavior. The unit suite exposed four unused `.ads`/`.ads-head` CSS rules left after the markup rename (former `web/src/styles.css:126`); removing these dead rules preserves the rendered layout. Initial temporary-copy omissions of evidence/mockup fixtures were corrected before final runs.

## Actual commands

Root commands ran in the temporary task copy, Playwright commands from its `web/` directory. The runner served production `dist/` under `/preview/`; final evidence was copied to the matching repository paths.

| Command | Output | Result |
| --- | --- | --- |
| `node scripts/refresh-easylist.mjs` | Fixture header | 13,077 generic rules; version 202610222028 |
| `npm --prefix web run typecheck` | `typecheck-results.txt` | Exit 0 |
| `npm --prefix web run build` | `build-results.txt` | Exit 0; existing >500 kB chunk warning |
| `npm --prefix web test` | `unit-results.txt` | 1,192 passed; no failures/skips |
| `playwright test job12.spec.ts --grep 'job 13 promotions panel\|two labelled balances' --reporter=list` | `playwright-results.txt` | 10 passed |
| `playwright test job12.spec.ts --grep-invert 'job 13 promotions panel\|two labelled balances' --reporter=list` | `regression-playwright.txt` | 22 passed |
| `playwright test store.spec.ts --grep 'Store and Learn fit\|keyboard focus reaches main action\|export works offline' --reporter=list` | `store-playwright.txt` | 5 passed |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline` | `design-probe.json` | Exit 0; 13/16 checks passed |

The probe used the explicitly selected temporary Playwright module/browser, avoiding fallback discovery. The final export's 390×844 first screen was inspected: the product, price and Describe it action fit. Actual balance, cancellation and EasyList screenshots were inspected. The two committed JPEGs cover the balance note and requested EasyList state; cancellation and probe screenshots remain in scratch. Required runtime assets and textual results are complete. Final packaging/export checks are beside this report.

## Better Interface review

The visual idea remains a paper-and-pine pixel storefront with its character pond. The six-domain review covers the changed views and affected shared surfaces; no redesign was introduced.

| Domain | Coverage and limitations |
| --- | --- |
| Accessibility | Checked native labels, disabled states and adjacent deposit guidance. Chromium exercised amount controls, confirmations, wallet-sheet focus trap/Escape/focus return and 320px reflow. Entry target-spacing probe passed. Screen readers, forced colors and physical touch were not tested. |
| Layout | Inspected balance/cancellation screenshots at 390px. Full promotion flow passes at 320/390/1440; Builder regressions cover 320 through 2560. Entry probe found no overflow, overlap, covered text or hidden-text clipping. Native zoom, RTL and pseudolocalization were not tested. |
| Writing | Corrected the consequential deposit explanation and funding instruction at `Promotions.tsx:120–122`, asserting both chains' text. Corrected the unchosen-chain proven line at `proven.ts:24`, preserving real nearest-match changes and other-chain redeployment wording. |
| Typography | Preserved font files, sizes and numeric roles. Loaded-font regressions pass at 390/1440; inspected new copy wrapping at 390. No new sizes or truncation. |
| Colors | All tokens/states preserved. Entry probe passed measured solid-background text contrast, excluding 20 text boxes over canvas/images/gradients. Promotion contrast was not separately remeasured; no new color pair was added. |
| UI | Exercised empty deposit, disabled actions, invalid/valid amounts, both allowance paths, confirmation, success, proceeds and withdrawal. EasyList-injected strip/panel and first-RPC-429 cases pass. Reduced-motion entry probe passes. Real-wallet rejection behavior was not retested. |

Casing, eyebrows and chrome remain probe exceptions: the established SPEC-mandated Press Start 2P capitals/labels and hard border/shadow design are preserved. All other probe checks passed. This narrow revision did not retest WebKit, assistive technology, physical devices, native zoom, the full historical browser suite or Anvil. Public RPC behavior used controlled answers; current live availability was not certified. No public-chain transaction or deployment was sent.
