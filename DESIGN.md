# The Hooks Store design system

## Overview

A dense retro-pixel storefront for people browsing or describing Uniswap v4 hooks. The composition follows the supplied Steam-like mockup: sticky search/navigation, an edge-to-edge pond behind centered copy, a compact featured strip, a filter rail and catalog cards. Learn uses the same paper panels and hierarchy. The beige theme is identical under a dark operating-system preference. There is no footer.

Canonical rules live in `web/src/styles.css`; page composition lives in `App.tsx`, `Landing.tsx`, `Catalog.tsx`, `Builder.tsx`, `Hook.tsx`, `RelayTimeline.tsx`, `SwarmPanel.tsx`, `Management.tsx`, `MyHooks.tsx`, `LaunchReview.tsx`, `OpenPool.tsx` and `Learn.tsx` in that directory. The pond and readability glow are specific to Store. This document describes the final source through job 9 against SPEC 1.34. Job 8 retains the established visual system and makes rule composition, unavailable blocks, written-rule risk and pool-scoped controls explicit.

Job 9 adds automatic proven-source attribution and the wait estimate to existing summaries, with no new panel or switch. `ProvenLine` in `web/src/ProvenLaunches.tsx` uses `.proven-line`: inherited 18px/1.5 Pixelify Sans, pine text and unrestricted wrapping. `.launch-wait` caps the estimate at 70ch. The Hook page reuses `.actions`, `.btn`, `.notice` and the stable `.copy-status` region for Copy link and the once-per-browser notification choice. These rows wrap at every width; `.hook-link` adds 20px bottom separation. No color, font, size, radius or motion tokens were added.

Current rendered evidence and the six-domain review are in `tests/results/job9/REVIEW.md`. The summary and its source/fallback states were exercised at 320, 390 and 1440px. The 390px Store first screen, complete Builder summary and zero-hook address state were visually inspected. Five rendered WCAG A/AA audits reported zero violations; the 320px RTL mirror had no document overflow. Physical-device, screen-reader, native zoom and WebKit rendering remain unverified.

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

The scene retains three ink tile alphas (7%, 15%, 26%) and three stroke tones from `pondScene`. Bank reeds, the distant boat, sparse canopy and extra birds use that same glyph/tile system; the source Pepe grids stay unchanged. Translucent ink forms the landing's fine grid. Gradients are confined to the landing's beige glow.

Unavailable palette entries use `--ink-2` with explicit grey state pills, rather than opacity that lowered reading contrast. Inactive stack cards use paper-2, ink-2 and ink-3 outlines; inactive added chips use muted text and a dashed border. No new color tokens were added. Historical job 7 Lighthouse results remain in `VALIDATION.md`; current job 8 browser/probe coverage and its limits are in `tests/results/job8/REVIEW.md`.

## Typography

The three Google Fonts are bundled as Latin WOFF2 files in `public/fonts/`, with licenses. Offline browser checks verified all three load.

| CSS family | Face and fallback | Role |
| --- | --- | --- |
| `--display` | Press Start 2P, Courier New, monospace | Headings, brand, main buttons, nav, pills |
| `--body` | Pixelify Sans, Trebuchet MS, system-ui, sans-serif | Paragraphs, descriptions, labels |
| `--mono` | VT323, Courier New, ui-monospace, monospace | Numbers/amounts, addresses, symbols, callbacks, single-line input text, ticker, canvas |

Six size tokens: `--text-xs: 8px`, `--text-label: 10px`, `--text-heading: 13px`, `--text-body: 16px`, `--text-large: 18px`, `--text-title: 26px`. Three one-offs copy the mockup exactly, by the owner's decision: the 12px wordmark, 9px nav links (wide desktop), and the 9px landing eyebrow (Press Start 2P, uppercase, pine). The Builder v2 page (job 11, SPEC 3.2) follows the approved mockup's fixed sizes, scoped to `.builder-page` as `--b-label: 9px`, `--b-small: 15px`, `--b-body: 17px` and `--b-mono: 19px`, plus the 13px step titles, the 22px page title and 22px cost and symbol numerals. None of them scale with the viewport. Body defaults to 18px/1.5 at weight 500; catalog paragraphs use 16px. Display and mono use 400. Pixelify is variable 400–700; body uses 500 and review-table row headers use 600. Headings use line-height 1.6 (landing 1.65) and balanced wrapping. No letter-spacing is added.

