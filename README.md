# The Hooks Store

Phase 1, jobs 1–3: a static React storefront and Builder for Uniswap v4 hooks, now with Intake chain reads, address search, Hook management and My hooks. The finished application is in `dist/`. Hash routes work on static hosting and at an IPFS gateway subpath.

The catalog includes **only requests composed through this store**. There is no bundled launch snapshot or sample catalog. With no matching requests it keeps the empty pond panel. Ethereum and Robinhood Chain are the only supported chains; a new Builder draft has no selected chain or pool share. The pixel hook is an inline SVG and all application fonts are self-hosted.

`SPEC.md` and `mockup/index.html` were refreshed from the requested upstream URLs on 2026-10-21. Upstream returned version **1.13**, including the owner's two-mainnet decision. These reference files retain upstream historical notes and mockup data; the application does not execute or redirect to the mockup.

## Install, preview and rebuild

Use Node.js 24 or newer and npm. Existing dependency manifests and build configuration in `web/` are unchanged.

```sh
npm --prefix web ci
npm --prefix web run dev -- --host 127.0.0.1
npm --prefix web run typecheck
npm --prefix web run build
node scripts/serve.mjs --port 4173
# Open http://127.0.0.1:4173/preview/#store
```

`npm --prefix web run preview` also previews the export. Vite uses root `index.html`, `base: './'` and root `dist/`. Serve that directory without route rewrites. Fonts, wallet marks, favicon, share image, configuration and all JS/CSS chunks are local. The Open Graph image uses the supplied canonical site name, `https://the-hooks-store.sites.imd.fun/og.png`; this task did not publish or verify that deployment.

Keep source, the existing `web/package.json` and `web/package-lock.json`, runtime assets and complete `dist/` together. Do not submit dependency installations, caches or temporary browser reports. No ignore file was changed. The old locked `snapshot` script is obsolete: its job-1 snapshot generator was already removed; do not run it.

## Pages and interactions

- **Store / Catalog:** describe a hook, browse, filter and search as you type. Keywords require every word to match. A 40-hex value matches known hook, token, distributor or pool currency addresses; a 64-hex value matches request IDs or transaction hashes. Both accept the `0x` prefix or bare hex. An unmatched address is read on both chains. Hook results show PoolManager and permissions; token results offer **Build a hook for this token**, prefilled as type C. Failed lookups have a retry action and never claim that an unavailable chain contains no contract.
- **Builder:** the delivered job-2 blocks, rules, custom prose, risk tooltips, draft persistence and exact request composition remain. Deploy chain starts at **Choose a chain** and offers Robinhood Chain / Ethereum. Continue requires that choice, the applicable pool share and all other valid fields. The top bar follows the draft chain. Proven marks say “proven in a live launch”; unproven blocks expose “not yet proven in a live launch” to assistive technology. The bundled verification evidence remains empty.
- **Hook:** `#hook/<intakeChainId>/<requestId>`. The route identifies the payment-chain request; its contracts may deploy on the other supported chain. The page shows status, available evidence, copyable addresses, matched rules and the original request. **Build one like this** copies rules/words into a fresh draft; allocation and owner must be chosen anew. Manage links scroll to the panels.
- **Owner controls:** functions come only from completely matched catalog sentence templates. `owner()` must equal the connected wallet. Query parameters never authorize transactions. Argument forms validate addresses, address arrays, booleans and integer ranges. Writes simulate first, request the wallet transaction, wait for its receipt and then refresh readings; cancellation, reverts and connection failures stay visible. Public functions require a connected wallet; the relevant chain switch appears when needed. Views and ownership refresh every 20 seconds.
- **My hooks:** `#mine` filters by the connected payer. For read-only inspection before the launch-payment job, use `#mine?address=<wallet-address>` or `?address=<wallet-address>#mine`. Live rows have Manage links. Saved drafts support Resume, Discard and Undo. Pending requests use the storage format below. Promotions remain the later placements job, with the specified terms shown.
- **Launch / Learn:** Launch has the mockup's payment notice and draft review; payment submission is job 4. Learn has the requested **Which chains?** answer and the existing source links and permissions table.

