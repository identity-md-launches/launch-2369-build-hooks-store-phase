# Job 7 implementation and Better Interface review

Worker observations on 2026-10-21 against SPEC 1.25. These results are not independent certification. The complete source and static export accompany this record. No real approval, payment, launch, contract deployment or publication was performed.

The site remains a Uniswap v4 hook storefront carried by a monochrome fishing pond and a dense pixel interface. The existing visual direction, contracts, chains, economics, dependency versions and build configuration were preserved.

## Requirement coverage

| Requirement | Implementation and evidence |
| --- | --- |
| Fee side and settlement follow the pair | `src/blocks/catalog.json:40`, `src/lib/compose.ts:61`: IMD for A/IMD; ETH for A/ETH, B and C. Unit matrix composes all 35 blocks × 3 types × 2 pairing settings × 2 chains (420 cases), including correct omission of unavailable blocks. |
| Recipient is concrete | `src/lib/compose.ts:66`: paying address for my wallet; exact supplied IMD treasury for treasury choices. Missing/zero/short recipients block checking and payment. All fee and buyback recipient options are tested. An explicitly addressed recovered recipient is retained and shown, rather than silently becoming my wallet. |
| Explicit IMD conversion opt-out | `src/lib/compose.ts:187`: exact requested sentence appended automatically. Currency labels, thresholds, settlement, jar/pot units and readings follow the same pairing. |
| Consistency before free check and Launch | `src/lib/safety.ts:12`, `web/src/useSwarmCheck.ts`, `web/src/relay.ts`, `web/src/chain/launch.ts`: shared actual-output check before the relay and again over the exact bytes before signing. Red notices quote the sentence. Mutation tests corrupt settlement currencies independently of the composer. |
| Dependencies and contradictory rules | Missing service addresses, unresolved existing-token/PoolManager addresses, fee exclusions, fixed/dynamic LP fees, donation restrictions, liquidity-lock/pause withdrawal promises, schedule order, owner-power and swap restrictions are checked. Yield is refused on both chains because no verified Aave/Morpho service address is supplied. Unsupported types are omitted. |
| Fixed facts | `src/lib/safety.ts:90`, `web/src/SwarmPanel.tsx`: conflict text, persistent Launch gate, explicit opt-outs and a fresh check for changed bytes. Browser cases cover a conflicting owner fact and the automatically resolved IMD/ETH conversion default. |
| Blocked job question | `web/src/RelayTimeline.tsx:43`: relay GET /jobs/:id, blockedReason and failed nodes' failureReason shown unchanged under Needs attention. No HTML/Markdown execution. |
| Fix in Builder and corrected request | `web/src/draft.ts:31`, `web/src/Hook.tsx:35`: exact local draft/request archive, on-chain recovery for older requests, preserved previous request and question beside the editable draft. Tests reproduce the historical ETH-fee/IMD-pair request, correct it and inspect the relaunch bytes. Token, pool allocation, owner, recipients and source survive recovery. |
| Known questions | `src/blocks/known-questions.json:1` loads into the checker. First entry is the documented launch 2 conversion-pool question. Its wording is explicitly identified as a summary from SPEC, rather than an invented verbatim API capture. |
| Spent-fee copy | `web/src/LaunchReview.tsx:155`: fee table and check/payment page say stopped requests spend the fee and checks exist to make that rare. Corrected relaunch copy says a new fee is required. |
| Hat removal, boat/birds retained | `src/scene/pond.ts`: drawHat and its call removed; Pepe data, far boat, canopy birds, fish and cast behavior retained. Sprite equality and pond interaction tests pass. |
| Cancelled/replaced launch retry | `web/src/LaunchReview.tsx:95`: confirmed replacement verifies the exact Requested event; a replacement without the request fails and unlocks retry, rechecking price/allowance. Repricing or a replacement that did create the request finishes without a second payment. |
| Unknown transaction remains locked | Reload and receipt retry retain a genuinely submitted unknown hash as pending. The test waits for the persisted pending hash before reloading, rather than interrupting the wallet/simulation phase. |
| Reorg ticker | `web/src/Landing.tsx:47`: losing the canonical matching launch clears its announcement and age. Browser test removes the request and advances another minute. |
| SPEC refresh | `SPEC.md` is byte-identical to the requested upstream 1.25 download; SHA-256 cd7fe16d0befb0c18a43e61b923797fc8e04808d84da833c5c27e66631363057. |
| Source/export/docs | Relative URLs, complete local runtime assets, source, existing lockfile, DESIGN.md, README and actual test results delivered. `scripts/check-delivery.mjs` verifies export completeness, protected-path integrity and complete Git-bundle size. |

## Six-domain review

