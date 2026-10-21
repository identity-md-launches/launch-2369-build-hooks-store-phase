# Worker validation — job 7 revision

The six reported findings were reproduced and fixed; the accepted visual system, build/dependency configuration, contracts and economics remain. Source and the rebuilt `dist/` accompany this revision. Each finding has a decision in [.imd-responses.json](.imd-responses.json).

Final revision checks: **643 unit tests**, **9 relay tests**, **188 Chromium cases** passed, with seven optional browser cases skipped and no failures/flaky cases. Typecheck and production build passed. All seven routes and the new correction flows were exercised at **320, 390 and 1440px**. A fresh browser settled both real public RPC histories in **8,892ms**. No real signature or transaction was sent. The offline design probe passed **13/16**, retaining the three established pixel-style exceptions.

Current evidence, six-domain coverage, source findings and practical limits are in [tests/results/job7/REVISION.md](tests/results/job7/REVISION.md), [revision-summary.json](tests/results/job7/revision-summary.json) and the `revision-` reports/screenshots. Browser batches cover the entire suite after the final source build; the interrupted preliminary command is recorded separately. Screen-reader, physical-device, Safari/WebKit, native wallet-app and optional Anvil checks were not performed in this revision. Address association checks do not certify external contract code or arbitrary prose.

# Original job 7 delivery record

Validated on 2026-10-21 against SPEC **1.25** and the production export. These are worker observations, not independent certification. Current evidence is in [tests/results/job7](tests/results/job7/), with the requirement-by-requirement and six-domain review in [REVIEW.md](tests/results/job7/REVIEW.md).

| Check | Actual job 7 result | Evidence under tests/results/job7 |
| --- | --- | --- |
| Typecheck and production build | Exit 0; complete export matches the isolated build byte for byte | typecheck.txt, build.txt, export-integrity.json |
| Unit suite | **495 passed**, zero failed/skipped | unit.txt |
| Composer/check matrix | 420 cases: all 35 blocks × A/B/C × IMD/ETH settings × both deploy chains; unavailable blocks omitted, unverified lending refused; mutation and contradiction cases also pass | unit.txt; tests/safety.test.mjs |
| Relay Worker | **9 passed**, zero failed/skipped; web relay parser/gates are also in the unit suite | relay-unit.txt |
| Full Chromium suite | **160 passed**, seven optional skipped, zero failures/flaky | playwright.txt, playwright-results.json |
| Route/width coverage | Store, Catalog, Builder, Launch, Hook, My hooks and Learn at **320, 390, 1440**; navigation/forms/filters/wallet/prepayment interactions, local resources and reflow | 21 route JPEGs |
| Blocked-job correction | Both IMD question fields, exact local draft recovery and older ETH-fee/IMD-pair recovery at all three widths; original request retained; corrected relaunch bytes inspected | blocked-hook-*.jpg, fix-builder-*.jpg; browser report |
| Receipt/reorg regressions | Cancelled/replaced Launch retries; matching replacement/repricing completes once; submitted unknown hash remains locked after reload; orphaned ticker announcement/age removed | Browser report; unit receipt tests |
| Real free check | Owner relay **HTTP 200**, **599 ms**, 14 facts, nine plan steps, zero blockers; no wallet or launch | live-relay.txt, live-check.request.json, live-check.response.json, live-check-summary.json |
| Live-RPC settle | Fresh browser settled both histories in **26,625 ms**; existing range splitting handled this verification provider's 100,000-block cap | live-rpc.txt, live-rpc.json; first-attempt limitation retained |
| Accessibility measurement | Lighthouse **100 / 100 / 100** for Store, Builder, checked Builder response at 390 | lighthouse.txt, lighthouse-summary.json |
| Design probe | Final deterministic offline run **13/16**; casing, eyebrows and hard border/shadow are inherited visual-spec exceptions | design-probe.json; earlier online result in design-probe-online.json |
| Export and bundle budget | Relative runtime references, metadata and complete local assets checked; no protected-path changes, caches or submodules; complete standalone Git snapshot bundle under 8 MiB | export-integrity.json, submission-budget.json |

The exact install/build/test commands are in README. Dependencies were installed in an isolated temporary copy using the unchanged package manifest and lockfile. Production `dist/` was copied back and compared by file hashes. The delivery script creates its measurement repository/bundle only in temporary storage; it never writes the workspace's .git. No ignore file was changed and no dependency/archive/cache directory was added to the submission.

