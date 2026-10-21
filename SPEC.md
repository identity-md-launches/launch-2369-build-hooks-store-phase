# The Hooks Store — product and build specification

Version 1.8 · 2026-10-21 · Status: draft for review, then handed to the IMD swarm job by job.

This document is a specification, not a wish list. Every section says exactly what to build, what data it uses, and how to tell when it is done. The clickable mockup in `mockup/index.html` is the visual reference; where the mockup and this text disagree, this text wins.

Changes in 1.8: the three friends on the bank are Pepe frogs drawn in filled tiles, the one at the water's edge holding the rod; lily pads are flat notched discs with no dark centre; the water field uses dashes, dots and a few `><>` fish instead of tildes; reed clusters stand at the shores (section 9).

Changes in 1.7: the brief is published at github.com/the-hook-store/hooks-store-spec and job 1 imports it as a two-step chain (content check, then build); jobs are paid on-chain through the Intake because the explorer's form cannot send an imported-repository build; every block must pass a real Sepolia launch before the mainnets open (15.4, 12), with the results in `evidence/blocks-verified.json` read by the Builder (4.14).

Changes in 1.6: gameable blocks show a small warning sign with a hover/focus explanation instead of a red label; the live site name is `the-hooks-store.sites.imd.fun`, claimed from job 1; the brief is hosted on a GitHub account created for the project, not the owner's personal one.

Changes in 1.5: the owner's decisions on the open questions are recorded (section 14); the pool share has no default and must be chosen; a Games and lotteries group marks blocks that can be gamed, with warnings on the card, the summary and the request; no reference to any other product remains in the brief; a new section 15 explains how the site goes from mockup to live.

Changes in 1.4: the featured #ad row is a self-scrolling strip of compact one-line cards (name, symbol, creator, hours left), boosting and promoting live only in My hooks under Promotions, and Learn gains links to the IMD and Uniswap v4 docs plus a plain-words reference of the 14 hook permissions; the mockup was screenshot-checked at desktop and phone widths.

Changes in 1.3: the landing scene is monochrome character-tile art again, redrawn with the composition of the owner's pond reference (no painting, no image job); every block states who uses it after launch; blocks added in Describe mode can be removed there and a stated rule says numbered rules win over the words; featured #ad placements last 24 hours, anyone can boost one to rank it higher, and the cards are compact; the ad contract becomes FeaturedPlacementsV2 deployed through an IMD contracts launch (job 6a).

