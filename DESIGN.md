# The Hooks Store design system

## Overview

A dense retro-pixel storefront for people browsing or describing Uniswap v4 hooks. The composition follows the supplied Steam-like mockup: sticky search/navigation, an edge-to-edge pond behind centered copy, a compact featured strip, a filter rail and catalog cards. Learn uses the same paper panels and hierarchy. The beige theme is identical under a dark operating-system preference. There is no footer.

Canonical rules live in `web/src/styles.css`; page composition lives in `App.tsx`, `Landing.tsx`, `Catalog.tsx`, `Hook.tsx`, `Management.tsx`, `MyHooks.tsx`, `LaunchReview.tsx`, `OpenPool.tsx` and `Learn.tsx` in that directory. The pond and readability glow are specific to Store.

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
| `--ad` | `#c9a227` | #AD pill and block warning signs |
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

Six size tokens: `--text-xs: 8px`, `--text-label: 10px`, `--text-heading: 13px`, `--text-body: 16px`, `--text-large: 18px`, `--text-title: 26px`. Three one-offs copy the mockup exactly, by the owner's decision: the 12px wordmark, 9px nav links (wide desktop), and the 9px landing eyebrow (Press Start 2P, uppercase, pine). The Builder uses only the six tokens; its amounts (cost box 26px, sentences, chips, numeric inputs 18px) are VT323. Body defaults to 18px/1.5 at weight 500; catalog paragraphs use 16px. Display and mono use 400. Pixelify is variable 400–700; body uses 500 and review-table row headers use 600. Headings use line-height 1.6 (landing 1.65) and balanced wrapping. No letter-spacing is added.

`Text` in `web/src/Text.tsx` wraps number/address runs in `.num`; API and Learn text use it. Explicit numerical fields use `.num` or a VT323 container. The canvas draws VT323 at 13px. Paragraphs generally cap at 65ch; Learn uses 75ch. Long API names and callbacks wrap instead of widening the document.

## Layout

`.wrap` is a 1,180px maximum border-box column with 16px gutters and safe-area support. Spacing uses 4–8px for tight controls, 10–14px inside dense cards/disclosures, 16px common gaps, and 18–24px between cards and sections. These are actual component rules, not a second spacing-token system.

The layout breakpoint is 820px. Above it, `.top-in` is a nonwrapping flex row: the inline pixel-hook SVG (24 × 32px, 12 × 16 viewBox, crisp edges), 10px gap and 12px wordmark; nav; search; Connect. There is no chain pill, draft-chain state or element between search and Connect. Connect stays 168px wide for its label and twelve-character address. Search shrinks to a 120px minimum. From 821 to 1,140px gaps tighten to 6px and nav links use 12px 6px padding at 8px; the wordmark now remains visible because removing the pill frees its space. At or below 820px the header stacks brand/Connect, nav and search. Header geometry was checked at 821, 1024 and 1440px. ResizeObserver measures its height so hash-route scrolling clears the sticky bar. The banner wraps on narrow screens.

The landing fills the viewport width and is at least 660px high. Copy is at most 680px wide (540px mobile). Its headline is 26px desktop and 18px mobile; the input/button stack on mobile. At 390px, the product explanation and main submit action fit on the first screen. The same canvas remains anchored right beneath the glow on phones.

The Builder (`.builder`) is three columns above 1,100px: palette 280px, canvas, preview 340px (the preview is sticky under the header). From 821 to 1,100px it is palette 240px + canvas, with the preview spanning below. At or below 820px it stacks canvas, palette, preview. Type cards are a 3-column grid (1 column on phones); the chooser and settings rows are 2 columns (1 on phones). Palette rows are `minmax(0,1fr) auto`, so the grey state pill (max 96px, wraps) never squeezes the text column. Builder pages were rendered at 320, 390 and 1440px without document overflow.

`.store` uses a 224px rail, flexible grid and 24px gap. Cards use `auto-fill`, a 260px minimum bounded by available width, and 18px gaps. Mobile places two-column filter controls above cards. Status pills cap at 96px and wrap. With placements, the featured strip clips its 42-second marquee and reduced motion makes it a locally scrollable row. With only the open slot there is one wrapping card, no duplicate and no animation or scroll.

