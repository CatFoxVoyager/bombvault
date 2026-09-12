# Phase 6: Maquette Screens - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning
**Mode:** `--auto` (decisions auto-selected as recommended defaults; every choice logged in 06-DISCUSSION-LOG.md)

<domain>
## Phase Boundary

The design bible's core surfaces are fully operational on a phone — glanceable Home with backup triggering, Containers with touch folder selection, File sets with the same tree, and Run detail — with tap-popovers, fail-tone sheet confirmations, and visibility-aware live progress working below the breakpoint. Requirements: SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, PRIM-02, PRIM-03, PRIM-04, FLOW-03. Depends on Phase 5 (shell, BottomSheet primitive, harness already exist). Desktop above 48rem renders unchanged; presentation-only milestone (zero new runtime deps, `router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**` frozen).

</domain>

<decisions>
## Implementation Decisions

### Arbre touch (SCRN-03) — the milestone's hardest work
- **D-01:** The touch adaptation lives INSIDE the ONE `SelectionTree` as an interaction-mode prop — never a fork, never a wrapper that re-renders a second tree. The APG state model (treegrid roles, `aria-checked` mixed/true/false, roving tabindex, Space-through-`onToggle`, cascade semantics, serialized save queue wiring) is byte-identical between desktop and touch; only the interaction layer differs: full-row ≥44px targets, chevron/check hit-area separation, muted excluded rows, no hover-dependent styling. — **Reversibility:** reversible — the desktop default mode is unchanged; the prop is additive to one component.
- **D-02:** Touch hit semantics: tap anywhere on the row toggles the check; the chevron is a dedicated ≥44×44px zone (right-aligned) for expand/collapse — the two gestures never share a hit area. `touch-action: manipulation` on rows to kill double-tap-zoom. The jsdom/vitest tree behavior tests keep running unchanged (state model untouched); the e2e harness gains touch-mode assertions (hit-area geometry via bounding boxes).
- **D-03:** Save is pinned in a bottom action bar that is a sticky element INSIDE the scroller's normal flow (never `position:fixed` — same discipline as the bottom bar), safe-area padded via the Phase 5 custom properties, carrying the live "handed to restic · n of m ticked" count and the per-root CACHEDIR.TAG toggle line. The save itself goes through the existing serialized save queue — the exact desktop-identical path SCRN-03 mandates. Empty-deselect rule is surfaced in the sheet copy (existing rule, mobile wording).
- [--auto] Selected: interaction-mode prop on the ONE component (recommended default over fork/wrapper).

### Navigation without new routes (router.tsx frozen)
- **D-04:** Container detail (SCRN-02) is a LOCALLY STACKED VIEW inside the existing `/containers` page — list ↔ detail as component-local state with an explicit back affordance, NOT a BottomSheet and NOT a new route. Rationale: the selection tree needs full height plus a persistent Save bar; a sheet chrome (scrim, drag-to-dismiss semantics) fights that. The container list stays mounted (cheap to preserve scroll position on back).
- **D-05:** Run detail (SCRN-05) is a full-screen BottomSheet (PRIM-01, already built in Phase 5) that reuses the existing run-detail CONTENT — completion time, duration, monospace snapshot id, new/changed/unchanged triad (tabular numerals), activity log with mono timestamps naming exclusion reasons (unticked / CACHEDIR.TAG), verify-integrity and browse-snapshot-files as touch rows, restore entry point reachable. No new route (router.tsx frozen); the deep-link from a backup trigger navigates to the existing surface and opens the sheet. The researcher/planner must map which existing desktop component(s) hold this content and plan the extraction/reuse (no duplication).
- [--auto] Selected: stacked local view (containers) + full-screen sheet (run detail) (recommended default over new routes — frozen — or sheets-everywhere — hostile to the tree).