The shared check runs on the composed output before the free check and again on actual request bytes before approval/Launch. It quotes mismatched fee currencies, unresolved recipients, missing dependencies and contradictory rules. The fee recipient is the paying address or the supplied IMD treasury; IMD-paired requests explicitly forbid ETH conversion/other pools. Historical rule templates remain readable. Fixed-fact conflicts persist until the request opts out and is checked again. Questions from GET /jobs/:id appear unchanged beside the restored draft, and the original paid request is retained.

Practical limits: safety rules do not formally prove arbitrary prose/imported code or certify user-entered external addresses. Yield remains unavailable until verified Aave/Morpho deployments are supplied. The first live-RPC attempt aborted because a verification route left a transport timeout unhandled; its helper now returns a retryable 502. The final fresh browser passed despite range-limit HTTP 500 replies and one transport timeout, with all observations retained. The build retains Vite's existing large-chunk warning. Five optional Anvil cases remain unperformed; the two opted-in live tests were run separately. WebKit/Safari, physical devices, screen readers and native zoom are unperformed. No real signature, approval, payment, launch, deployment or publication occurred. See REVIEW.md for exact coverage and remaining limits.

---

# Prior job 6 validation (historical)

# Worker validation — phase 1, job 6

Complete for the stated scope, validated on 2026-10-21. Current evidence is in [tests/results/job6](tests/results/job6/); the prior job 5 record below is historical. These are worker observations, not independent certification. The seven fixes and all six Better Interface domains are documented with source locations and limitations in [REVIEW.md](tests/results/job6/REVIEW.md).

| Check | Actual job 6 result | Evidence under tests/results/job6 |
| --- | --- | --- |
| Locked install | npm ci passed in an isolated temporary copy; existing manifests/lockfiles/config untouched | Build/typecheck logs; README commands |
| Typecheck and production build | Exit 0; complete relative-URL export in dist/ | typecheck.txt, build.txt, export-integrity.json |
| Unit suite | 62 passed; no failures/skips | unit.txt |
| Cloudflare Worker | 9 passed; no failures/skips | relay-unit.txt |
| Full Chromium suite | 121 passed, 7 optional skipped, zero failures/flaky; all 33 go-live tests included | playwright.txt, playwright-results.json |
| All routes | Store, Catalog, Builder, Launch, Hook, My hooks, Learn at 320/390/1440; primary interactions, local resources and reflow passed | 21 route/width JPEGs and full suite results |
| Live free check | Owner relay HTTP 200 in a browser, 583 ms for the request; 14 facts, 9 plan steps, zero blockers; no wallet/launch | live-check.request.json, live-check.response.json, live-check-summary.json, live-relay.txt |
| Live-RPC settle | Fresh browser: both histories settled in 2,258 ms; 2 Ethereum and 48 Robinhood log calls | live-rpc.txt, live-rpc.json |
| Lighthouse | 100 Store, 100 Builder, 100 checked Builder response at 390 | lighthouse-summary.json, lighthouse.txt |
| Final critic probe | 13/16 pass; 3 established visual-spec exceptions; no layout/resource/target/contrast/metadata failure | design-probe.json; REVIEW.md |
| Export and submission budget | Complete assets/config; protected paths, cache/submodule absence and conservative 8 MiB envelope checked | export-integrity.json, submission-budget.json |

Build/check commands were npm --prefix web ci, npm --prefix web run typecheck, npm --prefix web test, node --test relay/worker.test.mjs, npm --prefix web run build, npm --prefix web run test:e2e, and node scripts/check-delivery.mjs, executed from the isolated source copy where dependencies were installed. The two live tests were run individually with HOOKS_LIVE_RELAY=1 and HOOKS_LIVE_RPC=1. Contributor read transports were supplied only to verification; public RPC names remain in the site/evidence. Fonts/assets are local; all runtime file references were checked under /preview/.

SPEC.md was refreshed from the task's upstream URL to 1.19. The recorded live GET /jobs answer and its URL/time/hash are under tests/fixtures/relay/. Its current failed/queued state is tested unchanged; working/completed phases replay the same actual schema. Reorg scenarios are explicitly synthetic fixtures using observed chain hashes, not claims of real reorganizations.

