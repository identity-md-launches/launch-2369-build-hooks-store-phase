# The Hooks Store — product and build specification

Version 1.34 · 2026-10-22 · Status: draft for review, then handed to the IMD swarm job by job.

This document is a specification, not a wish list. Every section says exactly what to build, what data it uses, and how to tell when it is done. The clickable mockup in `mockup/index.html` is the visual reference; where the mockup and this text disagree, this text wins.

Changes in 1.34 (2026-10-22): proven launches are automatic (decision 26 amended): no switch; a matching stack is built from the proven repository in the background, the summary shows one line, and a failed import falls back silently to a fresh build. Only the creator's own repository in Advanced overrides it.

Changes in 1.33 (2026-10-22): the wait. A hook takes one to three hours because every one is written, tested and audited; the owner decided two answers (decisions 26 and 27). Proven launches (4.17): the store indexes every verified launch and lets a user who stacks the same blocks start from its audited repository, so the swarm adapts and re-audits instead of writing from scratch; the wait is stated before payment and the hook page can be left and found again. Instant hooks (6.8, phase 3): for stacks with a proven launch the swarm builds an audited factory per chain, and the Builder offers "Create instantly, gas only" beside the swarm launch for hook-only and existing-token stacks. Job 9 ships 4.17 with the open carry-overs; the ads move to jobs 10a and 10; the factories are phase 3.

Changes in 1.32 (2026-10-22): launch 1 is live and its hook PondsideGuard is deployed, the store's first. Found on the way: for a contracts-only launch the result file the Completed event points at is written before deployment and never names an address, so Live cannot come from the chain alone; 7.3 now says the hook page takes the deployed addresses from the launch record's artifacts through the relay, reads hook() when the artifact is a deployer, and treats the Completed event with status 0 as the chain confirmation. Job 9 carries it.

Changes in 1.31 (2026-10-21): section 4.16 is rewritten in full after an independent review that read the audit findings of all four launches, IMD's own successful hook launch on Robinhood Chain and 18 more free checks (evidence/review-2026-10-21/). Corrections: the deployer mines its salt inside its constructor (an off-chain salt cannot be known), partial fills that specify the pair-currency amount revert, the no-fee sentence uses IMD's phrasing "Hook fee rate: 0%". New: type A hooks accept initialization only from the IMD launch factory ($factory), the Buyback jar cannot burn the standard token and keeps the tokens instead, the buyback happens only inside buyback(), fee blocks are tied together with one rate and one destination, liquidity rules are keyed per position, time is measured in seconds (Robinhood Chain's block number is the L1's), incompatible advanced blocks exclude each other, Batch auctions leaves version 1, the dynamic-fee flag, pull payments for the prize pot, the owner always in the body, and a no-outside-dependency sentence in every request. Job 8 ships all of it.

Changes in 1.30 (2026-10-21): a sweep of every block through IMD's free check under every launch kind and pairing (122 checks, evidence/check-sweep-2026-10-21.json) found one reproducible blocker: a request with no fee block still carries the fee footer of 5.1, which the checker reads as an unstated fee (open_rate). 4.16 item 18: a request without a fee block says instead that the hook takes no fee of its own. Item 19 reworks the Donation rules sentence per option. Job 8 ships both.

Changes in 1.29 (2026-10-21): the audit panels of launches 3 and 4 (read on the explorer, evidence/launch-audit-notes.md) found design flaws in the block sentences themselves and rated them high: a fee computed on the amount requested instead of the amount traded, the Anti-sandwich rule that lets a dust first swap pick the capped direction, the cap's withheld difference going to the fee recipient, a window that starts at pool initialization which anyone can trigger early, and per-wallet limits keyed by tx.origin. One auditor wrote that the fix is an owner decision because the brief specifies the rule. 4.16 gains items 11 to 16 with the decided wording; job 8 ships them.

Changes in 1.28 (2026-10-21): the words mode and the Custom rule block carry a warning (4.16 item 8): written rules are riskier than blocks, and a builder question after payment spends the fee. Job 8 becomes a two-step chain whose second step is a read-only adversarial review of the composer, the consistency check and the deployer wording, inside the same 0.5 IMD (13, decision 22); no standalone audit job is planned, because every hook launch and the ad contracts launch already carry IMD's audit panel.

Changes in 1.27 (2026-10-21): a deep review of the catalog, the composer and IMD's launch rules, done after three blocked launches and before any more spending, is recorded as section 4.16 (builder-proof catalog): the deployer sentence for hook-only and existing-token launches (accepted by the free check, evidence/check-B-deployer.*), the pair currency in every threshold, the Yield block offered only where its protocol exists and named by address, the undefined "burn" fee destination removed, the Volatility fee tied to a Swap fee, "the pool's token" defined for hook-only hooks, the hooks reference attached to every launch kind, and a what-to-name checklist for the words mode. Job 8 becomes "Catalog hardening" and carries all of it; the ads move to jobs 9a and 9.

Changes in 1.26 (2026-10-21): the hook-only question of 6.5 is answered by launch 4: an `evm_contracts` launch deploys at a fixed, launch-salted address and does not mine the hook's permission bits, so the hook's constructor would revert; the manifest step stopped with that question (evidence/launch-4-job-blocked.json). From now on type B and C requests ask for a deployer contract that creates the hook with CREATE2 at an address carrying its permission bits, and the site reads the hook's address from the deployer (6.5, decision 20). Job 8 carries the composer change; launches 1 and 3 were sent before this and may block the same way.

