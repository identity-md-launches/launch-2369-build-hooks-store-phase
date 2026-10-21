# The Hooks Store design system

## Overview

A dense retro-pixel storefront for people browsing or describing Uniswap v4 hooks. The composition follows the supplied Steam-like mockup: sticky search/navigation, an edge-to-edge pond behind centered copy, a compact featured strip, a filter rail and catalog cards. Learn uses the same paper panels and hierarchy. The beige theme is identical under a dark operating-system preference. There is no footer.

Canonical rules live in `web/src/styles.css`; page composition lives in `App.tsx`, `Landing.tsx`, `Catalog.tsx` and `Learn.tsx` in that directory. The pond and readability glow are specific to Store.

## Colors

These are the exact section 8 tokens; no extra palette or dark theme is generated.

| Token | Value | Implemented role |
| --- | --- | --- |
| `--paper` | `#e9dfc3` | Page and landing |
| `--paper-2` | `#dfd3b0` | Rail, banner, panels, hover surfaces |
| `--paper-3` | `#f3ecd8` | Inputs, cards, disclosures, ticker |
| `--ink` | `#15130f` | Text, solid outlines, hard shadows |
| `--ink-2` | `#5b5342` | Muted text, labels, callback names |
| `--ink-3` | `#8a816a` | Dashed separators and secondary borders |
| `--pine` | `#1e5a3a` | Top bar, primary action, links, live status, focus |
| `--pine-2` | `#2c7a50` | Hover border/underline accent |
| `--on-pine` | `#f3ecd8` | Text and focus outline on pine |
| `--ad` | `#c9a227` | #AD pill only |
| `--bad` | `#a3382b` | Failed status and errors |
| `--warn` | `#a1731c` | Notice stripe |

The primary button retains pine on hover, with a pine-2 border. On-pine/pine measures 6.90:1; on-pine/pine-2 would be 4.44:1. Muted ink-2 on paper-2 measures 5.10:1. Calculated token-pair ratios are in `tests/results/contrast.json`; the probe separately measures rendered solid backgrounds. Contrast over the moving canvas/glow was visually reviewed, not numerically certified.

The scene retains three ink tile alphas (7%, 15%, 26%) and three stroke tones from `pondScene`. Translucent ink forms the landing's fine grid. Gradients are confined to the landing's beige glow.

## Typography

The three Google Fonts are bundled as Latin WOFF2 files in `public/fonts/`, with licenses. Offline browser checks verified all three load.

| CSS family | Face and fallback | Role |
| --- | --- | --- |
| `--display` | Press Start 2P, Courier New, monospace | Headings, brand, main buttons, nav, pills |
| `--body` | Pixelify Sans, Trebuchet MS, system-ui, sans-serif | Paragraphs, descriptions, labels |
| `--mono` | VT323, Courier New, ui-monospace, monospace | Every number/amount, address, symbol, callback, input text, ticker, canvas |

Six size tokens: `--text-xs: 8px`, `--text-label: 10px`, `--text-heading: 13px`, `--text-body: 16px`, `--text-large: 18px`, `--text-title: 26px`. Four one-offs copy the mockup exactly, by the owner's decision: the bar's hook glyph ʃ at 30px VT323, the 12px wordmark, 9px nav links (all desktop), and the 9px landing eyebrow (Press Start 2P, uppercase, pine). The Builder uses only the six tokens; its amounts (cost box 26px, sentences, chips, numeric inputs 18px) are VT323. Body defaults to 18px/1.5 at weight 500; catalog paragraphs use 16px. Display and mono use 400. Pixelify is variable 400–700; this interface uses 500. Headings use line-height 1.6 (landing 1.65) and balanced wrapping. No letter-spacing is added.

`Text` in `web/src/Text.tsx` wraps number/address runs in `.num`; API and Learn text use it. Explicit numerical fields use `.num` or a VT323 container. The canvas draws VT323 at 13px. Paragraphs generally cap at 65ch; Learn uses 75ch. Long API names and callbacks wrap instead of widening the document.

## Layout

