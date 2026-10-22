# Job 12: implementation and review

Complete for the stated scope. The final export is the root `dist/`, built from the existing React/TypeScript/Vite project with the original package manifest, lockfile and build configuration. The current spec was fetched as version 1.50; the task's explicit wording governs any older conflicting prose in that document. The runtime proven index still comes only from the spec repository's raw `evidence/proven-launches.json` URL.

The site is a pixel storefront for composing and managing v4 hooks, carried by its paper-and-pine palette and character-tile pond. This is a continuation of that visual system, not a redesign.

## Requirement coverage

| Item | Implemented behavior and evidence |
| --- | --- |
| h: phantom gap | Existing relative positioning retained. Browser tests use seven findings at 1920×1080 and 1366×768, comparing scrollHeight against the last panel bottom plus padding within 2px, at load and at the end of the column. |
| i: fluid Builder | 1800px wrapper; safe-area-aware clamp(16px,3vw,48px) gutters; minmax(0,1fr) and clamp(420px,28vw,520px) columns from 1100px; fixed type and 65ch paragraphs. Tests cover 320, 390, 768, 1100, 1366, 1440, 1920 and 2560px, including 1920×1080 and 2560×1440. |
| j: readable text | Press Start 2P retained. Atkinson Hyperlegible 400/700 and JetBrains Mono 400–500 are local Latin WOFF2 assets with OFL notices. Old files and faces removed. Unit checks and computed-family/loaded-font assertions cover Builder and hook pages at 390/1440px. |
| k: contracts request ids | Direct routes read the chain's Requested event using the id and then the transaction's admission/launch record. Tests use the actual 2454/2456 event ids without a wallet. A separate live, read-only smoke check reached both real Live pages and build links. |
| l: two balances | `readPromotionBalances` reads token balanceOf and placements available independently of the hook's chain. Two labelled lines, deposit explanation, low-wallet note, refresh and post-transaction rereads are covered by unit/controlled-RPC tests. |
| m: pay on either chain | Hook options include both chains; createListing records the hook's own chain on the payment registry. Writes stay on their placement/payment chain. Own rows include both chains. Featured totals merge by hook chain/address, and hook-page ad state checks both. Controlled Ethereum payment for a Robinhood hook reaches Done; local-fork payment/boost/cancel/withdraw still pass. |
| 1: nearest proven match | Exact match first; otherwise shared block-id count within the same type, newer launch-number tie break, with at least one shared behavior block. Token-only/words-only/no-match and explicit-source cases are covered. Named remove/add instructions pin the imported repository and commit and request a new audit. Exact instructions stay unchanged. |
| 2: catalog/hook marks | The actual indexed launch gets PROVEN on both surfaces. Both Build one like this actions restore its block set; previous owners/allocations are not copied. Tested at 390×844, 1100×800 and 1920×1080 for the nearest flow, and at those widths for marked catalog/hook interactions. |
| 3: wait/cost | Exact requested wait text appears in Builder and review. A proven source adds “This stack starts from audited code.” The request sheet, source line and paid review are exercised at all three requested widths. |
| 4: one lane | One Continue to launch action, 0.5 IMD through the swarm. No instant, factory or free-launch offer. Unit assertions and payment review regression tests cover this. |

Exact matches continue to require the same deployment chain. The task defines nearest candidates by type; nearest adaptation can cross chains. Extra index fields such as tokenAddress, deployerAddress, poolId and notes are ignored. Existing silent fallback on failed automatic import and explicit own-source precedence are preserved.

## Actual checks