The source and export set relayUrl to https://hooks-store-relay.hooks-store.workers.dev and inProgress to false. Approve/Launch work after the existing wallet/receipt gates. A failed, stale or blocker-bearing check stays locked; the refused-body warning remains. No real approval, payment, launch, contract/token deployment or site publication was made. WebKit/Safari, screen-reader, physical-device and native-zoom checks remain unperformed; details are in the review.

---

# Prior job 5 validation (historical)

# Worker validation — phase 1, job 5

Validated on 2026-10-21 against the production static export. These are this implementation seat’s observations, not independent certification. Current evidence is in `tests/results/job5/`; job 4 and earlier evidence remain in their original directories. The separate read-only adversarial review is pending and is not replaced by these checks.

## Scope and assumptions

Incremental implementation of SPEC **1.16** sections 7.4, 8 and 9 and the IMD-first pairing decision. Existing deploy/payment chains, RPCs, ABI, approve/request code, economics, hash routes and build/dependency configuration are retained. New drafts start on IMD; a saved explicit ETH selection remains its creator’s selection. The optional relay remains `null` and the in-progress lock remains `true` in both source configuration and the export. No real launch or deployment was performed.

The relay is delivered as source for the operator to deploy, with its one-command deployment documented in `relay/README.md`. Narrow OPTIONS handling is the necessary CORS preflight for an allowed route/method; it never reaches upstream. Unrecognized application paths/methods are rejected locally. Only successful GETs are cached, for 30 seconds; POSTs and errors are not cached. Cache failures fall back to the upstream. JSON response bytes are read before constructing the response’s public header allowlist, so the handler does not preserve a compressed body under a missing encoding header.

## Build, tests and results

| Check | Actual result | Evidence in `tests/results/job5/` |
| --- | --- | --- |
| Locked install | Passed in an isolated temporary copy; original manifests and lockfiles unchanged | README commands; build/typecheck logs |
| TypeScript | Passed, exit 0 | `typecheck.txt` |
| Production build | Passed, exit 0; complete static export copied to `dist/` | `build.txt` |
| Frontend/composer/chain units | 51 passed, no failures/skips | `unit.txt` |
| Relay fetch-mock/client subset | 17 passed: 9 Worker and 8 client/parser tests; the 8 client tests are already included in the 51 above | `relay-unit.txt` |
| Every route at 320, 390 and 1440px | All 21 route/width combinations passed, with control interactions, reflow and local-resource checks | `playwright-results.json`, `playwright.txt` |
| Job 5 relay-specific browser cases | 30 passed, including route matrix, blocker/reload/direct-launch gates, check failure/retry, import resolution, timeline discovery, newly live ticker, reduced motion and long-response wrapping | `job5-panels.txt` |
| Lighthouse accessibility | Store **100**, Builder **100**, checked Builder panel **100**, 390px | `lighthouse-summary.json`, three full Lighthouse JSON reports |
| Required design probe | 12 of 16 checks pass; four explicit visual-spec exceptions retained | `design-probe.json` |
| Production IMD free check | HTTP 200, CORS `*`, 14 facts, zero blockers, nine plan titles ending in Ethereum mainnet deployment | `live-check.request.json`, `live-check.response.json`, `live-relay-summary.json` |
| Production import and read schemas | HTTP 200 through undeployed handler for a real pinned public Foundry repository, launches, jobs and intake | `live-relay-summary.json` |
| Export and byte budget | Relative/local references, required metadata, source/export config equality, complete assets, unchanged protected paths and package locks checked | `export-integrity.json`, `submission-budget.json` |

The conservative uncompressed submission envelope is below 8 MiB (including a 16 KiB metadata reserve); no protected path, dependency/cache directory or submodule is included. Recheck it with `node scripts/check-delivery.mjs`.

Production checks used `npm --prefix web run build`, `npm --prefix web run typecheck`, `npm --prefix web test`, and `node --test relay/worker.test.mjs tests/relay.test.mjs`. No source package/dependency/build-config change was needed. The existing main-JS-chunk-over-500-kB Vite advisory remains; it is not a build failure. Dependencies, tool packages, browser binaries and caches were kept outside the submission.

