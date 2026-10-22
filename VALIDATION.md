# Job 10 validation

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
