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