The final full Chromium run passed **89 tests**, with **5 optional local-fork tests skipped**, zero failures and zero flaky results. It included the opt-in fresh-browser real RPC check: **2,537 ms**, 2 Ethereum log calls and 48 Robinhood log calls (`playwright.txt`/`playwright-results.json`). Tests use the real static export served under `/preview/`. Mocked results and injected wallets are test fixtures, never shipped as site data. No fabricated launch cards, metrics, addresses or audit results were added to the export. Prior job 4 fork evidence is retained; job 5 does not claim a new paid-call fork run.

A first new-suite run had three test-locator failures: Learn’s supplied uppercase “WHICH CHAINS?” text was queried case-sensitively. The locator was corrected and every route/width was rerun successfully. A unit assertion initially expected 404 rather than the equally rejected 405 after URL dot-segment normalization; it was corrected to test local rejection and zero upstream calls. A Lighthouse fixture needed a proper preflight response before its checked-panel scan could run. No interrupted or initial failed result is counted as a pass.

## Implemented behavior and interaction coverage

- IMD is first/default in a new type A draft; choosing ETH updates the summary and exact request. Persisted explicit pairings are kept. Composer fixtures remain byte-for-byte checked with the new default.
- Free check sends the exact composer body under `action: launch.open`. Facts retain their states; plan titles, blockers and suggestions render as text. Pending, failed, malformed and stale responses do not unlock continuation. A known blocker survives reload and direct `#launch` navigation. Editing checked bytes requires a fresh check; abort signals suppress results from obsolete requests.
- Import uses the verified production `{url, ref, kind: contracts}` schema. No own-code source enters the visible/composed body with a relay until `/import` returns a valid GitHub URL and pinned commit. Failure/retry, canonical `.git` URL, source edits and Launch preview are checked. Session caches are validated; failed storage writes do not crash the current page. An import needs session storage to remain resolved across route remounts/reloads.
- `/launches` names are used only when chain/id or chain/hook-address matches a store launch. Initial API history does not cast. A newly live matching launch updates the ticker once, including under reduced motion, while unrelated launches stay absent. Long names and times wrap fully.
- A matching intake entry supplies the pending job id; `/jobs/:id` supplies Building/Audit panel/Deploying states. Tests advance build → audit → deploy using an accelerated browser clock. Live/Failed remain chain-based. Missing stage data is explicit, with retry and automatic refresh. The existing catalog remains chain-sourced.
- Reeds, sparse canopy, a hat, distant boat and one or two additional birds use the existing monochrome tiles. Original Pepe data, three fish silhouettes, school of 42 and cast durations are unchanged and remain tested. Reduced motion leaves a still frame; offscreen and hidden-tab behavior remains.
- The existing suite checks navigation, search/filter reset, first-screen action, saved drafts, block editing/risk signs, wallet discovery/rejection/focus trap/mobile links, wrong chain, signature rejection, price refusal, payment lock, exact copy JSON, type C copy-only pool calls, responsive management and offline/gateway-subpath assets.

## Better Interface: consolidated six-domain review

The pinned contents/workflow, core principles of all six domains and documentation section were read and applied. Review covered source, the export in Chromium, automated interactions, computed geometry, Lighthouse, the required probe and actual screenshots. The browser tool also opened the export, selected Describe mode, verified IMD/ETH order and relay-disabled copy, confirmed all three fonts loaded, and reported zero console errors.

