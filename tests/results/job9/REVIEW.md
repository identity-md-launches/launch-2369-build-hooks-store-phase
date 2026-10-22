# Job 9 validation and design review

Delivered against fetched **SPEC 1.34**, with source and rebuilt relative-base export in `dist/`. Existing manifests, lockfile and build configuration were retained. No paid launch, approval, deployment, publishing action or wallet signature was sent.

| Check | Actual result |
| --- | --- |
| Production `npm run build` | Passed TypeScript and Vite; existing large-chunk advisory remains. `build.txt`. |
| Separate `npm run typecheck` | Passed. `typecheck.txt`. |
| `node --test tests/*.test.mjs` | **1,145 passed, zero failures/skips.** `unit.txt`. |
| Complete production Playwright suite | **234 passed, seven optional service/fork skips, zero failures.** All 241 per-test outcomes/durations are retained in `playwright-results.json`. |
| Changed/affected browser cases | 24/24 passed before the final complete run, covering 320/390/1440, own-source override, checksummed wallet, zero-hook Live, Copy link and notification deduplication. |
| Rendered accessibility | Five Chromium surfaces: Store 390, Builder 320/390/1440, Launch 390. **Zero WCAG A/AA violations**, zero document overflow; three local fonts loaded. `accessibility.json`. |
| Pinned design probe | **13/16 passed**, including layout, targets, contrast, motion and metadata. Three intentional style flags below. `design-probe.json`. |
| Export / bundle | `export-integrity.json` and `submission-budget.json` record asset completeness, relative references, metadata, protected paths, cache/submodule checks and complete snapshot Git bundle size. |
| Public read-only observation | Relay launch 2424 reported Live; Robinhood Chain `hook()` returned `0x74bbef7025b0378050bfdd3263bc29508522d0cc`. `live-launch-record.json`, `live-hook.json`. |
| Separate adversarial seat | Concrete findings repaired and rechecked; no confirmed open finding. `ADVERSARIAL-REVIEW.md`. |

## Behavior coverage

The new unit tests compose with a checksummed wallet and explicit owner/remainder/token/split recipients, checking embedded addresses too. Consistency refuses uppercase, malformed and non-string address fields recursively. The signing guard rechecks the exact body. Older fixture expectations were updated to lowercase request text; displayed address controls keep checksum formatting.

Runtime proven matching compares type, chain and id set; parameter changes, words and Custom rule are allowed. No index is bundled or used as a failed-fetch fallback. Import success must return the entry's exact source pin. The complete fresh request remains apart from the required audited-source instruction after its first sentence. Tests cover failed/missing index, absent relay, HTML/error/mismatched import replies, cached import across hash navigation, changed chain/block set and Advanced own-source override. Failed automatic reuse has no error notice or source fields. Builder and Launch show the exact wait copy; Hook provenance follows the submitted source. Launch description length and the free-check context use that same prepared request; browser assertions compare the displayed count with the exact JSON objective at all three widths.

Fee tests cover structural trade/amount intent, percentages/bps, whole spelled amounts and fractions, grouped numbers, leading decimals, commissions/tolls, route/divert/accrue, owner receipts, plain/curly IMD treasury destinations, missing rates and unattached secondary amounts. They verify pair-side, settlement, recipient, claims and partial-fill facts. The 5% cap combines applicable block replacements and written additions separately for buys and sells.

Contracts-only result files supply build metadata. `web/src/chain/decode.ts:202` applies the matching relay record and attestation/manifest names; `web/src/chain/store.ts:278` refreshes it and reads deployer `hook()` on the deploy chain. Completed 0 plus a live record confirms Live even with zero hook. Tests cover both addresses, zero/nonzero/cache, wrong id/chain, missing/failed completion and reorg invalidation. Management, pool-opening and My hooks' Manage action require a nonzero hook independently of Live.

Playwright exercises summary and silent fallback at **320, 390 and 1440**, checking overflow, script errors and local resource failures. Copy link is read from the actual clipboard. A controlled notification API/clock verifies one permission request, one notification and no repeat after navigation. The complete suite also covers navigation, filters, forms, storage, wallet controls, free-check gates and launch confirmation guards. Six failures in the first full run were stale expectations/fixtures; after their correction the final full run passed.

## Better Interface: six domains

The pinned workflow and all six core domains were read before implementation. Existing SPEC styling governs deliberate exceptions. Source and rendered observations are distinguished below.

