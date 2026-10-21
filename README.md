# The Hooks Store

Phase 1, job 1: a static React storefront for Uniswap v4 hooks. The delivered application is in `dist/`; `mockup/index.html` remains the unchanged design reference, with its original sample data. The application never redirects to the mockup.

Store includes the live ASCII pond, describe form, open-slot #ad strip, real launch snapshot, keyword search and filter rail. Learn contains the seven answers, eight source links and fourteen permissions from the mockup, with the ad duration corrected to 24 hours. Builder, Launch, Hook and My hooks show the requested later-job placeholder.

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

Vite's root is this repository, its base is `./`, and the output is root `dist/`. The build includes the committed launch snapshot, site configuration, local fonts, wallet marks, favicon and share image. It does not contact the launch API. There are no required environment variables, private keys, relay credentials or project IDs.

Preview the finished export at a gateway-like subpath:

```sh
node scripts/serve.mjs --port 4173
# Open http://127.0.0.1:4173/preview/#store
```

Alternatively use `npm --prefix web run preview`. Serve the contents of `dist/` without route rewrites. Application assets use relative URLs. The absolute Open Graph image URL uses the site name supplied in `SPEC.md`: `https://the-hooks-store.sites.imd.fun/og.png`. This job did not publish the site or verify that domain's deployment.

Do not include `node_modules`, package caches or temporary browser reports in a submission. No ignore file was changed. Keep the source, `web/package.json`, `web/package-lock.json`, runtime assets and complete `dist/` together.

## Regenerate the catalog

Run from the repository root:

```sh
node scripts/snapshot-launches.mjs
npm --prefix web run build
```

The script fetches `https://api.imd.fun/launches?limit=500`, then `/launches/:id` for `univ4_hook` and `evm_contracts` candidates. It includes native hook launches and contract launches whose actual job objective mentions “Uniswap v4 hook.” The latter may include related contracts, as the assignment's inclusion rule requires. Two requests run concurrently, with bounded retries for rate limits and temporary server failures. Any failed detail fetch leaves the previous complete file intact; replacement is atomic.

Commit both `public/launches.json` and rebuilt `dist/launches.json`. The delivered snapshot was generated at **2026-10-21 07:56:14 UTC** from 500 index entries and contains **72 launches**: 64 native hook launches and 8 matching contract launches. Those are snapshot facts, not hardcoded UI counters.

Normalized records retain original requests, source statuses, available identifiers and addresses. Unknown numbers, symbols and addresses remain `null`. Unknown names display “Unnamed hook.” Recognized numbered sentence templates produce block labels; unrecognized prose produces “Custom.” The Own source filter groups custom/imported requests. Parked, rejected and failed records display Failed, with the original status retained. Cards do not assert a new independent audit. The build does not verify deployed bytecode or refresh chain logs; those are later-job features.

Optional `--output path` writes elsewhere. `--fixture path` accepts a saved JSON map from complete API URLs to response objects for offline pipeline testing. Unit tests also exercise the pipeline with saved public response fixtures under `tests/fixtures/`.

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

Actual worker validation: production build and strict TypeScript check passed; **11 unit tests and 24 Playwright tests passed**. Store and Learn were checked at 320, 390 and 1440 px; the desktop bar additionally passed at 821 and 1024 px with a twelve-character address. Tests cover search, filters, reset, draft storage, errors/retry, placeholders, banner configuration, offline fonts/assets, wallet states, cast frames/timings, reduced motion, pointer flight, splash and observer pause/resize.

The pinned design probe passed 12 of 16 checks. Four heuristic flags are documented exceptions to preserve the specified mockup: capitals, metric labels, marquee, and combined hard borders/shadows. All eight supplied audit findings reproduced against the original and have regression coverage in the application. See [VALIDATION.md](VALIDATION.md), [DESIGN.md](DESIGN.md), and [tests/results/](tests/results/) for evidence, fixes and limitations.

Real wallet installations, signing, on-chain transactions, Safari/Firefox and a screen-reader session were not tested. Lighthouse was not run; no score is claimed. Connection behavior uses an EIP-6963 fixture with a real public address, without a private key. No production contract action was sent.

## Source map and attribution

- `web/src/`: React pages, wallet adapter, draft interface and the single `styles.css`.
- `src/scene/`: canvas implementation, sprite data and cast integration.
- `scripts/`: snapshot generator, static preview server and share-image renderer.
- `public/`: complete local runtime assets and configuration.
- `tests/` and `web/tests/`: fixture/unit tests and browser interactions.
- `SPEC.md`, `mockup/`, `jobs/`, `evidence/`: original project inputs, preserved.

Design guidance uses pinned Better Interface material by Jakub Krehel (MIT), with documentation guidance adapted from Paul Bakaus's Impeccable (Apache-2.0). Official wallet marks and fonts retain their notices. See [THIRD_PARTY.md](THIRD_PARTY.md).