The shared Connect control retains EIP-6963 wallet discovery, injected fallback, wallet-browser phone links and Coinbase Wallet / Smart Wallet. It offers **Switch to Ethereum** only on an unsupported wallet chain. Hook actions separately switch to the hook's deployment chain. There is no WalletConnect relay or project ID.

## Chain data and configuration

`public/site-config.json` is the single application configuration. Rebuild after changing it; the exported file is also read on load. Committed defaults are used if loading fails. Defaults:

| Chain | ID | Public RPC |
| --- | --- | --- |
| Robinhood Chain | 4663 | `https://rpc.mainnet.chain.robinhood.com` |
| Ethereum | 1 | `https://ethereum-rpc.publicnode.com` |

Intake is `0xa43e6f75ee006411f79ac1c84120606c2330de82` on both chains. `src/abi/intake.json` is copied from the assignment's foundation commit `46e17ea70534e8a7ac2c4ff78501a3c183d32da8`. The indexed action is the bytes32 encoding of `launch.open@launch-1`.

`web/src/chain/store.ts` starts with the latest 10,000 blocks, then walks backwards in inclusive, non-overlapping windows of at most 10,000 blocks. It persists its cursor and matching raw logs; smaller provider limits split a rejected range without skipping it. Four historical windows are processed at a time, with cooperative pauses. A separate 20-second head poll takes priority, overlapping the previous 12 blocks and deduplicating request IDs. Successful subranges survive later errors. History starts at zero unless a verified Intake deployment block is configured; no deployment block was guessed.

Only `univ4_hook` / `evm_contracts` JSON bodies ending in `Composed with The Hooks Store block builder.` or `Composed with The Hooks Store.` survive. Other requests are discarded before fetching their completions, displaying cards or triggering the pond. Matched numbered rules produce parameterized labels and 4.11 minimal ABIs; unfamiliar rules stay Custom. The same risk warning component appears next to Hook-page block labels.

Completed status 1 or 2 means Failed; its bytes32 reason is decoded as ASCII. Status 0 with a supported IPFS URI fetches `https://ipfs.imd.fun/ipfs/<cid>/result.json`. Live requires a reported hook address on the requested chain. The parser accepts named `launch` fields, address maps and contract artifacts; unknown addresses, pool IDs, launch numbers, audit links and intermediate stages remain unknown. UUID launch IDs are preserved for evidence links even when a numeric launch number is absent. There is no fabricated success and no browser dependency on the CORS-restricted launch API.

Each payer gets an Ethereum-mainnet ENS reverse lookup, cached for one day. ENS names are display-only. They appear on Hook pages and in the featured component when placements are supplied. The strip currently has one stationary open-slot card; its seamless 42-second marquee runs only with placements.

New store requests call `src/scene/cast.ts` with the parsed hook name and chain, or the generic new-request message. Initial history, cached history, duplicate logs and unrelated launches do not cast. Job-2 practice/manual casts and reduced-motion controls remain. `/swarm` supplies the three labeled network metrics; failure hides them without a numeric fallback.

| Browser key | Content |
| --- | --- |
| `hooks-store:draft:v2` | Existing Builder type, mode, words, blocks, settings |
| `hooks-store:intake:v1:<chainId>` | Version, observed head, backward cursor, matching raw requests/completions and results |
| `hooks-store:ens:v1:<lowercase payer>` | Name or negative lookup, expiry timestamp |
| `hooks-store:pending` | Array of `{requestId, chainId, payer, txHash?, createdAt?}`; chainId is the payment chain. The `:v1` key is also accepted. |

Deleting an Intake key restarts that chain's history scan. Storage failures fall back to the current in-memory store. RPC errors keep cached data and offer Retry. Missing IPFS results retry on refresh or immediately on **Retry result**.

