# Job 12 validation

Complete for the stated scope. The final source and static export implement the proven lane and all carry-overs (h)–(m), with the existing wallet, swarm payment and launch safety flows retained.

| Check | Actual final result |
| --- | --- |
| Production build and separate TypeScript check | Passed |
| Unit tests | 1,177 passed, 0 failed |
| Relay tests | 9 passed, 0 failed |
| Chromium production-export suite | 277 passed, 7 existing opt-in cases skipped, 0 failed |
| Job 12 browser cases | All 23 passed within the full suite |
| Local Anvil fork | Listing, approve/deposit, purchase, metadata revision pinning, second-wallet boost, cancel/refund and withdrawal passed; browser payments passed at 320, 390 and 1440px |
| Real public request links, no wallet | Launches 2456 and 2454 reached Live and their real IMD build links in 3.9s and 5.8s |
| Better Interface/design probe | All six domains reviewed; 13/16 probe checks passed; three required pixel-style exceptions retained |
| Export integrity and submission budget | Passed; complete snapshot about 7.83 MiB, under 8 MiB. See final [export-integrity.json](tests/results/job12/export-integrity.json) and [submission-budget.json](tests/results/job12/submission-budget.json) |

Detailed coverage, source locations, findings/fixes, actual commands, screenshots and limitations are in [tests/results/job12/validation.md](tests/results/job12/validation.md). Machine-readable results are in [tests/results/job12/summary.json](tests/results/job12/summary.json). [README.md](README.md) explains installation, preview and rebuild; [DESIGN.md](DESIGN.md) documents the final system.

These are worker observations, not independent certification. No public-chain transaction, token deployment, factory deployment or publication was performed. Screen readers, physical devices and native zoom were not tested. The supplied browser connector could not locate Chrome; all rendered checks used the working Playwright Chromium runner. Older validation files remain historical.
