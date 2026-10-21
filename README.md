# The Hooks Store

Phase 1, jobs 1 and 2: a static React storefront and Builder for Uniswap v4 hooks. The delivered application is in `dist/`; `mockup/index.html` remains the unchanged design reference, with its original sample data. The application never redirects to the mockup.

Store includes the live ASCII pond, describe form, open-slot #ad strip, keyword search and filter rail. The catalog lists only hooks launched through this site (SPEC 3.1); job 3 reads them from chain, so for now it shows the empty pond panel ("Nothing on the pond yet", Describe a hook) with **0 hooks**, and any search or filter shows the no-match state. Learn contains the seven answers, eight source links and fourteen permissions from the mockup, with the ad duration at 24 hours. **Builder** (job 2) implements SPEC 3.2, 4 and 5. Launch, Hook and My hooks still show the later-job placeholder.

## Install, develop and rebuild

Use Node.js 24 or newer and npm. Frontend manifests and tooling live in `web/` to preserve existing repository build configuration.

```sh
npm --prefix web ci
npm --prefix web run dev -- --host 127.0.0.1
```

Build and typecheck:

```sh
npm --prefix web run typecheck
npm --prefix web run build
```

Vite's root is this repository, its base is `./`, and the output is root `dist/`. The build includes the site configuration, the empty bundled tested-marks file, local fonts, wallet marks, favicon and share image. It does not contact the launch API. `web/package.json` still lists a `snapshot` script from job 1; its script was removed with the snapshot (package manifests are outside this job's write scope), so do not run it. There are no required environment variables, private keys, relay credentials or project IDs.

Preview the finished export at a gateway-like subpath:

```sh
node scripts/serve.mjs --port 4173
# Open http://127.0.0.1:4173/preview/#store
```

Alternatively use `npm --prefix web run preview`. Serve the contents of `dist/` without route rewrites. Application assets use relative URLs. The absolute Open Graph image URL uses the site name supplied in `SPEC.md`: `https://the-hooks-store.sites.imd.fun/og.png`. This job did not publish the site or verify that domain's deployment.

Do not include `node_modules`, package caches or temporary browser reports in a submission. No ignore file was changed. Keep the source, `web/package.json`, `web/package-lock.json`, runtime assets and complete `dist/` together.

## Builder

Open `#builder`. The canvas reads as three numbered questions:

1. **What are you launching?** Type cards A (hook + new token + pool), B (hook only), C (hook for my existing token). The type decides which blocks are allowed and which settings show.
2. **How do you want to build it?** DESCRIBE IT | STACK BLOCKS. A first visit shows the two-card chooser. Describe mode has the 3,000-character text area, four example chips, the blocks added from the palette as removable chips and the rule "if your words and a rule disagree, the rule wins". Blocks mode shows the token card (type A, BRING MY OWN / USE STANDARD TOKEN) and one card per block with its number, short label, fields, up/down/remove, the Who uses it line and what it adds to the hook page. The palette works in both modes; switching never drops words or blocks. The first visit to the stack, with no blocks yet, starts from the reviewed default stack (Swap fee, Anti-sniper window, Buyback jar).
3. **Settings.** Deploy chain (enabled chains from `site-config.json`, others “phase 2”), pair, pool share (type A, empty until the user chooses 10–90 in steps of 5), remainder address, existing token and symbol (C), hook name (B and C), owner, and ADVANCED: START FROM MY OWN CODE.

The preview lists Type, Token or Hook, Chain, Words, Rules, Owner and Pool, the exact text inside a disclosure, and the cost box (0.5 IMD, 2 transactions, length out of 7,500, body size out of 16 KiB). CHECK WITH THE SWARM (FREE) is disabled and says it needs the relay. CONTINUE TO LAUNCH stays disabled while any 4.10 rule or field check fails; every failure is shown inline next to its field and listed under the button.