Changes in 1.25 (2026-10-21): launch safety (6.7, owner's decision 19). A request the swarm has to stop on after payment spends the fee and IMD refunds nothing, so the store must guarantee the request before anyone pays: a consistency check that locks Launch on any sentence a builder would have to guess, a comparison of the free check's fixed facts against the request, the builder's question shown on the hook page with a Fix in Builder button, a known-questions list that turns every past question into a rule, and plain copy about the spent fee. Job 7 becomes "Launch safety" and carries every open finding; the ads move to jobs 8a and 8.

Changes in 1.24 (2026-10-21): launch 2 (the test token, paired with IMD) was blocked by the builder with needs_input: the Swap fee block's sentence still says "of the ETH side … settled in ETH" while the footer says fees come from the IMD side, and IMD's own rule sells an IMD fee for ETH in the same swap unless told otherwise, so the builder asked for an IMD/ETH conversion pool the brief never named. Correction (5.1, decision 18): every fee sentence names the pair currency for both the side and the settlement ("of the IMD side … settled in IMD"), says "do not convert the fee to ETH and do not use any other pool" for IMD pairs, and names the recipient address instead of "my wallet". The free check accepts that wording (evidence/check-test-imdfee.*). Job 7 carries it; launch 2's 0.5 IMD is spent.

Changes in 1.23 (2026-10-21): the owner decided what "treasury" means (decision 17, revised): every fee choice that routes to a treasury routes to IMD's fee recipient 0x3f252e859a277a86A3967c11D4E054B2f07a1F22 on both chains, the wallet IMD's docs name for the network's pool-fee share. The option reads "IMD's treasury", the composed sentence names the address, and no address field is needed. Job 7 carries it; until then creators choose "my wallet".

Changes in 1.22 (2026-10-21): the "treasury address" choice of the fee blocks never asked for an address, so a request read "send it to treasury address" and IMD's check assumed the paying wallet ("Who receives fees and payouts: unknown"). Now choosing it reveals a required address field in the block, the sentence carries the address, and the option is never IMD's own fee recipient (4, decision 17). Job 7 carries it.

Changes in 1.21 (2026-10-21): job 6 is delivered and verified (jobs/log.md): the seven review findings are fixed, the relay address is set, the banner is gone and the site takes real launches. Its critic left two edge-case findings (a confirmed cancelled launch transaction still locks the flow; the pond ticker keeps an orphaned launch after a reorg) that ride at the top of job 7 with the hat removal. Phase 1 is complete; the three test launches of 15.4 come next.

Changes in 1.20 (2026-10-21): no hat on Pepe (owner's decision 16): the pointed hat job 5 drew over the sprite makes his head look triangular; job 7 removes it and the sprite stays as the mockup draws it. The far boat and the birds stay (9).

Changes in 1.19 (2026-10-21): job 5 is delivered and verified (jobs/log.md). Its adversarial review (three findings: timeline node states, the fee sentence for IMD pairs, relay error text) and its design critic (four reproducible bugs: a cancelled approval stuck pending, reorged Intake events kept, a full-storage import lost, a ticker timestamp that never ages) are recorded in evidence/job-5-reviews.md; none reopened the build, so all seven ride at the top of job 6, which also goes live: the relay URL set and the in-progress banner removed (13, 15, owner's decision 15). Phase 2 jobs are renumbered 7a and 7. 7.4 records the job states the API returns.

Changes in 1.18 (2026-10-21): the owner scrapped the pairing and IMD-fee idea; the proposal and its switch are removed from the mockup and nothing of it is planned. The three mockup repairs and the fee-side wording of 5.1 from 1.17 stay.

Changes in 1.17 (2026-10-21): the mockup carries a parked proposal behind the SHOW PROPOSAL switch in its top strip: a Pair with choice for existing-token launches (IMD, ETH or another token that already exists) and a store IMD fee of 0.1% of the paired side on every pool not paired with IMD, converted to IMD and burned or sent to a treasury address the creator picks. It is not part of any job until this document says so. One correction found while drawing it: the composer's fee-side sentence (5.1) names the pair currency, IMD when paired with IMD, instead of always ETH; the next job mirrors it.

Changes in 1.16 (2026-10-21): job 4 is delivered and verified (jobs/log.md): the chain reads settle in about five seconds on a fresh browser, the top bar has no chain pill, and the launch flow is live behind the in-progress banner. The Builder's Pair with select lists IMD first and starts on IMD, ETH second (owner's decision 14 in section 14); job 5 carries it. IMD's launch policy pairs a new token's pool only with ETH, IMD or, on Ethereum, FWA (capabilities read 2026-10-21); the store offers ETH and IMD.

Changes in 1.15 (2026-10-21): the top bar loses the chain pill (owner's decision 13 in section 14): the bar is the logo, the nav, the search box and Connect, and the chosen deploy chain shows only in the Builder's settings and summary and on the cards (3.0, 4 step 3). Job 4 carries the removal with its other corrections.

Changes in 1.14 (2026-10-21): job 3 is delivered (jobs/log.md). Its chain reads need two corrections that job 4 carries: the Ethereum RPC is `https://rpc.mevblocker.io`, because `ethereum-rpc.publicnode.com` refuses `eth_getLogs` older than about 10,000 blocks as archive requests; and the reads start at the Intake's deployment block on each chain with a log window sized per chain (7.2), instead of walking the whole chain from block 0 in 10,000-block windows. The resolved-address card says "not launched through this store" (3.1). Job 5 becomes a two-step chain (build-website, then adversarial-review) so the money path gets an independent review inside the same 0.5 IMD job (13, 15).

Changes in 1.13 (2026-10-21): no test network. Hooks deploy on Robinhood Chain or Ethereum from the first launch (owner's decision 12 in section 14): Sepolia leaves the chain lists, the filters, the Builder, the Learn page and the go-live path; the deploy chain is a required choice with no default; the tested marks record real launches instead of a verification round; IMD's free check accepts the sample launch bodies for both mainnets (5.3); job 3 carries the change.

Changes in 1.12 (2026-10-21): the brand mark is a drawn pixel fishing hook (inline SVG in the mockup's top bar) instead of the ʃ character, because VT323 has no glyph for ʃ and the character fell back to a different system font on every machine (owner's decision 11 in section 14); job 3 carries the swap.

Changes in 1.11 (2026-10-21): the catalog lists only hooks launched through this site (owner's decision 9 in section 14); IMD's other launches are no longer snapshotted or shown, the featured strip and the pond ticker follow the same rule, and the catalog gets an empty pond panel; 7.2 reads only this site's launches from chain; job 2 removes the snapshot catalog and keeps the top bar exactly as the mockup; job 3 follows.

Changes in 1.10 (2026-10-21): job 1 is delivered and live at the-hooks-store.sites.imd.fun (jobs/log.md); the mockup's Learn cost answer says 24 hours for a featured slot (the delivery's critic caught the stale 7 days); the two cosmetic deviations found in the delivery are carried at the top of job 2's objective.

Changes in 1.9: the landing scene is rebuilt as a live ASCII canvas in the manner of the ascii-sharks demo: IMD's Pepe (converted to tiles, three poses) fishing from a rowboat, drawn fish silhouettes and a flocking school, a hook on the line, and a full cast, splash, bite, reel and cheer sequence on every launch; the anime pond composition and the DOM tile layers are gone (section 9).

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
5. Hooks deploy on Robinhood Chain or Ethereum from the first launch. There is no test-network phase: testing happens with real launches on those chains (decision 12).

Non-goals for version 1:

- No store-operated review pipeline, requester or gated deployer. The `AutoHookJobRequester`, `HookRequestCodec` and `GatedHookDeployer` contracts from the foundation repo are **not used**.
- No "buy this hook from its creator" marketplace. Free listings and paid #ad slots (`HookListingRegistry`, `FeaturedPlacements` from the foundation repo) are phase 2 (job 10); the carousel slot exists from day one.
- No AI chat. "Describe it" is a text box whose contents become requirements in the launch request; IMD's free check reports what the swarm understood. The site does not interpret text itself.
- No backend, database or accounts. A small optional relay (7.4) is the only server-side piece and the site works without it.

## 2. Users and the three journeys

**Describe journey.** Type a sentence in the landing box → Builder opens in Describe mode with the text → pick the launch type and chain → read the short summary and the exact text → run the free check and read what the swarm understood → Launch (connect, approve, send) → watch status → share the hook page.

**Blocks journey.** Open Builder → choose Stack blocks → add blocks and set numbers → same from the summary onwards.

**Browse journey.** Scroll past the landing scene to the catalog, or search by name, token, block or address → open a hook page → "Build one like this" preloads the Builder.

## 3. Pages

All pages are hash routes on one static page: `#store` (home), `#catalog` (scrolls to the grid), `#builder`, `#launch`, `#hook/<chainId>/<requestId>`, `#mine`, `#learn`. There is no footer. A sticky top bar is on every page. Every number on every page uses the terminal face (section 8).

### 3.0 Top bar

Logo, Store, Builder, My hooks, Learn, the search box, Connect. Nothing sits between the search box and Connect: the bar shows no chain pill and does not display the deploy chain (decision 13). The logo is the drawn pixel fishing hook from the mockup's top bar (an inline SVG with class `hook`: a 12 by 16 cell grid drawn at 2 px per cell, 24 by 32 px, `fill="currentColor"`, `shape-rendering="crispEdges"`), followed by the wordmark THE HOOKS STORE in Press Start 2P at 12 px with a 10 px gap. The mark is not a font character: VT323 has no glyph for ʃ, so a character mark depends on each visitor's system fonts. On desktop (above 820 px) nothing wraps: the nav links have fixed widths, the search box shrinks first (minimum 120 px), and the Connect button keeps one width (168 px) whether it shows "CONNECT" or the shortened address `0x5a7e…f00d`; disconnect is a tooltip and click on that same button. Below 820 px the bar intentionally stacks into three rows (brand and connect, nav, search).

### 3.1 Store (home)

**Landing.** Full-bleed (edge to edge of the viewport, never a centered box), at least 660 px tall, with the character-tile pond of section 9 behind the copy. Centered on top, inside a soft beige glow: eyebrow, headline "Stack blocks. Cast a hook.", a two-sentence explanation, the describe box (one input, placeholder "What should your hook do? e.g. 1% of every buy goes to a prize pot", button DESCRIBE IT), the line "or open the block builder · browse hooks", and three live numbers from `GET /swarm` (hidden if the call fails). Nothing else sits in the landing: no counter, no demo button. The ticker is one boxed line at the bottom edge of the scene (`role="status"`). Submitting the box opens the Builder in Describe mode with the text filled in. Clicking the water casts (the manual trigger for tests).

**Featured strip (#ad).** Directly under the landing, inside the content column: a heading "FEATURED #AD", the sentence "Paid placements, 0.1 IMD for 24 hours, ranked by total paid. Managed from My hooks. Not a review or endorsement.", and a strip that scrolls by itself (a seamless marquee, about 42 s per loop, paused on hover or keyboard focus, a plain scrollable row under reduced motion). Each card is one compact line: the #AD pill, the hook name, the symbol, "by {creator}" (the launch payer as an ENS name when reverse lookup on Ethereum mainnet finds one, else the shortened address) and the hours left. No chain, no description, no block labels, no buttons; the card links to the hook page. Cards are sorted by total paid (base price plus boosts), ties by the earlier purchase, and the strip ends with an open-slot card ("OPEN SLOT · 0.1 IMD / 24h · promote from My hooks"). Buying, boosting and cancelling happen only in My hooks (3.5). Cards come from `FeaturedPlacementsV2` (6.6) once it is deployed in phase 2; until then only the open-slot card shows.

**Catalog.** Below the carousel, Steam layout: a left rail of filters and a card grid. The grid lists only hooks launched through this site: launch requests whose description ends with the fixed last sentence of 5.1. Hooks launched elsewhere on IMD never appear in the grid, in the search results or in the featured strip, and the site ships no snapshot of them; the address search below can still describe one when its address is typed. While the pond has no hooks the grid is replaced by one panel in the Learn style (paper-3, 3 px ink border, hard shadow): the heading NOTHING ON THE POND YET, the line "Hooks launched through this store appear here. Be the first to cast.", and a primary button DESCRIBE A HOOK that opens #builder; the count beside the heading reads 0 hooks.

- Filters: block type (Fees, Protection, Treasury and rewards, Liquidity rules, Timing and access, Advanced, Own source), chain (Robinhood Chain, Ethereum), status (All, Live only, In progress), sort (Newest, Oldest, Name). Every filter changes the grid immediately.
- A card: name and symbol (or hook name for token-less hooks), chain pill, status pill (Requested, In progress, Live, Failed), the block labels parsed from the request, one sentence, launch number when live, View.
- Empty state for a search or filter with no match: "No hooks match. Clear search and filters or build the first one." (The empty pond panel above is for a catalog with no hooks at all.)

**Search.** The top-bar box searches as you type and shows results in the catalog grid under the heading "Results for …":

- Keywords match name, symbol, chain, block labels and the request text; all words must match.
- A 40-hex address matches the hook address, the token address, the distributor address or the pool id's currencies of any known launch. A 64-hex value matches a request id or a transaction hash.
- An address that matches nothing is resolved on chain through the public RPCs: if it answers `poolManager()` and `getHookPermissions()` it is shown as "A v4 hook not launched through this store" with its permissions decoded (hooks such as Hamster Hour were launched through IMD, only not through this site); if it answers `name()` and `symbol()` it is shown as a token with "Build a hook for this token" (opens the Builder with launch type C and the address filled in); otherwise "No contract found at this address on Robinhood Chain or Ethereum".
- Enter also navigates to `#catalog`.

### 3.2 Builder

The canvas reads top to bottom as three numbered questions, so the launch type is the first thing a user sees.

**1. What are you launching?** Three cards: A: HOOK + NEW TOKEN + POOL. B: HOOK ONLY. C: HOOK FOR MY EXISTING TOKEN. The selected card is pine. The choice changes which blocks are available and which settings appear.

**2. How do you want to build it?** A segmented control (DESCRIBE IT | STACK BLOCKS). On a first visit, under it, the two-card chooser with two sentences each. Switching never loses anything: words stay in the request as the creator's description and blocks stay as numbered rules; the summary shows both.

- Describe mode: a text area (3,000 characters), four example chips that fill it, then "Blocks added from the palette" as chips with an × to remove each one, and the rule in one sentence: blocks become numbered rules under your words; if your words and a rule disagree, the rule wins. The palette stays available in this mode, so a block can be added or removed without leaving it.
- Blocks mode: the stack. The token block (type A only) sits first with a pine stripe and a BRING MY OWN / USE STANDARD TOKEN switch. Each behavior block shows its number, title, the short label with the numbers filled in, its fields, up, down and remove, and a "Who uses it" line (4.12) followed by what the block adds to the hook page after launch ("On the hook page: owner buttons: pause swaps, resume swaps"). A block the launch type does not allow is dimmed with a pill and left out of the request.

**3. Settings.** Deploy chain (Robinhood Chain or Ethereum; no default: the select starts on "Choose a chain", Continue stays disabled until the user picks one; the chosen chain appears in the summary and on the launch page, never in the top bar), pair with (a select that lists IMD first and starts on IMD, then ETH; both are sold on both chains), the pool share (no default: the user must choose 10–90% in steps of 5, and Continue stays disabled until they do) and the remainder address (type A), existing token address and symbol (type C), hook name (B and C), owner address (used only when a block adds a power), and a collapsed ADVANCED: START FROM MY OWN CODE with repository URL and commit. Rule errors appear in a red notice under the stack (4.10).

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

Seven short answers (What is a hook? Describe it or stack blocks? What happens after I pay? What happens to a feature after launch? What does it cost? Which chains? Who audits it?), then **Read the sources**: links to the IMD docs, the Uniswap v4 overview, the hooks concept page, the PoolManager page, dynamic fees, "Your first hook", hook deployment and address mining, and the Hooks library reference (all at docs.uniswap.org/contracts/v4/…, checked live on 2026-10-21), then **What a hook can do: the 14 permissions**, a table that explains each callback in plain words (beforeInitialize/afterInitialize, beforeSwap, afterSwap, before/afterAddLiquidity, before/afterRemoveLiquidity, before/afterDonate, beforeSwapReturnDelta, afterSwapReturnDelta, afterAddLiquidityReturnDelta/afterRemoveLiquidityReturnDelta) and names the builder blocks that use each, ending with the note that a hook's address encodes its permissions.

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
| Swap fee | ABC | rate % (1.0; 0.1–5), applies to (buy and sell / buy / sell), send to (my wallet / IMD's treasury 0x3f252e859a277a86A3967c11D4E054B2f07a1F22 / burn) | "Take {rate}% of the ETH side of every {applies} as a hook fee, settled in ETH inside the swap that paid it (mint a claim when the PoolManager cannot pay it directly), and send it to {to}." |
| Fee that fades | ABC, needs Swap fee | start % (10), end % (1), minutes (30) | "The hook fee starts at {start}% of the ETH side of every swap when the pool opens and decreases linearly to {end}% over the first {minutes} minutes, then stays at {end}%." |
| Different buy and sell fees | ABC, not with Swap fee | buy % (0.5), sell % (2.0), send to (my wallet / IMD's treasury) | "Take {buy}% of the ETH side of every buy and {sell}% of the ETH side of every sell as a hook fee, settled in ETH inside the swap that paid it (…), and send it to {to}." |
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
| Buyback jar | ABC | jar rate % (1.0), trigger ETH (0.1), then (burn / send to IMD's treasury) | "Collect {rate}% of the ETH side of every swap into a jar held by the hook. Whenever the jar holds at least {trigger} ETH, anyone may trigger it to buy {symbol} from this pool with the whole jar and {action}. The swap that fills the jar does not revert if the buyback fails." |
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

The site does not hold hook code: every launch is written, tested and audited by the swarm for that request (section 6). So the proof that a block works is a real launch that used it. `evidence/blocks-verified.json` in the spec repository records that proof: an array of `{block, launchId, chainId, hook, passed, checkedAt, notes}`, one entry per block per real launch that Claude checked (15.4). The Builder fetches `https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/blocks-verified.json` at load (that host allows browser reads) and falls back to the bundled copy `public/blocks-verified.json`. A block with an entry whose `passed` is true shows a small tick and the words "proven in a live launch" on its card; any other block shows "not yet proven in a live launch" in its tooltip and nothing else changes. The file ships empty and fills as real launches on Robinhood Chain or Ethereum are checked. Blocks are not pre-verified on a test network (decision 12): every launch is written, tested and audited by the swarm for that request, and a block that fails in a real launch has its sentence or its 4.11 functions rewritten, or leaves the catalog.

### 4.16 Builder-proof catalog (deep review, 2026-10-21)

IMD's builders stop and ask when a request leaves them a guess, the audit panel rates a flawed design high, and either costs the fee after payment. Three blocked launches, the panels' findings on all four, a free-check sweep of every block (122 checks) and an independent review (18 more checks, evidence/review-2026-10-21/) produced these rules. Every rule binds the composer and the catalog; job 8 ships them. Two facts frame them: the free check does not catch interactions between blocks, so only the site's own consistency check (6.7) can; and the panel is a launch gate, so a sentence that predictably earns a high finding is a launch risk.

**Deployment and the pool**

1. **Deployer for hook-only and existing-token launches (6.5).** The request opens with `<HookName>Deployer`: its constructor takes the PoolManager address, `$owner` and the fee recipient, takes no salt, starts at salt 0 and increments until the CREATE2 address carries the hook's permission flags, then creates the hook in the launch transaction, passing those arguments unchanged; neither constructor calls any other contract; there is no deploy function to call afterwards; `hook()` returns the address. The salt cannot be mined off-chain because the deployer's own address is salted by the launch number and unknown until deployment. The site shows "hook not deployed yet" when `hook()` is zero (launch 1 was built with a later `deploy(salt)` step before this rule). Whether IMD's manifest verifier accepts a constructor that deploys is confirmed by the first hook-only launch after job 8.
2. **Type A accepts initialization only from the launch factory.** "beforeInitialize accepts only the IMD launch factory, passed as the constructor argument $factory; any other initialization reverts; the hook serves only the pool the factory initializes. Constructor arguments: the {chain} PoolManager {address}, $owner and $factory." Without it anyone can bind the hook to a junk pool first; launch 1's panel rated that high, and IMD's own hook launch on Robinhood Chain uses exactly this gate. The free check accepts the sentence.
3. **Hook-only and existing-token hooks serve ETH pairs.** Every B and C request says "Only pools whose currency0 is native ETH may be initialized with this hook; any other initialization reverts" (Pool rules then only narrows the fee tier), and for type C "only pools of native ETH and {token}". Every pool-dependent view and limit is keyed by PoolId (windowEndsAt(PoolId), haltedUntil(PoolId), boughtBy(PoolId, address), …), the sentences say so, and the hook page passes the pool id. One definition line: "In this hook, the token is the pool's non-ETH currency and its total supply is that token's totalSupply()."
4. **Pair currency everywhere.** Every fee side, settlement, threshold and unit follows the pool's pair currency: IMD for an IMD-paired type A launch, ETH otherwise; IMD-paired requests add "do not convert the fee to ETH and do not use any other pool" and "the launch token may be currency0 or currency1; handle both orders".
5. **No outside dependencies.** Every request without the Yield block says "The hook uses no outside pool, token, price feed or service; every price it needs comes from its own pool." References `uniswap-v4-hooks` and `uniswap-v4-security` ride on every launch kind.
6. **The launch factory, named.** Type A: "the launch factory ($factory) may always add liquidity and collect fees with a zero-change modify." Types B and C never mention a factory.
7. **The owner, in the body too.** `body()` always sends `owner` = the address the text names, so `$owner` and the sentences agree.

**Fees**

8. **Fees on what traded.** Every fee sentence adds "computed on the amount actually traded; when the swap specifies its {pair currency} amount and the pool fills only part of it, the swap reverts rather than overpaying" (in v4 a fee on the filled pair-currency amount cannot be reconciled after the swap; launch 4's panel rated the overcharge high three times and accepted the revert).
9. **No fee, say so.** With no fee block the composer writes "Hook fee rate: 0%." instead of the fee footer; the footer alone makes the checker refuse (open_rate) and otherwise leaves the fee rule to assumption.
10. **One rate, one destination.** Whale fee requires Swap fee or Different buy and sell fees and uses their recipient. Fee that fades has no end field: it starts at its start rate and fades to the Swap fee's rate, replacing it for the swaps the Swap fee applies to. Volatility fee requires Swap fee and applies to the same swaps; when a fade and a volatility rate both apply, the higher wins. Split the fee and Share fees with LPs split the Swap fee and the Whale fee only (never the jar or the pot), LP share first, then the split; Split replaces the Swap fee's destination and the composer drops "send it to". Fee destinations are the paying wallet, written as its address, or IMD's treasury (decision 17); "burn" leaves the fee blocks.
11. **Buyback jar.** The buyback happens only inside buyback(), never inside a swap, with a price limit 3% above the pool price at the start of the call; it keeps what it could not spend and anyone may call it again; the "does not revert" clause is gone. Standard launch token: "keep the bought tokens in the hook forever; no function can move them" (the token has no burn function and a dead-address transfer is refused by IMD). Own token: the token sentence adds "with a public burn(uint256) that burns the caller's own tokens" and the jar burns. Existing token: "burn with the token's burn(uint256); if it has none, keep them in the hook forever".
12. **Share fees with LPs** adds "if no liquidity is in range, the whole fee goes to the recipient" (donate reverts otherwise).
13. **Prize pot.** The winner withdraws with claimPrize(); a period with no buyers rolls its pot into the next; draw() settles the most recent complete period; the buyer list per period is bounded by paying only the weighted winner from recorded totals.

**Protection and timing**

14. **Anti-sandwich, decided.** "Within one block, no swap executes at a better price than the block's opening price in its own direction; the difference the cap withholds is donated to the pool's liquidity providers through the PoolManager's donate, never to the fee recipient or the owner."
15. **When a pool opens.** Every window (Anti-sniper window, Allowlist opening, Fee that fades, Prize pot periods) starts at the pool's first swap, not at initialization.
16. **What a wallet is.** Per-wallet rules (Anti-sniper window, Max buy per wallet, Cooldown, Allowlist opening, LP allowlist, Prize pot buyers, Donation rules) define the wallet as tx.origin and say that several wallets or a shared relayer can defeat the limit.
17. **Time in seconds.** Volatility fee, Circuit breaker and JIT penalty measure in seconds of block timestamp, not blocks (Robinhood Chain's block.number is the L1's). Anti-sandwich keeps "one block" and says "the chain's own block number (ArbSys(address(100)).arbBlockNumber() on Robinhood Chain)".
18. **Max swap size** applies when the swapper specifies a token amount; swaps that specify the pair-currency amount are not capped by this rule; amounts are in the token's own decimals.
19. **Liquidity rules by position.** Liquidity lock is keyed per position (sender, tickLower, tickUpper, salt) with unlockAt(bytes32 positionKey); Minimum position and JIT penalty likewise; the hook's own positions (Limit orders, Yield) are exempt from every liquidity rule and the sentences say so.
20. **Sunset** says "every other rule in this request stops applying" wherever the block sits, and "funds already collected stay withdrawable through their functions".
21. **Donation rules, one sentence per option.** Only the owner: only the owner may donate, no function. Allowlisted: addresses on the owner's donor allowlist, setDonor(address, bool) for the owner. Nobody: every donation reverts, no function, no owner power. Always: "the hook's own donations (Share fees with LPs, the anti-sandwich difference) are always allowed".

**Advanced blocks**

22. **Incompatible blocks exclude each other** (`excludes` becomes a list): Stable curve excludes Volatility fee, Circuit breaker, Anti-sandwich, Price oracle, Limit orders and Dynamic LP fee; Limit orders excludes Batch auctions; Yield is type B and C only, holds all liquidity itself and excludes every liquidity rule.
23. **Batch auctions leaves version 1** (dimmed "not in this version"): it had no claim function, no exact-output rule and no definition of the clearing price.
24. **Dynamic LP fee** says "the pool must be initialized with the dynamic-fee flag (fee 0x800000)", excludes Pool rules, names its mapping ("the fee moves linearly with the absolute price move over the last {seconds} seconds"), and 6.4 initializes a pool for it with the flag.
25. **Yield on idle liquidity** stays dimmed on every chain until the catalog lists verified protocol addresses; if re-enabled it is B and C only, says "the hook holds all liquidity; LPs deposit through the hook; direct adds revert", and names the Aave v3 Pool address or the Morpho Blue market id on the deploy chain.

**Words, size and process**

26. **Words mode and Custom rule** show the warning "Written rules are riskier than blocks. If the builder has to stop and ask a question after you pay, the 0.5 IMD is spent. Blocks are checked sentences; words are yours." and the checklist: name every address, currency, amount and time; say who may call what, or say there are no owner functions; name no outside pool, token or service unless with its address on the deploy chain. Words mode composes no blocks unless the stack is shown, the summary lists every rule in both modes, the footer never denies owner functions the description grants, and a numbered block rule wins over the Custom rule and the description.
27. **Fewer rules, safer launch.** Above six blocks the summary says every extra rule is more for the audit panel to refuse and that the contract has a 24 KB size limit.
28. **Arithmetic.** Percent rules use mulDiv; the own-token supply is capped at 1,000,000,000,000.
29. **Copy to verify before advertising:** whether `poolBps` is a share of the creator's 90% or of the total supply (IMD's own launch describes 8,000 as "80% pool, 10% remainder, 10% swarm").
30. **One launch per kind after a fix,** every builder question into `src/blocks/known-questions.json` (6.7), and every audit read on the explorer and turned into a rule here.

### 4.17 Proven launches: start from audited source

Every launch through the store leaves a public, audited repository (IMD delivers each launch to `identity-md-launches/launch-<number>-…`). The spec repository keeps `evidence/proven-launches.json`, one entry per launch the owner has verified: `{launchId, launchNumber, chainId, type, blocks: [block ids], repoUrl, commit, hookAddress, deployerAddress, name, verifiedAt}`. The site fetches it at load from raw.githubusercontent.com, like the tested marks of 4.14, and never bundles it.

- **Matching, automatic.** A draft matches a proven launch when the launch type and the set of block ids are the same and the chain is the same; parameters may differ, and extra words or a Custom rule are allowed. Nothing is asked: the match is applied in the background, the summary shows one line, "Built from a proven launch: {name} (launch {number}, audited {date})", and the hook page carries the same line after launch. A creator's own repository in Advanced (start from my own code) overrides the match; there is no other control.
- **The request.** When a match applies, the body carries `repoUrl` and `baseCommit` from the entry, resolved first through the relay's `/import` (7.4); if the import fails or the relay is absent, the request is composed from scratch with no notice beyond the longer wait estimate, and the composed text says, after the first sentence: "Start from the audited source at {repoUrl} commit {commit}: keep its behavior, apply the parameters and rules of this request, adapt the deployer to 4.16 item 1 if it mines its salt after deployment, and audit it as imported code." Every other sentence of 5.1 and 4.16 stays, so the request is complete on its own.
- **The wait, stated.** The Builder's summary and the Launch page say "Typically 1 to 3 hours: the swarm writes, tests, audits with four auditors and a judge, then deploys. From a proven launch, usually less." The hook page offers Copy link, asks once for permission to show a browser notification when the launch goes live, and the pond announces it. Nothing promises a time IMD does not promise.
- **Owner's step.** After verifying a launch the way 15.4 describes, the owner adds its entry; a launch whose audit left an unresolved finding is never listed.

## 5. Composing the launch request

### 5.1 The description text (at most 7,500 characters)

Type A:
```
Launch {name} ({symbol}) with a Uniswap v4 hook on {chain}, paired with {IMD|ETH}.
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
Fees are always taken from the {ETH|IMD} (pair currency) side, never from {symbol}; a fee the PoolManager cannot pay directly is minted as a claim the recipient can redeem.
A: Enable beforeInitialize (required by the IMD launch factory) and only the callbacks the behavior above needs. Take the PoolManager as a constructor argument. Owner, if any, is $owner.
A: Pool: {poolShare}% of my 90% share seeds the pool; the remainder goes to {remainderTo}.   (only once the user has chosen; never a default)
B, C: Take the PoolManager as a constructor argument and enable only the callbacks the behavior above needs. The deployed address must carry the correct hook permission bits (mine a CREATE2 salt). Owner, if any, is $owner.
Start from the creator's own source at {repo} commit {commit}: audit it as imported code, adapt it to this launch, and keep its behavior.   (only with Advanced: own code)
Keep the function names exactly as written so the storefront can show them. Composed with The Hooks Store block builder.   ("block builder" only when blocks were used; the fixed last sentence marks cards Built here)
```
Words are cleaned: `"`, `\`, `<`, `>` and line breaks become spaces; 3,000 characters maximum. PoolManager addresses: Ethereum `0x000000000004444c5dc75cB358380D2e3dE08A90`, Robinhood `0x8366a39CC670B4001A1121B8F6A443A643e40951`.

### 5.2 The request body

Type A:
```json
{ "objective": "<text>", "shape": "chain", "references": ["uniswap-v4-hooks", "uniswap-v4-security"],
  "steps": [ { "skill": "build-contract-project" }, { "skill": "adversarial-review" } ],
  "onchain": "univ4_hook", "chainId": 4663, "pairWith": "eth", "owner": "0x…",
  "economics": { "poolBps": 5000, "remainderTo": "0x…" }, "customToken": true, "github": true }
```
`customToken` only when Bring your own token is used; `owner` and `remainderTo` only when set. Types B and C:
```json
{ "objective": "<text>", "onchain": "evm_contracts", "chainId": 4663, "owner": "0x…", "github": true }
```
With Advanced: own code, both add `repoUrl` and `baseCommit` (resolved first with `POST /requests/import` when the relay exists). The compact JSON must stay under 16 KiB.

### 5.3 Evidence that IMD accepts these

Run through `POST https://api.imd.fun/requests/check` on 2026-10-20 and 2026-10-21, all with zero blockers and the full plan (build, independent tests, four audit specialists, judge, deploy on Sepolia); the exact bodies and answers are saved under `evidence/`. On 2026-10-21, after decision 12, the A1, B and C bodies were checked again with `chainId` 1 and 4663: zero blockers, and the plan's last step reads "Deploy on Ethereum mainnet" or "Deploy on Robinhood Chain" (`evidence/check-launch-mainnet-*.json`):

- `check-A-default-blocks`: type A from the default stack (kind "hook"; token name, symbol, fee rule, fee destination and admin recognised).
- `check-liquidity`: type A with Liquidity lock and JIT penalty. `check-prompt`: type A written in plain words inside `<description>`.
- `check-standalone`: type B (kind "contracts"). `check-attach`: type C for an existing token (kind "contracts", recipient recognised).
- `check-all-blocks-A1`, `A2`, `B`, `C`: every block in section 4 with its management functions, split across four requests so each stays under the limit; together they cover all 31 behavior blocks under every launch type that allows them.
- `check-job-0` and `check-job-1`: the hero art job and the first website job.

## 6. Chains, payment and fees

### 6.1 Where the hook deploys

Robinhood Chain and Ethereum, both from the first launch (decision 12). `site-config.json` enables deploy chains `[4663, 1]` and lists only those two chains; the Builder offers exactly those, with no default. Sepolia is not offered anywhere.

### 6.2 Where the payment happens

A launch is paid on **Ethereum or Robinhood Chain** in that chain's IMD, while the body's `chainId` says where the hook deploys; the two need not match (IMD held on Ethereum pays for a hook on Robinhood Chain). Intake v2 on every chain: `0xa43e6f75ee006411f79ac1c84120606c2330de82`. IMD on Ethereum `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7`, on Robinhood `0x5f7bb59365ce557c26dbcaa4ee9d39a4b95b7127`. Action id `launch.open@launch-1` as bytes32 `0x6c61756e63682e6f70656e406c61756e63682d31000000000000000000000000`. Price from `priceOf(action, asset)`, today 0.5 IMD; refuse to send if 0 or above 0.5 IMD. Two transactions: `IMD.approve(intake, price)` then `Intake.request(actionId, bodyBytes, (0x0, 0x00000000), imd, price)`. The Intake ABI is in the foundation repo at `docs/checks/consolidated/sources/intake-abi.json`. Without the relay the Launch page warns that a refused body spends the fee and offers Copy request.

### 6.3 Fee table

The swarm fee is 0.5 IMD per launch, once, and the audit panel is included in it. (The earlier foundation design paid 0.5 IMD for a build plus 0.5 IMD for a separate oracle review; IMD's own launch replaces that second step, so there is no 1 IMD total.) Every amount on the site is rendered in the terminal face (section 8), never in the pixel body font.

Type A: swarm fee 0.5 IMD; gas for two transactions; supply 10% swarm / 90% you with {poolShare}% of yours in the pool; pool trading fee 1.25% (1% to you, 0.25% network) plus the hook's own fee; deployment paid by IMD.
Types B and C: swarm fee; gas; "Token and pool: none created. You get the audited hook contract only."; for C "Opening the pool: one more transaction from your wallet after the hook is live, prepared by the site"; deployment paid by IMD.
A featured #ad slot is 0.1 IMD for 24 hours, optional, phase 2; anyone can boost a placement with more IMD to rank it higher, and boosts are not refunded (6.6).

### 6.4 Opening a pool for a type C hook (phase 2b)

After a type C hook is live, the hook page shows OPEN THE POOL: the site builds `PoolManager.initialize(poolKey, sqrtPriceX96)` for currencies (ETH, token) sorted, the fee tier the Pool rules block chose (else 0.3%), the matching tick spacing, the hook address, and a starting price the user types as "1 token = x ETH". The wallet sends it. Then a link to add liquidity on a v4 interface for the chain. Until phase 2b the hook page shows the same panel with the values and a copy button but tells the user to send it from a v4 interface.

### 6.5 Hook-only address bits (answered by launch 4)

A v4 hook's address must encode its permissions. The `univ4_hook` launch mines the address. An `evm_contracts` launch does not: it deploys each listed contract at a fixed address salted with the launch number, where a hook's constructor reverts (launch 4, 2026-10-21, blocked at the manifest step with exactly that question). So every type B and type C request asks for two contracts in one: a deployer, listed in the launch, whose constructor creates the hook with CREATE2 at an address that carries the hook's permission bits, using a salt mined off-chain against the deployer's own address when that address can be computed in advance, or mined inside the constructor otherwise; the deployer exposes `hook()` as a view returning the hook's address, and the request says all of this in its first sentence. The site treats the launch's verified contract as the deployer and reads `hook()` to find the hook for the hook page, My hooks, the pool-opening call (6.4) and the tested marks (4.14). The browser-side CREATE2 fallback that this section used to describe is dropped.

### 6.6 Featured placements, version 2 (phase 2)

The foundation repo's `FeaturedPlacements` (0.1 IMD for 7 days, ordered by purchase) is too cheap for a week and invites spam. Version 2 keeps its custody model and changes the terms:

- Duration 24 hours; base price 0.1 IMD per placement; one live placement per listing; `#ad` on every placement and event; the same deposit, withdraw, cancel with pro-rata refund of the base price, settle, proceeds recipient and two-step owner as before. No proxy, no upgrade, no self-destruct.
- `boost(placementId, amount)`: anyone may add IMD from their deposited balance to an open placement. Boosts are never refunded: on cancel they go to the pinned proceeds recipient, on settle both base and boosts do. `rankOf(id)` returns base plus boosts; `featured(cursor, scanLimit)` returns each placement's total so the site sorts by total paid, ties by the earlier purchase.
- Deployed through an IMD contracts launch (`jobs/job-10a-ads-contract.json`, `evm_contracts`, one launch per chain: Robinhood Chain, then Ethereum), which includes the audit panel; the free check's answer is saved as `evidence/check-job-6a`. The listing registry deploys unchanged beside it.

### 6.7 Request safety: never pay for a question

IMD keeps the fee once a request is on chain, refunds nothing, and lets nobody answer a builder's question after payment. Every such failure is a request that was ambiguous, contradictory or missing a fact, and the store writes every word of the request, so the store guarantees the request before payment and owns the mistake when one slips through.

- **The composer writes complete requests.** Every fee sentence names the pair currency for the fee side and the settlement (5.1); every recipient is an address; every pool, token or service a block depends on is named with its address on the deploy chain, or the block is refused for that chain; IMD-paired requests say "do not convert the fee to ETH and do not use any other pool".
- **A consistency check before Launch.** It runs on the composed request before the free check and before Launch and locks Launch with a red notice naming the sentence when a fee side or settlement does not match the pair currency, a recipient is not an address, a block depends on something with no address on the chosen chain, or two rules contradict each other. Unit tests compose every block under every type and pairing and assert the check passes.
- **IMD's fixed facts are read.** The free check answers with the rules IMD will apply (for example that an IMD-side fee is sold for ETH unless told otherwise). When a fixed fact conflicts with the request, the "What the swarm understood" panel shows the conflict and Launch stays locked until the request opts out explicitly; the composer adds the opt-out for IMD pairs by itself.
- **A blocked launch is explained, not guessed at.** The hook page shows the builder's question as IMD reports it (`blockedReason`, the failed node's `failureReason`, read through the relay) under Needs attention, with a Fix in Builder button that reopens the draft that produced the request with the question beside it. The question joins `src/blocks/known-questions.json`, which the check applies, so the same question never costs a second person.
- **Plain copy.** The fee table (6.3) and the Launch page say that a request the swarm has to stop on still spends the fee, and that these checks exist to make that rare.

### 6.8 Instant hooks from audited factories (phase 3)

For hook-only and existing-token stacks that have a proven launch (4.17), the swarm builds a factory contract per chain through a contracts launch: the factory holds the audited hook code for that exact block set, takes the block parameters, the owner and the fee recipient as arguments to `create(...)`, mines the CREATE2 salt inside the call so the hook's address carries its permission bits, emits the hook's address, and has no owner functions. IMD's audit panel reviews each factory once. In the Builder, a stack with a live factory on the chosen chain shows two buttons: "Create instantly, gas only" (the site sends `create` from the connected wallet and jumps to the hook page) and "Launch with the swarm, 0.5 IMD" (anything custom, or the creator's choice). Token launches never take the instant lane: IMD creates the token and the pool. Open decisions before phase 3 starts: which stacks get a factory first (the default stack is the obvious one), whether an instant hook pays a small fee in IMD and to whom, and how the hook page reads a factory-made hook (its `HookCreated` event is the chain record).

## 7. Data: how a static site reads everything

### 7.1 Browser access, tested 2026-10-20

`api.imd.fun` sends no CORS header on `/launches`, `/jobs`, `/intake/…`, `/requests/check` or `/publications`, so a page cannot call them. `GET /swarm`, the IPFS gateway `ipfs.imd.fun` and the public RPCs for Ethereum, Sepolia and Robinhood do allow it.

### 7.2 Catalog from chain

The Intake emits `Requested(bytes32 requestId, address payer, bytes32 action, bytes body, address callbackTarget, bytes4 selector, address asset, uint256 amount)` and `Completed(bytes32 requestId, uint8 status, bytes32 resultHashOrReason, string uri, bool delivered)`. The site reads `Requested` logs for the `launch.open@launch-1` action on Robinhood Chain and Ethereum from the Intake's deployment block forward, in windows sized per chain and cached in memory and `localStorage`, decodes the body JSON, keeps only the `onchain` `univ4_hook` and `evm_contracts` bodies whose objective ends with the fixed last sentence of 5.1 (a launch made through this site) and ignores every other launch, then reads `Completed` for those ids: status 0 with an `ipfs://CID/result.json` uri → fetch it from `https://ipfs.imd.fun/ipfs/CID/result.json` for the launch id and addresses; status 1 or 2 → Failed with the reason decoded as ASCII. There is no build-time snapshot of other launches: a hook launched outside this site is never listed. Launch numbers and addresses come from `result.json`.

RPCs and windows (`site-config.json`, measured 2026-10-21): Ethereum reads go to `https://rpc.mevblocker.io` for everything (logs, `eth_call`, `eth_getCode`, blocks and the ENS registry; it serves the Intake's whole history, 346 `Requested` logs from block 26164897, in one call and sends CORS headers for this site); `https://ethereum-rpc.publicnode.com` must not be used for logs because it answers HTTP 403 "Archive requests require a personal token" for any window older than about 10,000 blocks. Robinhood Chain reads go to `https://rpc.mainnet.chain.robinhood.com`, which accepts 400,000-block windows (68 `Requested` logs in total). `intakeFromBlock` is 26164897 on Ethereum (the block where the Intake's code first appears) and 85300000 on Robinhood Chain (before the Intake's first event at block 85318832, 2026-10-10 21:30 UTC); `logRange` is 100000 on Ethereum and 400000 on Robinhood Chain. `Completed` logs are read once per chain over the same windows and matched to known request ids, not walked per request. A window that fails for any reason is split in half down to 1,000 blocks before the chain is reported unreadable. On a fresh browser the status line must reach "Read from Ethereum and Robinhood Chain" within 30 seconds. Block labels on cards come from the numbered rules: the site matches each rule against the catalog's sentence templates and falls back to "Custom".

### 7.3 Status for the user's own launches

Same logs filtered by payer, plus pending request ids saved in `localStorage` when launched from this site.

Contracts-only launches (types B and C): the result file that the chain's Completed event points at is written when the job completes, before deployment, and names no address (launch 1, 2026-10-22). So the Completed event with status 0 is the chain confirmation that the launch finished, and the deployed addresses come from the launch record (`GET /launches/:id` through the relay, `artifacts[].address`, with `attestation.contracts` naming each contract). When the artifact is a deployer (4.16 item 1, and launch 1's `deploy(salt)` design), the hook page reads `hook()` from it and shows both addresses; while `hook()` is zero it says "hook not deployed yet". The Live step turns green when the Completed event has status 0 and the launch record reads live; the hook's address is a separate line, never a condition for Live.

### 7.4 Optional relay

A single-file Cloudflare Worker forwarding `POST /check` and `POST /import` to `api.imd.fun/requests/…`, and `GET /launches*`, `/jobs/:id`, `/intake/:chain/:tx` to the same paths, adding `Access-Control-Allow-Origin: *`, caching GETs 30 seconds, allowing nothing else. `site-config.json` has `relayUrl` (null by default). With it: the free check button and the "What the swarm understood" panel work live, the pond ticker names launches, the timeline shows Building / Audit panel / Deploying, and own-code imports are resolved. The swarm writes and tests it; the operator deploys it. The operator will also ask IMD to enable CORS on those routes.

Job states: `GET /jobs/:id` reports each node as `waiting` (queued), `working` (in progress) or `accepted` (done), with `failed` possible, and the job as `executing` or `completed`. The timeline marks Building active while an implement node is working, Audit panel active while a review or audit node is working, and Deploying active once the job is completed and the launch is not yet live; it never shows Live from the relay alone, only from the chain.

## 8. Design system

**Identity.** A retro-pixel Steam storefront on beige paper: Steam's bones (sticky bar with search, a full-bleed featured scene, a carousel, a filter rail and a dense grid, boxy panels) in a pixel skin (hard corners, 3 px ink outlines, hard 4 px offset shadows, no blur, no gradients outside the painted scene, no rounded corners). The painted pond is the one soft element and is confined to the landing.

**One theme, by choice.** Beige for everyone; the site does not switch to a dark palette. Tokens: paper `#e9dfc3` (page), paper-2 `#dfd3b0` (rails, panels), paper-3 `#f3ecd8` (cards, inputs), ink `#15130f` (text, borders, shadows), ink-2 `#5b5342` (muted), ink-3 `#8a816a` (dashed rules, state pills), pine `#1e5a3a` (top bar, primary buttons, links, active states), pine-2 `#2c7a50` (hover), on-pine `#f3ecd8`, ad `#c9a227` (the #AD pill only), bad `#a3382b`, warn `#a1731c`.

**Type.** Press Start 2P for the bar, headings, buttons and pills at 8–26 px, never for paragraphs. Pixelify Sans 15–18 px for body. VT323 for addresses, hashes, the exact request text, function signatures, and **every number and amount** (0.5 IMD, 50%, 1.25%, counts, numeric inputs), because Pixelify Sans draws a 5 that reads as an 8. Google Fonts with system fallbacks.

**Components.** Button, pill, state pill (grey, wraps, 96 px max), #AD pill, input, numeric input in VT323, notice (left stripe in the semantic color), segmented control, collapsible group, card, ad card (warm paper), open-slot card (dashed), choice card, type card (pine when selected), summary list, timeline, steps, manage rows. Content column 1,180 px, 16 px gutters, one breakpoint at 820 px. The top bar never wraps above 820 px (3.0). No footer.

**Copy.** Plain and short; buttons start with a verb; never "audited" for a hook that is not live; never invented numbers.

## 9. The pond, drawn in ASCII tiles on a canvas

The landing background is a live ASCII scene in the manner of the open-source "ascii sharks" demo (silhouettes rasterised into a character grid, lit from above, dense glyphs in shadow and sparse glyphs in light, drawn on a canvas with no dependencies): Pepe the frog stands in a rowboat at the right, rod out over the water, line down to a hook; fish swim below the surface; every launch is a cast. The earlier painted-pond and anime-reference compositions are gone. Monochrome by choice: ink on beige, three tile shades, no colour. The technique is written for this site; no code is copied from the demo.

- **Grid and tiles.** A `<canvas>` fills the landing behind the copy (`aria-hidden`, pointer events pass through to the landing). Cells are 9 × 15 px. A cell holds one glyph and one of three tile shades behind it: `8` `#` `%` `@` the darkest (26% ink), `S` `&` `o` the middle (15%), `t` `:` `;` the lightest (7%); `.` `,` `'` `"` `-` `_` `|` `\` `/` `*` `J` `><>` are untiled strokes in one of three inks (ink, muted, faint). Font VT323 13 px on the canvas; never `~`, which that face draws like an N.
- **Pepe.** IMD's own Pepe sprite (imd.fun; the owner chose to copy the shape) converted to a 24 × 18-cell character grid in three poses, mirrored to face the water: *idle* (side profile, frame 7 of the sheet), *windup* (turned away, frame 11) and *cheer* (arms up, frame 17). The conversion keeps the drawn outline as dark cells, the eye as `o`, skin as light tiles, shirt as middle tiles and shorts as dark `%`; the grids ship as data in `src/scene/pepe.json` exactly as in the mockup, with `meta` (width, feet row, hand cell). He stands in a rowboat whose gunwale hides his feet: a bow and stern `\` `/`, a dark `8` gunwale row, a `#` hull row and a dotted keel line; the boat spans his width plus one cell each side, anchored to the right edge with a four-cell margin.
- **Water.** The surface sits at 62% of the landing height: a sparse drifting line of `-` and `.` (30% of cells, re-rolled 1.6 times a second), broken where the boat sits. Below it a faint field of `.` and `,` that gets denser with depth (1% to 6%), re-rolled every two seconds.
- **Fish.** Three large fish are drawn silhouettes: a body profile (half-width `0.03 + 0.13·sin(π·u^0.75)^0.9` of the length to the tail root at 84%), a forked tail, a dorsal fin at 32–56%, a pectoral at 30–42%, an `o` eye, and a travelling wave growing toward the tail; every cell in the bounding box is sampled at five points, cells with three or more hits become skin (`#8%SSt::` by shade, lit from above), fewer become edge strokes (`'` above the spine, `.` below). Lengths 100, 136 and 172 px, speeds 22–38 px/s, turning round off-screen at a new depth. Forty-two small fish are single glyphs (`-`, or `'` `,` when rising or diving) in a flocking school: separation, alignment, cohesion, a slow random drift, flight from the pointer within 110 px and from a splash within 150 px (ink-dark while panicking), and an attraction to the hook while it waits.
- **Rod, line, hook.** The grip is at chest height, one cell left and four rows above the sprite grid's `meta.hand` (a rod held at hip height with the line dropping beside him read as something else entirely). The rod runs from the grip to a tip sixteen cells left and eleven up, above head height, drawn as `_` with `\` where it steps a row. The line falls from the tip, four cells further left, to the surface and continues as `|` to the hook, `|` over `J`. Idle, the hook bobs one cell five rows under the surface.
- **Cast.** `cast()` runs a timed sequence; casts queue up to three. windup 0.35 s (Pepe turns, the rod sweeps back and up) → fly 0.55 s (the rod snaps forward to eighteen cells left and six up, the hook flies on an arc of `.` to a spot 36–48 cells left of the grip); the wind-up swings the rod up and to the left of Pepe's head with the hook dangling under the tip, never across his face → splash 0.45 s (`*` then `( o )` then a fading ring at the surface) → sink 0.6 s (six rows down) → wait 1.3 s (the small fish gather) → bite 0.5 s (the hook jitters) → reel 0.6 s (hook and `><>` rise to the boat) → cheer 0.9 s (arms up, the fish beside him) → idle. About 5.2 s in all.
- **Triggers.** (a) a new `Requested` log with the launch action on Ethereum or Robinhood (polled every 20 s), (b) the user's own launch transaction confirming, (c) with the relay, a new live hook, (d) a click on the water, which also splashes where it lands. Each cast updates the ticker ("{name} was launched on {chain} · {relative time}" or "A new hook was requested on {chain}").
- **Life on the left.** A fish jumps out of the water every 6–14 s somewhere in the left 60% (an arc of `><>` 5.5 rows high over 1.1 s, a splash where it leaves and where it lands); the big fish let out bubbles (`.` `:` `'` rising 11 px/s); three birds (`\v/` and `_v_` flapping three times a second) cross the top-left sky every 18–32 s; a frog sits on a lily pad at 6% from the left on the surface (`(o)(o)` over `.:SSSS:.`) and blinks every 3–7 s.
- **Motion and cost.** A 30 fps timer loop (setInterval, not requestAnimationFrame, which stalls in some embeds and in headless capture), skipped while the landing is off-screen (IntersectionObserver) or the tab is hidden, resized with a ResizeObserver, device pixel ratio capped at 2; about two thousand cells drawn per frame. The first sample cast runs three seconds after load and then every eighteen seconds while the Store is open; real triggers replace the samples in job 3. Reduced motion: one still frame, no fish movement, no cast, and a `▶ animate the pond` button in the ticker that starts the loop for that visit; the ticker still updates. Phones: the same scene; the copy sits over it with its beige glow and Pepe keeps the right edge.
- **Phase 2 polish.** A second boat far off, a bird or two. Still monochrome. No hat on Pepe: the sprite is drawn as in the mockup, with nothing added over his head (decision 16).

## 10. Technical choices

Vite + React + TypeScript, hash routing, `base: "./"`, static export; wagmi + viem with the wallet layer reused from the polished repo, three chains; one `styles.css` of tokens; configuration only through the committed `public/site-config.json` (enabled deploy chains, payment chains, relayUrl, featuredRequestId, trade URL templates, pool-opening defaults); tests as in section 12; never fabricate addresses, launch numbers or audit results.

## 11. What to reuse

From `launch-2254-build-hooks-store-polished` at `11f246f`: `src/wallet/*`, `src/lib/route.ts`, `vite.config.ts`, `tsconfig.json`, the `tests/` harness shape. From `launch-1811-build-technical-foundation-hooks` at `46e17ea`: `docs/checks/consolidated/sources/intake-abi.json` and the chain references in `deployment/manifest.json`. Phase 3 may reuse `HookListingRegistry.sol` and `FeaturedPlacements.sol`.

## 12. Acceptance criteria

Store: no horizontal scroll at 320, 390 and 1440 px; the scene renders behind the copy and the copy stays readable; the top bar never wraps above 820 px with a connected address and shows no chain pill; filters and search change the grid; an unknown address query resolves on chain or says nothing was found; `/swarm` numbers appear or are hidden.

Builder: first visit shows the chooser; both modes work and switching keeps words and blocks; every catalog block is addable under the right types and renders its sentence with defaults; the three launch types change the request shape; the composed text for the fixture (standard token, Swap fee 1%, Anti-sniper 10 min 1%, Buyback jar 1% 0.1 ETH burn, Robinhood Chain, pool 50%) equals `tests/fixtures/compose-A.txt` byte for byte, and likewise `compose-B.txt` (hook only, Anti-sniper, Cooldown) and `compose-C.txt` (existing token, Swap fee); the 5% rule and dependency rules are enforced; drafts survive a reload.

Launch: on an Anvil fork of Robinhood with a mocked IMD balance, the three steps run in order for type A and type B bodies, the bytes sent equal the preview, the request id is parsed; wrong chain, rejected signature and zero price are covered; no live payment in tests.

Hook page and My hooks: decode real `Requested` and `Completed` fixtures from both chains; Live with addresses for a real result.json fixture; Failed with the decoded reason. Chain reads: on a fresh browser against the live RPCs, both chains finish (the status line reads "Read from Ethereum and Robinhood Chain") within 30 seconds, with the window sizes and start blocks of 7.2.

Blocks: `evidence/blocks-verified.json` records every block a checked real launch has exercised; the Builder reads the file at load and shows the proven mark for passing blocks and the not-yet-proven tooltip for the rest, with the fetch failure falling back to the bundled copy.

Build: `npm run build` and `npm test` pass; `dist/` works from an IPFS gateway subpath; Lighthouse accessibility ≥ 95 on Store and Builder.

## 13. Delivery plan for the swarm

One IMD website project, built as `job.open` then `job.continue` jobs so each job starts from the previous commit, plus one contracts launch for the phase 2 ad contracts. Bodies in `jobs/`, checked with the free `POST /requests/check` before paying. The spec and mockup live in a public GitHub repository the first website job imports with `repoUrl` + `baseCommit`.

| # | Job | Delivers |
|---|---|---|
| 1 | Shell, Store and the pond | Top bar, routing, tokens, full-bleed landing with the character-tile scene and the describe box, the self-scrolling #ad strip with the open-slot card, Learn with the sources and the permissions table, catalog from the snapshot with working filters and keyword search, Learn, the cast animation with the click trigger, placeholders for the other routes |
| 2 | Builder and composer | Launch type first, modes and chooser, palette groups and state pills, all catalog blocks with their management notes, settings, summary preview with the exact-text disclosure, composer and body encoder, draft persistence, unit tests with the three fixtures |
| 3 | Chain reads, search by address, hook page, My hooks | Intake log decoding on both chains, result.json fetch, block-label matching, address resolution on chain, the Manage and Anyone-can panels built from section 4.11, pond triggers from chain, snapshot script |
| 4 | Launch flow | The job 3 corrections of 7.2 (Ethereum RPC, start blocks and windows) and 3.0 (no chain pill), wallets on Ethereum and Robinhood Chain, price read, approve, request, receipt parsing, Launch page per type, pool-opening panel (copy-only in phase 1) |
| 5 | Relay, polish and the review | A two-step chain: `build-website` (pairing order IMD first, worker, live free check and facts panel, stage names, import of own code, scene polish with reeds, hat and birds, copy pass) then `adversarial-review` by a different seat, read-only, of the money path from jobs 4 and 5; IMD's free check accepts the shape with no blockers and adds the design critic as well, all inside one 0.5 IMD job |
| 6 | Go live | The seven findings of job 5's reviews (timeline node states, the pair-currency fee sentence, relay error text, cancelled-approval retry, reorged events dropped, import kept on full storage, ticker timestamp), then `relayUrl` set to the owner's deployed worker and `inProgress` false: the banner goes and Approve and Launch work |
| 7 | Launch safety | The fee wording of 5.1 for every block and pairing, the consistency check and the fixed-facts comparison of 6.7, the builder's question on the hook page with Fix in Builder, the known-questions list, the spent-fee copy, plus the carry-overs: no hat, cancelled launch transaction retry, reorged ticker |
| 8 | Catalog hardening | A two-step chain: `build-website` for everything in 4.16: the deployer for hook-only and existing-token launches, pair-currency thresholds, the Yield block by chain, the fee destinations, the Volatility fee dependency, the token definition, references on every kind, the words-mode warning and checklist, the hidden-stack and owner-footer fixes; then `adversarial-review` by a different seat, read-only, of the composed requests for every block under every type and pairing, the consistency check, the fixed-facts comparison and the deployer wording |
| 9 | Proven launches and the wait | A two-step chain: `build-website` for 4.17 (the proven index, matching, the import through the relay, the request sentence, the wait copy, Copy link and the notification) plus the carry-overs (the owner lowercase regression, the written-fee detector, Live and addresses for contracts-only launches from the launch record, the residuals of job 8), then `adversarial-review` of the composer and the import path |
| 10a | Ad contracts (contracts launch, phase 2) | `HookListingRegistry` and `FeaturedPlacementsV2` per 6.6, audited and deployed by IMD on Robinhood Chain and Ethereum |
| 10 | Listings and #ad (phase 2) | The Promotions panel in My hooks: promote a hook (free listing, deposit, 24-hour placement), boost, cancel, withdraw; the strip reading `featured()` with creator ENS names; the hook page's #ad state |

## 14. Decisions taken by the owner (2026-10-21)

1. Fonts: Press Start 2P, Pixelify Sans and VT323, numbers in VT323. Kept.
2. Pool share: no default. The user chooses it, and can change it freely within IMD's 10–90% range.
3. Trade links: Uniswap's interface on every chain where it lists the pool. No code or asset from any other product is used anywhere in this project; other sites were only looked at for ideas.
4. Going live: see section 15. Partly superseded by decision 12: there is no test-network phase, and phase 2 now means only the ads (6.6).
5. Hook-only test: one real type B launch on Robinhood Chain or Ethereum, early, paid by the owner (0.5 IMD), before any fallback is built.
6. Prize pot stays in version 1, inside the Games and lotteries group; every block with a risk field carries the warning sign of 4.13.
7. Ads: 0.1 IMD base per 24 hours with boosts. Kept.
8. GitHub: not the owner's personal account. A new GitHub account is created for the project (IMD only imports from public GitHub repositories and delivers to GitHub, so a project account is the practical home); the push happens from it.
9. Catalog scope (2026-10-21, after job 1): the store lists only hooks launched through this site, recognized on chain by the fixed last sentence of the description (5.1). Other IMD launches are not shown anywhere, not in the grid, the search results, the featured strip or the pond ticker; the pond casts for this site's launches and the practice cast. The top bar stays as the mockup draws it (its chain pill was removed later, decision 13).
10. Site name: the live site is `the-hooks-store.sites.imd.fun` (`the-hooks-store.site.identitymd.eth`). The label was free on 2026-10-21 and is claimed by job 1, so every delivery publishes there; while the site is unfinished the page says so in its banner.
11. Brand mark (2026-10-21, after job 2): the drawn pixel fishing hook of 3.0 replaces the ʃ character, which VT323 cannot draw; the owner asked for the mockup's mark or anything but the fallback glyph the live site showed.
12. No test network (2026-10-21, after job 2): Sepolia is dropped. Hooks deploy on Robinhood Chain or Ethereum from the first launch, the user chooses the chain in the Builder with no default, and testing is done with real launches on those chains; the tested marks record real launches instead of a verification round. IMD's free check accepts the sample launch bodies with chain ids 1 and 4663 with no blockers (5.3). The owner's IMD sits on Ethereum, which can pay for launches on either chain (6.2).
13. No chain pill (2026-10-21, after job 3): the owner asked to remove the ETHEREUM · ROBINHOOD pill from the top bar. The bar is the logo, the nav, the search box and Connect; the chosen deploy chain shows in the Builder's settings and summary, on the launch page and on each card. Job 4 carries the removal.
14. Pairing order (2026-10-21, after job 4): the Pair with select lists IMD first and starts on IMD, ETH second. IMD's launch policy offers ETH, IMD and, on Ethereum only, FWA as the pool pairing for a new token; the store does not offer FWA. Job 5 carries the order.
15. Go live (2026-10-21, after job 5): the owner's agent read job 5's adversarial review and the critic's findings; all seven ride in job 6, which removes the banner. The owner deploys the relay worker on a free Cloudflare account before job 6 so the free check works live from the first real launch.
16. No hat (2026-10-21, after job 5): the owner saw the pointed hat the swarm drew over Pepe and asked for it to go. Nothing is drawn over the sprite; job 7 removes the hat and keeps the far boat and the birds.
17. Treasury (2026-10-21, before the first launch, revised the same day): wherever a block offers a treasury (Swap fee and Different buy and sell fees "send to", Buyback jar "then"), the treasury is IMD's fee recipient 0x3f252e859a277a86A3967c11D4E054B2f07a1F22 on Ethereum and Robinhood Chain, the wallet IMD's docs list for the network's share of pool fees. The option reads "IMD's treasury" and shows the address; the composed sentence says "send it to 0x3f252e859a277a86A3967c11D4E054B2f07a1F22"; there is no address field. A creator who wants their own second wallet uses "my wallet" from that wallet, or the words mode. Until job 7 lands, creators choose "my wallet", because the delivered site still writes "treasury address" with no address.
18. Fee currency (2026-10-21, after launch 2 blocked): in every block sentence the fee side and the settlement currency are the pair currency (ETH for ETH pairs and for types B and C, IMD for IMD pairs), IMD-paired requests say "do not convert the fee to ETH and do not use any other pool", and "my wallet" is written as the paying wallet's address. The composer, the fixtures and the mockup follow 5.1.
19. Launch safety (2026-10-21, after launch 2 blocked): the owner asked that a user never pays twice for the same mistake. 6.7 defines the checks; job 7 builds them before the store is advertised; the owner's test launches absorb such failures first.
20. Hook-only deployment (2026-10-21, after launch 4 blocked): type B and C launches deploy a deployer contract that CREATE2-deploys the hook at a permission-bit address; the site reads hook() from the deployer. The composer says so in every B and C request. No type B or C launch is paid until job 8 ships the wording, unless its words carry the deployer sentence by hand.
21. Deep review before more spending (2026-10-21): the owner asked for every remaining way a launch could block to be found first. Section 4.16 is the result; job 8 ships it; the ads wait as jobs 9a and 9.
22. Reviews, not audits (2026-10-21): no standalone audit job is planned. Website jobs that touch the money path or the composer carry a read-only adversarial review as their second step (jobs 5 and 8); every hook launch and the ad contracts launch carry IMD's audit panel by themselves.
23. Audit-derived wording (2026-10-21): the Anti-sandwich rule caps every swap at the block's opening price in its own direction and donates the withheld difference to liquidity providers; fees are computed on the amount traded; windows start at the first swap; wallets are tx.origin with the limit stated; standalone hooks key everything by pool (4.16 items 11 to 16).
24. Independent review adopted (2026-10-21): section 4.16 is rewritten in full from the review's findings; the type A factory gate, the in-constructor salt, the revert on partial fills and the jar without burn are decided as written there.
25. Live for contracts-only launches (2026-10-22, after launch 1): Live comes from the Completed event plus the launch record through the relay; addresses from the record's artifacts and the deployer's hook(); the result file is not the source of addresses (7.3). Job 9 carries it.
26. Proven launches (2026-10-22, amended the same day): every verified launch is indexed and a draft that stacks the same blocks on the same chain is built from its audited repository automatically, in the background, with one line in the summary and no switch; a failed import falls back silently (4.17). Job 9 ships it.
27. Instant hooks (2026-10-22): for stacks with a proven launch the swarm builds an audited factory per chain and the Builder offers an instant, gas-only lane beside the swarm launch, inside the stack-blocks mode, for hook-only and existing-token hooks (6.8). Phase 3, after the ads; the open decisions are listed there.

## 15. From mockup to live

The mockup is a drawing of the product, not the product. The swarm builds the real site from this spec and the mockup. Here is the whole path, and who does what at each step.

1. **Publish the brief.** Done on 2026-10-21: the `spec/` folder is the public repository https://github.com/the-hook-store/hooks-store-spec under a GitHub account created for the project (not the owner's personal one). Job 1 names it with `repoUrl` and `baseCommit`. IMD accepts only public GitHub repositories as a starting point and delivers every job to GitHub, which is why a project account is needed at all. Two consequences, both already in job 1's body: IMD hosts a site built from your own repository only after a `site-content-check` step, so job 1 is a two-step chain (content check, then `build-website`); and the repository needs an `index.html` at its root, which introduces the spec and opens the mockup. IMD's free check passes job 1 with no blockers (evidence/check-job-1.response.json).
2. **Pay for job 1.** Done on 2026-10-21: paid 07:21 UTC, delivered 08:48 UTC, details in jobs/log.md. The explorer's Launch form cannot send this job: when it is given a repository it only hosts that repository as it is, and it has no way to paste a full body. So the owner pays on-chain instead, through IMD's Intake contract on Ethereum (where the owner's IMD is), from a local page Claude prepared (`tools/pay-onchain.html`, outside this repository): connect the wallet, approve 0.5 IMD, send the request. The page holds the exact checked body; its transaction encoding was verified against an independent encoder and a dry run on Ethereum. Claude cannot pay: every job and every test launch is paid by the owner's wallet, and Claude prepares the exact text each time. Within hours the swarm delivers source and a built site to a GitHub repository under IMD's launches organisation, and IMD pins the built site to IPFS and serves it at `the-hooks-store.sites.imd.fun`. That is the final name, claimed from day one; until the site is finished its banner says it is in progress.
3. **Iterate.** Jobs 2 to 6 are `job.continue` requests on the same project: each one starts from the previous commit, and each delivery replaces what is served at the site name. Claude reads every delivery, screenshots it and drives it by script, and carries any miss to the top of the next job rather than paying for a separate fix-up. There is no audit after every job: website jobs already include IMD's design critic, every hook launch gets IMD's audit panel, and the money path (jobs 4 and 5) gets one adversarial review as the second step of job 5, before the first real launch. Budget: six website jobs at 0.5 IMD plus a few continuations, so roughly 4 IMD for the site.
4. **Test on chain with real money.** After job 6 removes the banner, the owner makes real launches from the site on Robinhood Chain or Ethereum, each 0.5 IMD plus gas, paid in IMD on Ethereum or Robinhood Chain (decision 12: no test network).
   - *The three journeys.* One hook with a new token (type A), one hook only (type B), one hook for an existing token (type C), each from a small default stack. This proves the launch flow end to end and settles the type B address question (6.5).
   - *Block coverage.* There is no separate verification round. Claude checks every real launch the way 4.14 describes: the 4.11 function names are in the deployed ABI and do what the sentence says, the owner-only ones refuse other callers, and where a rule can be exercised with a swap (fees, limits, windows, cooldowns, jars) it is exercised and the effect is read back. Every block the launch used gets an entry in `evidence/blocks-verified.json` with passed true or false and notes, and the Builder shows the proven mark from then on. A failing block has its sentence or its 4.11 functions rewritten, or leaves the catalog. The Custom rule block cannot be pre-verified; the user's own launch audit covers it, and the card says so.
   Budget: three launches, 1.5 IMD plus gas; the owner may add the four all-blocks launches of 5.3 (2 IMD) at any time to cover every block sooner.
5. **Go live, phase 1.** The site is static files, so "live" is a hosting decision, and two options can run at once:
   - *IMD hosting.* Every delivery already publishes to `the-hooks-store.sites.imd.fun` and its ENS name `the-hooks-store.site.identitymd.eth`. Done on 2026-10-21 by job 6: the banner is gone and `relayUrl` is set (7.4), the owner having deployed the worker from the delivered `relay/` folder with one wrangler command on a free Cloudflare account; Claude runs that command with the owner. The old `the-hooks-store-uniswap-v4-hooks` name stays on its offline page or is pointed at the new site later.
   - *The owner's own domain.* Cloudflare Pages (free) connected to a fork of the delivered repository under the owner's GitHub account, building `dist/` on every push, with a custom domain such as thehooksstore.xyz. Claude sets it up with the owner in about fifteen minutes. The relay worker (7.4) lives on the same Cloudflare account.
   Both serve the identical build. The IMD name is the canonical, audit-trailed copy; the custom domain is the one to advertise.
6. **Phase 2.** The ad contracts are deployed by the job 10a launch (one launch per chain: Robinhood Chain, then Ethereum), job 10 wires the Promotions panel and the strip, and the same republish puts it live.
7. **Phase 3.** Instant hooks (6.8): one contracts launch per factory per chain, then a website job that adds the instant lane to the Builder and the hook page.
8. **After that.** Changes are new `job.continue` jobs; the owner never edits code. Operating costs are zero: no server, no database, the relay is within Cloudflare's free tier, and users pay IMD directly for their own launches and placements.

