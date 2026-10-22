# Job 8: independent read-only request review

Reviewed 2026-10-22 by the separate `/root/composer_tests` agent. This is a worker-side review by a different agent, not certification by an external network seat. The final review made no product edits. Earlier concrete findings were returned to the implementation agent, repaired, and then reviewed again. No approval, payment, deployment or Solidity exploit transaction was sent.

## Coverage and result

The reviewer read all 35 catalog blocks and the 420-case request corpus: every A/B/C type, both stored pair settings, and both supported chains. All 420 recorded body hashes match the current composer; there is no drift. All 368 enabled, applicable cases pass consistency checks. Disabled cases remain refused. Every declared exclusion was tested under every shared launch type, both pair settings and both chains. The dedicated composer suite passes **444/444** tests.

The review covered actual-traded fees and partial-fill reverts, destination resolution, PoolId isolation, first-swap windows, seconds and position keys, token definitions, no-fee defaults, references, owner/body agreement, factory authorization, constructor-only deployer mining and words-mode composition. Mutations removing salt mining, immediate deployment, factory authorization, references or owner agreement are refused. The recorded A/IMD, A/ETH, B and C free-check facts have no conflicts with the exact checked requests.

Four findings remain for the owner's next job. They concern policies prescribed by SPEC 4.16; the implementation does not silently invent an owner decision to close them. Therefore the review does **not** assert that every accepted request is free of builder ambiguity or high financial risk.

## 1. Prize pot: skipped periods are undefined

**Kind:** builder ambiguity; possible stranded funds. **Source:** `src/blocks/catalog.json:326`, corpus case `pot/B/eth/1`, SPEC 4.16.13.

**Now:** draw(PoolId) settles only the most recent complete period. Earlier unsettled periods have no specified catch-up operation.

**Reproduction:** the first swap is at t=0; buyers fund period 0; nobody calls draw until t=2h+1s. The most recent complete period is period 1. The request does not say whether period 0 is merged, remains drawable, or is skipped. A per-period implementation can strand its pot; a global pot can award earlier contributions to later buyers. `checkConsistency()` accepts the request.

**Owner follow-up:** specify deterministic catch-up behavior, buyer attribution and withdrawal accounting for missed periods. Do not let the next builder choose between those policies.

## 2. Prize pot: “small pots” has no enforceable bound

**Kind:** financial design risk. **Source:** `src/blocks/catalog.json:326`, corpus case `pot/B/eth/1`, SPEC 4.16.13 and the retained block-data randomness warning.

**Now:** the request calls block-data randomness acceptable only for small pots, without a numeric cap, collection stop or overflow policy.

**Reproduction:** at the default 2%, 1,000 ETH of buys accumulates 20 ETH. Nothing enforces the adjective “small.” The warning acknowledges manipulation but does not bound the exposure. The local check accepts this request.

**Owner follow-up:** choose an enforceable bound and handling of excess collection, or explicitly accept unrestricted exposure. No cap was invented in this job.

## 3. Buyback jar: the 3% limit uses a manipulable baseline

**Kind:** high financial risk candidate. **Source:** `src/blocks/catalog.json:172`, corpus case `jar/B/eth/1`, SPEC 4.16.11.

**Now:** the 3% bound is measured from spot price at the start of each public buyback call.

**Reproduction:** an attacker first buys to inflate token price, calls buyback against that inflated baseline, and sells back. Repeated calls reset the bound and can spend retained jar funds in chunks. An illustrative constant-product calculation, excluding fees, starts with reserves 100/100, an attacker buy of 100 pair units, and a 10-unit jar; the round trip returns approximately 107.56 pair units to the attacker. This is arithmetic showing the baseline weakness, **not** an executed v4 exploit or a guaranteed profit after fees. The local check accepts the specified design.

**Owner follow-up:** decide the reference-price policy and horizon, then make the request enforce it. This job retains the exact required 3% spot-relative policy rather than inventing another oracle.

## 4. JIT penalty: no recipient exists when the last LP exits

**Kind:** builder ambiguity. **Source:** `src/blocks/catalog.json:199`, corpus case `jit/B/eth/1`, SPEC 4.16.17–19.

**Now:** fees from early removal are forfeited to remaining LPs. The request gives no rule when no in-range liquidity remains.

**Reproduction:** the sole in-range position earns fees and removes all liquidity after 30 seconds, within the default 60-second penalty window. There is nobody to receive the forfeiture. The sentence does not choose between waiving the penalty, retaining the fees, another destination, or rejecting withdrawal. LP sharing's explicit no-liquidity fallback does not cover JIT. The local check accepts this request.

**Owner follow-up:** decide the empty-liquidity penalty behavior and add a deterministic sentence and regression.

## Preliminary findings repaired before this final review

- Different buy/sell fee templates were mistakenly recognized as both base-fee blocks. Typed template matching now distinguishes them.
- No-outside-dependency wording and LP-share recipient references caused false positives; explicitly resolved references now pass.
- Written owner grants bypassed fixed-fact comparison, and Custom opt-outs were ignored. Both now have positive/negative regression tests.
- The revised position-lock sentence escaped checks against unconditional liquidity-removal promises. Lock/pause/breaker/hours conflicts are now refused.
- Split retained the original treasury in claims, fallback allocation and constructor context. All effective destination wording now follows the split; the replaced field is disabled.
- Off-grid inputs totaling 4.98% rendered as 5.1%. Fractional-step validation now rejects those inputs before checking or payment.
- An existing token's reverting burn could break buybacks. Missing or reverting burn calls now retain the bought tokens permanently.
- A percentage protection rule suppressed the zero-fee default, while complete flat-fee prose received a contradictory zero. Both modes now distinguish those examples across types and pair settings.

## Reviewed snapshot

| File | SHA-256 |
| --- | --- |
| `src/blocks/catalog.json` | `320537bf96bf4ff457206abff862f74f10054c4a0c8493cb39c21f1823450de3` |
| `src/lib/compose.ts` | `405a5b7754a46e831c0d4f38a6a496c62e89c968ac2dba91d57205974c3f9d29` |
| `src/lib/safety.ts` | `93547888e809ac57b632637f6187e06a8d8755cbed6130be246322f16241e104` |
| `tests/job8.test.mjs` | `a3446fab1d8677fb800ce4921aac076f14d21c1268e2e8a86279e50be1c63458` |
| `composed-requests.jsonl` | `214f4f0ae10acacf520b3f2d02c4b9c7f0a4952c38879a138973fbda3e42e054` |

Arbitrary prose is not semantically proven. Constructor acceptance by IMD's manifest verifier and deployment gas remain unverified until an authorized post-fix launch. SPEC 4.16.30's real launches are an owner follow-up; this website job did not deploy or pay for them.