Learn caps at 1,000px. The permissions table uses fixed layout and row headers with `scope="row"`. On mobile, each callback/description pair stacks and wraps inside the panel. Store/Learn were rendered at 320, 390 and 1440px without document overflow; bar geometry was also verified at 821 and 1024px.


Launch uses 20px desktop panel padding and gaps, 16px mobile padding, 10px table-row padding, and a 24px gap before the steps. The exact JSON, addresses, hashes and pool calldata wrap at any character instead of widening the page. The price field is at most 560px and uses the existing 18px terminal input face. Launch was rendered with its complete request disclosure at 320, 390, 821 and 1440px without horizontal document overflow.

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
| `Featured`, `.adcard` | One stationary open slot until placements exist. Then ranked placement cards plus the open slot form a 42s loop with an inaccessible duplicate. Hover/focus pause; reduced motion removes animation and duplicate. |
| `Catalog`, `.rail`, `.card` | Native fieldsets/inputs; immediate filters; polite result count. Only marker-matched chain launches appear. With no launches, `.empty-pond` (dashed box, “Nothing on the pond yet”, one line, DESCRIBE A HOOK to #builder), and any search or filter shows the clearable no-match state. |
| `Builder`, `.types` / `.type` | Three type cards as `aria-pressed` buttons; the selected card is pine. |
| `.seg`, `.chooser` / `.choice` | Segmented DESCRIBE IT / STACK BLOCKS control (`aria-pressed`); two choice cards on a first visit. |
| `.palette` details, `.pal-item`, `.pill.state` | Collapsible groups with VT323 added/total count; first three open, plus any group with an added block. ADD buttons are named “Add {block}”. Grey state pills: ADDED, ALWAYS, NEEDS SWAP FEE, REMOVE … FIRST, OWN POOLS ONLY, TOKEN LAUNCH ONLY. Unavailable rows dim their text. |
| `.blk`, `.blk.token`, `.params` | Block card: number, title, warning sign, tested mark, ▲ ▼ REMOVE (named per block), the short label in VT323, labelled fields with inline `.field-error` and `aria-invalid`, and the Who uses it / On the hook page note. The token card has a 12px pine left stripe and the BRING MY OWN / USE STANDARD TOKEN switch. Dimmed (`.off`) with a “Not for this launch type” pill when the type does not allow it. |
| `.editor`, `.chips`, `.added .chip` | Describe editor: textarea with VT323 counter, example chips, added-block chips with a 32px × remove button. |
| `.warn` | 20px yellow (`--ad`) square with `!`, focusable, `role="img"` with the full tooltip as its name. The ink tooltip appears on hover and focus, positioned above its containing palette row, card header or summary rule. Its border-box width is `min(260px, 70vw)`, capped at the containing row's width; inactive tooltips use `display: none`. Focused and hovered risk signs were checked at 320, 390 and 1440px without horizontal overflow. No red labels. |
| `.tested`, `.block-name .sr` | Pine-outlined “✓ proven in a live launch” on cards of blocks with a passing entry. Untested block names include visually hidden status text for assistive technology; the native title remains available on mouse hover. |
| `Builder` removal status | Names the removed parent block and its removed dependants; the next draft edit clears the note. |
| `.notice.bad` | Rule notice under the stack (left stripe `--bad`): the 5% rule, dependencies, exclusions. |
| `.preview`, `.sum`, `.exact`, `.cost` | Summary rows (8px label column 76px), the exact text in a closed disclosure (VT323 `pre`), cost box with VT323 26px amounts, disabled check button with its relay note, Continue disabled with a “Before you continue” list. |
| `.pill.status-*`, `.pill.ad` | Text identifies status alongside color. Ad always says #AD. |
| `Learn`, `details/summary` | Seven native keyboard-operable disclosures, first initially open. Sources use new tabs with `rel="noreferrer"`. |
| `Learn`, `.permissions` | Semantic callback/description table with mobile stacking. |
| `wallet/Connect.tsx`, `.wallet-sheet` | Fixed-width connection/address control; named detected wallets, phone links, Coinbase. Tab trap, Escape, trigger focus restoration, recoverable rejection. |
| `src/scene/cast.ts` | New matching store requests call the cast integration; history and unrelated requests never cast. Ticker still updates when motion is reduced. |
| `ReadStatus`, `.read-status` | Quiet loading/backfill/cached-state copy and a Retry action; missing reads never become a fabricated success. |
| `Hook`, `.detail-head`, `.timeline` | Name and primary Build one like this action; five explicit stages. Only chain-supported milestones use pine. Unknown intermediate stages retain paper-2 and explanatory text. |
| `AddressValue`, `.address-value` | Full checksummed address or hash in VT323, wrapping at any character, optional explorer link, Copy button and polite copied/error feedback. |
| `Management`, `.management-panel`, `.function-row` | Owner and public panels reuse paper-3 boxes. Plain label, VT323 signature, Send/Open form, one labeled input per ABI argument. Owner controls stay locked until the wallet matches owner(). Readings refresh every 20 seconds. |
| `.function-form`, `.function-feedback` | Native bool select; whole-number and address validation. Empty fields get neutral guidance, invalid entered values get inline red errors. Transaction states distinguish wallet review, receipt wait, confirmed and failed; fields are retained on errors. |
| `Hook`, `.hook-blocks .warn` | The same keyboard-focusable warning sign and risk tooltip as Builder, next to the matched block label. Tooltip width is capped at the viewport. |
| `MyHooks`, `.mine-row`, `.saved-draft` | Payer's status rows, View/Manage links, draft Resume/Discard and reversible Undo. Query-param viewing is explicitly read-only. |
| `LaunchReview`, `.launch-columns`, `.review-table` | Two adjacent paper-3 panels for the summary and type-specific fees. Semantic tables use row headers, a 38% label column and dashed separators. Both collapse to a single column at 820px. Values wrap fully; numbers and addresses use `Text`/VT323. |
| `LaunchReview`, `.launch-steps` | Three numbered paper panels for Connect, Approve and Launch. Three columns above 820px, one below. Native payment-chain select; 44px buttons with wrapping labels; persistent inline errors and status text distinguish wallet review, receipt wait and success. Later actions stay disabled with an adjacent explanation. |
| `LaunchReview`, `.exact-launch`, `.launch-done` | Exact compact JSON in a native disclosure, refused-body warning and Copy request. After receipt verification, the Hook page displays the request id and links. Stored transaction hashes are recoverable via Check confirmation after reload. |
| `OpenPool`, `.pool-panel`, `.pool-price` | Live type C hooks only. Copyable verified addresses, fee tier/tick spacing, labeled decimal starting price, calculated `sqrtPriceX96`, full call disclosure and Copy initialize call. Invalid prices and failed contract reads keep copy disabled with a recovery explanation. No send button. |

Hook detail uses a flex header with a 24px gap, a five-column timeline, 1.3fr/1fr address/evidence columns and equal management columns, all with minmax(0,1fr) constraints. At 820px the header, data and panels stack; timeline rows use number / stage / explanation columns. Panels use 20px padding on desktop and 16px on phones. Full addresses wrap; function rows put their action/readout under the label on phones. The Manage section has scroll margin equal to the measured sticky header plus 24px. My hooks rows wrap with 16px gaps. Hook layouts and risk signs were rendered at 320, 390 and 1440px.

Focus uses a 3px pine outline with 3px offset, switching to on-pine inside the bar and system Highlight in forced colors. The water trigger has a keyboard name and inset focus ring; the canvas is decorative (`aria-hidden`). The pond stops work offscreen, in hidden tabs and for reduced motion. Cleanup removes timers, observers and listeners.

## Do's and Don'ts

Start another route with `.wrap.page` and the existing heading/paragraph hierarchy. Reuse `.panel`, `.box`, `.btn`, `.pill` and `.notice` for their documented purposes. Keep amounts and numerical API text in VT323. Label controls and preserve recoverable input on errors.

Keep the beige palette, hard corners, three families, six sizes, 820px breakpoint and shared bar. Use text alongside semantic colors. Read configuration from `public/site-config.json`. Do not invent metrics or unsupported actions to fill panels. The glow and pond remain specific to Store. Future pages must not add a footer or reintroduce simulated transaction flows.

Coverage, probe exceptions and unperformed checks are in `VALIDATION.md`. Better Interface and Impeccable attribution is retained in `THIRD_PARTY.md` and `LICENSES/`.