`.wrap` is a 1,180px maximum border-box column with 16px gutters and safe-area support. Spacing uses 4–8px for tight controls, 10–14px inside dense cards/disclosures, 16px common gaps, and 18–24px between cards and sections. These are actual component rules, not a second spacing-token system.

The layout breakpoint is 820px. Above it, `.top-in` is a nonwrapping flex row with the mockup's measures: 14px gaps, brand = glyph 30px + 10px gap + 12px wordmark, nav links padded 12px 10px at 9px with 2px gaps, the chain pill reading “Sepolia · test phase” (8px, padded 8px 10px), Connect fixed at 168px whether it shows CONNECT or a twelve-character address. Search takes the remaining width with a 120px minimum. The full mockup bar needs about 1,110px, so between 821 and 1,140px the same row tightens (6px gaps, nav padding 12px 6px at 8px, chain pill padding 8px 6px) and the wordmark is visually hidden but still read by the brand link's label; nothing wraps. At or below 820px the header becomes three rows (brand/Connect, full-width nav, search) and, as in the mockup, the chain pill is hidden. ResizeObserver measures header height so catalog anchor scrolling clears it. Root scroll anchoring is disabled because hash routes control their own position; asynchronously loaded cards must not restore the prior Learn scroll. The narrow banner wraps its single sentence when needed.

The landing fills the viewport width and is at least 660px high. Copy is at most 680px wide (540px mobile). Its headline is 26px desktop and 18px mobile; the input/button stack on mobile. At 390px, the product explanation and main submit action fit on the first screen. The same canvas remains anchored right beneath the glow on phones.

The Builder (`.builder`) is three columns above 1,100px: palette 280px, canvas, preview 340px (the preview is sticky under the header). From 821 to 1,100px it is palette 240px + canvas, with the preview spanning below. At or below 820px it stacks canvas, palette, preview. Type cards are a 3-column grid (1 column on phones); the chooser and settings rows are 2 columns (1 on phones). Palette rows are `minmax(0,1fr) auto`, so the grey state pill (max 96px, wraps) never squeezes the text column. Builder pages were rendered at 320, 390 and 1440px without document overflow.

`.store` uses a 224px rail, flexible grid and 24px gap. Cards use `auto-fill`, a 260px minimum bounded by available width, and 18px gaps. Mobile places two-column filter controls above cards. Status pills cap at 96px and wrap. The featured strip clips only its intentional marquee; reduced motion makes it a locally scrollable row without page overflow.

Learn caps at 1,000px. The permissions table uses fixed layout and row headers with `scope="row"`. On mobile, each callback/description pair stacks and wraps inside the panel. Store/Learn were rendered at 320, 390 and 1440px without document overflow; bar geometry was also verified at 821 and 1024px.

## Elevation & Depth

Panels and controls use 3px solid ink borders. `.box` and `.btn` use `--shadow: 4px 4px 0 var(--ink)`. Pressing a button offsets it 2px and shortens its shadow. Cards themselves are flat. The native wallet modal has a 60%-ink backdrop. The top bar is sticky at z-index 20; the keyboard skip link sits above it. Pond/copy/ticker form a separate local stack.

## Shapes

Hard rectangular corners throughout. Pills are rectangular labels. Secondary separators are 2px dashed ink-3; the open-slot card has a 3px dashed ink outline. No blur, soft box shadows or rounded card system. Native checkboxes and radio buttons retain their platform shape with a pine accent.

## Components