Changes in 1.2: the landing scene is a painted pond (an IMD image job, in the spirit of the owner's reference, not a copy) animated in layers, with no counter or button; the landing is full-bleed and centered; a featured #ad carousel sits between the landing and the catalog and the listing/#ad contracts move to phase 2; the Builder shows the launch type first; every block that gives the owner or the public something to do names its functions, and the hook page gets Manage and Anyone-can panels; all numbers render in the terminal face because the pixel body font draws 5 like 8; every block was run through IMD's free check across all launch types with zero blockers.

Changes in 1.1: single beige theme; the pond is a background scene behind the landing copy with a "describe your hook" box; the Builder has two modes (describe, stack blocks) and three launch types (new token, hook only, existing token); the block catalog covers every v4 hook capability; the preview is a short summary with the exact text behind a disclosure; search by keyword and by address; no footer; the top bar never wraps on desktop.

---

## 0. One paragraph

The Hooks Store is a website where anyone can get a Uniswap v4 hook built, audited and launched by the IMD swarm, either by describing it in their own words or by stacking reviewed building blocks. It is a front door to IMD's existing launches: `launch.open` with `onchain: "univ4_hook"` for a hook with a new token and pool, and `launch.open` with `onchain: "evm_contracts"` for a hook on its own or for a token that already exists. The site never writes Solidity, never holds funds, and has no backend. Paying is one wallet transaction to IMD's Intake contract. Browsing reads public chain data. A retro-pixel Steam-style storefront with a character-tile fisherman on a pond gives it a personality.

## 1. Goals and non-goals

Goals, in priority order:

1. A newcomer goes from "I want a hook that does X" to a paid launch request in under five minutes, without reading documentation, in words or with blocks.
2. Every launch made through the site is a standard IMD launch: audited by IMD's panel, deployed by IMD's factory, listed on IMD's explorer. The site adds no trust assumptions of its own.
3. Browsing and search show real hooks launched through IMD, read from chain, with honest status.
4. The site is a static export (IPFS) that works on phones.
5. Phase 1 deploys hooks on Sepolia. Phase 2 opens Robinhood Chain and Ethereum on the same day.

Non-goals for version 1:

- No store-operated review pipeline, requester or gated deployer. The `AutoHookJobRequester`, `HookRequestCodec` and `GatedHookDeployer` contracts from the foundation repo are **not used**.
- No "buy this hook from its creator" marketplace. Free listings and paid #ad slots (`HookListingRegistry`, `FeaturedPlacements` from the foundation repo) are phase 2 (job 6); the carousel slot exists from day one.
- No AI chat. "Describe it" is a text box whose contents become requirements in the launch request; IMD's free check reports what the swarm understood. The site does not interpret text itself.
- No backend, database or accounts. A small optional relay (7.4) is the only server-side piece and the site works without it.

## 2. Users and the three journeys

**Describe journey.** Type a sentence in the landing box → Builder opens in Describe mode with the text → pick the launch type and chain → read the short summary and the exact text → run the free check and read what the swarm understood → Launch (connect, approve, send) → watch status → share the hook page.

**Blocks journey.** Open Builder → choose Stack blocks → add blocks and set numbers → same from the summary onwards.

**Browse journey.** Scroll past the landing scene to the catalog, or search by name, token, block or address → open a hook page → "Build one like this" preloads the Builder.

## 3. Pages

All pages are hash routes on one static page: `#store` (home), `#catalog` (scrolls to the grid), `#builder`, `#launch`, `#hook/<chainId>/<requestId>`, `#mine`, `#learn`. There is no footer. A sticky top bar is on every page. Every number on every page uses the terminal face (section 8).

### 3.0 Top bar

Logo, Store, Builder, My hooks, Learn, the search box, the active chain pill, Connect. On desktop (above 820 px) nothing wraps: the nav links and the chain pill have fixed widths, the search box shrinks first (minimum 120 px), and the Connect button keeps one width (168 px) whether it shows "CONNECT" or the shortened address `0x5a7e…f00d`; disconnect is a tooltip and click on that same button. Below 820 px the bar intentionally stacks into three rows (brand and connect, nav, search).

### 3.1 Store (home)

**Landing.** Full-bleed (edge to edge of the viewport, never a centered box), at least 660 px tall, with the character-tile pond of section 9 behind the copy. Centered on top, inside a soft beige glow: eyebrow, headline "Stack blocks. Cast a hook.", a two-sentence explanation, the describe box (one input, placeholder "What should your hook do? e.g. 1% of every buy goes to a prize pot", button DESCRIBE IT), the line "or open the block builder · browse hooks", and three live numbers from `GET /swarm` (hidden if the call fails). Nothing else sits in the landing: no counter, no demo button. The ticker is one boxed line at the bottom edge of the scene (`role="status"`). Submitting the box opens the Builder in Describe mode with the text filled in. Clicking the water casts (the manual trigger for tests).

**Featured strip (#ad).** Directly under the landing, inside the content column: a heading "FEATURED #AD", the sentence "Paid placements, 0.1 IMD for 24 hours, ranked by total paid. Managed from My hooks. Not a review or endorsement.", and a strip that scrolls by itself (a seamless marquee, about 42 s per loop, paused on hover or keyboard focus, a plain scrollable row under reduced motion). Each card is one compact line: the #AD pill, the hook name, the symbol, "by {creator}" (the launch payer as an ENS name when reverse lookup on Ethereum mainnet finds one, else the shortened address) and the hours left. No chain, no description, no block labels, no buttons; the card links to the hook page. Cards are sorted by total paid (base price plus boosts), ties by the earlier purchase, and the strip ends with an open-slot card ("OPEN SLOT · 0.1 IMD / 24h · promote from My hooks"). Buying, boosting and cancelling happen only in My hooks (3.5). Cards come from `FeaturedPlacementsV2` (6.6) once it is deployed in phase 2; until then only the open-slot card shows.

**Catalog.** Below the carousel, Steam layout: a left rail of filters and a card grid.

- Filters: block type (Fees, Protection, Treasury and rewards, Liquidity rules, Timing and access, Advanced, Own source), chain (Sepolia, Robinhood, Ethereum), status (All, Live only, In progress), sort (Newest, Oldest, Name). Every filter changes the grid immediately.
- A card: name and symbol (or hook name for token-less hooks), chain pill, status pill (Requested, In progress, Live, Failed), the block labels parsed from the request, one sentence, launch number when live, View.
- Empty state: "No hooks match. Clear search and filters or build the first one."

**Search.** The top-bar box searches as you type and shows results in the catalog grid under the heading "Results for …":

- Keywords match name, symbol, chain, block labels and the request text; all words must match.
- A 40-hex address matches the hook address, the token address, the distributor address or the pool id's currencies of any known launch. A 64-hex value matches a request id or a transaction hash.
- An address that matches nothing is resolved on chain through the public RPCs: if it answers `poolManager()` and `getHookPermissions()` it is shown as "a v4 hook not launched through IMD" with its permissions decoded; if it answers `name()` and `symbol()` it is shown as a token with "Build a hook for this token" (opens the Builder with launch type C and the address filled in); otherwise "No contract found at this address on Sepolia, Robinhood Chain or Ethereum".
- Enter also navigates to `#catalog`.

### 3.2 Builder

The canvas reads top to bottom as three numbered questions, so the launch type is the first thing a user sees.

**1. What are you launching?** Three cards: A: HOOK + NEW TOKEN + POOL. B: HOOK ONLY. C: HOOK FOR MY EXISTING TOKEN. The selected card is pine. The choice changes which blocks are available and which settings appear.

**2. How do you want to build it?** A segmented control (DESCRIBE IT | STACK BLOCKS). On a first visit, under it, the two-card chooser with two sentences each. Switching never loses anything: words stay in the request as the creator's description and blocks stay as numbered rules; the summary shows both.

- Describe mode: a text area (3,000 characters), four example chips that fill it, then "Blocks added from the palette" as chips with an × to remove each one, and the rule in one sentence: blocks become numbered rules under your words; if your words and a rule disagree, the rule wins. The palette stays available in this mode, so a block can be added or removed without leaving it.
- Blocks mode: the stack. The token block (type A only) sits first with a pine stripe and a BRING MY OWN / USE STANDARD TOKEN switch. Each behavior block shows its number, title, the short label with the numbers filled in, its fields, up, down and remove, and a "Who uses it" line (4.12) followed by what the block adds to the hook page after launch ("On the hook page: owner buttons: pause swaps, resume swaps"). A block the launch type does not allow is dimmed with a pill and left out of the request.

**3. Settings.** Deploy chain (Sepolia enabled in phase 1), pair with, the pool share (no default: the user must choose 10–90% in steps of 5, and Continue stays disabled until they do) and the remainder address (type A), existing token address and symbol (type C), hook name (B and C), owner address (used only when a block adds a power), and a collapsed ADVANCED: START FROM MY OWN CODE with repository URL and commit. Rule errors appear in a red notice under the stack (4.10).

**Layout.** Three columns on desktop (palette 280 px, canvas, preview 340 px); stacked on phones in the order canvas, palette, preview. The palette stays available in Describe mode so a user can add a block to their words.

**Palette** (left). Groups as collapsible sections with an added/total count: Token (type A only), Fees, Protection, Treasury and rewards, Liquidity rules, Timing and access, Advanced, Custom. Each entry is one row: title, a one-line blurb, and on the right either ADD or a small grey state pill (ADDED, ALWAYS, NEEDS SWAP FEE, REMOVE … FIRST, OWN POOLS ONLY, TOKEN LAUNCH ONLY) that wraps within 96 px and never squeezes the text column.

**Preview** (right). "Your hook, in short": Type, Token or Hook, Chain, Words, Rules (a numbered list of short labels), Owner, Pool. Under it a disclosure "EXACT TEXT THE SWARM RECEIVES" with the composed text. Then the cost box (0.5 IMD, 2 transactions, length out of 7,500), CHECK WITH THE SWARM (FREE), CONTINUE TO LAUNCH, and after a check the "What the swarm understood" panel: the facts IMD returns with their states, the plan steps, and blockers.

Drafts persist in `localStorage` under `hooks-store:draft:v2` (type, mode, words, blocks, settings) and reopen.

### 3.3 Launch

A review page: summary table (type, token or hook, existing token for C, chain, pairing and pool for A, owner, rules, description length); the fee table (6.3, varies by type); the one-sentence note that payment happens on Robinhood or Ethereum; for type C a note that the site prepares the pool-opening transaction after the hook is live. Three numbered steps with real wallet actions: Connect, Approve 0.5 IMD, Launch; each shows its hash and the next stays disabled until the previous receipt succeeds. After the launch confirms: the request id, "The swarm has your request…", links to the hook page and the IMD explorer.

### 3.4 Hook page

Header (name, symbol or hook name, chain, status pill, launch number, BUILD ONE LIKE THIS), the five-step timeline (Requested, Building, Audit panel, Deploying, Live or Failed), addresses with copy buttons (hook, token, distributor, pool id when known; "unknown until live" otherwise), evidence (source job link, audit, launch page, trade link from the operator template), then two side-by-side panels built from the hook's blocks (section 4.11):

- **OWNER CONTROLS.** One row per owner function: a plain-language label, the function signature in the terminal face, and a SEND button (or OPEN FORM when the function takes arguments; the form has one field per argument, address fields validated). Enabled only when the connected wallet is the hook's owner (read from `owner()`); otherwise the rows show with a note "Connect the owner wallet to use these". Hooks with no owner powers say "No owner powers. This hook runs itself." Hooks launched outside the store with unknown functions say "Managed outside the store".
- **TRADERS, ANYONE, AND READINGS.** One row per public function (trigger a buyback, run a draw, settle a batch, place or cancel a limit order, rebalance) and one row per view (jar balance, pot, next draw, paused, window end, TWAP) read on load and refreshed every 20 s.

Then the block labels and the request text as sent. For type C hooks that are live, the OPEN THE POOL panel (6.4). The ABI for these rows is built by the site from the function signatures in section 4.11; the swarm is told to keep the names exactly.

### 3.5 My hooks

Requires a connected wallet. Lists every launch request whose payer is the connected address (7.3), newest first, with the compact status and a MANAGE link for live hooks, plus the saved draft with Resume and Discard. Under it, **Promotions (#ad)**: one sentence of terms (0.1 IMD for 24 hours, ranked by total paid, top-ups never refunded, cancelling refunds the unused base), the wallet's placements as rows (hook, hours left, total paid, current rank out of the strip, BOOST which asks an amount then deposits if needed and calls `boost`, CANCEL), and PROMOTE A HOOK, which lists the wallet's live hooks and runs the free listing, deposit and purchase steps of job 6. This is the only place in the site that spends IMD on placements.

Requires a connected wallet. Lists every launch request whose payer is the connected address (7.3), newest first, with the compact status, plus the saved draft with Resume and Discard.

### 3.6 Learn

Seven short answers (What is a hook? Describe it or stack blocks? What happens after I pay? What happens to a feature after launch? What does it cost? Why Sepolia first? Who audits it?), then **Read the sources**: links to the IMD docs, the Uniswap v4 overview, the hooks concept page, the PoolManager page, dynamic fees, "Your first hook", hook deployment and address mining, and the Hooks library reference (all at docs.uniswap.org/contracts/v4/…, checked live on 2026-10-21), then **What a hook can do: the 14 permissions**, a table that explains each callback in plain words (beforeInitialize/afterInitialize, beforeSwap, afterSwap, before/afterAddLiquidity, before/afterRemoveLiquidity, before/afterDonate, beforeSwapReturnDelta, afterSwapReturnDelta, afterAddLiquidityReturnDelta/afterRemoveLiquidityReturnDelta) and names the builder blocks that use each, ending with the note that a hook's address encodes its permissions.

## 4. Block catalog, version 1

A block is a reviewed, named piece of hook behavior with a few numbers to set. The site turns each block into one numbered sentence in the launch description. The swarm reads sentences, not block ids, so every sentence must be unambiguous on its own. "Types" says which launch types may use the block: A (hook + new token + pool), B (hook only), C (hook for an existing token).

The catalog covers every v4 hook capability: pool initialization rules, swap-time rules (fees, limits, access, timing, dynamic fees, custom curves, async swaps), liquidity-time rules (locks, penalties, gating, minimums), donation rules, return-delta fee extraction, oracles, limit orders, and hook-owned or re-hypothecated liquidity. It is the Uniswap hook-type table (BaseHook, BaseAsyncSwap, BaseCustomAccounting, BaseCustomCurve, BaseDynamicFee, BaseOverrideFee, BaseDynamicAfterFee, BaseHookFee, AntiSandwichHook, LiquidityPenaltyHook, LimitOrderHook, ReHypothecationHook, BaseOracleHook) expressed as plain-English blocks.

### 4.1 Token (type A only; exactly one)

| Block | Parameters | Sentence |
|---|---|---|
| **Launch token** (default) | name (1–40), symbol (2–11 uppercase A–Z0–9) | "Token: {name} ({symbol}), the standard launch token: 1,000,000,000 supply, 18 decimals, plain transfers, no owner functions." |
| **Bring your own token** | name, symbol, supply, decimals (6–18) | "Token: my own token {name} ({symbol}), supply {supply}, {decimals} decimals, minted once to the launch factory, no transfer fee, nothing minted after launch, no privileged address can move, freeze, pause or seize a holder's tokens." Sets `customToken: true`. |

### 4.2 Fees

| Block | Types | Parameters (defaults) | Sentence |
|---|---|---|---|
| Swap fee | ABC | rate % (1.0; 0.1–5), applies to (buy and sell / buy / sell), send to (my wallet / treasury address / burn) | "Take {rate}% of the ETH side of every {applies} as a hook fee, settled in ETH inside the swap that paid it (mint a claim when the PoolManager cannot pay it directly), and send it to {to}." |
| Fee that fades | ABC, needs Swap fee | start % (10), end % (1), minutes (30) | "The hook fee starts at {start}% of the ETH side of every swap when the pool opens and decreases linearly to {end}% over the first {minutes} minutes, then stays at {end}%." |
| Different buy and sell fees | ABC, not with Swap fee | buy % (0.5), sell % (2.0), send to | "Take {buy}% of the ETH side of every buy and {sell}% of the ETH side of every sell as a hook fee, settled in ETH inside the swap that paid it (…), and send it to {to}." |
| Whale fee | ABC | above ETH (1), extra % (1.0) | "Any swap whose ETH side is larger than {above} ETH pays an extra {extra}% of its ETH side as a hook fee, on top of any other hook fee, settled the same way." |
| Volatility fee | ABC | move % (5), within blocks (20), fee % (3) | "When the pool price has moved more than {move}% within the last {blocks} blocks, the hook fee on the ETH side of every swap is {fee}% until the move settles below that; otherwise the normal hook fee applies." |
| Split the fee | ABC, needs Swap fee | share to my wallet % (70), second address | "Split every hook fee: {a}% to my wallet and {100−a}% to {b}." |
| Dynamic LP fee | BC | low % (0.3), high % (1.0) | "The pool uses a dynamic LP fee that the hook sets per swap between {lo}% and {hi}% based on recent price volatility (the BaseDynamicFee pattern)." Not on IMD launch pools, whose LP fee is fixed at 1.25% by policy. |

### 4.3 Protection

| Block | Types | Parameters | Sentence |
|---|---|---|---|
| Anti-sniper window | ABC | minutes (10), max buy % of supply (1.0) | "For the first {minutes} minutes after the pool opens, each wallet may buy at most {pct}% of the total supply in total; larger buys revert." |
| Max buy per wallet | ABC | % of supply (2.0) | "Each wallet may buy at most {pct}% of the total supply through this pool in total, for the life of the pool; larger buys revert. Sells are never blocked." |
| Max swap size | ABC | tokens (1,000,000) | "Reject any single swap whose specified amount is above {tokens} {symbol}, in either direction. This caps only the amount the swapper specifies." |
| Anti-sandwich | ABC | none | "Protect swappers from sandwich attacks: within one block, swaps against the direction of the block's first swap execute at no better than the block's opening price (the AntiSandwichHook pattern)." |
| Cooldown | ABC | seconds (30) | "A wallet must wait at least {seconds} seconds between its swaps in this pool." |
| Circuit breaker | ABC | move % (20), within blocks (10), pause minutes (5) | "If the pool price moves more than {move}% within {blocks} blocks, reject every swap for the next {pause} minutes, then resume automatically. Liquidity can still be removed during the pause." |

### 4.4 Treasury and rewards

| Block | Types | Parameters | Sentence |
|---|---|---|---|
| Buyback jar | ABC | jar rate % (1.0), trigger ETH (0.1), then (burn / send to treasury) | "Collect {rate}% of the ETH side of every swap into a jar held by the hook. Whenever the jar holds at least {trigger} ETH, anyone may trigger it to buy {symbol} from this pool with the whole jar and {action}. The swap that fills the jar does not revert if the buyback fails." |
| Prize pot (Games and lotteries group) | ABC | pot rate % of buys (2.0), draw every hours (1) | "Collect {rate}% of the ETH side of every buy into a prize pot. Every {hours} hour(s), anyone may trigger a draw that pays the whole pot to one buyer from that period chosen at random, weighted by how much ETH each buyer spent; randomness comes from recent block data, which is acceptable for small pots and must be stated in the README." |
| Share fees with LPs | ABC, needs Swap fee | share % (50) | "Donate {pct}% of every hook fee back to the pool's liquidity providers in proportion to their liquidity (through the PoolManager's donate), and send the rest as the fee block says." |

### 4.5 Liquidity rules

| Block | Types | Parameters | Sentence |
|---|---|---|---|
| Liquidity lock | ABC | days (7) | "Liquidity added to the pool is locked for {days} days from the time it was added; removing it earlier reverts. The launch factory's own zero-change fee collection is always allowed." |
| JIT penalty | ABC | blocks (10) | "Penalize just-in-time liquidity: liquidity removed within {blocks} blocks of being added forfeits the fees it earned in that time to the remaining liquidity providers (the LiquidityPenaltyHook pattern)." |
| LP allowlist | ABC, owner power | none | "Only addresses the owner has added to a liquidity allowlist may add liquidity; anyone may remove their own. The launch factory's initial seeding is always allowed." |
| Minimum position | ABC | ETH value (0.05) | "Reject adding liquidity worth less than {eth} ETH at the current price. Removing is never blocked by this rule." |

### 4.6 Timing and access

| Block | Types | Parameters | Sentence |
|---|---|---|---|
| Scheduled open | ABC | date-time UTC | "Reject every swap before {when} UTC. Liquidity may be added before then." |
| Trading hours | ABC | from hour, to hour (UTC) | "Allow swaps only between {from}:00 and {to}:00 UTC each day, judged by block timestamp; reject all others. Liquidity changes are always allowed." |
| Allowlist opening | ABC, owner power | minutes (15) | "For the first {minutes} minutes after the pool opens, only addresses the owner has added to an allowlist may buy. After that, anyone." |
| Pause switch | ABC, owner power | none | "The owner may pause and unpause swaps. Liquidity can always be removed while paused." |
| Sunset | ABC | date-time UTC | "After {when} UTC every rule above stops applying and the hook lets every swap and liquidity change through unchanged, forever." |

### 4.7 Advanced

| Block | Types | Parameters | Sentence |
|---|---|---|---|
| Price oracle | ABC | none | "Record a time-weighted average price of the pool that other contracts can read (the BaseOracleHook pattern, with a Uniswap v3 compatible observe interface)." |
| Limit orders | ABC | none | "Let users place limit orders in the hook that fill automatically when the pool price crosses the order price, and withdraw unfilled orders at any time (the LimitOrderHook pattern)." |
| Yield on idle liquidity | ABC | protocol (Aave / Morpho) | "Liquidity the pool is not using at the current price is lent on {protocol} and recalled when needed for swaps (the ReHypothecationHook pattern). If {protocol} has no deployment on the chosen chain, the swarm must report that as a blocker instead of substituting another protocol." |
| Batch auctions | BC | seconds (60) | "Swaps are not filled immediately: the hook collects them and settles each batch at one clearing price every {seconds} seconds (the BaseAsyncSwap pattern)." |
| Stable curve | BC | none | "Replace the pool's pricing with a constant-sum curve suited to two assets of the same value (the BaseCustomCurve pattern)." |
| Pool rules | BC | fee tier (0.05 / 0.3 / 1 %) | "Only pools where one currency is native ETH and the fee tier is {tier}% may be initialized with this hook; any other pool initialization reverts." |
| Donation rules | ABC, owner power | who (only the owner / allowlisted / nobody) | "Donations to the pool are allowed from {who}; all other donations revert." |

### 4.8 Custom

| Block | Types | Parameters | Sentence |
|---|---|---|---|
| Custom rule | ABC | one or two sentences (text, cleaned) | the text itself |

### 4.9 Owner powers

The description always ends the rules with one of: "No owner functions, no backend signer, no upgrade path." or "Owner {address} may only: {powers}. No other admin function, no backend signer, no upgrade path." `{address}` is the owner field, else the connected wallet.

### 4.10 Combination rules (enforced in the palette and the stack)

- At most one of each block. Fee that fades, Split the fee and Share fees with LPs need Swap fee and are removed with it. Different buy and sell fees cannot coexist with Swap fee.
- The sum of all ETH-side rates (Swap fee or the larger of buy/sell, Whale fee extra, Buyback jar, Prize pot) must be ≤ 5%. A red notice blocks Continue above that.
- Blocks marked BC are dimmed under type A with the pill OWN POOLS ONLY and are left out of the request; token blocks exist only under type A.
- Blocks are a JSON file, `src/blocks/catalog.json`: `{id, group, title, blurb, types, params[], short, sentence, ownerPower?, requires?, excludes?, replaces?, owner?[], anyone?[], user?[], view?[]}`. Adding a block changes only that file plus a test that its sentence renders.

### 4.11 Management interface (what each block asks the swarm to expose)

Every block whose behavior can be operated or read after launch appends to its sentence the exact functions the hook must expose, so the hook page can offer buttons without reading the delivered source. The composed text ends with "Keep the function names exactly as written so the storefront can show them." The site builds a minimal ABI from these signatures. Owner functions are gated by the hook's `owner()`.

| Block | Owner functions | Anyone / user functions | Views |
|---|---|---|---|
| Swap fee, Different buy and sell fees | | `claimFees()` redeems minted claims to the recipient | |
| Fee that fades | | | `currentFeeBps()` |
| Volatility fee | | | `isVolatile()` |
| Dynamic LP fee | | | `currentLpFee()` |
| Anti-sniper window | | | `windowEndsAt()` |
| Max buy per wallet | | | `boughtBy(address)` |
| Cooldown | | | `nextSwapAt(address)` |
| Circuit breaker | | | `haltedUntil()` |
| Buyback jar | | `buyback()` | `jar()` |
| Prize pot | | `draw()` | `pot()`, `nextDrawAt()` |
| Liquidity lock | | | `unlockAt(address)` |
| LP allowlist | `setLpAllowed(address[] accounts, bool allowed)` | | `isLpAllowed(address)` |
| Scheduled open | | | `opensAt()` |
| Trading hours | | | `isOpen()` |
| Allowlist opening | `setAllowed(address[] accounts, bool allowed)` | | `isAllowed(address)` |
| Pause switch | `pause()`, `unpause()` | | `paused()` |
| Sunset | | | `sunsetAt()` |
| Price oracle | | | `twap(uint32 secondsAgo)` returning a Q64.96 sqrt price |
| Limit orders | | `placeOrder(bool zeroForOne, int24 tick, uint256 amount)` returning an id, `cancelOrder(uint256 id)`, `claim(uint256 id)` | |
| Yield on idle liquidity | | `rebalance()` | |
| Batch auctions | | `settleBatch()` | |
| Donation rules | `setDonor(address account, bool allowed)` | | |

Blocks with no row (Whale fee, Split the fee, Max swap size, Anti-sandwich, Share fees with LPs, JIT penalty, Minimum position, Stable curve, Pool rules, Custom rule) run themselves and show nothing to manage.

### 4.12 Who uses each block (shown on every block card)

Most blocks run by themselves inside the pool and need nothing from anyone. The card says which kind each block is, in these words:

| Kind | Blocks | What the hook page shows |
|---|---|---|
| Runs itself | Swap fee, Fee that fades, Different buy and sell fees, Whale fee, Volatility fee, Split the fee, Dynamic LP fee, Anti-sniper window, Max buy per wallet, Max swap size, Anti-sandwich, Cooldown, Circuit breaker, Share fees with LPs, Liquidity lock, JIT penalty, Minimum position, Scheduled open, Trading hours, Sunset, Stable curve, Pool rules | Readings only, where the block has a view |
| You (the owner) flip a switch or keep a list | Pause switch, Allowlist opening, LP allowlist, Donation rules | Owner controls |
| Anyone presses a button when it is time | Buyback jar, Prize pot, Yield on idle liquidity, Batch auctions | Traders, anyone, and readings |
| For traders | Limit orders | An order form under Traders, anyone, and readings |
| For other contracts and apps | Price oracle | A reading (the average price); nothing for the owner to do |

So "Price oracle" is not a setting the creator operates: it makes the pool publish its average price so other apps can rely on it. "Limit orders" gives the people who trade the pool a new ability. Neither needs managing; the hook page just exposes them.

### 4.13 Blocks that need a heads-up

Some blocks can be worked around by determined users or need care. They stay in the catalog, and the site flags them quietly: a small yellow warning sign (`!`) next to the block's name in the palette, on the block card and in the summary list. Hovering or focusing the sign shows a tooltip, "Heads up: this block is easy to work around or needs care." followed by the block's own sentence below. No red labels, no extra text on the card. The Prize pot lives in the palette group "Games and lotteries". The hook page shows the same sign next to the block label.

| Block | Warning shown |
|---|---|
| Prize pot | The draw uses block data for randomness. A well-funded player can tilt the odds. Keep pots small and say so on your token's page. |
| Circuit breaker | A large trader can trip the breaker on purpose to stall trading for everyone. |
| Anti-sniper window, Max buy per wallet, Cooldown | Per-wallet limits can be sidestepped by splitting across several wallets. |
| Max swap size | A trader can split one large trade into several smaller ones. |

The catalog entry carries the text in a `risk` field; a block with a `risk` field shows the sign everywhere in the site.

### 4.14 Tested marks

The site does not hold hook code: every launch is written, tested and audited by the swarm for that request (section 6). So the proof that a block works is a real launch that used it. `evidence/blocks-verified.json` in the spec repository records that proof: an array of `{block, launchId, chainId, hook, passed, checkedAt, notes}`, one entry per block per verification launch (15.4). The Builder fetches `https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/blocks-verified.json` at load (that host allows browser reads) and falls back to the bundled copy `public/blocks-verified.json`. A block with an entry whose `passed` is true shows a small tick and the words "tested on Sepolia" on its card; any other block shows "not yet tested on Sepolia" in its tooltip and nothing else changes. The file ships empty in job 2 and fills as launches pass. Before Robinhood Chain and Ethereum are enabled (15.6), every block in the catalog must have a passing entry, or it is removed.

## 5. Composing the launch request

### 5.1 The description text (at most 7,500 characters)

Type A:
```
Launch {name} ({symbol}) with a Uniswap v4 hook on {chain}, paired with {ETH|IMD}.
{token sentence}
```
Type B:
```
Deploy one contract: {hookName}, a standalone Uniswap v4 hook with no token and no pool of its own, on {chain}. It must be usable by anyone initializing a new pool with it on the PoolManager passed as a constructor argument ({chain} PoolManager {address}).
```
Type C:
```
Deploy one contract on {chain}: {hookName}, a Uniswap v4 hook for the existing token {tokenAddress} ({symbol}), paired with ETH. No new token and no pool created by the launch; the creator will initialize the pool with this hook afterwards on the PoolManager passed as a constructor argument ({address}).
```
Then, for every type:
```
The hook does exactly the following, and nothing else:            (with words only: "exactly what the creator describes below, and nothing else"; with words and rules: "exactly what the creator describes, plus the numbered rules, and nothing else. If the description and a numbered rule disagree, the numbered rule wins.")
In the creator's own words: <description>{words}</description>      (only when words were written)
1. {rule}  2. {rule} …                                               (only when blocks were stacked)
{owner powers sentence, ending "through the functions named above" when there are powers}
Fees are always taken from the ETH (pair currency) side, never from {symbol}; a fee the PoolManager cannot pay directly is minted as a claim the recipient can redeem.
A: Enable beforeInitialize (required by the IMD launch factory) and only the callbacks the behavior above needs. Take the PoolManager as a constructor argument. Owner, if any, is $owner.
A: Pool: {poolShare}% of my 90% share seeds the pool; the remainder goes to {remainderTo}.   (only once the user has chosen; never a default)
B, C: Take the PoolManager as a constructor argument and enable only the callbacks the behavior above needs. The deployed address must carry the correct hook permission bits (mine a CREATE2 salt). Owner, if any, is $owner.
Start from the creator's own source at {repo} commit {commit}: audit it as imported code, adapt it to this launch, and keep its behavior.   (only with Advanced: own code)
Keep the function names exactly as written so the storefront can show them. Composed with The Hooks Store block builder.   ("block builder" only when blocks were used; the fixed last sentence marks cards Built here)
```
Words are cleaned: `"`, `\`, `<`, `>` and line breaks become spaces; 3,000 characters maximum. PoolManager addresses: Sepolia `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`, Ethereum `0x000000000004444c5dc75cB358380D2e3dE08A90`, Robinhood `0x8366a39CC670B4001A1121B8F6A443A643e40951`.

### 5.2 The request body

Type A:
```json
{ "objective": "<text>", "shape": "chain", "references": ["uniswap-v4-hooks", "uniswap-v4-security"],
  "steps": [ { "skill": "build-contract-project" }, { "skill": "adversarial-review" } ],
  "onchain": "univ4_hook", "chainId": 11155111, "pairWith": "eth", "owner": "0x…",
  "economics": { "poolBps": 5000, "remainderTo": "0x…" }, "customToken": true, "github": true }
```
`customToken` only when Bring your own token is used; `owner` and `remainderTo` only when set. Types B and C:
```json
{ "objective": "<text>", "onchain": "evm_contracts", "chainId": 11155111, "owner": "0x…", "github": true }
```
With Advanced: own code, both add `repoUrl` and `baseCommit` (resolved first with `POST /requests/import` when the relay exists). The compact JSON must stay under 16 KiB.

### 5.3 Evidence that IMD accepts these

Run through `POST https://api.imd.fun/requests/check` on 2026-10-20 and 2026-10-21, all with zero blockers and the full plan (build, independent tests, four audit specialists, judge, deploy on Sepolia); the exact bodies and answers are saved under `evidence/`:

- `check-A-default-blocks`: type A from the default stack (kind "hook"; token name, symbol, fee rule, fee destination and admin recognised).
- `check-liquidity`: type A with Liquidity lock and JIT penalty. `check-prompt`: type A written in plain words inside `<description>`.
- `check-standalone`: type B (kind "contracts"). `check-attach`: type C for an existing token (kind "contracts", recipient recognised).
- `check-all-blocks-A1`, `A2`, `B`, `C`: every block in section 4 with its management functions, split across four requests so each stays under the limit; together they cover all 31 behavior blocks under every launch type that allows them.
- `check-job-0` and `check-job-1`: the hero art job and the first website job.

## 6. Chains, payment and fees

### 6.1 Where the hook deploys

Phase 1: Sepolia. Phase 2: Robinhood Chain and Ethereum, released together. `site-config.json` lists the enabled deploy chains; the Builder shows the others disabled with "(phase 2)".

### 6.2 Where the payment happens

IMD's Intake on Sepolia sells only oracle questions, so a launch is paid on **Ethereum or Robinhood Chain** in that chain's IMD, while the body's `chainId` says where the hook deploys. Intake v2 on every chain: `0xa43e6f75ee006411f79ac1c84120606c2330de82`. IMD on Ethereum `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7`, on Robinhood `0x5f7bb59365ce557c26dbcaa4ee9d39a4b95b7127`. Action id `launch.open@launch-1` as bytes32 `0x6c61756e63682e6f70656e406c61756e63682d31000000000000000000000000`. Price from `priceOf(action, asset)`, today 0.5 IMD; refuse to send if 0 or above 0.5 IMD. Two transactions: `IMD.approve(intake, price)` then `Intake.request(actionId, bodyBytes, (0x0, 0x00000000), imd, price)`. The Intake ABI is in the foundation repo at `docs/checks/consolidated/sources/intake-abi.json`. Without the relay the Launch page warns that a refused body spends the fee and offers Copy request.

### 6.3 Fee table

The swarm fee is 0.5 IMD per launch, once, and the audit panel is included in it. (The earlier foundation design paid 0.5 IMD for a build plus 0.5 IMD for a separate oracle review; IMD's own launch replaces that second step, so there is no 1 IMD total.) Every amount on the site is rendered in the terminal face (section 8), never in the pixel body font.

Type A: swarm fee 0.5 IMD; gas for two transactions; supply 10% swarm / 90% you with {poolShare}% of yours in the pool; pool trading fee 1.25% (1% to you, 0.25% network) plus the hook's own fee; deployment paid by IMD.
Types B and C: swarm fee; gas; "Token and pool: none created. You get the audited hook contract only."; for C "Opening the pool: one more transaction from your wallet after the hook is live, prepared by the site"; deployment paid by IMD.
A featured #ad slot is 0.1 IMD for 24 hours, optional, phase 2; anyone can boost a placement with more IMD to rank it higher, and boosts are not refunded (6.6).

### 6.4 Opening a pool for a type C hook (phase 2b)

After a type C hook is live, the hook page shows OPEN THE POOL: the site builds `PoolManager.initialize(poolKey, sqrtPriceX96)` for currencies (ETH, token) sorted, the fee tier the Pool rules block chose (else 0.3%), the matching tick spacing, the hook address, and a starting price the user types as "1 token = x ETH". The wallet sends it. Then a link to add liquidity on a v4 interface for the chain. Phase 1 shows the same panel with the values and a copy button but tells the user to send it from a v4 interface.

### 6.5 Hook-only address bits (to confirm in phase 1)

A v4 hook's address must encode its permissions. The `univ4_hook` launch mines the address. For `evm_contracts` the docs do not say whether the factory mines a salt, and IMD's check accepted the request without a blocker. The first type B launch on Sepolia is the test: if the deployed address has the wrong bits, the site switches types B and C to a fallback where the swarm job delivers audited source and bytecode (`job.open`, no `onchain`) and the site deploys it through a minimal public CREATE2 deployer with a salt mined in the browser,.

### 6.6 Featured placements, version 2 (phase 2)

The foundation repo's `FeaturedPlacements` (0.1 IMD for 7 days, ordered by purchase) is too cheap for a week and invites spam. Version 2 keeps its custody model and changes the terms:

- Duration 24 hours; base price 0.1 IMD per placement; one live placement per listing; `#ad` on every placement and event; the same deposit, withdraw, cancel with pro-rata refund of the base price, settle, proceeds recipient and two-step owner as before. No proxy, no upgrade, no self-destruct.
- `boost(placementId, amount)`: anyone may add IMD from their deposited balance to an open placement. Boosts are never refunded: on cancel they go to the pinned proceeds recipient, on settle both base and boosts do. `rankOf(id)` returns base plus boosts; `featured(cursor, scanLimit)` returns each placement's total so the site sorts by total paid, ties by the earlier purchase.
- Deployed through an IMD contracts launch (`jobs/job-6a-ads-contract.json`, `evm_contracts`, Sepolia first), which includes the audit panel; the free check's answer is saved as `evidence/check-job-6a`. The listing registry deploys unchanged beside it.

## 7. Data: how a static site reads everything

### 7.1 Browser access, tested 2026-10-20

`api.imd.fun` sends no CORS header on `/launches`, `/jobs`, `/intake/…`, `/requests/check` or `/publications`, so a page cannot call them. `GET /swarm`, the IPFS gateway `ipfs.imd.fun` and the public RPCs for Ethereum, Sepolia and Robinhood do allow it.

### 7.2 Catalog from chain

The Intake emits `Requested(bytes32 requestId, address payer, bytes32 action, bytes body, address callbackTarget, bytes4 selector, address asset, uint256 amount)` and `Completed(bytes32 requestId, uint8 status, bytes32 resultHashOrReason, string uri, bool delivered)`. The site reads `Requested` logs for the `launch.open@launch-1` action on Robinhood and Ethereum in 10,000-block ranges walking backwards (cached in memory and `localStorage`), decodes the body JSON, keeps `onchain` `univ4_hook` and `evm_contracts` bodies whose objective mentions "Uniswap v4 hook", then reads `Completed` for those ids: status 0 with an `ipfs://CID/result.json` uri → fetch it from `https://ipfs.imd.fun/ipfs/CID/result.json` for the launch id and addresses; status 1 or 2 → Failed with the reason decoded as ASCII. A build-time snapshot `public/launches.json` (from `GET /launches` and `/launches/:id`, run before each publish) supplies launch numbers and addresses for older history; chain data wins. The fixed last line in 5.1 marks cards Built here. Block labels on cards come from the numbered rules: the site matches each rule against the catalog's sentence templates and falls back to "Custom".

### 7.3 Status for the user's own launches

Same logs filtered by payer, plus pending request ids saved in `localStorage` when launched from this site.

### 7.4 Optional relay

A single-file Cloudflare Worker forwarding `POST /check` and `POST /import` to `api.imd.fun/requests/…`, and `GET /launches*`, `/jobs/:id`, `/intake/:chain/:tx` to the same paths, adding `Access-Control-Allow-Origin: *`, caching GETs 30 seconds, allowing nothing else. `site-config.json` has `relayUrl` (null by default). With it: the free check button and the "What the swarm understood" panel work live, the pond ticker names launches, the timeline shows Building / Audit panel / Deploying, and own-code imports are resolved. The swarm writes and tests it; the operator deploys it. The operator will also ask IMD to enable CORS on those routes.

## 8. Design system

**Identity.** A retro-pixel Steam storefront on beige paper: Steam's bones (sticky bar with search, a full-bleed featured scene, a carousel, a filter rail and a dense grid, boxy panels) in a pixel skin (hard corners, 3 px ink outlines, hard 4 px offset shadows, no blur, no gradients outside the painted scene, no rounded corners). The painted pond is the one soft element and is confined to the landing.

**One theme, by choice.** Beige for everyone; the site does not switch to a dark palette. Tokens: paper `#e9dfc3` (page), paper-2 `#dfd3b0` (rails, panels), paper-3 `#f3ecd8` (cards, inputs), ink `#15130f` (text, borders, shadows), ink-2 `#5b5342` (muted), ink-3 `#8a816a` (dashed rules, state pills), pine `#1e5a3a` (top bar, primary buttons, links, active states), pine-2 `#2c7a50` (hover), on-pine `#f3ecd8`, ad `#c9a227` (the #AD pill only), bad `#a3382b`, warn `#a1731c`.

**Type.** Press Start 2P for the bar, headings, buttons and pills at 8–26 px, never for paragraphs. Pixelify Sans 15–18 px for body. VT323 for addresses, hashes, the exact request text, function signatures, and **every number and amount** (0.5 IMD, 50%, 1.25%, counts, numeric inputs), because Pixelify Sans draws a 5 that reads as an 8. Google Fonts with system fallbacks.

**Components.** Button, pill, state pill (grey, wraps, 96 px max), #AD pill, input, numeric input in VT323, notice (left stripe in the semantic color), segmented control, collapsible group, card, ad card (warm paper), open-slot card (dashed), choice card, type card (pine when selected), summary list, timeline, steps, manage rows. Content column 1,180 px, 16 px gutters, one breakpoint at 820 px. The top bar never wraps above 820 px (3.0). No footer.

**Copy.** Plain and short; buttons start with a verb; never "audited" for a hook that is not live; never invented numbers.

## 9. The pond, in monochrome character tiles

The landing background is character-tile art, like the owner's first reference (creatures drawn from small character tiles over a faint grid), but the picture is the pond from the owner's second reference: a tree line and far bank across the top, a leafy branch hanging in from each top corner, open water with lily pads and a couple of flowers, reeds at the shores, and three Pepe frogs on the near bank at the bottom right, the one at the water's edge holding a long rod out over the water with the line down to a float. Monochrome by choice: ink on beige, three tile shades, no color.

- **Tiles.** Every non-space character is a 9 × 15 px cell. `%`, `#` and `8` get the darkest tile, `S` the middle, `t` and `:` the lightest; `.` `,` `'` `"` `-` `~` are untiled dots in the muted ink; rod and line characters are plain ink; the float `o` is ink on the middle tile.
- **Layers**, all `<pre>` elements absolutely positioned inside the landing, pointer-events none, `aria-hidden`: the canopy (a seeded field, 220 × 8, dense at the top and breaking up into a shoreline of `,` and `-`), two sparse water fields (`-` and `.` at about 4% over 220 × 36, each with seven `><>` or `<><` fish dropped in at seeded spots; never `~`, which reads as an N in VT323) that alternate every 1.6 s so the water moves, twelve lily pads (three flat sprites with a `\` notch and no dark centre, two with a `*` flower) placed by percentage and drifting a few pixels over 10–13 s, two reed clusters (`8` heads on `|` stems) at the left shore and the lower left, the two branches (hand-drawn, swaying 1° over 8–10 s around their top corner), the near bank (a seeded grass field 96 × 14 with a sloped top edge and two seated Pepe frogs stamped into it: a 17 × 7 sprite with a dark `8` rim, `S` face, `(_o)(_o)` eyes and a `======` mouth, at rows 2/74 and 6/58), the fisher (a separate 46 × 15 layer at the bank's left edge, redrawn per frame: a 25 × 8 Pepe head with `(_oo_)(_oo_)` eyes and a `.============.` mouth over a tiled body, its own grass rows under it, the rod from the hands at row 9), two fish (`<><`, `><>`) swimming across the lower rows on CSS keyframes, and three leaves (`,` `'`) drifting down.
- **Cast.** Trigger → reel (the rod lifts as four `/` up and left of the head), cast (rod out, the line flies out as `.----------.` with the float `o` ahead of it), land (`(*)` splash at the water), ripple (`( o )` with a second ring), idle (rod out, line `/` down to the float at `( o )`). Seven frames at 240 ms; casts queue up to three. Reduced motion: no water alternation, no drift, no sway, no fish or leaves, no cast; the ticker still updates.
- **Triggers.** (a) a new `Requested` log with the launch action on Ethereum or Robinhood (polled every 20 s), (b) the user's own launch transaction confirming, (c) with the relay, a new live hook, (d) a click on the water. Each cast updates the ticker ("{name} was launched on {chain} · {relative time}" or "A new hook was requested on {chain}").
- **Phase 2 polish.** A hat on the fisher, a bird or two over the canopy. Still monochrome.

## 10. Technical choices

Vite + React + TypeScript, hash routing, `base: "./"`, static export; wagmi + viem with the wallet layer reused from the polished repo, three chains; one `styles.css` of tokens; configuration only through the committed `public/site-config.json` (enabled deploy chains, payment chains, relayUrl, featuredRequestId, trade URL templates, pool-opening defaults); tests as in section 12; never fabricate addresses, launch numbers or audit results.

## 11. What to reuse

From `launch-2254-build-hooks-store-polished` at `11f246f`: `src/wallet/*`, `src/lib/route.ts`, `vite.config.ts`, `tsconfig.json`, the `tests/` harness shape. From `launch-1811-build-technical-foundation-hooks` at `46e17ea`: `docs/checks/consolidated/sources/intake-abi.json` and the chain references in `deployment/manifest.json`. Phase 3 may reuse `HookListingRegistry.sol` and `FeaturedPlacements.sol`.

## 12. Acceptance criteria

Store: no horizontal scroll at 320, 390 and 1440 px; the scene renders behind the copy and the copy stays readable; the top bar never wraps above 820 px with a connected address; filters and search change the grid; an unknown address query resolves on chain or says nothing was found; `/swarm` numbers appear or are hidden.

Builder: first visit shows the chooser; both modes work and switching keeps words and blocks; every catalog block is addable under the right types and renders its sentence with defaults; the three launch types change the request shape; the composed text for the fixture (standard token, Swap fee 1%, Anti-sniper 10 min 1%, Buyback jar 1% 0.1 ETH burn, Sepolia, pool 50%) equals `tests/fixtures/compose-A.txt` byte for byte, and likewise `compose-B.txt` (hook only, Anti-sniper, Cooldown) and `compose-C.txt` (existing token, Swap fee); the 5% rule and dependency rules are enforced; drafts survive a reload.

Launch: on an Anvil fork of Robinhood with a mocked IMD balance, the three steps run in order for type A and type B bodies, the bytes sent equal the preview, the request id is parsed; wrong chain, rejected signature and zero price are covered; no live payment in tests.

Hook page and My hooks: decode real `Requested` and `Completed` fixtures from both chains; Live with addresses for a real result.json fixture; Failed with the decoded reason.

Blocks: every block in section 4 has a passing entry in `evidence/blocks-verified.json` from a real Sepolia launch before the mainnets are enabled; the Builder reads the file at load and shows the tested mark for passing blocks and the not-yet-tested tooltip for the rest, with the fetch failure falling back to the bundled copy.

Build: `npm run build` and `npm test` pass; `dist/` works from an IPFS gateway subpath; Lighthouse accessibility ≥ 95 on Store and Builder.

## 13. Delivery plan for the swarm

One IMD website project, built as `job.open` then `job.continue` jobs so each job starts from the previous commit, plus one contracts launch for the phase 2 ad contracts. Bodies in `jobs/`, checked with the free `POST /requests/check` before paying. The spec and mockup live in a public GitHub repository the first website job imports with `repoUrl` + `baseCommit`.

| # | Job | Delivers |
|---|---|---|
| 1 | Shell, Store and the pond | Top bar, routing, tokens, full-bleed landing with the character-tile scene and the describe box, the self-scrolling #ad strip with the open-slot card, Learn with the sources and the permissions table, catalog from the snapshot with working filters and keyword search, Learn, the cast animation with the click trigger, placeholders for the other routes |
| 2 | Builder and composer | Launch type first, modes and chooser, palette groups and state pills, all catalog blocks with their management notes, settings, summary preview with the exact-text disclosure, composer and body encoder, draft persistence, unit tests with the three fixtures |
| 3 | Chain reads, search by address, hook page, My hooks | Intake log decoding on both chains, result.json fetch, block-label matching, address resolution on chain, the Manage and Anyone-can panels built from section 4.11, pond triggers from chain, snapshot script |
| 4 | Launch flow | Wallets on three chains, price read, approve, request, receipt parsing, Launch page per type, pool-opening panel (copy-only in phase 1) |
| 5 | Relay and polish | Worker, live free check and facts panel, stage names, import of own code, scene polish (reeds, hat, birds), copy pass, hosting under the existing label |
| 6a | Ad contracts (contracts launch, phase 2) | `HookListingRegistry` and `FeaturedPlacementsV2` per 6.6, audited and deployed by IMD on Sepolia, later on the mainnets |
| 6 | Listings and #ad (phase 2) | The Promotions panel in My hooks: promote a hook (free listing, deposit, 24-hour placement), boost, cancel, withdraw; the strip reading `featured()` with creator ENS names; the hook page's #ad state |

## 14. Decisions taken by the owner (2026-10-21)

1. Fonts: Press Start 2P, Pixelify Sans and VT323, numbers in VT323. Kept.
2. Pool share: no default. The user chooses it, and can change it freely within IMD's 10–90% range.
3. Trade links: Uniswap's interface on every chain where it lists the pool. No code or asset from any other product is used anywhere in this project; other sites were only looked at for ideas.
4. Going live: see section 15. The owner flips phase 2 after at least one successful Sepolia launch of each type; Claude prepares the edit.
5. Hook-only test: one real type B launch on Sepolia early in phase 1, paid by the owner (0.5 IMD), before any fallback is built.
6. Prize pot stays in version 1, inside the Games and lotteries group; every block with a risk field carries the warning sign of 4.13.
7. Ads: 0.1 IMD base per 24 hours with boosts. Kept.
8. GitHub: not the owner's personal account. A new GitHub account is created for the project (IMD only imports from public GitHub repositories and delivers to GitHub, so a project account is the practical home); the push happens from it.
9. Site name: the live site is `the-hooks-store.sites.imd.fun` (`the-hooks-store.site.identitymd.eth`). The label was free on 2026-10-21 and is claimed by job 1, so every delivery publishes there; while the site is unfinished the page says so in its banner.

## 15. From mockup to live

The mockup is a drawing of the product, not the product. The swarm builds the real site from this spec and the mockup. Here is the whole path, and who does what at each step.

1. **Publish the brief.** Done on 2026-10-21: the `spec/` folder is the public repository https://github.com/the-hook-store/hooks-store-spec under a GitHub account created for the project (not the owner's personal one). Job 1 names it with `repoUrl` and `baseCommit`. IMD accepts only public GitHub repositories as a starting point and delivers every job to GitHub, which is why a project account is needed at all. Two consequences, both already in job 1's body: IMD hosts a site built from your own repository only after a `site-content-check` step, so job 1 is a two-step chain (content check, then `build-website`); and the repository needs an `index.html` at its root, which introduces the spec and opens the mockup. IMD's free check passes job 1 with no blockers (evidence/check-job-1.response.json).
2. **Pay for job 1.** The explorer's Launch form cannot send this job: when it is given a repository it only hosts that repository as it is, and it has no way to paste a full body. So the owner pays on-chain instead, through IMD's Intake contract on Ethereum (where the owner's IMD is), from a local page Claude prepared (`tools/pay-onchain.html`, outside this repository): connect the wallet, approve 0.5 IMD, send the request. The page holds the exact checked body; its transaction encoding was verified against an independent encoder and a dry run on Ethereum. Claude cannot pay: every job and every test launch is paid by the owner's wallet, and Claude prepares the exact text each time. Within hours the swarm delivers source and a built site to a GitHub repository under IMD's launches organisation, and IMD pins the built site to IPFS and serves it at `the-hooks-store.sites.imd.fun`. That is the final name, claimed from day one; until the site is finished its banner says it is in progress.
3. **Iterate.** Jobs 2 to 5 are `job.continue` requests on the same project: each one starts from the previous commit, and each delivery replaces what is served at the site name. Claude reads every delivery, screenshots it, and writes the next job or a fix-up continuation. Budget: six website jobs at 0.5 IMD plus a few continuations, so roughly 4 IMD for the site.
4. **Test on Sepolia with real money, every block.** During jobs 4 and 5 the owner makes real launches from the site, in two rounds, each launch 0.5 IMD plus gas on Ethereum or Robinhood, deploying on Sepolia.
   - *The three journeys.* One hook with a new token (type A), one hook only (type B), one hook for an existing token (type C), each from a small default stack. This proves the launch flow end to end and settles the type B address question (6.5).
   - *The block verification round.* The four all-blocks requests of 5.3 (A1, A2, B, C) sent as real launches, so every block in section 4 is built, audited and deployed at least once. For each block Claude checks the delivered hook: the 4.11 function names are in the deployed ABI and do what the sentence says, the owner-only ones refuse other callers, and where a rule can be exercised with a Sepolia swap (fees, limits, windows, cooldowns, jars) it is exercised and the effect is read back. Every block gets an entry in `evidence/blocks-verified.json` (4.14) with passed true or false and notes. A failing block has its sentence or its 4.11 functions rewritten and goes into one more launch, or leaves the catalog. The Custom rule block cannot be pre-verified; the user's own launch audit covers it, and the card says so.
   Budget: seven launches, 3.5 IMD plus gas, before the mainnets open. Nothing on the site is sold on Robinhood Chain or Ethereum until this round is complete.
5. **Go live, phase 1.** The site is static files, so "live" is a hosting decision, and two options can run at once:
   - *IMD hosting.* Every delivery already publishes to `the-hooks-store.sites.imd.fun` and its ENS name `the-hooks-store.site.identitymd.eth`. Going live is removing the in-progress banner. The old `the-hooks-store-uniswap-v4-hooks` name stays on its offline page or is pointed at the new site later.
   - *The owner's own domain.* Cloudflare Pages (free) connected to a fork of the delivered repository under the owner's GitHub account, building `dist/` on every push, with a custom domain such as thehooksstore.xyz. Claude sets it up with the owner in about fifteen minutes. The relay worker (7.4) lives on the same Cloudflare account.
   Both serve the identical build. The IMD name is the canonical, audit-trailed copy; the custom domain is the one to advertise.
6. **Phase 2.** The owner (or Claude, on the owner's go) changes `public/site-config.json` to enable Robinhood Chain and Ethereum as deploy chains, the ad contracts are deployed by the job 6a launch (Sepolia first, then the mainnets), job 6 wires the Promotions panel and the strip, and the same republish puts it live.
7. **After that.** Changes are new `job.continue` jobs; the owner never edits code. Operating costs are zero: no server, no database, the relay is within Cloudflare's free tier, and users pay IMD directly for their own launches and placements.