`Text` in `web/src/Text.tsx` wraps number/address runs in `.num`; API and Learn text use it. Explicit numerical fields use `.num` or a VT323 container. The canvas draws VT323 at 13px. Paragraphs generally cap at 65ch; Learn uses 75ch. Long API names and callbacks wrap instead of widening the document.

Description and Custom rule textareas use the global `textarea` rule: Pixelify Sans, 16px, weight 500 and line-height 1.4; the description has a 160px minimum height and custom fields an 80px minimum. They resize vertically. The 390px second-revision review confirmed the description's computed font and size.

## Layout

`.wrap` is a 1,180px maximum border-box column with 16px gutters and safe-area support. Spacing uses 4–8px for tight controls, 10–14px inside dense cards/disclosures, 16px common gaps, and 18–24px between cards and sections. These are actual component rules, not a second spacing-token system.

The layout breakpoint is 820px. Above it, `.top-in` is a nonwrapping flex row: the inline pixel-hook SVG (24 × 32px, 12 × 16 viewBox, crisp edges), 10px gap and 12px wordmark; nav; search; Connect. There is no chain pill, draft-chain state or element between search and Connect. Connect stays 168px wide for its label and twelve-character address. Search shrinks to a 120px minimum. From 821 to 1,140px gaps tighten to 6px and nav links use 12px 6px padding at 8px; the wordmark now remains visible because removing the pill frees its space. At or below 820px the header stacks brand/Connect, nav and search. Header geometry was checked at 821, 1024 and 1440px. ResizeObserver measures its height so hash-route scrolling clears the sticky bar. The in-progress banner is absent in the final production configuration, so the page begins directly below the sticky bar.

The landing fills the viewport width and is at least 660px high. Copy is at most 680px wide (540px mobile). Its headline is 26px desktop and 18px mobile; the input/button stack on mobile. At 390px, the product explanation and main submit action fit on the first screen. The same canvas remains anchored right beneath the glow on phones. The ticker's status text wraps long API names and times instead of clipping them; the motion control remains beside it.

