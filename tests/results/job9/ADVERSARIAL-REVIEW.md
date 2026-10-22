# Job 9 independent adversarial review

A separate review seat inspected the composer, matching/import path, address guards, written fees and contracts-only Live reading. It changed no repository files, made no paid request and performed no browser inspection. The owner repaired confirmed findings and added regression tests; the seat then rechecked its reproductions. **No confirmed finding remains open from this review.** This is bounded evidence, not proof of arbitrary prose or eventual contract behavior.

## Reproductions and resolution

Use Type B, Describe it, chain 4663, hook name `PondHook`, payer `0x6cba4751742f6989fa224b2dc5d5d52fcef98a34` and explicit owner `0x9a50fd22bcefd3774d796e775a467a7f743e0ab0`. Run the real `compose()`, `body()`, `rateTotal()`, `validate()` and `checkConsistency()`. These inputs now appear in `tests/job9.test.mjs`.

| Finding | Exact input / defect before repair | Final result and source |
| --- | --- | --- |
| P1: scoped prohibition hid a charge | `No buy fee, and the owner receives 1% of every sell.` wrote zero, omitted fee facts and passed both checks. | Sell charge retained; owner resolved; buys remain fee-free. Same-direction prohibitions still conflict. `src/lib/writtenFees.ts:3`, `src/lib/safety.ts:35`. |
| P1: owner payee became payer | `Pay the owner 1% of every swap.` and `Give the owner 1% of every swap.` named owner in the description but payer in constructor/footer; guards accepted both. | Both resolve the owner before the amount and agree in constructor/footer. `src/lib/writtenFees.ts:125`. The final addendum explicitly rechecked “Give”. |
| P2: direction prefix lost | `On buys, take 4%. On sells, take 4%.` counted 8%, blocking a valid request. | Prefixes survive splitting; cap is 4% per direction. `src/lib/writtenFees.ts:3`, `src/lib/compose.ts:122`. |
| P1: spelled amounts partially parsed | `Take five and a half percent on every swap.` counted 0.5%; `Take one fifth of every swap.` wrote zero; `Take one hundred and fifty basis points of every swap.` counted 0.5%. | Whole phrases produce 5.5%, 20% and 1.5%; over-cap cases are refused. Unsupported phrases require clarification. `src/lib/writtenFees.ts:53`. |
| P2: unquantified taking wrote zero | `Take a percentage of every swap.` and `Accrue a slice of every swap.` silently wrote zero. | Both receive fee facts and a rate clarification. Observable records/logs remain exempt. `src/lib/writtenFees.ts:78`. |
| P1: numeric suffix parsing | `Take 1,000 basis points of every swap.` and `Take 1,000% of every swap.` counted zero; `.5%` counted 5%. | Counts 10%, 1000% and 0.5%. `src/lib/writtenFees.ts:53`. |
| P1: non-string address bypass | Mutate a valid Type A `economics.remainderTo` to null, 1, {}, [], or an address array. Previously accepted; no live refusal was claimed. | Each gets `address-case`; the final signing guard repeats it. `src/lib/safety.ts:68`. |
| P1: second amount discarded | `Take 1% of every swap and an additional 5% for the owner.` and `Take 1% of every swap, plus 6% credited to the owner.` counted only 1%; guards accepted a request requiring a guess. | Each unattached amount gets `fee-rate`; `launchBody()` refuses it. `src/lib/writtenFees.ts:95`, `src/lib/safety.ts:180`. Final addendum explicitly rechecked both. |

Two intermediate repair regressions (`a 1%` and a comma after a direction prefix) were also fixed and rechecked. Their cases remain in the tests.

## Clean paths and limits

The seat found no additional defect in matching/nonmatching drafts, parameter/Custom rule tolerance, explicit own source, relay success/absence/errors/mismatched pins, checksum normalization, wrong record id/chain rejection, Completed 0 + live record with no hook, or zero-to-nonzero/cached `hook()` readings. Reorg invalidation replaces relay/hook cache data; in-flight entry identity checks prevent old enrichment restoring orphaned completion.

The seat's targeted `node --test tests/job9.test.mjs tests/job8-ui.test.mjs` run passed 20/20 at that point. Its final addendum passed 1/1 and direct composer/launch-guard assertions for the last two findings. The owner's complete final run passed 1,145 unit tests and 234 browser tests, with seven optional skips.

Earlier combined chain-suite runs in the review seat had varying generic refresh-wait timeouts; isolated completion-reorg checks passed. The owner's final complete run passed those cases. The seat did not reproduce an incorrect Live state, call live IMD `/check`, inspect browser UI or certify a paid launch.
