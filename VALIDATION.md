# Worker validation

Validation date: **2026-10-21**. These are checks performed by the implementing worker, not an independent audit or deployment certification. The production export was tested at a subpath with the local preview server. Runtime assets, fonts and launch data are bundled; only the optional live metrics call requires the public API for normal browsing.

## Commands and actual results

| Check | Command or evidence | Result |
| --- | --- | --- |
| Strict TypeScript | `npm --prefix web run typecheck`; also included in build | Passed |
| Production export | `npm --prefix web run build` | Passed, Vite 8.3.5; relative HTML/CSS/JS/font assets |
| Unit tests | `npm --prefix web test` | 11 passed, 0 failed |
| Browser interactions | `npm --prefix web run test:e2e` | 24 passed, 0 failed, Chromium, one worker |
| Original audit reproduction | `node tests/audit-baseline.mjs` | All 8 findings reproduced, 9 observations including both narrow Learn widths |
| Pinned design probe | `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 12 of 16 checks passed; 4 specified-design exceptions below |
| Manual rendered review | Actual export, desktop/mobile screenshots and browser inspection | Store first screen, catalog, Learn permissions, navigation and readable controls inspected |
| Public snapshot | `node scripts/snapshot-launches.mjs` | 500 index entries inspected; 72 relevant launches saved; snapshot timestamp 07:56:14 UTC |

Chromium was installed outside the submission. Tests used `PLAYWRIGHT_BROWSERS_PATH`; the pinned probe used `IMD_PLAYWRIGHT` pointing to the installed Playwright module. The guide/probe input is removed before submission, so its exact runner remains an assignment-provided tool, not an extra runtime dependency. The complete results summary, frame hashes, audit observations and selected screenshots are retained under `tests/results/`.

An initial browser run hit Chromium target crashes while a separate browser session was open. Closing that session and running one browser worker resolved the resource contention. The final suite completed normally; no crash is counted as a pass. Intermediate failures also exposed the dialog focus loop and catalog scroll offset, both corrected and rechecked. Final manual review caught stale scroll anchoring across Learn/catalog; the added regression passes.

## Interaction coverage

- Store and Learn at **320, 390, 1440px**: no horizontal document/body overflow, all seven disclosures open without overflow, all fourteen callback names present, no script errors or missing local assets. At 390px the headline and Describe it action appear on the first screen.
- Header at **821, 1024, 1440px**: one row, search at least 120px, Connect stays 168px with and without a twelve-character address, right edge inside the viewport.
- Search: all words, case-insensitive, original request-only “remainder” finds the real HamsterHook record; Enter scrolls to Results. Filters cover chain, block group, status and sorting. Reset restores all selections and clears query/status/sort.
- Describe form: exact draft key and prompt, existing draft fields preserved, route placeholder, empty input, and failed storage retaining text. All four deferred route types show the later-job panel.
- Data states: `/swarm` success uses saved actual response fields; failure hides metrics. Catalog failure renders no invented cards and Retry works. Public config turns the banner off. Offline browsing works under `/preview/` with local fonts and a beige theme despite dark preference.
- Ads/Learn: only the open slot plus an aria-hidden loop copy; hover/focus pause; both pages say 0.1 IMD for 24 hours. Seven FAQ texts and all fourteen permission explanations are compared against the unchanged mockup, allowing only the specified 7-day-to-24-hour correction.
- Pond: all **eight animated states plus idle**, eight distinct sampled canvas hashes, specified durations within one 33ms frame; queue cap three; mouse/keyboard casts; click splash; 42 schooling fish, three silhouettes of 100/136/172px; pointer panic; offscreen pause, ResizeObserver and DPR cap. This covers the brief's “seven frames” wording by testing the complete nine-state sequence required by SPEC §9.
- Reduced motion: identical canvas pixels after 26 simulated seconds and a water click; no marquee animation; actual pointer click on opt-in starts movement. Timer tests advance Playwright's clock rather than waiting in real time.
- Wallet: named EIP-6963 discovery, rejection/retry, connect/disconnect and fixed address width, using an actual public fixture address without a key. Mobile offers four wallet-browser links and Coinbase Smart Wallet. Keyboard Tab stays in the dialog; Escape restores trigger focus.
- Snapshot units: native hook inclusion, contract objective matching, unrelated-kind exclusion, request preservation, real fields/nulls, conservative numbered-block parsing, statuses, deduplication/sorting, mismatched details, failure preserving the prior file, invalid input rejection. Pepe data and meta are compared character for character.

## Supplied audit: reproduced and fixed

All eight findings reproduced. None were dismissed as unreproducible. `mockup/index.html` remains unchanged to preserve the visual reference; the corrections are in the delivered application.

| Audit ID prefix | Reproduced observation | Correction and regression coverage |
| --- | --- | --- |
| `db6ce245` | Root redirect, absent app/export, sample metrics and paid placements | `index.html:1`, `web/src/App.tsx:11`, `Landing.tsx:15`, `Catalog.tsx:57`; real Vite export, public data, flag and placeholders. Build, offline export, metrics, ads and route tests. Original entry preserved in `tests/fixtures/initial-entry.html`. |
| `d4cc2a79` | Learn document 434px at 320/390px; table 401px | `web/src/styles.css:179` and `:242`; fixed table layout, wrappable callback names and stacked mobile rows. Store/Learn test at all three required widths. |
| `bb19b26d` | Request-only “remainder” yielded zero cards | `web/src/Catalog.tsx:6`; full request included in all-word keyword matching. Real HamsterHook regression. |
| `e43738dd` | Required draft key null; mockup key populated | `web/src/draft.ts:1`, `Landing.tsx:44`; save required JSON interface before navigation. Draft preservation and blocked-storage tests. |
| `3638d058` | At 821px, search 0px and Connect ended at 959px | `web/src/styles.css:86`; fixed compact sibling widths, flexible search minimum 120px, stable 168px Connect. Geometry checks at 821/1024/1440px. |
| `da6a3411` | Clear left In progress selected with one card | `web/src/Catalog.tsx:32`; clear resets groups, chains, status, sort and query. Full reset regression. |
| `581fdbf2` | Opt-in inherited pointer-events none; landing intercepted it | `web/src/styles.css:122`; ticker button restores pointer events. Real pointer opt-in test checks pixel movement. |
| `bd049d81` | Learn cost answer said seven days | `web/src/learn-content.json`; 24-hour wording follows SPEC. Exact FAQ comparison and Store/Learn term test. |

## Better Interface review: six domains

The pinned workflow and core principles of all six domains were read and used during construction. Source review was followed by rendered inspection and regression checks; source alone is not treated as visual evidence.

| Domain | Coverage and findings | Fixes / evidence / limits |
| --- | --- | --- |
| Accessibility | Landmarks, labels, fieldsets, table headers, live regions, focus, target spacing, motion | `App.tsx:34` skip link; `Learn.tsx:23` row headers; `wallet/Connect.tsx:37` explicit Tab wrap after a reproduced focus escape; `styles.css:122` pointer opt-in. Keyboard and reduced-motion tests pass. Screen reader and physical assistive devices untested. |
| Layout | First-screen action, header compression, container widths, long data, mobile Learn table, scrolling | `styles.css:86`, `:129`, `:242`; fixed 821px bar, responsive marquee group, stacked permissions. Removed duplicated scroll offset so #catalog heading clears sticky bar. Final rendered review reproduced stale Learn scroll restoration when cards arrived; `styles.css:40` disables root scroll anchoring, with a cross-route regression test. Screenshots and width tests confirm. |
| Writing | Exact Learn copy, short landing explanation, verbs, failures and honest status/data | `Landing.tsx:15`, `:29`, `Catalog.tsx:43`; actual metric labels, explicit practice casts, recoverable messages. Corrected 24-hour term. No sample paid launch or fabricated count in production. |
| Typography | Three local faces, six-size scale, paragraph measure, numeric separation, wrapping | `styles.css:1`, `:29`, `Text.tsx:1`; all fonts load offline, probe confirms six sizes / three families / two used weights. Callback code uses readable VT323 and wraps. Required small pixel navigation is retained. |
| Colors | Exact token palette, one theme, solid pair contrast, status text and focus | `styles.css:29`, `:69`; pine-2 hover fill would yield 4.44:1, so kept pine text background and used pine-2 border/underline. Solid pairs pass; canvas/glow pairs remain unmeasured. Dark preference test confirms beige. |
| UI | Default/hover/focus/disabled/loading/error/empty states; reversible input; dialog | `Catalog.tsx:20`, `:40`, `Landing.tsx:44`, `wallet/Connect.tsx:10`; retry, reset, storage errors, pending connection and rejection covered. `.pill[class*="status-"]` caps at 96px and wraps. No payment UI is simulated. |

### Pinned probe findings

The final probe's passing checks are render, layout, targets, contrast, tracking, type sizes, type faces, glyphs, slogans, copy budget, motion and share metadata. No script errors or missing local assets were reported. It measured no horizontal scroll at 320/390/1440px, no text-box overlap, no floating control covering text and no clipped text. Two intentional ellipses (search/ticker) were reported without failure.

Four checks remain flagged because the user's SPEC/mockup wins over these generic heuristics:

1. **Casing:** pixel button/heading/pill/rail capitals are specified, while paragraphs remain mixed case.
2. **Eyebrows:** the heuristic treats the three semantic metric `dt` labels above their numeric `dd` values as kicker headings. These are the requested live-number group, not decorative headings.
3. **Repetition:** the explicitly required 42-second featured marquee is identified as an endless ticker. Hover/focus pauses it; reduced motion removes it.
4. **Chrome:** Connect and the describe form intentionally combine ink borders with hard offset shadows from SPEC §8. They are not accidental nested decoration.

The probe reports controls meeting its 24px-or-spacing threshold; many compact navigation/catalog links are below its preferred 44px comfort target. The main submit and wallet rows are at least 44px high. Its contrast pass excludes 36 text boxes over canvas/gradients. Those were visually inspected, not assigned a fabricated contrast score. The first screen uses 39 prose words at 390px and 65 at 1440px, within probe thresholds.

## Scope and remaining limitations

This is job 1. Address resolution, live Intake logs, transaction flows, Builder composition, Hook management, My hooks data and paid placements are later jobs. Snapshot status is public API state at generation time, not a continuously verified chain state. Unavailable request IDs stay null; placeholder View routes use actual launch UUIDs until later resolution. Unknown block prose stays Custom rather than claiming a supported template. `/swarm` counts are network-wide and honestly labeled.

No live transaction, signature or approval was sent. Installed wallet apps, a real Coinbase session, Safari/Firefox, screen-reader output, forced-colors rendering, native browser zoom and Lighthouse were not exercised. No Lighthouse accessibility score is claimed. The supplied domain's publication and social-crawler fetch were not tested. All required metadata and its local OG asset are present. Probe source and temporary browser binaries are intentionally not packaged.

`DESIGN.md` records the final implemented values and reuse points. `README.md` records installation, preview, rebuild, snapshot regeneration and integration boundaries. Required source, lockfile and static assets remain complete; generated dependency/cache directories are removed before delivery. File/byte accounting is recorded in `tests/results/export-integrity.json`.

The production export is **1,067,311 bytes**. The complete candidate file tree measured **3,062,564 bytes** before the small integrity report; its temporary compressed snapshot was **1,813,342 bytes**. Including separate artifact copies and a 1 MiB report/packaging reserve totals **4,774,793 bytes**, below the 8 MiB limit. The temporary archive remains outside the repository. No ignore file was changed, no submodule was added, and only README/index were modified among pre-existing files.

An additional attempt to measure the original repository's complete history bundle was blocked by its read-only Git object database: the partial clone tried to fetch a missing historical object, and Git reported “Unable to create temporary file … .git/objects/pack/tmp_pack_XXXXXX: Read-only file system” followed by “index-pack failed.” No permissions or Git configuration were changed. The file-tree measurements cover the complete deliverable; the publisher-generated Git history bundle was not measured. This packaging-check limitation does not affect the tested static export.
