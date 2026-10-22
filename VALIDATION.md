# Job 13 revision validation

Complete for the stated revision scope. All three reviewer findings reproduced and were fixed. Responses are in [.imd-responses.json](.imd-responses.json); actual results and the six-domain review are in [tests/results/job13/validation.md](tests/results/job13/validation.md).

| Check | Actual final result |
| --- | --- |
| Production build and separate TypeScript check | Passed; final `dist/` included |
| `npm --prefix web test` | 1,192 passed, 0 failed, 0 skipped |
| Focused job 13 Chromium cases and balance-copy check | 10 passed |
| Existing job 12 Chromium regressions | 22 passed |
| Store/Learn reflow, keyboard wallet sheet and offline subpath | 5 passed |
| Better Interface/design probe | All six domains reviewed; 13/16 probe checks passed; three established pixel-style exceptions retained |
| Generic EasyList names in final export | No matches; 254 classes and 120 ids scanned against 13,077 pinned rules |
| Export integrity and complete Git snapshot size | Passed; see [export-integrity.json](tests/results/job13/export-integrity.json) and [submission-budget.json](tests/results/job13/submission-budget.json) |

The browser cases use the production export under `/preview/`, controlled RPC answers and a local injected wallet. They cover deposit 0.25, promote, boost 0.05, cancel and withdraw at 320, 390 and 1440px; allowance sufficiency; zero-deposit guidance; proceeds; injected EasyList; first-endpoint HTTP 429; and an exact proven stack before and after choosing each chain. The final first screen was inspected at 390×844: the product and Describe it action are visible.

[README.md](README.md) explains installation and rebuilding; [DESIGN.md](DESIGN.md) documents the implemented system. The requested EasyList image and all final textual results are retained. The optional cancellation inspection image stays in scratch to preserve bundle space.

These are worker observations. WebKit, screen readers, physical devices, native zoom, the full historical browser suite, live public endpoint verification and the Anvil fork were not rerun in this focused revision. The build emits an existing non-fatal chunk-size warning. Earlier reports remain historical. No public-chain transaction or deployment was sent.
