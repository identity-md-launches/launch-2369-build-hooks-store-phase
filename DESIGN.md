# The Hooks Store design system

## Overview

A pixel storefront for browsing, composing and managing Uniswap v4 hooks. Preserve the supplied pond scene, paper palette, hard borders, terminal numbers and compact Steam-style navigation. The primary actions are describing a hook on Store, completing its Builder request, and managing owned hooks and advertisements in My hooks.

Canonical tokens and components are in `web/src/styles.css`. React composition is in `web/src/`. The canvas and character grids live in `src/scene/`. This document describes the final source, including job 13's balance-first Promotions panel and proven-launch wording. This revision preserves the existing tokens, typography and layout.

## Colors

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#e9dfc3` | Page background |
| `--paper-2` | `#dfd3b0` | Shelf, inset surfaces and confirmations |
| `--paper-3` | `#f3ecd8` | Panels, inputs, light button surfaces |
| `--ink` | `#15130f` | Text, structural borders and hard shadows |
| `--ink-2` | `#5b5342` | Secondary text |
| `--ink-3` | `#8a816a` | Separators and muted borders |
| `--pine`, `--pine-2` | `#1e5a3a`, `#2c7a50` | Primary actions, selected state, hover |
| `--on-pine` | `#f3ecd8` | Text on pine |
| `--ad` | `#c9a227` | #AD labels and promotion confirmation stripe |
| `--bad`, `--warn` | `#a3382b`, `#a1731c` | Errors and caution |

Builder category swatches are pine for token/treasury, gold `#c9a227` for fees, red `#a3382b` for protection, blue `#3b6ea5` for liquidity, purple `#7a4e9e` for timing, orange `#c2612e` for games and the existing ink tones for advanced/custom. Labels accompany every swatch and status; color alone carries no state. There is one light theme. The final entry-page probe measured solid-background contrast and passed; detailed coverage and canvas limitations are recorded in `tests/results/job12/validation.md`.

## Typography

Three local WOFF2 families in `public/fonts/` (all `font-display: swap`; license notices in `LICENSES/` and `public/fonts/LICENSES.txt`):

- `--display`: Press Start 2P, Courier New, monospace, weight 400, for navigation, headings and action labels.
- `--body`: Atkinson Hyperlegible, Verdana, sans-serif; real Latin faces at 400 and 700, normally weight 400.
- `--mono`: JetBrains Mono, ui-monospace, Menlo, monospace; Latin variable WOFF2 declared at weights 400–500, for amounts, addresses, signatures, exact requests and hook-panel readings.

The global scale is 8, 10, 13, 16, 18 and 26px (`--text-xs` through `--text-title`). The established wordmark is 12px and the landing eyebrow 9px. Builder v2 uses its mockup's scoped 9px labels, 15px small text, 17px body and 19px mono, with 13px step headings and 22px title/cost numerals. These sizes stay fixed across viewports. Body line-height is 1.5; wrapping labels and buttons use 1.6. No extra tracking is added.

Use `.num`/JetBrains Mono and tabular numerals for changing totals and hours. Long addresses and request text wrap anywhere. Reading paragraphs cap at 65ch; a few existing notices use 75ch. Preserve the explicit pixel capitals; do not introduce another font or viewport-scaled type system.

## Layout

`.wrap` has a 1,180px maximum width with 16px gutters and safe-area support. Typical spacing is 4–8px within controls, 10–14px within dense rows, 16px common insets and 18–24px between groups.

Above 820px the header stays on one row. Search shrinks to 120px; Connect keeps a 168px width. At 820px and below it becomes brand/connect, navigation, then search. A ResizeObserver updates `--header-height`; hash destinations and promotion sections clear the sticky bar. Store's pond is full bleed and at least 660px tall. At 390×844 the product explanation and Describe it action fit on the first screen.

Builder caps at 1,800px and uses `max(clamp(16px, 3vw, 48px), env(safe-area-inset-…))` gutters on each side. At 1,100px and wider its grid is `minmax(0,1fr) clamp(420px,28vw,520px)` with a 36px gap. At 2560px the 1800px wrapper centres and the column is 520px. Rule rows, shelf and fields fill their available column; paragraph measure and type sizes stay fixed. Steps are left; `.hookcol` sticks below the header on the right. `.hookcard` is a flex column with fixed header/action regions and an internal `.hc-scroll` for tiles, money and readiness. Its room comes from the card's **viewport position**, fixed content height and current viewport, recomputed on scroll through requestAnimationFrame, resize and re-render. While stuck it preserves at least its load height, within available viewport space. Desktop Builder removes trailing space outside the sticky grid, so reaching the page end on a tall viewport does not push the card header behind the top bar; the column retains its 6px shadow padding.

Below 1,100px the card comes first. Below 720px the details show at least 40vh, or all content when shorter; the card can run beyond the first screen. The shelf is a sideways scroll-snap row of 210px cards. Type/starting-point/settings controls stack; rule tools wrap below the text. Grid children have min-width:0. Rendered page overflow checks cover 320, 390, 768, 1100, 1366, 1440, 1920 and 2560px. The seven-finding scroll extent is checked at both 1920×1080 and 1366×768, before and after scrolling to the end.

