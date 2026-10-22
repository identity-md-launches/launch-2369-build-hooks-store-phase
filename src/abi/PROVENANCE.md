The ABIs are generated with solc 0.8.26 from the pinned source, without handwritten signatures.

- Robinhood Chain: identity-md-launches/launch-2454-what-build-two-immutable, 952e62de284440144a24fc4ec4868461e4534612.
- Ethereum: identity-md-launches/launch-2456-what-build-two-immutable, fcca6490b279cd9821cf71d1edf083afbfa1cba5.

The separately compiled ABI arrays are identical on both chains. Source copies used by the local fork test are in tests/fixtures/ads and tests/fixtures/ads-ethereum. No live contracts are deployed or changed by tests.

PondsideGuard-2424-controls.json is the control ABI excerpt extracted from src/PondsideGuard.sol at identity-md-launches/launch-2424-deploy-one-contract-pondsideguard commit 5a9f6a36d659084e084a8abc08a55213c9516f07. The source declares global pause(), unpause(), paused() and claimFees(), plus pool-scoped buyback, jar and windowEndsAt. Its raw out/ artifact returns 404, so this excerpt is a fallback for this exact repository, commit and contract only. It is not claimed to be the full contract ABI.

Both pinned Foundry configurations use solc 0.8.26, Cancun, optimizer enabled with 200 runs, bytecode_hash none and cbor_metadata false. The fork runner passes these settings on the command line (--optimize --optimizer-runs 200 --evm-version cancun --no-metadata); it does not change a repository build configuration.
