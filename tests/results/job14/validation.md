# Job 14 validation

Complete for the stated scope. This is the worker's evidence, not independent certification. Implemented SPEC 1.56, decision 49, in the requested order: u, v, r, s, t. No chain transaction, deployment or publication was sent. Build configuration, package manifests/lockfiles, contract dependencies and ignore files are unchanged.

## Delivered behavior

| Requirement | Result and evidence |
| --- | --- |
| u: public pond | One rule excludes failed completions, stopped jobs/nodes, parked/failed launches and stale requests without running records. Catalog/count/search/rail, landing/casts and featured lookup use it. My hooks retains all payer requests with recovery. Direct pages retain content and add the specified sentence. Unit cases cover every listed state, the exact 24-hour boundary and the three captured real blocked jobs. Browser fixtures count four hooks and four LIVE/PROVEN pills; stopped ids never appear in the grid/search, all three remain in My hooks, and their direct links work. The old and live test tokens share the name “test”: that search retains the legitimate live token and excludes the stopped request. |
| v: Checking | Live type A starts at Checking… / status-checking, remains public, counts under In progress and becomes LIVE only after the code response. Unit and browser tests cover the transition while the code read is held pending. |
| r: snapshot fallback | Runtime fetch only; no snapshot JSON is bundled. Matching requires exact objective SHA-256, payer, kind, chain and any known launch id. Addresses, pool/source and job/launch states supplement the chain request after relay failure. Real fixtures match all four published live records. Browser tests separately return 503 for intake, jobs, launches and all three; each resolves four LIVE and PROVEN hooks. Chain scanning continues. |
| s: windows/backoff | Each endpoint has a configured maximum, including publicnode's 10,000 blocks. Transport splits for the endpoint used, shares a two-scan queue per chain, waits 2/4/8 seconds after 429 and skips known-ineligible history providers. Unit tests exercise inclusive boundaries, backoff/reset, actual local HTTP fallback windows and concurrency. The forced-429 browser case reaches working balances and strip without an error. The final real full-history scan completes both chains with zero failed calls and a maximum of two concurrent log calls. |
| t: findings by cause | A named hook-only draft without chain/wallet has exactly two findings, with working setting jumps. Missing chain suppresses dependent PoolManager/deployer symptoms; missing owner groups its body/recipient/constructor symptoms. Independent malformed values still fail. A zero-fee constructor can use the explicit owner without a connected wallet. |
| Static export/documentation | Source and production dist are present with the existing manifest/lockfile. Export integrity finds no missing or absolute local asset references and confirms title, favicon, description, og:title and og:image. README documents install/preview/rebuild and runtime data/RPC settings. DESIGN.md records the final implementation. |

## Actual checks

All browser checks used the production export under `/preview/`. The final combined run was sequential from `web/` using its existing configuration and local HTTP preview. No development server was used for interaction evidence.

| Command | Actual result | Artifact |
| --- | --- | --- |
| `npm --prefix web run typecheck` | Exit 0 | typecheck.txt |
| `npm --prefix web run build` | Exit 0; existing >500 kB chunk warning | build.txt |
| `npm --prefix web test` | 1,228 passed; 0 failed/skipped | unit.txt |
| `npm run test:e2e -- job14.spec.ts job12.spec.ts store.spec.ts wallet.spec.ts builder.spec.ts hook.spec.ts pond.spec.ts` (from web) | 105 passed, 2 optional fork cases skipped, 0 failures/flaky cases; 227.6 seconds | playwright.txt, playwright-results.json |
| `node web/scripts/check-job14-rpc.mjs` | Both full Intake histories complete; 0 failed HTTP/JSON-RPC/transport calls; max 2 log calls in flight | rpc-scan.json |
| Pinned taste.mjs, explicit workspace Playwright module, `--out test/scratch/taste --offline` | 13/16 checks passed | design-probe.json |
| `node scripts/check-export.mjs` | Pass: 30 runtime files; no missing/absolute local references | export-integrity.json |

The real scan read Robinhood Chain from block 85,300,000 to 95,706,591 (18 Requested and 72 Completed logs), and Ethereum from block 26,164,897 to 26,253,294 (45 Requested and 389 Completed logs). These totals describe Intake events, not counts of store/public hooks. Transport-level counters include every actual call, not only final successful logical reads. No vendored registry is needed to rerun this read-only service check.

The earlier endpoint diagnostic recorded six failed calls. It exposed public history restrictions and an unavailable fallback. `rpcLogLookbacks` now skips those ineligible history sources; the final production scan is separately retained and reports zero failures. Individual endpoint availability remains external. The scheduled snapshot script in the spec repository was not changed.

## Better Interface review

The visual idea remains the established paper-and-pine pixel storefront and character pond. All six pinned domains were reviewed within the changed views and affected shared components.