| Command/check | Result |
| --- | --- |
| `npm --prefix web run typecheck` | Passed separately on the final source. |
| `npm --prefix web run build` | Passed; includes TypeScript and Vite production build. Existing large-chunk advisory remains non-fatal. |
| `node --test --test-concurrency=1 tests/*.test.mjs` | 1,177 passed, 0 failed. |
| `node --test relay/worker.test.mjs` | 9 passed, 0 failed. |
| `npx playwright test --workers=3` from web | 284 collected: 277 passed, 7 skipped, 0 unexpected, 0 flaky. No spec file excluded. |
| Job 12 suite and final targeted rerun | 23/23 passed in both: nearest/request/sheet/review, widths/gutters, seven findings, marks/preloads, loaded fonts, public requests, balances, Ethereum-funded Robinhood promotion, merged card and both own-placement chains. |
| `node web/scripts/check-ads-fork.mjs` | Passed seven contract-flow checks on an isolated Robinhood Anvil fork. Four additional browser cases in the full suite exercised real local wallet transactions. |
| `node scripts/check-visual.mjs` | Passed first-screen action, loaded local fonts, no page errors and geometry checks at 1440×900, 1920×1080, 2560×1440, 390×844 and 320×900. |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline` | Ran from the repository root against final dist; 13/16 passed. Copied measured report: design-probe.json. |
| Export/delivery checker | Relative local runtime references, metadata, local asset copies, unchanged protected paths and complete Git snapshot bundle measured by `scripts/check-delivery.mjs`; final results in export-integrity.json and submission-budget.json. |
| Public contract reads | Both placement contracts have code, correct registry, configured IMD and configured proceeds recipient. Observation is read-only; setup remains live-checked. |
| Public request smoke | 2456 reached “Contracts launch 2456, live” in 3941ms and 2454 in 5820ms; real job links and no page errors. No wallet was installed or connected in this check. |

Build/test used a temporary copy installed with `npm ci` from the unchanged manifest and lockfile. The local fork initially encountered a read-only compiler-cache location. It was rerun successfully with an official solc 0.8.26 binary in temporary storage, verified against the upstream SHA256 `d5f23436f443edb85d8e76906d12f0a86ce0490e7663a9e608efeb7a93f149ef`. No compiler, dependency archive or cache is delivered.

An initial concurrent unit run had a timing-sensitive cached-reorg assertion; the isolated 26-case chain suite and final sequential full suite passed. Early browser failures exposed the overlapping-enrichment and sticky-footer defects below; final results above are from their repaired source, not those attempts. Controlled-RPC fixtures were also corrected to supply the actual ABI return values for simulated writes.

## Better Interface: six-domain coverage

| Domain | Coverage and evidence | Limits |
| --- | --- | --- |
| Accessibility — Checked | Native buttons/links/labels retained; PROVEN and chain states have text; named scroll regions, exact-sheet Escape/focus return, wallet focus trapping, keyboard main-action access, disabled/pending states and reduced motion pass browser tests. Entry probe: all 28 controls meet 24px or spacing; 21 remain below the comfortable 44px target. | No screen-reader session, physical touch device or native zoom. No claim of complete accessibility conformance. |
| Layout — Checked | Real export at a gateway-style subpath; width/gutter/card and overflow measurements, seven-finding extent at load/end, phone-first card and scrolling shelf, and tall-viewport end-of-page regression. Store main action ends at y=565.16 within the 844px phone screen. | Representative widths, not every possible viewport. Phone card may exceed the first screen to retain its required 40vh details floor. |
| Writing — Checked | Exact requested wait, adaptation/removal/addition sentence, fee, deposit explanation and low-wallet note. Public contracts pages say “Not a hook”; no instant promise. Empty, pending, failed import, rejected transaction and retry paths retained. Entry prose count: 41 words at 390 and 71 at 1440, both within probe limits. | Historical spec prose is not rewritten into marketing copy. |
| Typography — Checked | Real local faces loaded; reading/rule/address/request/cost/readout computed families checked at 390/1440. Existing sizes/line heights preserved; body weights 400/700, mono 400–500, tabular numbers and anywhere wrapping retained. Entry probe passed families, weights, scale, tracking and glyph checks. | Font rendering on physical operating systems was not compared. |
| Colors — Checked | Original tokens retained; textual labels accompany swatches/status. Probe reports all measured solid-background text meeting 4.5:1, or 3:1 for large text. Actual screenshots of paper/pine/readiness/proven states inspected. | Probe leaves 20 text boxes over the canvas/gradient unmeasured; no numerical contrast claim is made for those backgrounds. No dark theme exists. |
| UI — Checked | Consistent hard-edged cards/buttons/pills, native sheets, source detail, confirm/Done/reopen/reject states, balances and both-chain placement controls. Marquee hover/focus/reduced-motion and pond controls pass the existing suite. | No 10%-speed animation-panel replay, physical wallet app or passkey enrollment was tested. Wallet connector regression tests use EIP-6963 fixtures. |

The supplied browser connector could not initialize because its Chrome distribution was absent. Rendered review used the working Playwright Chromium runner and real screenshots, not source inspection alone. Its accessibility snapshots are not screen-reader tests.

## Findings and fixes

| Severity / source | Observed problem | Correction and recheck |
| --- | --- | --- |
| Medium — web/src/styles.css:264,280 | The 1240px/420px Builder left large unused side areas. | Fluid 1800px wrapper, scaling gutters/card. Eight-width sweep and screenshots pass. |
| Medium — web/src/styles.css:2,37 | Pixelify/VT323 reading and data faces were difficult to read and no longer matched the brief. | Self-hosted Atkinson/JetBrains with licenses, declared fallbacks and same sizes/line heights. Unit and loaded/computed-family checks pass. |
| High — web/src/Hook.tsx:65; web/src/chain/store.ts:108 | Public request-id pages depended on history/wallet resolution. Adding a direct reader also exposed overlapping enrichment consuming retry windows or overwriting Live data. | Read the indexed Requested event, follow its transaction, retain identical cache entries, serialize enrichment per chain and preserve failed-result feedback during retry cooldown. Actual ads ids, Live/deployer regressions, result retry and live smoke checks pass. |
| Medium — web/src/Promotions.tsx:12,85; web/src/chain/ads.ts:51 | A zero escrow balance could be read as a zero wallet balance; hook/payment chains were coupled. | Two labelled readings and low-wallet guidance; all live owned hooks selectable, hook chain sent in listing data, payment-chain context used for writes. Controlled cross-chain Done and local fork flows pass. |
| Medium — web/src/chain/ads.ts:27; web/src/Catalog.tsx:81 | Separate placements could produce multiple cards for one hook. | Group by deployment chain/address, sum totals and rank once; retain raw placements for management. Unit ranking (including tied merged totals whose largest boost is a later purchase) and controlled two-chain card tests pass. |
| Medium — src/lib/proven.ts:59,29 | Only exact proven stacks could reuse audited source. | Nearest selection, named deltas, source/commit and new-audit instruction; original exact sentence retained. Exact/nearest/tie/no-match/words-only/A–C unit cases and three-width sheet/review checks pass. |
| Medium — web/src/Catalog.tsx:68; web/src/Hook.tsx:105 | Indexed launches lacked the requested PROVEN mark and catalog preload. | Text pill and block-preserving build actions on both surfaces; three-width browser interactions pass. |
| Medium — web/src/styles.css:284 | At 2560×1440, filling the final owner field pushed the card header to y=-7.625 because of trailing space outside the sticky grid. | Remove desktop trailing page/grid space while retaining column shadow padding. Recheck puts the header at y=84, card bottom at 1075.64; added 2560×1440 after-scroll/keystroke regression passes. |

No required feature remains unresolved. The inherited scroll-container positioning was retained and its requested seven-finding regression passed.

The probe's three failures are deliberate, specification-required exceptions: **casing** (pixel headings/buttons/pills), **eyebrows** (the pinned landing line and compact labels, with some button/legend false positives), and **chrome** (the mockup's hard border plus offset shadow). These were inspected and retained; removing them would conflict with the requested established direction. All render/layout/targets/contrast/type/motion/share checks passed.

## Evidence and remaining limits

- `playwright-results.json`, `playwright.txt`: complete final browser run; 277 pass, 7 skip.
- `unit.txt`, `relay.txt`, `build.txt`, `typecheck.txt`: actual final command output.
- `browser-geometry.json`, `visual.txt`: measured phone main action and default Builder load/scrolled sizes.
- `nearest-builder-390.jpg`, `nearest-builder-1100.jpg`, `nearest-builder-1920.jpg` and corresponding nearest-sheet images: audited adaptation UI/request.
- `ethereum-promotion-390.jpg`: controlled Ethereum payment flow for a Robinhood hook.
- `contracts-2454-390.jpg`, `contracts-2456-390.jpg`, `live-request-smoke.json`: real public-chain read-only pages with no wallet.
- `store-390.jpg`, `builder-390.jpg`, `builder-1440.jpg`: final visual review. The full probe screenshots remain only in removable scratch; measured probe output is preserved.
- `ads-fork-results.json`, `live-ads-read.json`, `design-probe.json`, `summary.json`: structured check results.

The seven skipped cases are existing opt-ins: two additional management/address fork cases, two swarm launch payment fork cases, one refresh/approval-recovery fork case, one live free-check case and one full-history live-RPC timing case. Their skips do not omit the requested controlled-RPC promotion or no-wallet ads-request coverage. No physical-device, screen-reader, native zoom or real wallet/passkey session is claimed.

Generated dependencies and caches remain outside the submission. Obsolete tracked `.playwright-mcp/` browser cache files and `test-results/.last-run.json` were removed. Six obsolete root artifacts/builder-*.png captures were also retired, replaced by the current Builder captures and complete width/scroll results; packaging.json lists their paths and sizes. Historical source/evidence/results under tests/results/, all current runtime assets and the complete production export remain; no ignore file was changed. The complete Git snapshot measured about 7.83 MiB against the 8 MiB cap, with 16 KiB metadata reservation and no protected-path, dependency/cache or submodule findings. The final bundle and protected-path results are recorded in `submission-budget.json`. Current evidence is delivered under `tests/results/job12/` because the existing repository ignore rules exclude new files under `artifacts/`; all evidence was preserved without an ignore-file change.