### Home trigger + confirmations (SCRN-01, FLOW-03, PRIM-03)
- **D-06:** The Home "New backup" primary action is a full-width primary button in a sticky bottom action zone of the Home page (above the bottom bar, sticky within the scroller's normal flow, safe-area padded) — thumb-zone reachable one-handed. NOT a floating FAB: the FAB is PLAT-01 (Phase 7) platform-expression work, and a floating layer contradicts the in-flow discipline.
- **D-07:** Confirmations keep ONE `useConfirm` implementation (PRIM-03's contract): below the breakpoint the PRESENTATION swaps to a fail-tone bottom sheet — statusFail tonality, consequence-naming copy (what stops/restarts, what gets restored), outcome-naming button label — while desktop keeps today's dialog. The presentation switch rides the existing `useIsDesktop` media-query hook; the semantic API (promise-based confirm) is untouched, so every existing call site (BackupButton, restore guards) inherits the mobile sheet without per-site changes. No destructive control is default-focused (focus lands on the safe action).
- **D-08 (FLOW-03):** Triggering from Containers and File-set surfaces uses the exact same `BackupButton` semantics as desktop (async-start `{ok:true,started:true}`, `useBackupWatch` baseline-id correlation, deep-link into the live run) — only the presentation differs (D-06 button placement, D-07 sheet confirm). No new trigger code paths.

### Tap-popover (PRIM-02) + visibility-aware progress (PRIM-04)
- **D-09:** Tap-popover anatomy: anchored to its trigger (absolutely positioned relative to it, flips at viewport edges), transparent tap-outside-to-dismiss backdrop, Escape closes, light focus handling (focus moves in, restores to trigger on dismiss — no heavy focus trap: a popover is not a modal). Consumers this phase: InfoBubble, FilterPopover, ColorPickerPopover. Desktop hover behavior is untouched (`hover:` is already `@media (hover: hover)`-gated repo-wide); below the breakpoint the affordance becomes tap-to-toggle. The primitive is hand-rolled in `web/src/components/mobile/` alongside BottomSheet.
- **D-10 (PRIM-04):** Visibility-aware live progress is a dedicated hook (e.g. `useVisibilityGate`) consumed by live-progress surfaces — NOT a change to `web/src/lib/progress.ts` (frozen). `visibilitychange` → hidden: drop/refuse to open the SSE connection and stop timers; visible: refetch + reconnect, where `useBackupWatch`'s baseline-id correlation reconciles a run that finished in the background (never silently stale). Reconciliation correctness comes from server state refetch, never client clock.
- [--auto] Selected: anchored tap-popover + hook-level visibility gate (recommended default over popover-as-sheet and over touching the frozen progress singleton).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design bible (LOCKED — lives on another branch)
- `design/mobile/README.md` @ commit `0b64c7df` on branch `mobile-design-concepts` — NOT present on `docker-folders`; read via `git show 0b64c7df:design/mobile/README.md` (or `git show mobile-design-concepts:design/mobile/README.md`). Carbon tokens, accent `#FCC419` with `on-accent` ink (never white), four-status rule, card language, sheet patterns.
- `android.html` / `ios.html` maquettes @ `0b64c7df` (same branch) — the maquette screens this phase operationalizes (Home, Containers, Files, Run detail).

### Milestone planning
- `.planning/REQUIREMENTS.md` — SCRN-01..05, PRIM-02..04, FLOW-03 verbatim; also the Out-of-Scope table (no confirm-in-confirm chains, no infinite scroll, no horizontal-scroll tables).
- `.planning/phases/05-mobile-shell-navigation-foundation/05-CONTEXT.md` — shell decisions Phase 6 builds on (h-dvh, safe-area custom properties, BottomSheet mechanics, navModel).
- `.planning/phases/05-mobile-shell-navigation-foundation/05-UI-REVIEW.md` — 22/24 audit; Phase 6 reuses BottomSheet and MUST absorb the open findings at reuse sites: safe-area-clamped side padding (`BottomSheet.tsx:199,231`), `aria-label` on the mobile `<nav>` (`BottomNav.tsx:92`), BottomSheet close button ≥44px floor (currently ~40px — blocks PRIM-03 reuse).
- `.planning/research/PITFALLS.md`, `.planning/research/FEATURES.md`, `.planning/research/ARCHITECTURE.md` — milestone research (touch-tree pointer semantics flagged as the hardest work; SSE background-throttling pitfalls for PRIM-04).

### Codebase tokens & contracts
- `web/src/index.css` — semantic tokens (`carbon-*`, `accent*`, `statusOk/Fail/Warn/Neutral`, safe-area custom properties); never raw design-bible hex.
- `web/src/lib/pageShell.ts` — PAGE_SHELL contract for page roots (lint-enforced).
- `web/src/lib/useMediaQuery.ts` — the ONE breakpoint authority (`(min-width: 48rem)`), `useIsDesktop`; presentation-switch point for D-07.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/components/mobile/BottomSheet.tsx` (PRIM-01, Phase 5) — focus-trapped, scroll-contained, safe-area-padded, motion-safe slide-up; the base for D-05 run detail and D-07 fail-tone confirm presentation (absorb 05-UI-REVIEW findings at reuse).
- `web/src/lib/useConfirm` mechanics (existing confirm implementation) — D-07 swaps presentation only, keeps the promise-based semantic API.
- `SelectionTree` (the ONE tree from v1.0 phases 1-4) — D-01 adds the interaction-mode prop; its vitest behavior suite is the regression net for the state model.
- `BackupButton` + `useBackupWatch` (`web/src/lib/backupWatch.ts`) + `fireAndWaitRun` — FLOW-03 semantics, reused as-is.
- `useIsDesktop`, safe-area custom properties, `navModel` registry, four-status badges, PAGE_SHELL — Phase 5 infrastructure.
- `web/src/lib/progress.ts` singleton — frozen, but its consumers are where D-10's visibility hook attaches.

### Established Patterns
- Async jobs: POST `{ok:true,started:true}`; outcomes via `useBackupWatch` run-id correlation (baseline ids before firing) — never client clock.
- Tailwind utilities over semantic tokens; `glim-*` engine classes on shared controls; status colors on badges never on interactive controls.
- Every user-visible string through `t()`; em dashes banned in user text (lint-enforced, 42-locale parity).
- Sticky-in-flow positioning (never `position:fixed` for chrome); `hover:` gated behind `@media (hover: hover)`.
- Load-bearing "why" comments at the top of nontrivial files; eslint house rules (8 `bombvault/*`), exceptions declared in `web/eslint.config.js`.

### Integration Points
- `web/src/app/router.tsx` — FROZEN: no new routes; all detail surfaces are local state or sheets (D-04, D-05).
- `web/src/lib/api.ts` — FROZEN: tree save queue, run queries, container APIs consumed as-is.
- `web/src/lib/progress.ts` — FROZEN: PRIM-04 lives in a hook around it (D-10).
- `Layout.tsx` chrome switch + `useIsDesktop` — the single JS breakpoint; in-page adaptation stays CSS-only (`max-md:`) wherever possible.
- New primitives land in `web/src/components/mobile/` (BottomSheet precedent); the interaction-mode prop is additive to the existing tree component.
- E2E harness (Phase 5, 4 projects) gains the Phase 6 screen coverage; desktop-untouched assertions keep guarding ≥48rem.

</code_context>

<specifics>
## Specific Ideas

- STATE.md research flag (carried verbatim): "Phase 6 touch SelectionTree variant is the milestone's hardest work (pointer semantics, roving-tabindex-on-tap, hit areas) — targeted research recommended at plan time." Plan-phase should run the researcher.
- 05-UI-REVIEW top fixes are absorbed by this phase's reuse of BottomSheet/BottomNav rather than a separate cleanup pass: safe-area side padding, nav `aria-label`, ≥44px close button.
- Success criterion 1's "one glance" for Home means the phone viewport must show identity + next run + recent runs + repo health without scrolling past the trigger — layout density is a planner concern against the maquette.
- Four-status rule applies everywhere: badges carry text labels (never color alone), offsite-copy age renders in offsite blue per SCRN-01.

</specifics>

<deferred>
## Deferred Ideas

None — auto-selected decisions stayed within phase scope. (FAB expression and navpill/large-title chrome remain PLAT-01 / Phase 7 by roadmap; guided restore flow is SCRN-06 / Phase 8.)

</deferred>

---

*Phase: 06-Maquette Screens*
*Context gathered: 2026-09-12*