| Domain | Coverage | Findings, fixes and recheck |
| --- | --- | --- |
| Accessibility | Checked: native buttons/disclosures, labels, states, keyboard risk signs/wallet modal, status/alert feedback, reduced motion, named timeline and fact lists. | MEDIUM: unavailable palette prose had rendered 2.68:1 contrast because `.pal-item.off .pal-text` used opacity (`web/src/styles.css:269`). Replaced opacity with the existing full-opacity muted ink; inactive stack/chips use muted text plus explicit states. Lighthouse Builder improved from 96 to 100. Screen-reader sessions and physical devices were not performed. |
| Layout | Checked: every route at 320/390/1440, existing 821/1024 bar checks, configured relay response/errors and full names. | MEDIUM: API launch names could inherit ticker ellipsis (`web/src/styles.css:119`). Status text now wraps; long-name browser tests show no clipping or document overflow at all three widths. Swarm response sections reuse the preview width and mobile reading order. Native 200% zoom and RTL/localization were not verified. |
| Writing | Checked against SPEC 8: concise actions, inline retry guidance, no invented metrics, free check versus payment distinction, explicit unknowns. | MEDIUM: “Nothing is sent until you launch” became false once a free check/import existed (`web/src/Builder.tsx:270`). Updated to explain checks send the request and launches need payment. Prospective type B/C fee copy no longer calls an unlaunched hook “audited” (`web/src/LaunchReview.tsx:134`). |
| Typography | Checked: existing three local fonts/six tokens; source and rendered loading, API text wrapping and terminal numerals. | New fact/plan/stage text uses `Text`; states reuse existing pills. All long imported URLs/commits wrap. No new font, size system or tracking added. |
| Colors | Checked: existing paper/ink/pine roles, state text redundant with color, Lighthouse contrast audit and probe solid-background checks. | Palette contrast fix above. Active/failed job stages use existing pine/bad inset stripes with status words (`web/src/styles.css:397`). Contrast over the canvas/glow is visually reviewed, not numerically certified; no dark theme is intended. |
| UI | Checked: empty/pending/error/success/stale/blocker/import states, aborted obsolete calls, retry, cache failures, timer cleanup and unchanged wallet steps. | Added exact-JSON/relay result binding and the same direct-Launch gate (`web/src/useSwarmCheck.ts:18`, `web/src/LaunchReview.tsx:77`); blocker/reload/edit regressions pass. Own code is composed only after a pinned import (`web/src/useSwarmCheck.ts:59`). Failures keep input and never manufacture progress. Ten-percent animation-panel replay was not performed; accelerated timing/state tests were. |

`DESIGN.md` describes the final implemented tokens, type, components, responsive behavior, states and source paths. Attribution and licenses remain in `THIRD_PARTY.md` and `LICENSES/`.

## Probe evidence and retained spec exceptions

From the repository root, the pinned probe was run with `--out test/scratch/taste` and temporary Playwright/browser paths. Its measured report was copied to `tests/results/job5/design-probe.json`; scratch screenshots are disposable.

All 16 checks completed. Render, layout, targets, contrast, tracking, type families, glyphs, slogans, repetition, copy budget, reduced motion and sharing metadata passed. The first-screen copy budget is 44 prose words at 390px. All measured controls satisfy 24px-or-spacing; the inherited compact header controls are below the optional 44px comfort target. Source and 390px screenshots confirm the product, describe input and primary action are visible without scrolling.

Four probe flags are explicit retained visual requirements, not claims of universal style compliance:

1. **Casing:** pixel headings/buttons, #AD and the supplied uppercase landing eyebrow follow SPEC 8 and the owner’s earlier exact-copy decisions.
2. **Eyebrows:** the supplied landing eyebrow and labels such as filters/open slot are retained; some are generic-probe false positives above nearby content.
3. **Type sizes:** six shared sizes plus the owner-specified 12px wordmark and 9px nav/eyebrow; desktop therefore measures seven recurring sizes.
4. **Chrome:** hard 3px outlines and 4px offset shadows are the explicit retro-pixel system.

## Limitations and separate review

- WebKit was installed but could not start because required system libraries are missing (`webkit-attempt.txt`). Chromium rendering and interactions are measured; no Safari or physical-phone result is claimed.
- Lighthouse is an automated accessibility check, not full accessibility certification. It uses the real export with deterministic empty chain history, unavailable network metrics and a recorded check response. Native screen readers, browser-native zoom, localization/RTL and manual animation-panel replay remain unperformed.
- The relay was not deployed. Its fetch/cache tests and real-upstream handler checks do not certify Cloudflare edge operation, cache locality, quota or a live cross-origin URL. The operator deploys it and sets `relayUrl`; default-null browsing remains usable.
- No real paid call, approval, token mint/deployment, pool initialization or contract change was made. The in-progress lock remains. The different-seat adversarial review of jobs 4/5 must be read before any real launch. Reproduction entry points are in `REVIEW-HANDOFF.md`; confirmed findings belong in the next job.

Complete for the implementation scope and required Chromium/Lighthouse checks, with the stated optional/runtime limitations. This is not the separate money-path review’s verdict.