## Tests and fork checks

```sh
npm --prefix web test
PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers web/node_modules/.bin/playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers npm --prefix web run test:e2e
```

Build first. Browser tests use the production export under `/preview/`; RPC/IPFS responses are intercepted except in explicitly enabled fork checks. Fork tests skip by default, so the normal tests do not depend on public RPC availability. Reports are generated under `artifacts/` and `test/scratch/`; delivered reports are copied to `tests/results/job3/` because temporary artifacts are excluded by the existing repository rules.

For the optional fork checks, install Anvil and Solidity 0.8.26, then run a local mainnet fork in one terminal:

```sh
anvil --fork-url https://ethereum-rpc.publicnode.com --chain-id 1 --port 8545 --no-storage-caching --silent
```

In a second terminal, from the repository root:

```sh
mkdir -p test/scratch/fork/compiled
solc --bin --abi --overwrite -o test/scratch/fork/compiled tests/fork/ControlHook.sol
node web/scripts/fork-setup.mjs
node web/scripts/check-fork.mjs
HOOKS_FORK_URL=http://127.0.0.1:8545 PLAYWRIGHT_BROWSERS_PATH=/tmp/hooks-browsers npm --prefix web run test:e2e -- tests/hook.spec.ts
```

The setup impersonates a public fixture payer **inside local Anvil**, deploys the explicit mock and writes its generated address to scratch. It uses no private key. `check-fork.mjs` resolves the real Hamster Hour hook and token. Playwright connects the local mock wallet, calls pause/unpause, waits for successful receipts and verifies `paused()`, then exercises token resolution and type-C prefill. No public-chain transaction is sent.

Raw fixture provenance and the live-result limitation are in `tests/fixtures/chain/README.md`. `web/scripts/capture-fixtures.mjs` is an optional network capture utility, not part of the default tests or production catalog.

The production build and typecheck passed, with **29 unit tests and 50 Chromium interaction tests passing** (including both optional fork checks). Actual commands, screenshots, Better Interface coverage and remaining limitations are recorded in [VALIDATION.md](VALIDATION.md). Final implementation tokens, typography, components and responsive behavior are in [DESIGN.md](DESIGN.md).

## Known limits

The supplied public Ethereum RPC rejected older history with “Archive requests require a personal token”; historical-state fork requests also sometimes failed. The UI retains partial data and retries, but a complete genesis-to-head scan was not established on this machine. No secret or alternate backend was added.

The captured successful IPFS result reports a completed contract build but **null launch details and no deployed addresses**. Other inspected launch results had the same gap. Consequently, a captured real **Live result.json with addresses** was unavailable. Real-log decoding, a real failed completion and the real result file are tested; Live mapping uses a clearly identified synthetic schema fixture, while management transactions and known-address resolution are tested on a real mainnet fork. This limitation is not presented as a passed real-Live-fixture check. The site cannot infer missing deployment details from that immutable result.

Intermediate Building / Audit panel / Deploying events need the later relay. Payment submission, own-code import/check, pool opening and paid placements remain their assigned later jobs. Trade URL templates are empty and no trade destination is invented. Physical wallet apps, Safari/WebKit and assistive-technology sessions were not certified; Chromium interactions and local-fork transactions were exercised.

## Source map and attribution

`web/src/chain/` contains chain clients, decoding, caches, resolution and minimal ABIs. `web/src/` contains the pages, existing wallet adapter and stylesheet. `src/blocks/catalog.json` and `src/lib/compose.ts` contain the catalog and composer; `src/scene/` retains the pond. `public/` and `dist/` contain the complete runtime assets. Tests are in `tests/` and `web/tests/`.

Design guidance uses pinned Better Interface material by Jakub Krehel (MIT), with documentation guidance adapted from Paul Bakaus's Impeccable (Apache-2.0). Official wallet marks and fonts retain their notices. See [THIRD_PARTY.md](THIRD_PARTY.md).