| Pattern/source | Use and behavior |
| --- | --- |
| `App`, `.top-in`, `.nav` | Hash navigation, `aria-current`, labeled search and skip-to-main. Enter scrolls to catalog. |
| `.btn`, `.btn.primary` | Verb-led actions, hover/active/focus states. General minimum height 44px; compact header controls 40px. |
| `Landing`, `.prompt` | Labeled describe field, submit and draft persistence. Recoverable inline alerts preserve input. |
| `Landing`, `.stats`, `.ticker` | Actual data or no metric group; outlined ticker with `role="status"`, pause/opt-in and no demo button. |
| `Featured`, `.adcard` | One open-slot link plus an inaccessible visual duplicate for a 42s loop. Hover/focus pause; reduced motion removes animation and duplicate. |
| `Catalog`, `.rail`, `.card` | Native fieldsets/inputs; immediate filters; polite result count. Only hooks launched through this site; until job 3 the list is empty: `.empty-pond` (dashed box, “Nothing on the pond yet”, one line, DESCRIBE A HOOK to #builder), and any search or filter shows the clearable no-match state. |
| `Builder`, `.types` / `.type` | Three type cards as `aria-pressed` buttons; the selected card is pine. |
| `.seg`, `.chooser` / `.choice` | Segmented DESCRIBE IT / STACK BLOCKS control (`aria-pressed`); two choice cards on a first visit. |
| `.palette` details, `.pal-item`, `.pill.state` | Collapsible groups with VT323 added/total count; first three open, plus any group with an added block. ADD buttons are named “Add {block}”. Grey state pills: ADDED, ALWAYS, NEEDS SWAP FEE, REMOVE … FIRST, OWN POOLS ONLY, TOKEN LAUNCH ONLY. Unavailable rows dim their text. |
| `.blk`, `.blk.token`, `.params` | Block card: number, title, warning sign, tested mark, ▲ ▼ REMOVE (named per block), the short label in VT323, labelled fields with inline `.field-error` and `aria-invalid`, and the Who uses it / On the hook page note. The token card has a 12px pine left stripe and the BRING MY OWN / USE STANDARD TOKEN switch. Dimmed (`.off`) with a “Not for this launch type” pill when the type does not allow it. |
| `.editor`, `.chips`, `.added .chip` | Describe editor: textarea with VT323 counter, example chips, added-block chips with a 32px × remove button. |
| `.warn` | 20px yellow (`--ad`) square with `!`, focusable, `role="img"` with the full tooltip as its name; the tooltip is an ink box shown on hover and focus, hidden (`display: none`) otherwise so it never widens the page. No red labels. |
| `.tested` | Pine-outlined “✓ tested on Sepolia” on cards of blocks with a passing entry. |
| `.notice.bad` | Rule notice under the stack (left stripe `--bad`): the 5% rule, dependencies, exclusions. |
| `.preview`, `.sum`, `.exact`, `.cost` | Summary rows (8px label column 76px), the exact text in a closed disclosure (VT323 `pre`), cost box with VT323 26px amounts, disabled check button with its relay note, Continue disabled with a “Before you continue” list. |
| `.pill.status-*`, `.pill.ad` | Text identifies status alongside color. Ad always says #AD. |
| `Learn`, `details/summary` | Seven native keyboard-operable disclosures, first initially open. Sources use new tabs with `rel="noreferrer"`. |
| `Learn`, `.permissions` | Semantic callback/description table with mobile stacking. |
| `wallet/Connect.tsx`, `.wallet-sheet` | Fixed-width connection/address control; named detected wallets, phone links, Coinbase. Tab trap, Escape, trigger focus restoration, recoverable rejection. |
| `src/scene/cast.ts` | Integration entry for later launch events; ticker still updates when motion is reduced. |

Focus uses a 3px pine outline with 3px offset, switching to on-pine inside the bar and system Highlight in forced colors. The water trigger has a keyboard name and inset focus ring; the canvas is decorative (`aria-hidden`). The pond stops work offscreen, in hidden tabs and for reduced motion. Cleanup removes timers, observers and listeners.

## Do's and Don'ts

Start another route with `.wrap.page` and the existing heading/paragraph hierarchy. Reuse `.panel`, `.box`, `.btn`, `.pill` and `.notice` for their documented purposes. Keep amounts and numerical API text in VT323. Label controls and preserve recoverable input on errors.

Keep the beige palette, hard corners, three families, six sizes, 820px breakpoint and shared bar. Use text alongside semantic colors. Read configuration from `public/site-config.json`. Do not invent metrics or unsupported actions to fill panels. The glow and pond remain specific to Store. Future pages must not add a footer or reintroduce simulated transaction flows.

Coverage, probe exceptions and unperformed checks are in `VALIDATION.md`. Better Interface and Impeccable attribution is retained in `THIRD_PARTY.md` and `LICENSES/`.