The Builder v2 (`.builder-page.wrap`) caps its content at 1,240px and centres it. At 1,100px and wider `.b2` is a two-zone grid, `minmax(0, 1fr) 420px` with a 36px gap: the four steps (`.steps`, 28px apart) on the left and `.hookcol` on the right. `.hookcol` sticks under the header and is capped at `100dvh − header − 32px`, so it never exceeds the viewport height; it scrolls inside itself. Below 1,100px the grid is one column and the card comes first (`order: -1`, static). Below 720px the type, starting-point and settings grids collapse to one column, steps use 16px padding, the shelf becomes a sideways scroll-snap row of 210px cards, and each rule row moves its chip under the text and its tools onto their own line. Every grid child has `min-width: 0`; addresses, mono text, tiles, pills and findings use `overflow-wrap: anywhere`. Tests confirmed no horizontal page overflow at 320, 390, 768, 1100, 1440 and 2560px.

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
| `Catalog`, `.rail`, `.card` | Native fieldsets/inputs; immediate filters; polite result count. Only marker-matched chain launches appear. Reorged requests disappear and orphaned completions lose their Live status and derived result, including saved pending cards. With no launches, `.empty-pond` (dashed box, “Nothing on the pond yet”, one line, DESCRIBE A HOOK to #builder), and any search or filter shows the clearable no-match state. |
| `.seg`, `.chooser` / `.choice` | Segmented DESCRIBE IT / STACK BLOCKS control (`aria-pressed`); two choice cards on a first visit. |
| `.palette` details, `.pal-item`, `.pill.state` | Collapsible groups with VT323 added/total count; first three open, plus any group with an added block. ADD buttons are named “Add {block}”. Grey state pills: ADDED, ALWAYS, NEEDS …, REMOVE … FIRST, OWN POOLS ONLY, TOKEN LAUNCH ONLY, not in this version and no verified deployment. Saved blocks in Describe it use SAVED IN STACK. Unavailable rows use full-opacity muted ink so their descriptions remain legible. |
| `.blk`, `.blk.token`, `.params` | Block card: number, title, warning sign, tested mark, ▲ ▼ REMOVE (named per block), the short label in VT323, labelled fields with inline `.field-error` and `aria-invalid`, and the Who uses it / On the hook page note. The token card has a 12px pine left stripe and the BRING MY OWN / USE STANDARD TOKEN switch. Own-token supply is capped at 1,000,000,000,000. Split the fee disables the replaced destination field and explains why. Dimmed (`.off`) with a “Not for this launch type” pill when the type does not allow it. |
| `.editor`, `.chips`, `.added .chip` | Describe editor: textarea with VT323 counter, example chips and the written-rule warning/checklist. Pause and price-reading starting points include PoolId in their function signatures. Saved-block chips have a 32px × remove button and are explicitly excluded from this mode. Use saved stack reveals those rules; adding a palette block switches visibly to Stack blocks. Token choice changes retain the current mode. |
| `.warn` | 20px yellow (`--ad`) square with `!`, focusable, `role="img"` with the full tooltip as its name. The ink tooltip appears on hover and focus, positioned above its containing palette row, card header or summary rule. Its border-box width is `min(260px, 70vw)`, capped at the containing row's width; inactive tooltips use `display: none`. Focused and hovered risk signs were checked at 320, 390 and 1440px without horizontal overflow. No red labels. |
| `.tested`, `.block-name .sr` | Pine-outlined “✓ proven in a live launch” on cards of blocks with a passing entry. Untested block names include visually hidden status text for assistive technology; the native title remains available on mouse hover. |
| `.notice.bad` | Rule notice under the stack (left stripe `--bad`): the 5% rule, dependencies, exclusions. |
| `.preview`, `.sum`, `.exact`, `.cost` | Summary rows (8px label column 76px), exact text in a closed disclosure (VT323 `pre`), cost box with VT323 26px amounts. IMD is first/default for new type A drafts. Pool allocation is a percentage of total supply, with 10% to the swarm and the remainder shown separately. Above six behavior blocks, the summary warns about audit refusal and the 24 KB contract limit. Check is disabled without a relay or a valid/resolved draft; pending/error/blocker/stale checks keep continuation locked with adjacent guidance. |
| `SwarmPanel`, `.swarm-panel`, `.swarm-facts` | One response section below actions, separated by a dashed rule and 20px spacing. Fact labels are `dt`; state pills, required markers and applicable assumptions are `dd`. Plan is ordered; blockers/suggestions are lists. All API text uses `Text` for terminal numerals and wraps. Empty lists say None; the overall result has a polite status. No color-only status. |
| `ParamField` recovered recipient | A recovered literal fee recipient gets a “Keep recipient from request” option and its full wrapping VT323 address beneath the select. Changing to my wallet or IMD’s treasury is explicit. No new recipient field or guessed address is added. |
| `.pill.status-*`, `.pill.ad` | Text identifies status alongside color. Ad always says #AD. |
| `Learn`, `details/summary` | Seven native keyboard-operable disclosures, first initially open. Sources use new tabs with `rel="noreferrer"`. |
| `Learn`, `.permissions` | Semantic callback/description table with mobile stacking. |
| `wallet/Connect.tsx`, `.wallet-sheet` | Fixed-width connection/address control; named detected wallets, phone links, Coinbase. Tab trap, Escape, trigger focus restoration, recoverable rejection. |
| `src/scene/cast.ts` | New matching store requests call the cast integration; history and unrelated requests never cast. Ticker still updates when motion is reduced; its relative timestamp rerenders at least once a minute without replaying a cast. Reorged launches lose their announcement and age, reverting to the quiet pond message. |
| `ReadStatus`, `.read-status` | Quiet loading/backfill/cached-state copy and a Retry action; missing reads never become a fabricated success. |
| `Hook`, `RelayTimeline`, `.timeline` | Five explicit stages. Requested/Live/Failed use chain data; Building/Audit panel/Deploying use the real waiting/working/accepted/failed job nodes; a completed job awaiting its live launch activates Deploying. Complete uses pine/on-pine, active uses paper-3 with a 5px pine inset stripe, and failed job stages use a bad stripe with Needs attention text. Unknown stages retain paper-2 and explanatory copy; errors expose Retry stage details. Current progress uses `aria-current="step"`. |
| `AddressValue`, `.address-value` | Full checksummed address or hash in VT323, wrapping at any character, optional explorer link, Copy button and polite copied/error feedback. |
| `Management`, `.management-panel`, `.function-row` | Owner and public panels reuse paper-3 boxes. Plain label, VT323 signature, Send/Open form, one labeled input per ABI argument. Owner controls stay locked until the wallet matches owner(). A shared labeled Pool id field feeds every PoolId argument as bytes32; it starts from the launch pool id when available. Legacy requests retain their original ABI without fabricated PoolId arguments. Readings refresh every 20 seconds. |
| `.function-form`, `.function-feedback` | Native bool select; whole-number and address validation. Empty fields get neutral guidance, invalid entered values get inline red errors. Transaction states distinguish wallet review, receipt wait, confirmed and failed; fields are retained on errors. |
| `Hook`, `.hook-blocks .warn` | The same keyboard-focusable warning sign and risk tooltip as Builder, next to the matched block label. Tooltip width is capped at the viewport. |
| `MyHooks`, `.mine-row`, `.saved-draft` | Payer's status rows, View/Manage links, draft Resume/Discard and reversible Undo. Query-param viewing is explicitly read-only. |
| `LaunchReview`, `.launch-columns`, `.review-table` | Two adjacent paper-3 panels for the summary and type-specific fees. Semantic tables use row headers, a 38% label column and dashed separators. Both collapse to a single column at 820px. Values wrap fully; numbers and addresses use `Text`/VT323. |
| `LaunchReview`, `.launch-steps` | Three numbered paper panels for Connect, Approve and Launch. Three columns above 820px, one below. Native payment-chain select; 44px buttons with wrapping labels; persistent inline errors and status text distinguish wallet review, receipt wait and success. Later actions stay disabled with an adjacent explanation. Confirmed failed/cancelled/replaced approvals and launches enable retry; unknown receipts keep Check confirmation and the pending lock. |
| `LaunchReview`, `.exact-launch`, `.launch-done`, `.launch-check` | Exact compact JSON in a native disclosure, refused-body warning and Copy request without a relay. With a relay, Check before paying reuses the free-check action and response panel in a paper-3 box with 20px padding. Blocker, failed-check and stale-result gates apply here too, including navigation/reload. Non-JSON relay errors show a status and Try again. After receipt verification, the Hook page displays the request id and links. Stored transaction hashes are recoverable via Check confirmation after reload. |
| `ProvenLine`, `.proven-line` | One pine paragraph beneath the summary heading, and on the Hook page after launch. It names the verified source, launch number and audit date. No switch, choice or success dialog is shown. Failed import removes the attribution and retains the complete fresh request. |
| `.launch-wait` | Plain inherited body copy in Builder and Launch, limited to 70ch. It states 1–3 hours and the writing/testing/four-auditor/judge/deployment sequence without a countdown. |
| `LaunchNotifications`, `.notification-prompt`, `.hook-link` | A native Copy link button with polite status feedback; a plain notice offers Enable notification and Dismiss once. Both actions use existing neutral buttons, wrap on phones, and are keyboard accessible. The notice explains that the site must stay open. A granted watch follows hash navigation and deduplicates delivery. |
| `SafetyNotice`, `.safety-notice.notice.bad` | Red error stripe, explicit locked status and quoted offending sentences. Contradictory rules quote both effects with “Conflicts with”. Sits beside exact-request review and Continue, after the Builder choices, so a fresh draft does not hide the first-screen controls. Blocks the free check, continuation and payment. Quotes preserve line breaks and wrap anywhere; list items have 16px separation. Reuses paper-2, ink and `--bad`, with no new tokens. |
| `RelayTimeline`, `.needs-attention`, `Builder .correction` | Builder questions appear verbatim in blockquotes with a 3px leading border and 12px inset. Fix in Builder restores the associated draft. The correction keeps the old request in a native disclosure, a return link and the spent-fee explanation. Measured at 320, 390 and 1440px. |
| `SwarmPanel` fixed conflicts | A persistent red notice within the understood panel quotes the conflicting fact and explains the explicit request opt-out. Token-split conflicts quote the returned and requested allocations/recipients. While conflicts exist, the result status asks for their resolution; it never labels the request clear. Editing requires another check. Resolved ETH fee defaults get a plain explanation that the request keeps fees in IMD. |
| `OpenPool`, `.pool-panel`, `.pool-price` | Live type C launches with a nonzero, read hook address only. Copyable verified addresses, fee tier/tick spacing, labeled decimal starting price, calculated `sqrtPriceX96`, full call disclosure and Copy initialize call. Invalid prices and failed contract reads keep copy disabled with a recovery explanation. Dynamic LP fee initializes with fee 0x800000; Pool rules cannot coexist with it. No send button. |

Hook detail uses a flex header with a 24px gap, a five-column timeline, 1.3fr/1fr address/evidence columns and equal management columns, all with minmax(0,1fr) constraints. At 820px the header, data and panels stack; timeline rows use number / stage / explanation columns. Panels use 20px padding on desktop and 16px on phones. Full addresses wrap; function rows put their action/readout under the label on phones. The Manage section has scroll margin equal to the measured sticky header plus 24px. My hooks rows wrap with 16px gaps. Hook layouts and risk signs were rendered at 320, 390 and 1440px.

Focus uses a 3px pine outline with 3px offset, switching to on-pine inside the bar and system Highlight in forced colors. The water trigger has a keyboard name and inset focus ring; the canvas is decorative (`aria-hidden`). The pond stops work offscreen, in hidden tabs and for reduced motion. Cleanup removes timers, observers and listeners.

### Builder v2 (job 11, SPEC 3.2, decision 34)

| Component | Implemented behavior |
| --- | --- |
| `.head`, `.progress` | Page title (22px), the one-line drafts note, and five links (1 Type … 5 Check & launch) read as done (pine outline), now (pine fill, `aria-current="step"`) or pending from the draft. Each scrolls to its step or the card. |
| `.step`, `.step-head` | Paper-3 panel with a 3px ink border, 4px hard shadow and 22/24px padding. The step number sits in a 40px pine square. The title is 13px Press Start 2P. Step 1 names the chosen type in pine. Step 4 shows "N to fill in" in red, or "All set". |
| `.types`, `.start`, `.type` | Three type cards, then the two starting-point cards (From scratch, From my own code), as `aria-pressed` buttons. The chosen card is pine. The repository and commit fields (`.own`, dashed border) and Resolve repository exist only while own code is chosen. Switching back to scratch clears them from the draft and keeps them in memory to restore. |
| `.seg` | The Describe it / Stack blocks control with the mode note. In Describe mode, the textarea, examples, written-rules warning and saved-stack chips sit inside step 2. |
| `.shelf-tabs`, `.shelf`, `.bcard` | Category tabs (`role="tab"`) with a 10px colour swatch and a VT323 added/total count. The selected tab is ink. Each block card has a 6px top stripe in its category colour, a title, a blurb, and either ADD or the grey state pill. On phones the shelf scrolls sideways. |
| `.rule` | One row per rule: a 12px left stripe in the category colour, the number, the 9px title, the filled-in short label in VT323 19px, the who-uses-it chip (RUNS ITSELF, OWNER in pine, ANYONE PRESSES in ink), ↑ ↓ × and EDIT/CLOSE (`aria-expanded`). An open rule shows its fields, the who-uses-it sentence and the hook-page note. A newly added block opens. "Open all / Close all" sits above the stack. For type A the token is row 0, with STANDARD / MY OWN. |
| `.hookcard` | Pine header ("Your hook, as it stands", the name and symbol in VT323 22px, then pills for type, chain and pair). Below it come the tiles (14px swatch plus title and short label, scrolling past 480px), then "Where the money goes" (`.flow`, paper-2), the readiness list (✓ pine, → red with "fill it in"), the cost row (0.5 IMD, 2 tx), the wait line, the full-width CHECK and CONTINUE buttons, and the character count with SHOW EXACT TEXT. |
| `.findings` | Red 10px left stripe. The list scrolls inside itself at `max-height: 33vh`. Each row has a title, a JUMP TO IT button, and an excerpt clamped to two lines that quotes only the words at fault in VT323. With no findings the stripe turns pine and the box reads "Nothing to fix. The request is consistent." |
| `dialog.sheet` | Native modal `<dialog>` (Escape closes it), up to 760px wide and `100dvh − 32px` high, with COPY and CLOSE. The request is set in VT323 19px and scrolls inside the sheet. The words any open finding points at are marked (`#f6e3a1` with a warn outline). |
| `.understood` | After a check, "What the swarm understood" sits under the findings, in its own box that scrolls past 50vh. |

Category colours (`--cat-*`): token and treasury pine `#1e5a3a`, fees gold `#c9a227`, protection red `#a3382b`, liquidity blue `#3b6ea5`, timing purple `#7a4e9e`, advanced ink-2 `#5b5342`, games orange `#c2612e`, custom ink-3 `#8a816a`. They are used only as swatches and stripes, never behind text.

## Do's and Don'ts

Start another route with `.wrap.page` and the existing heading/paragraph hierarchy. Reuse `.panel`, `.box`, `.btn`, `.pill` and `.notice` for their documented purposes. Keep amounts and numerical API text in VT323. Label controls and preserve recoverable input on errors.

Keep the beige palette, hard corners, three families, six sizes, 820px breakpoint and shared bar. Use text alongside semantic colors. Read configuration from `public/site-config.json`. Do not invent metrics or unsupported actions to fill panels. The glow and pond remain specific to Store. Future pages must not add a footer or reintroduce simulated transaction flows.

Job 7 rechecked every route at 320, 390 and 1440px, plus blocked Hook/correction states. Store’s product and Describe it action fit the first 390px screen; that screenshot and the current free-check panel were inspected. Historical job 7 coverage remains in `tests/results/job7/REVIEW.md`; current job 8 coverage, fixed findings, screenshots and unperformed checks are in `tests/results/job8/REVIEW.md`. Better Interface and Impeccable attribution is retained in `THIRD_PARTY.md` and `LICENSES/`.

The launch-safety revision preserves this design system. Its two-sentence contradiction notices and fixed-allocation conflicts were inspected at 390px and exercised at 320/390/1440; measured notice ink on paper-2 contrast is 12.44:1. Current revision coverage and limitations are in `tests/results/job7/REVISION.md`.

Job 8 adds `.written-rules` (12px padding, 16px bottom margin, 20px list inset), `.block-count` at the existing body size, and `.management-pool` (20px bottom separation and a full-width input). Existing warning/error colors, native labels, 3px focus rings and 820px reflow rules remain. A zero deployer `hook()` shows “hook not deployed yet”; controls and pool-opening stay locked until a nonzero hook is read. Written owner functions are directed to the verified contract when the storefront has no matching block ABI. The Builder’s type and mode actions were inspected on the first 390px screen; screenshots cover both modes at 320, 390 and 1440. Screen-reader, native zoom, physical-device and WebKit rendering were not performed in job 8.

The job 8 revision reuses these components and tokens. Uncertain written fees, mismatched recipients and missing PoolId signatures appear in `SafetyNotice` beside the exact request and disabled actions; notices quote the rule and give a correction. A fee and its recipient can span the description and Custom rule while retaining one destination in the exact request. Peak fee totals use the existing `#rule-notice`, and incompatible palette entries use the existing wrapping “REMOVE … FIRST” pill. Both written editors were exercised at 320, 390 and 1440px. The 390px first screen, correction notice and keyboard focus were visually inspected; all three local font faces loaded. Notice ink `#15130f` on paper-2 `#dfd3b0` measured 12.44086:1. Current scope and unperformed checks are recorded in [revision/REVIEW.md](tests/results/job8/revision/REVIEW.md).

Job 9 keeps Live status and hook-address availability separate. The green Live timeline item is confirmed for contracts-only launches by Completed status 0 and the matching live relay record. The Addresses panel separately shows the deployer and `hook()` result, including the plain “hook not deployed yet” zero state. Management and pool-opening require the nonzero hook, and My hooks only offers Manage once that address is available. The status color always has a text label.