| Domain | Coverage and fixes | Limits |
| --- | --- | --- |
| Accessibility | Native buttons/disclosures, labels, polite Copy link feedback (`web/src/Hook.tsx:80`) and notification actions (`web/src/LaunchNotifications.tsx:19`). Keyboard reached Continue with a **3px solid outline**. Five rendered axe A/AA audits had zero violations. | No screen-reader/physical-device run; native notification permission UI was mocked. |
| Layout | Wrapping attribution, 70ch wait measure and wrapping notification/link actions (`web/src/styles.css:391`). Changed states fit all three widths. A 320 RTL mirror had scrollWidth 320. The Store 390 screenshot shows the product and Describe it on the first screen. | No native 200% zoom or full translated locale test. |
| Writing | Exact provenance/wait copy, no reuse switch/import-error notice; Copy link, Enable notification and Dismiss verbs. Prompt says to keep the site open. Fee clarifications require every amount to attach; Live copy identifies chain and record confirmation. | Deterministic checks cannot establish every possible prose meaning. |
| Typography | Existing six size tokens and three local WOFF2 faces retained. New text inherits body 18px/1.5. Complete 390 summary and desktop summary inspected for wrapping. Critical addresses remain selectable/wrapped. All faces loaded. | Prescribed 12px wordmark and 9px chrome/eyebrow exceptions remain. |
| Colors | Attribution reuses pine. Render-confirmed pairs measured **5.46:1** on paper-2 and **6.13:1** on Launch paper; notice ink on paper-2 **12.44:1**. `contrast.json` records exact pairs/method. Status has words as well as color. | No numerical contrast claim for canvas/gradient backgrounds excluded by the probe. |
| UI | Hard corners, outlines, offset shadows and immediate button states retained. No new animation. Persistent copy status; import gates actions while resolving and falls back completely. Reduced-motion probe found no endless animation. | Browser MCP could not start because its Chrome distribution was unavailable. Local Playwright Chromium supplied all rendered inspection; WebKit was not run. |

The visual idea remains a dense pixel storefront on beige paper, with the pond as its only animated illustration. Attribution is summary text, without another card, badge or primary action.

### Probe flags retained by the brief

- **Casing:** existing uppercase pixel buttons, legends and required landing eyebrow (`web/src/styles.css`).
- **Eyebrows:** heuristic flags required styling plus button/legend/empty-state arrangements. Screenshots confirmed functional labels, not newly added decorative heading stacks.
- **Chrome:** border plus hard offset shadow is the SPEC's deliberate pixel skin on Connect/input/action surfaces. No nested-card or gradient-text failure was reported.

No applicable first-screen, overlap, clipping, contrast or repeated new-component defect remained. `DESIGN.md` records the final source values, reuse points and responsive behavior.

## Packaging and limitations

Representative WebP screenshots accompany complete per-test results for every width. The desktop summary is cropped without scaling; `screenshot-encoding.json` records source hashes, dimensions and encoding. Historical PNG evidence was recompressed without changing a decoded RGBA pixel or removing any image; `historical-png-packing.json` records hashes and savings. Source and runtime assets remain complete. No ignore files, dependency/cache directories, registry archives or submodules are included as changes.

Dependencies/browser tools were installed only under `/tmp`, using the unchanged lockfile. Source was copied into that isolated checkout, production scripts/tests ran there, and final `dist/` was copied back. The pinned probe also ran from the repository root. An overlapping preview-server run and a broad route in the optional accessibility harness were corrected before final validation.

Seven optional tests require explicit live-service/local-fork opt-in. No real paid launch, native permission dialog, closed-tab push, screen-reader, physical device, WebKit or native zoom claim is made. The Vite 500kB advisory remains. The verifier checks paths and bytes only and does not independently certify behavior.

## Revision: passive owner payee (finding 2e210b89…)

Reproduced on the delivered source: `writtenFeeTargets('The owner is paid 1% of every swap.')` returned `[]`, so with a distinct owner `feeRecipient()`, the deployer constructor and `Fee recipient:` all named the paying wallet while `body.owner` named the owner, and `validate()`/`checkConsistency()` returned `[]`. The same held for `The owner gets/takes … 1% of every swap.`

Fix in `src/lib/writtenFees.ts:135-139`: a named payee (`the owner`, `my wallet`, the treasury, a literal address) followed by a passive payment (`is paid`, `is credited`, `is owed`, `is given`, `is sent` without a following `to/by/in/as/out`) or an active receipt verb (`receives`, `accrues`, `gets`, `earns`, `takes`, `keeps`, `collects`) is a written destination. A clause-initial passive payee that is not a known destination (`Alice is paid 1% of every swap.`) is also a destination; it resolves to no address, so the request is refused with a recipient finding (and `launchBody()` throws) instead of defaulting to the payer. Fee words, amounts, traders and `it/them` are never read as payees, so `The fee is paid in ETH.` still names no destination.

Regressions in `tests/job9-revision.test.mjs` (last two tests): four owner-payee wordings across launch types A, B and C with payer `0x6cba…8a34` and owner `0x9a50…0ab0`; the owner appears in the footer and, for contracts-only launches, the constructor, the payer appears in neither, and both checks return no finding. The unknown-payee case raises `recipient`.

Results after the change, recorded in `revision/`: typecheck and production build passed (`typecheck.txt`, `build.txt`); **1,155 unit tests passed** (`unit.txt`); **234 Playwright cases passed, 7 optional skips** (`playwright.txt`); `export-integrity.json` shows complete metadata and no missing or absolute references; `submission-budget.json` passed with 603,365 bytes of headroom. The UI did not change, so the design probe and accessibility records above stand; only the bundle hash in `dist/` changed.

Limitation: the reorg fixtures in `tests/chain.test.mjs` sometimes miss their 1-second polling window on this machine (one of the four fails in roughly half of the runs, also with the change stashed). They passed in the recorded run. This revision did not touch them.