| Domain | Coverage, findings and corrections | Limits |
| --- | --- | --- |
| Accessibility | Native buttons/disclosures, labeled inputs, role=alert for consistency/fixed-fact errors, polite progress, explicit locked-state copy. Existing keyboard navigation, wallet focus trap/Escape/return, reduced motion and target-size checks exercised. Lighthouse: Store 100, Builder 100, checked response 100 at 390px. | No screen-reader, physical-device, native zoom or WebKit/Safari session. Lighthouse and automated assertions do not establish full accessibility compliance. |
| Layout | All seven routes at 320/390/1440; document and control bounds checked. Blocked Hook and Fix in Builder states also measured at all three widths. `web/src/styles.css` safety quote rules preserve line breaks and wrap long questions/addresses. Inspected 390px Store screenshot: product explanation, input and Describe it action fit on screen. | Screenshots use emulated CSS viewports, not physical phones. |
| Writing | Fixed ambiguous currency/recipient wording at `src/blocks/catalog.json:40`; red warnings name the sentence and recovery action. Fee table warns about a stopped paid request. Questions are IMD text; corrections are new requests. | Deterministic rules do not prove arbitrary prose or guarantee a successful paid build. |
| Typography | Reused Press Start 2P, Pixelify Sans and VT323, existing tokens and wrapping. `Text` also formats numbers/addresses in builder questions. `web/src/Management.tsx:31` no longer labels an IMD jar/pot as ETH. | The pinned desktop wordmark/nav sizes and uppercase pixel headings remain intentional exceptions to the general probe bar. |
| Colors | Existing ink/paper surfaces and `--bad` red stripe reused; text identifies each problem independently of color. Probe solid-background text contrast passes. No new palette or dark theme. | Canvas/glow contrast and every transient native-browser control state are not numerically certified. |
| UI | Existing borders, hard shadows, controls and disclosures reused. Fix in Builder, prior-request disclosure, wallet recipient resolution, error correction, check retry, stale/blocker gates, cancelled/replaced/repriced receipt recovery and unknown pending state exercised. | No real signature/payment, Coinbase account creation or native wallet-app handoff. |

## Findings fixed

- `src/blocks/catalog.json:40`: ETH fee and ambiguous recipient conflicted with IMD pairing. Replaced active templates with pair context, concrete recipients and explicit settlement; retained historical templates only for decoding old hooks.
- `web/src/SwarmPanel.tsx:4`: fixed facts were displayed without a conflict gate. Added comparison, quoted conflict, explicit opt-out guidance and gate shared with Launch.
- `web/src/RelayTimeline.tsx:43`: a failed stage did not expose the builder's question or original draft. Added Needs attention and Fix in Builder, plus full prior-request retention.
- `web/src/LaunchReview.tsx:95`: a confirmed cancelled/replaced Launch stayed pending. Added terminal recovery while verifying replacement events before retry can pay again.
- `web/src/Landing.tsx:47`: the empty matching-launch branch retained an orphaned announcement. It now resets to the quiet message without an age.
- `src/scene/pond.ts`: removed the hat overlay while preserving the requested boat and birds.

## Probe interpretation

The final probe result is in design-probe.json. The final deterministic offline run passes 13 of 16 checks; its remaining candidate flags are the inherited casing, eyebrows and border-plus-shadow styling. An earlier online run passed 12 of 16 and additionally flagged the repeated desktop type sizes with live content; both reports are retained. SPEC 8/9 and prior owner decisions explicitly establish uppercase pixel headings/buttons, the landing eyebrow, the wordmark/nav sizes and hard outlined shadows. They are preserved rather than redesigned. Layout, script/local resources, control targets, solid-background text contrast, reduced motion, copy budget and sharing metadata pass.

## Evidence and practical limits

- `unit.txt`, `relay-unit.txt`, `typecheck.txt`, `build.txt`, `playwright.txt` and `playwright-results.json` contain actual commands/results. Route JPEGs cover all requested widths, plus blocked/correction states. Earlier evidence remains in its existing directories.
- The real free check through the owner relay returned HTTP 200 in 599ms: 14 facts, nine plan steps, zero blockers. Request, response and hashes are retained. It used the supplied treasury as an explicit remainder recipient and connected no wallet.
- The real RPC settle check passed in 26,625ms. Browser source names remain https://rpc.mevblocker.io and https://rpc.mainnet.chain.robinhood.com. The contributor-supplied verification transport was used without adding its address to the export or report. Robinhood returned HTTP 500 for ranges above 100,000 blocks, so the existing runtime split larger windows; final observations include 140 HTTP 500 replies and one transport timeout. The first test attempt aborted on an unhandled verification-route timeout. The helper now returns a retryable 502 instead of crashing the test; the same production read code settled within 30 seconds on the next fresh browser.
- The build has Vite's existing large-chunk warning. Runtime assets are complete and no dependencies/build settings were changed to suppress it.
- The standard browser suite skips five optional Anvil checks and two separately opted-in live checks. The two live checks were run independently; Anvil signing is outside this execution. Transaction replacements/reorgs use explicit local doubles, not claims of a real mainnet reorg or payment.
- Request safety recognizes supported catalog patterns and documented prose conflicts. It is not a semantic proof of arbitrary custom code, imported sources or natural language, and does not certify external contracts at user-entered addresses. An unknown dependency without an address is refused; lending blocks with no verified deployment are unavailable.
- The submitted draft archive is browser-local. An older request without that archive is reconstructed from its on-chain text; unknown rules remain visible/editable, and an oversized custom rule must be revised rather than silently truncated.