| Domain | Coverage and limits |
| --- | --- |
| Accessibility | Native search/filter/form controls, textual statuses, Needs attention/recovery, field jumps, wallet-sheet focus trap/Escape/focus return and keyboard access to the main action were exercised. Entry target-spacing and reduced-motion probes pass. Screen-reader sessions, forced-colors rendering and physical touch devices were not tested. |
| Layout | Store/hook checks at 320, 390 and 1440; job 14 also checks 820. Builder spans 320 through 2560 and preserves viewport fit. The seven-finding scroll regression passes at 1920×1080 and 1366×768 using seven independent missing inputs. Manual browser screenshots inspected Store at 390 and the real stopped Wordsmith page at 390/1440. The final 390 first screen and stopped My hooks card were inspected. Native 200% zoom, RTL and pseudolocalization were not tested. |
| Writing | Required pond sentences, Checking label, Needs attention, Fix in Builder and spent-fee explanation are present. Grouped findings name the cause and recovery setting. The existing brand copy is preserved. |
| Typography | Existing local Press Start 2P, Atkinson Hyperlegible and JetBrains Mono faces, numeric roles and sizes are preserved. Loaded-font and long-address/request regressions pass. No new size, font or truncation was added. |
| Colors | Checking reuses the existing neutral status pair; errors/caution and focus reuse existing tokens. The entry probe passes solid-background text contrast. Text over canvas/gradient backgrounds is excluded from its contrast measurement; the checking state was not separately measured for contrast. |
| UI | Filter/reset, direct navigation, draft restore, owner recovery, wallet discovery/mobile links, dialogs, result retry, Checking/code response, promotions deposit/boost/cancel/withdraw, EasyList injection, failed RPC fallback and reduced motion were exercised. Animation-panel slow-motion replay was not performed. |

Probe exceptions are deliberate SPEC 8 requirements: pixel capitals, the landing eyebrow/labels and hard border-plus-shadow surfaces. They remain unchanged. The entry probe passed render, layout, target spacing, measured contrast, tracking, type sizes/families, glyphs, slogans, repetition, copy budget, reduced motion and share metadata. The 390 first screen contains the product, price and Describe it control.

## Findings and repairs

| Severity/source | Finding, correction and recheck |
| --- | --- |
| High — web/src/chain/visibility.ts:10; web/src/Catalog.tsx:22 | Stopped/stale requests had permanent public Requested cards. Retained job evidence and applied the shared public rule across public consumers; real blocked fixtures and the four-hook browser set pass. |
| Medium — web/src/chain/visibility.ts:23; web/src/chain/store.ts:101 | An already-live type A looked stalled before verification. Derived Checking and published it before awaiting code; held-code browser test passes before/after. |
| High — web/src/chain/records.ts:28; web/src/chain/store.ts:114 | Record-plane outages prevented Live/address resolution. Added identity-checked runtime snapshot fallback; all 503 variants pass. |
| High — web/src/chain/clients.ts:12; web/src/chain/store.ts:38 | Failing range/read retries could multiply calls. Added endpoint ranges/history eligibility, shared cooldown/queue and limited subdivision to range/result errors. Forced-429 interaction and zero-failure real scan pass. An intermediate implementation retried the throttled primary too long; failover now waits, then advances to the next provider. |
| Low — src/lib/safety.ts:61; web/src/Builder.tsx:352 | Chain and owner prerequisites produced repeated symptoms. Grouped only dependent causes and retained independent failures; exactly-two and malformed-input tests pass. |
| Medium — web/src/chain/store.ts:359 | Fallback errors could overwrite the original IPFS retry explanation. Preserved the existing result error; the original unavailable-result/retry browser case passes. |
| Low — web/src/styles.css:81 | Recovery content needed a full My hooks flex row. Set flex-basis to 100%; the final 390 recovery screenshot and width tests pass. |

Regression fixtures now provide actual job ids/states and hook-code responses; old assertions expecting duplicate findings were updated to the new grouping. Historical screenshots regenerated by broader tests were restored before packaging. Lossless PNG compression then reduced encoding overhead; lossless-packaging.json records original/new file hashes and identical decoded RGBA hashes. Every evidence image is retained; current evidence is isolated here. Temporary full reports, extra captures and dependency/cache directories are omitted from the submission; required source, fixtures, runtime assets and results remain complete.

## Limitations

WebKit was attempted but could not launch, so no WebKit interactions are claimed. The two skipped cases require a real Ethereum fork: sending pause and resolving a fork hook/token. No real wallet signature or on-chain write was performed. The full historical 309-case browser inventory and Anvil suite were not run. Snapshot freshness depends on the external six-hour publisher; new chain requests do not depend on that publisher. Measured RPC availability and counts are observations at the recorded time, not future guarantees. Final bundle/path integrity is recorded separately in submission-budget.json.

Final packaging passes: the complete snapshot Git bundle is below 8,388,608 bytes, including a 16,384-byte metadata reserve. The budget report confirms no protected-path changes, dependency/cache paths or submodules. All 23 recompressed historical captures were compared against their original Git versions: decoded RGBA pixels are identical, with 150,944 encoding bytes saved.