The nested scroll containers `.hc-scroll`, `.findings .list`, `.understood` and `.marquee` are positioned relatively. This contains their absolutely positioned screen-reader labels without adding empty scroll space to `.hookcol`; their overflow rules and panel dimensions are retained.

Catalog uses a 224px filter rail and flexible card grid; mobile filters sit above it. Featured cards form a compact one-line marquee; a stationary open slot is the empty state. Promotions read vertically: terms, payment chain, wallet/deposit/proceeds balances, deposit form, then one row per live hook. `.deposit-row` and `.row-actions` wrap at narrow widths; the input flexes from a 160px basis. Confirmation and deposit insets are 16px, becoming 12px below 720px. Every promotion action has a minimum 44px height. Final browser checks covered the promotion cycle at 320, 390 and 1440px.

## Elevation & Depth

The established surfaces use 3px ink borders and `--shadow: 4px 4px 0 var(--ink)`. Buttons shift by 2px when pressed. The header is sticky at z-index 20, with the skip link above it. Native dialog backdrops dim surrounding content. Preserve this hard shadow treatment rather than introducing soft elevation.

## Shapes

Rectangular panels, fields, pills and buttons. The open slot has a dashed border. Native checkboxes retain their platform geometry and pine accent. No new rounded-card system, theme or decorative imagery is added.

## Components

| Component/pattern | Behavior and reuse |
| --- | --- |
| `App`, `.top-in`, `.nav` | Hash routes, current-page state, labeled search, skip-to-main, one wallet control. |
| `Landing`, `.prompt` | Describe field saves a local draft and opens Builder. Metrics come from live reads; reduced motion pauses the pond. |
| `Catalog`, `Featured` | Immediate native filters, clearable empty state, chain-backed hook cards. Indexed cards add a textual PROVEN pill and a Build one like this action. Ads show purchased metadata, #AD, symbol, creator and hours left. Ranking sums live totals per hook across both payment chains and ties use the earliest purchase; open slot is last. |
| `Builder`, `.step`, `.shelf`, `.rule` | Four steps, category tabs, one rule per row with Edit/reorder/remove, explicit own-code selection, token choice and readiness links. The old chooser and palette disclosures are absent. |
| `.hookcard`, `.findings`, `dialog.sheet` | Tile summary, audited-source adaptation line, fees, wait and readiness; concise findings with Jump to it; exact request in a native modal with highlighted words, Copy, Close and Escape. An identical proven stack says Built from before a chain is chosen; choosing the other chain names its redeployment, without an empty change list. |
| `Connect` | Native wallet sheet, EIP-6963 named wallets, mobile wallet-browser links and Coinbase Smart Wallet. Escape returns focus to Connect. |
| `Hook`, `RelayTimeline`, `AddressValue` | Status and evidence, full copyable addresses, deduplicated Build page links, pool opening and exact request. Notifications are restricted to own launches. |
| `Management`, `.function-row` | Catalog labels matched by name to the source ABI. Owner reads gate writes. Pool-scoped rows wait for a selected/typed pool id and do no read without one. Every Send simulates first; failures use plain action reasons. |
| `AdsProvider`, `Promotions` | Reads every 60 seconds and after transactions. Payment-chain selector, separately labelled wallet/deposit/proceeds balances, typed DEPOSIT form, live hook rows with PROMOTE, combined hook rank, typed BOOST with confirmation, cancellation terms and separate deposit/proceeds withdrawals. The persistent note explains that DEPOSIT moves wallet IMD into the contract and PROMOTE/BOOST spend it. Busy, rejected, unavailable, empty and setup-pending states have adjacent guidance. |
| `OpenPool` | Type C initialization parameters and copyable calldata; sending from this site remains phase 2b. |
| `.btn`, `.pill`, `.notice`, `.field-error` | Existing primary/secondary/disabled states, textual statuses, inline recovery and live-region feedback. |

The 42-second featured loop pauses for hover and keyboard focus. Reduced motion produces a scrollable row and hides its duplicate. Missing ads addresses hide both ads surfaces. Expired/cancelled placements are removed even if an RPC page still lists them.

`.featured-band`, `.featured-track`, `.featured-group`, `.placement-card`, `.placement-slot` and `.promotion-row` avoid generic blocker selectors; #AD stays visible text. Do not reintroduce ad/ads/adcard/adslot/ad-card/sponsored/promo class or id names. The pinned EasyList check scans the built export, and the browser suite injects its generic hiding stylesheet. Changing the wallet or payment chain clears entered amounts, confirmations and transaction feedback, then reads the new balances.

## Do's and Don'ts

Start another route with `.wrap.page`, reuse the existing boxes/fields/buttons and keep consequential wallet actions next to their terms. Keep normal actions as buttons and navigation as links. Give every input a persistent label. Use `AddressValue` for full copyable addresses and local transaction evidence.

Use the existing 3px focus ring: pine on paper, on-pine in the header; preserve forced-color behavior. Keep actions outside internal scrolling details. Show unavailable values and retry paths, and preserve entered form values after a rejected wallet step. Do not communicate status using color alone, hide a chain mismatch, replace IMD with an invented USD price, or render a placement from a newer metadata revision than the one purchased.
