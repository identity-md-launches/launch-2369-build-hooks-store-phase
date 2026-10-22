# Job 10 validation

Revision: all three reopened findings were reproduced and fixed. The rebuilt export passed a separate typecheck, production build, 1,167 unit tests, 9 relay tests and 252 Chromium cases; seven existing opt-in cases were skipped. The final design probe passed 12/16 checks with the established pixel-design exceptions retained. Reproductions, scoped six-domain review, actual commands and limitations are in [artifacts/validation.md](artifacts/validation.md); current logs and screenshots are in [artifacts/revision/](artifacts/revision/). The table below records the preceding accepted submission, not this revision's run.

The committed result summary is [tests/results/job10-revision.json](tests/results/job10-revision.json). New regressions cover unresolved payees after trade prefixes (including recovery to a full address), the desktop column ending at its last panel plus padding, and a real local-wallet purchase followed by a fresh checkout. The column's measured blank range fell from 324.8125px to rounding only, with unchanged panel dimensions. All three existing promotion widths and the Anvil listing/deposit/purchase/second-wallet boost/cancel/withdraw checks passed.

The six-domain revision review checked native labels, disabled states and retained scroll focus (accessibility); viewport/scroll geometry and screenshots (layout); address-correction and checkout copy (writing); retained fonts and wrapping (typography); sampled solid-background contrast (colors); and invalid, corrected, pending, completed and reopened flows (UI). The design probe's four exceptions are the established pixel capitals/labels, type scale, and ink border/shadow treatment. WebKit lacks required system libraries; the supplied browser connector could not initialize Chromium, so rendered checks used the working Playwright Chromium runner. Physical devices, screen readers, native zoom and slow-motion animation review were not performed. No public-chain write or publication was attempted.

The final source and `dist/` implement SPEC 1.43: all carry-overs, free listings and paid #AD placement flows. The detailed review, requirement mapping, six Better Interface domains, findings/fixes and limitations are in [artifacts/validation.md](artifacts/validation.md).

| Check | Actual result |
| --- | --- |
| Production build and separate typecheck | Passed |
| Unit tests | 1,166 passed |
| Relay worker tests | 9 passed |
| Chromium | 249 passed; 7 older optional cases skipped; no spec ignored |
| Catalog pair sweep | 1,221 pairs: 1,156 accepted cleanly, 65 refused before payment |
| Anvil fork | Listing, deposit, purchase, second-wallet boost, cancel/refund, withdraw and revision pinning passed |
| Promotion browser flow | Real local wallet calls at 320, 390 and 1440px |
| Export | Relative runtime references, all metadata and local assets checked |
| Design probe | 13/16; the three retained exceptions follow the supplied pixel mockup |
| Bundle | Under 8 MiB; exact final size in [bundle-budget.json](artifacts/bundle-budget.json) |

Read-only public checks at 2026-10-22 17:03 UTC found both deployed placement contracts **still missing their IMD and proceeds-recipient setup**. The UI explains this and disables payment until the contract owner configures them. Free listings remain available. This job sends no live transaction and does not publish the site.

[README.md](README.md) explains installation, preview, rebuild and checks. [DESIGN.md](DESIGN.md) documents the final implemented system. Current raw results are in `artifacts/`; earlier records under `tests/results/` are historical. These are worker observations and do not independently certify behavior.
