# Chain-fixture provenance

Captured on 2026-10-21 from the two assignment RPCs. Each `*-intake.json` contains the original RPC log objects, not re-encoded event data. `blocks` records hashes and timestamps where available; Robinhood's raw log `blockTimestamp` is zero, so the separate block response is used. Selecting a subset does not alter log bytes.

- `1-intake.json`: two Requested launch-action events and their two successful Completed events, at observed head 26240702. One pair is DAEMON (`0x8b892ac27fd75b95b6c277d822c2ecb44b5a404fecb82e710875086c9a8e5909`), whose real IPFS result is included.
- `4663-intake.json`: two Requested launch-action events, their successful completions, and an additional real status-2 failed completion, at observed head 94250656. The failed event supplies an empty bytes32 reason; the UI reports “No reason supplied by Intake.” A separately encoded test checks nonempty ASCII reasons.
- `completed-build-result.json`: a provenance wrapper around the exact parsed JSON fetched from the URI in DAEMON's Completed event. Its public URL and request ID are in `source`. The data says `state: completed` and `launch.requested: true`, but chain/id/status are null and there are no deployed addresses. This is **not** a real Live fixture.

These are real IMD launches from outside the storefront. Tests verify that none becomes a catalog card. The real raw envelopes are also used to construct **explicitly synthetic**, marker-bearing requests in `tests/chain.test.mjs` and `web/tests/chain-fixture.ts`. Synthetic Live result fields exercise the expected address schema using real observed Hamster Hour addresses; they are not passed off as captured result.json data. No fixture is bundled into the production catalog.

Known contracts used for the read-only mainnet-fork resolution check:

| Kind | Address | Observed response |
| --- | --- | --- |
| Hamster Hour hook | `0x82f636a92364d13754d7b3e72d460f0be20a28cc` | PoolManager `0x000000000004444c5dc75cB358380D2e3dE08A90`, six enabled permission flags |
| Hamster Hour token | `0x8e7c7936b4f2d4475dc4bacd174dc228d4d24e86` | HAMSTER; ERC-20 name read directly on the fork |

Addresses were located through the public launch-2336 record and then checked by the application's actual address resolver on the fork. The mock in `tests/fork/ControlHook.sol` is a separate local-only deployment, with its address generated during setup. The browser's synthetic event/result selects that local mock only when the fork test is explicitly enabled.

The worker also inspected other successful launch result files and older Completed ranges. The files available to it did not contain live addresses; older RPC history was restricted. A **captured real Live result.json** remains an explicit unmet evidence item. No address, ID, reason or result was invented to conceal that gap. See `VALIDATION.md` for actual commands and results.
