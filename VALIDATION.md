# Job 14 validation

Implemented SPEC 1.56 / decision 49 and carry-overs u, v, r, s, t. Production build and separate typecheck pass. All 1,228 unit tests pass. The final Chromium run passes 105 cases, skips two optional Ethereum-fork cases and has no failures or flaky cases. The real production-transport scan completes both Intake histories with zero failed calls and at most two concurrent log scans.

The pinned entry probe passes 13/16 checks; its three retained exceptions follow the required pixel design. The product and Describe it action fit the first screen at 390px. WebKit could not launch; screen readers, physical devices, native zoom and real-chain writes were not tested.

See [the complete worker report](tests/results/job14/validation.md), [machine-readable browser results](tests/results/job14/playwright-results.json), [RPC measurements](tests/results/job14/rpc-scan.json), [export integrity](tests/results/job14/export-integrity.json) and [submission budget](tests/results/job14/submission-budget.json). [DESIGN.md](DESIGN.md) and [README.md](README.md) document the final source and rebuild procedure. Earlier reports under tests/results are historical.
