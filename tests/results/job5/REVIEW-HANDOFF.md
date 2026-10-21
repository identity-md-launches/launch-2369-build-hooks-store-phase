# Job 5: handoff to the separate money-path reviewer

This is an implementation handoff, not an adversarial-review verdict. The next step is a **read-only review by a different seat**. Report concrete reproductions and the owner will carry confirmed findings into job 6. Do not launch on a real chain during this review. The committed `public/site-config.json` still has `inProgress: true` and `relayUrl: null`.

## Review surfaces

| Surface | Source | Useful reproduction entry points |
| --- | --- | --- |
| Price, approval, request simulation/calls, account/network guards | `web/src/chain/launch.ts` | `tests/launch.test.mjs`; `web/tests/launch.spec.ts`; optional guarded local fork runner `web/scripts/run-launch-checks.mjs` |
| Compact UTF-8 request body, type A/B/C choices, limits, owner/economics | `src/lib/compose.ts`; `web/src/chain/launch.ts` | Composer fixtures, body-size tests, preview/calldata equality tests |
| Wallet sequencing, receipt persistence, replacement/rejection, request-id routing | `web/src/LaunchReview.tsx` | Existing launch browser tests and `tests/results/job4/launch-browser-results.json`; this job changes import preparation and check gates, not the approve/request implementations |
| Receipt decoding and chain-sourced launches | `web/src/chain/decode.ts`; `web/src/chain/store.ts`; `web/src/chain/resolve.ts`; `web/src/chain/clients.ts` | `tests/chain.test.mjs`, fixtures, optional live read test; inspect reorg/window/cache behavior and result trust boundaries |
| Fixed-origin relay, CORS, method/path restrictions, cache | `relay/worker.js` | `node --test relay/worker.test.mjs`; test denied paths/methods, queries, headers, redirects, failures and cache expiry |
| Exact-body check binding and import resolution | `web/src/relay.ts`; `web/src/useSwarmCheck.ts`; `web/src/Builder.tsx`; `web/src/LaunchReview.tsx` | `tests/relay.test.mjs`; `web/tests/job5.spec.ts`: blocked check → reload → direct Launch; edit/wallet change → stale gate; rejected import → retry → pinned request; malformed check response |
| Optional names and stage reads | `web/src/Landing.tsx`; `web/src/RelayTimeline.tsx` | New-live detection and reduced motion; matching intake request before following job id; relay state never establishes a chain-confirmed Live status |

## Local commands

```sh
npm --prefix web ci
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test
node --test relay/worker.test.mjs
npm --prefix web run test:e2e
HOOKS_LIVE_RPC=1 npm --prefix web run test:e2e -- tests/live-rpc.spec.ts
```

The browser suite uses production `dist/` at `/preview/`. Its default wallet calls are intercepted fixtures; optional fork tests require loopback Anvil and never a public signing transport. The job 4 guarded fork runner mutates only that temporary fork. No account credentials are needed for the relay, free checks or public reads.

## Observed boundaries and unverified items

The worker unit suite uses a fetch/cache mock. Real upstream calls were exercised through the undeployed handler (`live-relay-summary.json`): free check, repository import and GET schemas. Cloudflare deployment, deployed edge cache behavior, quotas and live cross-origin operation remain operator checks after deployment. The site will work without that deployment.

A free check is advisory, not a contract-level authorization or a promise of acceptance. Its result is bound in the UI to exact JSON and the configured relay. With no check run, a valid request can reach review; after a check, blockers, failed checks, pending checks and stale results lock continuation. Without a relay, the explicit refused-body fee warning remains. Browser storage is controlled by the visitor and is not a trusted authorization boundary.

No real transaction, approval, paid request, contract deployment, mint, pool initialization or relay deployment was performed by job 5. This handoff does not establish that any hypothetical vulnerability is confirmed; the separate reviewer must reproduce and report its own findings.