- `src/blocks/catalog.json`: all 35 entries of SPEC 4 (2 token blocks, 33 behavior blocks including Custom rule) with `id, group, title, blurb, types, params` (defaults, limits, steps, units), `short`, `sentence` (ending with the exact 4.11 functions), `ownerPower, requires, excludes, replaces, owner, anyone, user, view, risk, who`. Templates use `{k}`, `{k:1}` (one decimal), `{k:n}` (digit groups), `{k:rest}` (100 minus k), `{@symbol}`. The Prize pot is in the Games and lotteries group.
- `src/lib/compose.ts`: the 5.1 text for A, B and C, the 5.2 body (`univ4_hook` for A with `economics` only once the pool share is chosen and `customToken` only with Bring your own token; `evm_contracts` for B and C; `repoUrl` and `baseCommit` when both own-code fields are filled), the 4.10 rules and draft normalisation. It is pure TypeScript, used by the Builder and by `node --test`.
- Risk blocks (Anti-sniper window, Max buy per wallet, Max swap size, Cooldown, Circuit breaker, Prize pot) show a small yellow `!` next to their name in the palette, on the card and in the summary; hover or focus shows “Heads up: this block is easy to work around or needs care.” and the block's risk sentence.
- Tested marks (SPEC 4.14): at load the Builder fetches `blocksVerifiedUrl` from `site-config.json` (the spec repository's `evidence/blocks-verified.json` on raw.githubusercontent.com) and falls back to the bundled `public/blocks-verified.json`, which ships as `[]`. A block with a `passed: true` entry shows “✓ tested on Sepolia” on its card; every other block says “Not yet tested on Sepolia.” in its tooltip.
- Drafts (type, mode, words, blocks, settings) persist under `localStorage` **`hooks-store:draft:v2`** and reopen after a reload. Text from the landing box arrives in the describe editor.

## Configuration and interactions

`public/site-config.json` is the single application configuration. Set `inProgress` to control the exact banner: “This site is being built; launches open when the banner goes away”. Rebuild after changing source configuration. The exported JSON is also read on load; committed defaults remain available if loading fails.

The file contains enabled deploy chains, payment chains, public RPCs, `relayUrl`, `featuredRequestId`, trade URL templates and pool-opening defaults. Unassigned later-job settings are explicitly null or empty. No made-up contract address is supplied. This phase has no payment or deployment action; removing the banner does not implement one.

Submitting the landing form preserves the entered text as `prompt`, sets `mode: "prompt"`, merges existing draft fields and stores JSON under **`hooks-store:draft:v2`** before navigating to `#builder`. The block-builder link sets `mode: "blocks"`. Empty input and failed browser storage have visible, recoverable errors.

Keyword search matches every word, case-insensitively, across name, symbol, chain, summary, block labels and the full request. Enter opens `#catalog`. All filters apply immediately; the empty-state reset also clears status and sort. Address resolution is intentionally deferred to job 3.

The live metrics read `/swarm`: `health.agentsOnline`, `counts.launchesLive`, and `health.jobsDoneLastDay`, labeled Agents online, Launches live and Jobs done · 24h. The endpoint does not provide hook-only or launches-today counts. Missing, invalid or failed responses hide the entire metrics group; there is no numeric fallback.

One Connect control supports EIP-6963 browser wallets, the injected fallback, mobile wallet-browser links and Coinbase Wallet/Smart Wallet. Phone links offer MetaMask, Rabby, Phantom and Coinbase. Connections request accounts only. There is no WalletConnect relay, signature, approval or fund transfer in this phase.

## Pond integration

`src/scene/pepe.json` is copied character for character, including meta, from the mockup. `src/scene/pond.ts` ports `pondScene`, preserving fish geometry, drawing order, cell grid, tile shades, boat, rod, line, water fields and flocking. It adds typed lifecycle cleanup, motion controls and read-only test diagnostics.

Later jobs can call the exported integration function (adjust the import relative to the caller):

```ts
import { cast } from './src/scene/cast';
cast('A new hook was requested on Sepolia');
```

When Store is mounted this updates the ticker and starts or queues a cast. The queue holds at most three pending casts. With reduced motion it updates the ticker without animation. The eight animated states plus idle are windup, fly, splash, sink, wait, bite, reel, cheer, idle. Durations are 0.35 / 0.55 / 0.45 / 0.6 / 1.3 / 0.5 / 0.6 / 0.9 seconds; the 33 ms timer rounds transitions to a frame. Practice casts run after three active seconds and then every eighteen, explicitly labeled as practice. Real log triggers belong to job 3.

The pond pauses offscreen and in hidden tabs, responds to ResizeObserver, caps device-pixel ratio at two, supports a pause control and starts still under reduced motion. Its reduced-motion opt-in works with pointer and keyboard for that visit.

To regenerate the share image from the built pond, install Chromium as below, run `node scripts/generate-og.mjs`, then rebuild. The existing image is already included.

## Tests and recorded results

```sh
npm --prefix web test
npm --prefix web exec -- playwright install chromium
npm --prefix web run test:e2e
```

For an external browser directory, set `PLAYWRIGHT_BROWSERS_PATH` consistently for installation and tests. The suite runs against the production export under `/preview/`, not the development server. Build first. Tests create temporary reports in `artifacts/` and `test/scratch/`; delivered compact results are in `tests/results/`.

Actual worker validation (job 2, 2026-10-21): `npm --prefix web run typecheck` and `npm --prefix web run build` passed; **16 unit tests** (`tests/compose.test.mjs`, `tests/scene-data.test.mjs`) and **34 Playwright tests** passed in Chromium headless shell. The Builder suite runs the type/mode/switch/add/reorder/remove/reload flow at 320, 390 and 1440 px, plus the pool share, the 4.10 rules, risk signs and tooltips, tested marks with a passing entry, the fallback to the bundled copy and the shipped empty copy. Unit tests cover every catalog block under every allowed type with its 4.11 function names, the three fixtures `tests/fixtures/compose-{A,B,C}.txt` byte for byte, bodies under 16 KiB, the 5% rule, the swap-fee dependencies and the buy/sell exclusion. Job 1's header tests still pass at 821, 1024 and 1440 px with a twelve-character address. Outputs are in `tests/results/`.

The pinned design probe passed 11 of 16 checks; the five flags (capitals, kicker labels, type sizes, the marquee, border plus shadow) come from the mockup and the brief and are documented in [VALIDATION.md](VALIDATION.md). See [DESIGN.md](DESIGN.md) and [tests/results/](tests/results/) for evidence, fixes and limitations.

Job 2 revision: all three reviewer findings were reproduced and fixed. Risk tooltips stay within their rows on phones; untested block names expose their status to assistive technology; dependency-removal notes clear on the next draft edit. The production build, typecheck, 16 unit tests and 38 Chromium interaction tests passed. Regression coverage exercises all six risk blocks in the palette, cards and summary at 320, 390 and 1440px with hover and keyboard focus. Current reports and screenshots use the `tests/results/revision-` prefix; reviewer answers are in [.imd-responses.json](.imd-responses.json). WebKit and screen-reader output remain unverified; see [VALIDATION.md](VALIDATION.md).

Real wallet installations, signing, on-chain transactions, Safari/Firefox and a screen-reader session were not tested. Lighthouse was not run; no score is claimed. Connection behavior uses an EIP-6963 fixture with a real public address, without a private key. No production contract action was sent.

## Source map and attribution

- `web/src/`: React pages (`Builder.tsx` for job 2), wallet adapter, draft storage and the single `styles.css`.
- `src/scene/`: canvas implementation, sprite data and cast integration.
- `src/blocks/catalog.json`, `src/lib/compose.ts`: block catalog, composer, body encoder and rules.
- `scripts/`: static preview server and share-image renderer.
- `public/`: complete local runtime assets and configuration.
- `tests/` and `web/tests/`: fixture/unit tests and browser interactions.
- `SPEC.md`, `mockup/`, `jobs/`, `evidence/`: original project inputs, preserved.

Design guidance uses pinned Better Interface material by Jakub Krehel (MIT), with documentation guidance adapted from Paul Bakaus's Impeccable (Apache-2.0). Official wallet marks and fonts retain their notices. See [THIRD_PARTY.md](THIRD_PARTY.md).
