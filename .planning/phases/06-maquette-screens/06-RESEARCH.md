# Phase 6: Maquette Screens - Research

**Researched:** 2026-09-12
**Domain:** Mobile presentation layer for an existing React 19 SPA — touch interaction for the SelectionTree, sticky-in-flow action bars, anchored tap-popovers, fail-tone sheet confirmations, visibility-gated live progress. Zero new runtime dependencies; router.tsx / api.ts / progress.ts / internal/** frozen.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Phase Boundary (verbatim)

> The design bible's core surfaces are fully operational on a phone — glanceable Home with backup triggering, Containers with touch folder selection, File sets with the same tree, and Run detail — with tap-popovers, fail-tone sheet confirmations, and visibility-aware live progress working below the breakpoint. Requirements: SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, PRIM-02, PRIM-03, PRIM-04, FLOW-03. Depends on Phase 5 (shell, BottomSheet primitive, harness already exist). Desktop above 48rem renders unchanged; presentation-only milestone (zero new runtime deps, `router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**` frozen).

### Locked Decisions (D-01..D-10, verbatim substance)

- **D-01:** The touch adaptation lives INSIDE the ONE `SelectionTree` as an interaction-mode prop — never a fork, never a wrapper that re-renders a second tree. The APG state model (treegrid roles, `aria-checked` mixed/true/false, roving tabindex, Space-through-`onToggle`, cascade semantics, serialized save queue wiring) is byte-identical between desktop and touch; only the interaction layer differs: full-row ≥44px targets, chevron/check hit-area separation, muted excluded rows, no hover-dependent styling. Reversibility: reversible — the desktop default mode is unchanged; the prop is additive to one component.
- **D-02:** Touch hit semantics: tap anywhere on the row toggles the check; the chevron is a dedicated ≥44×44px zone (right-aligned) for expand/collapse — the two gestures never share a hit area. `touch-action: manipulation` on rows to kill double-tap-zoom. The jsdom/vitest tree behavior tests keep running unchanged (state model untouched); the e2e harness gains touch-mode assertions (hit-area geometry via bounding boxes).
- **D-03:** Save is pinned in a bottom action bar that is a sticky element INSIDE the scroller's normal flow (never `position:fixed` — same discipline as the bottom bar), safe-area padded via the Phase 5 custom properties, carrying the live "handed to restic · n of m ticked" count and the per-root CACHEDIR.TAG toggle line. The save itself goes through the existing serialized save queue — the exact desktop-identical path SCRN-03 mandates. Empty-deselect rule is surfaced in the sheet copy (existing rule, mobile wording).
- **D-04:** Container detail (SCRN-02) is a LOCALLY STACKED VIEW inside the existing `/containers` page — list ↔ detail as component-local state with an explicit back affordance, NOT a BottomSheet and NOT a new route. Rationale: the selection tree needs full height plus a persistent Save bar; a sheet chrome (scrim, drag-to-dismiss semantics) fights that. The container list stays mounted (cheap to preserve scroll position on back).
- **D-05:** Run detail (SCRN-05) is a full-screen BottomSheet (PRIM-01, already built in Phase 5) that reuses the existing run-detail CONTENT — completion time, duration, monospace snapshot id, new/changed/unchanged triad (tabular numerals), activity log with mono timestamps naming exclusion reasons (unticked / CACHEDIR.TAG), verify-integrity and browse-snapshot-files as touch rows, restore entry point reachable. No new route (router.tsx frozen); the deep-link from a backup trigger navigates to the existing surface and opens the sheet. The researcher/planner must map which existing desktop component(s) hold this content and plan the extraction/reuse (no duplication).
- **D-06:** The Home "New backup" primary action is a full-width primary button in a sticky bottom action zone of the Home page (above the bottom bar, sticky within the scroller's normal flow, safe-area padded) — thumb-zone reachable one-handed. NOT a floating FAB: the FAB is PLAT-01 (Phase 7) platform-expression work, and a floating layer contradicts the in-flow discipline.
- **D-07:** Confirmations keep ONE `useConfirm` implementation (PRIM-03's contract): below the breakpoint the PRESENTATION swaps to a fail-tone bottom sheet — statusFail tonality, consequence-naming copy (what stops/restarts, what gets restored), outcome-naming button label — while desktop keeps today's dialog. The presentation switch rides the existing `useIsDesktop` media-query hook; the semantic API (promise-based confirm) is untouched, so every existing call site (BackupButton, restore guards) inherits the mobile sheet without per-site changes. No destructive control is default-focused (focus lands on the safe action).
- **D-08 (FLOW-03):** Triggering from Containers and File-set surfaces uses the exact same `BackupButton` semantics as desktop (async-start `{ok:true,started:true}`, `useBackupWatch` baseline-id correlation, deep-link into the live run) — only the presentation differs (D-06 button placement, D-07 sheet confirm). No new trigger code paths.
- **D-09:** Tap-popover anatomy: anchored to its trigger (absolutely positioned relative to it, flips at viewport edges), transparent tap-outside-to-dismiss backdrop, Escape closes, light focus handling (focus moves in, restores to trigger on dismiss — no heavy focus trap: a popover is not a modal). Consumers this phase: InfoBubble, FilterPopover, ColorPickerPopover. Desktop hover behavior is untouched (`hover:` is already `@media (hover: hover)`-gated repo-wide); below the breakpoint the affordance becomes tap-to-toggle. The primitive is hand-rolled in `web/src/components/mobile/` alongside BottomSheet.
- **D-10 (PRIM-04):** Visibility-aware live progress is a dedicated hook (e.g. `useVisibilityGate`) consumed by live-progress surfaces — NOT a change to `web/src/lib/progress.ts` (frozen). `visibilitychange` → hidden: drop/refuse to open the SSE connection and stop timers; visible: refetch + reconnect, where `useBackupWatch`'s baseline-id correlation reconciles a run that finished in the background (never silently stale). Reconciliation correctness comes from server state refetch, never client clock.

### Claude's Discretion

Research within the locked decisions; the [--auto] selections (interaction-mode prop; stacked local view + full-screen sheet; anchored tap-popover + hook-level visibility gate) are the recommended defaults now locked.

### Deferred Ideas (OUT OF SCOPE)

> None — auto-selected decisions stayed within phase scope. (FAB expression and navpill/large-title chrome remain PLAT-01 / Phase 7 by roadmap; guided restore flow is SCRN-06 / Phase 8.)

Additional hard scope fences from REQUIREMENTS.md Out-of-Scope table: no confirm-in-confirm chains, no infinite scroll, no horizontal-scroll tables.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRN-01 | Glanceable Home: identity, next run, recent runs, repo health visible without scrolling past the trigger; sticky New-backup bar | D-06 sticky-in-flow bar pattern (Pattern 3); PAGE_SHELL + density guidance; i18n keys `home.newBackup`, `home.newBackupConfirm`; four-status badges + offsite-blue rule from design bible |
| SCRN-02 | Containers screen with touch folder selection, stacked detail view | D-04 local stacked view (Pattern 4); serialized save queue reuse (FoldersEditor, Containers.tsx:836); zero-include guard blocks PATCH |
| SCRN-03 | File sets with the same touch tree | D-01/D-02 interaction-mode prop on the ONE SelectionTree (Pattern 1 — the milestone's hardest work; full seam documented); `fileSetEditorKey` remount contract (Files.tsx:1125) |
| SCRN-04 | Run detail reachable from runs lists | D-05 full-screen BottomSheet variant (Pattern 5); Frozen-API Data Adaptations (Run record field list verbatim) |
| SCRN-05 | Run detail content: time, duration, snapshot id, new/changed/unchanged triad, activity log with exclusion reasons | Data Adaptations: substitutes (bytes, duration, snapshot slice) because frozen `Run` has no per-file counts and no exclusion log lines; recorded deviation vs verbatim wording; `buildLogLines` reuse |
| PRIM-02 | Tap-popover primitive | D-09 anatomy (Pattern 6); `computeBubblePosition` reuse; in-repo precedents FilterPopover/ColorPickerPopover; APG/aria pattern verified |
| PRIM-03 | Fail-tone sheet confirmations below breakpoint | D-07 presentation swap inside ONE useConfirm (Pattern 7); `tone` already defaults to `"fail"` in useConfirm portal; BottomSheet focus mechanics; 05-UI-REVIEW findings 1/6 absorbed at reuse |
| PRIM-04 | Visibility-aware live progress | D-10 gate hook (Pattern 8); frozen progress.ts ref-count mechanics; Page-Lifecycle-verified hidden/resume contract; useBackupWatch baseline reconciliation |
| FLOW-03 | Backup triggering with desktop-identical semantics on mobile | D-06/D-08: BackupButton + `useBackupWatch` reused verbatim; only placement (D-06) and confirm presentation (D-07) differ |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives with authority over this phase (from `D:\code\bombvault\CLAUDE.md` and `.claude/CLAUDE.md`):

- **GSD workflow enforcement:** repo edits must go through GSD commands — satisfied: this research runs inside `/gsd-plan-phase`.
- **Tech stack:** SPA with no state library, no UI kit — the tree UI is hand-rolled in line with existing components. No new runtime npm dependencies this phase (locked).
- **Web build gate:** `cd web && npm ci && npm run build` (tsc --noEmit && vite build; commit web/dist) after ANY web/ change — the binary embeds web/dist; a stale build embeds the stale SPA.
- **Go chain before push:** `go build ./...`, `go vet`, `gofmt -l .` (must print nothing), golangci-lint, `go test ./...`; `just check` runs the chain. (Phase is web-only, but the pre-push hook still gates.)
- **Every user-visible string through `t()`** from `useT()` (lint-enforced); em dashes banned in user text (lint-enforced); 42-locale parity for new keys.
- **Status colors on Badges/chips, never on interactive controls**; page roots use `PAGE_SHELL` (`web/src/lib/pageShell.ts`).
- **Tailwind utility classes over semantic tokens** (`carbon-*`, `accent*`, `status*` from `web/src/index.css`) — never raw hex or hard-coded radii.
- **Async jobs:** POSTs return `{ok:true,started:true}`; outcomes NEVER read from the POST response — `useBackupWatch` correlates new run by id (baseline ids before firing, never client clock).
- **Comments are load-bearing "why" documents** — new nontrivial files carry narrative header comments; exceptions declared in `web/eslint.config.js`, never disable comments.
- **Releases:** never tag without explicit approval (not triggered by this phase).
- **No real user data / IPs in the repo.**

## Summary

Phase 6 is a presentation-only milestone against an unusually well-prepared foundation: Phase 5 already shipped the BottomSheet primitive, the width-only breakpoint authority, safe-area custom properties, the 4-project Playwright harness (touch-enabled), and the sticky-in-flow chrome discipline. The research confirms every D-01..D-10 decision is implementable without touching a single frozen file, and most of the phase is composition of existing, verified parts (`computeBubblePosition`, `useConfirm`'s promise API, the serialized save queue, `useBackupWatch` baseline correlation, `humanBytes`-style formatting for the run-detail tiles).

The genuinely new engineering — and the milestone's hardest work per STATE.md — is the touch interaction layer inside the ONE SelectionTree. The current desktop tree has an inverted interaction model: the row click expands (`onClick={spec.expandable ? () => toggleExpansion(spec.path) : undefined}`) and only the Space key toggles the check through `onToggle`. D-02 inverts this for touch: row tap = toggle, dedicated chevron zone = expand. The dangerous part is the existing aria-hidden checkbox, which both stops click propagation AND natively toggles its input — on touch, that combination produces either a dead zone (tap on checkbox does nothing) or a double-toggle (native input change + row onClick both fire). The research identifies the exact seam: in touch mode the visual checkbox must become purely presentational (`pointer-events-none`), the row carries the toggle onClick, and the chevron becomes a real `<button>` with `stopPropagation`. The APG state model — roles, `aria-checked`, roving tabindex, Space-through-onToggle, save-queue wiring — stays byte-identical, which is why the existing vitest behavior suite is the regression net.

Two findings matter for correctness beyond the tree. First, the touch/pointer switch should be driven by pointer capability (`(pointer: coarse)`), NOT by `useIsDesktop`: the user-locked width-only breakpoint gives landscape phones (≥48rem CSS width) the desktop chrome, but those devices still receive touch input — keying `interactionMode` off width would hand a landscape phone a hover-styled tree with 24px hit targets. Second, the D-10 visibility gate maps exactly onto the frozen progress.ts ref-count design (a gated consumer that stops subscribing drops the shared EventSource to zero) and onto Page-Lifecycle-verified behavior (hidden is the last reliably observable state on mobile; frozen-state guidance is literally "stop polling, close connections"; `useBackupWatch`'s baseline-id correlation reconciles anything that finished in the background).

**Primary recommendation:** Plan the phase as: (1) SelectionTree `interactionMode` prop with touch hit semantics + e2e geometry assertions; (2) sticky-in-flow action-bar pattern + Home trigger; (3) TapPopover primitive + three consumer migrations; (4) confirm-sheet presentation swap inside useConfirm (+ BottomSheet ≥44px close and inset-clamped padding fixes); (5) locally-stacked container detail; (6) full-screen run-detail sheet with the documented data adaptations; (7) `useVisibilityGate` wiring into live-progress surfaces. Zero installs; every package already present.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Touch tree interaction (SCRN-02/03) | Client (component interaction layer) | — | Pure pointer/keyboard handling over an unchanged APG state model; no server surface |
| Sticky action bars / Home trigger (SCRN-01) | Client (CSS sticky in scroller flow) | — | `position: sticky` inside `main#bv-main`; zero JS positioning |
| Tap-popover (PRIM-02) | Client (new mobile primitive) | — | Anchored positioning via existing `computeBubblePosition`; no API calls |
| Fail-tone confirm sheets (PRIM-03) | Client (presentation swap in useConfirm portal) | — | Promise API unchanged; desktop dialog untouched |
| Locally-stacked container detail (D-04) | Client (component-local state) | — | No route (router frozen); list stays mounted for scroll preservation |
| Run-detail full-screen sheet (SCRN-04/05) | Client (content extraction + BottomSheet variant) | — | Reads existing frozen `Run` data via existing client methods |
| Visibility-gated live progress (PRIM-04) | Client (hook around frozen singleton) | API/Backend (unchanged SSE contract) | Gate unsubscribes the shared EventSource by ref-count drop; server replay-on-reconnect already exists |
| Backup triggering (FLOW-03) | Client | API/Backend (existing async endpoints) | Exact `BackupButton`/`useBackupWatch` reuse; no new trigger paths |
| New i18n keys | Client + build (locale modules) | — | `t()`-enforced; parity gated by existing i18n pipeline |

## Standard Stack

### Core (all already installed — ZERO new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.7 [VERIFIED: .claude/CLAUDE.md Technology Stack] | Component model, conditional-render gate for visibility | Repo standard |
| react-dom | ^19.2.7 [VERIFIED: .claude/CLAUDE.md] | Portals (confirm/popover/sheet already portal-based) | Repo standard |
| Tailwind CSS | ^4.3.3 [VERIFIED: .claude/CLAUDE.md] | `max-md:` adaptation, sticky utilities, token-based classes | Repo standard |
| react-router-dom | ^7.18.1 [VERIFIED: .claude/CLAUDE.md] | Existing routes only (`useNavigate` for D-05 deep-link) | Frozen router |
| vitest + @testing-library/react + jsdom | ^4.1.10 / ^16.3.2 / ^30.0.1 [VERIFIED: .claude/CLAUDE.md] | `.dom.test.tsx` twins for touch tree, popover, confirm sheet | Repo standard |
| @playwright/test | 1.63.0 exact-pinned [VERIFIED: web/package.json + 05-UI-REVIEW.md "sole package is devDependency `@playwright/test` 1.63.0 exact-pinned"] | Touch e2e: `locator.tap()`, `boundingBox()` geometry, 4 projects | Phase 5 harness |

### Supporting (existing in-repo assets — the real "stack" of this phase)

| Asset | Location | Purpose | When to Use |
|-------|----------|---------|-------------|
| `BottomSheet` | `web/src/components/mobile/BottomSheet.tsx` | Base for D-05 run detail + D-07 confirm sheet (additive: full-height variant, footer slot, ≥44px close, inset-clamped padding) | All touch sheets |
| `useConfirm` | `web/src/lib/useConfirm.tsx` | Promise confirm API; portal renders with `tone={pending.tone ?? "fail"}` [VERIFIED: session code read, useConfirm.tsx:155-170] | D-07 swap point |
| `computeBubblePosition` | `web/src/lib/bubblePosition.ts` | Clamp-then-flip anchored positioning, `margin = BUBBLE_VIEWPORT_MARGIN /* 8 */` [VERIFIED: session code read, bubblePosition.ts] | TapPopover anchoring |
| `useTipBubble` show()/hide() | `web/src/lib/useTipBubble.tsx:95-101` | "Open/close by hand, for a trigger that needs its own extra reason" [VERIFIED: session code read] | InfoBubble tap migration |
| `SelectionTree` | `web/src/components/SelectionTree.tsx` | The ONE tree; gains `interactionMode` | SCRN-02/03 |
| Serialized save queue | `Containers.tsx:836` (`queueRef = useRef<{ inFlight: boolean; dirty: boolean; reload: boolean }>` [VERIFIED: session code read]); `Files.tsx:1129+` | D-03 save path — desktop-identical | Container/file-set editing |
| `BackupButton` + `useBackupWatch` + `fireAndWaitRun` | `web/src/components/BackupButton.tsx`, `web/src/lib/backupWatch.ts` | FLOW-03 semantics verbatim | All triggers |
| `useIsDesktop` / `DESKTOP_QUERY` | `web/src/lib/useMediaQuery.ts:29` | Presentation switch (D-07); NOT the touch-mode switch (see Pitfall 9) | Confirm presentation |
| Safe-area custom properties | `web/src/index.css:228-231` — `--safe-area-top: max(env(safe-area-inset-top), 0px);` (+ left/right/bottom siblings) [VERIFIED: session code read] | Sticky bar + sheet inset padding | All bottom chrome |
| `PAGE_SHELL` | `web/src/lib/pageShell.ts:88` — `export const PAGE_SHELL = "flex flex-col gap-10 max-w-6xl";` [VERIFIED: session code read] | Page roots (lint-enforced) | Home/Containers/Files adaptation |
| `useProgress` (FROZEN) | `web/src/lib/progress.ts` | Ref-counted shared EventSource; `closeSource` clears cached state so reconnect replays the server snapshot [VERIFIED: session code read] | PRIM-04 gate target |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `interactionMode` prop on ONE tree (D-01) | Fork tree / wrapper re-rendering a second tree | Rejected by D-01: state-model drift, double test surface; prop is additive and reversible |
| Sticky-in-flow bar (D-03/D-06) | `position: fixed` | Contradicts locked in-flow discipline; fixed needs manual safe-area + width sync with the scroller and stacks badly with the visualViewport keyboard mechanism in Layout |
| Conditional-render visibility gate (D-10) | Touching progress.ts to add a gate | progress.ts is frozen; conditional render achieves the identical ref-count effect with React semantics |
| `(pointer: coarse)` for interaction mode | `useIsDesktop` (width) | Width is WRONG for touch capability on landscape phones (user-locked width-only authority governs CHROME, not pointer semantics); coarse-pointer media query is the standard capability signal [ASSUMED for hybrid-device edge — see Open Questions] |

**Installation:**

```bash
# NONE. Zero new packages this phase. Standard verification gate only:
cd web && npm ci && npm run build
```

## Package Legitimacy Audit

No packages are installed in this phase (presentation-only milestone; zero new runtime deps is a locked constraint). No registry lookups required; no `checkpoint:human-verify` tasks needed for installs.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none — no installs) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
                       PHONE VIEWPORT (< 48rem CSS width)
 ┌───────────────────────────────────────────────────────────────────┐
 │ Layout.tsx (chrome switch: useIsDesktop=false → BottomNav)        │
 │  ┌─────────────────────────────────────────────────────────┐      │
 │  │ main#bv-main  (overflow-y-auto — THE scroller)          │      │
 │  │                                                         │      │
 │  │  Home page                Containers page               │      │
 │  │  ┌──────────────┐        ┌───────────────────┐          │      │
 │  │  │ identity     │        │ list ⇄ DETAIL     │ D-04     │      │
 │  │  │ next run     │        │ (local state,     │ stacked  │      │
 │  │  │ recent runs  │        │  list stays       │ view     │      │
 │  │  │ repo health  │        │  mounted)         │          │      │
 │  │  ├──────────────┤        │  SelectionTree    │          │      │
 │  │  │ STICKY BAR   │◄─D-06  │  interactionMode  │ D-01/D-02│      │
 │  │  │ New backup ──┼──┐     │  ="touch"         │          │      │
 │  │  └──────────────┘  │     │  [STICKY Save bar]│◄─D-03    │      │
 │  └────────────────────┼─────┴─────────┬─────────┘          │      │
 └───────────────────────┼───────────────┼────────────────────┘      │
                         │               │                            │
              D-07 confirm          D-08 trigger                     │
              useConfirm ─►         BackupButton (unchanged          │
              portal renders        semantics) ─► POST               │
              ConfirmSheet ─►       {ok:true,started:true}           │
              (below bp)                  │                          │
                         │               ▼                            │
                         │        useBackupWatch                      │
                         │        (baseline-id correlation)           │
                         │               │                            │
                         ▼               ▼                            │
 ┌───────────────────────────────────────────────────────────────────┐
 │ Overlays (portals):                                               │
 │  TapPopover (D-09) ── anchored via computeBubblePosition          │
 │  RunDetail BottomSheet (D-05, full-height)                        │
 │  Live progress ◄── useProgress (FROZEN singleton, ref-counted     │
 │                     EventSource) ◄── useVisibilityGate (D-10)     │
 │                     hidden: unsubscribe+stop timers               │
 │                     visible: refetch listRuns → resubscribe       │
 └───────────────────────────────────────────────────────────────────┘
                     │ SSE /api/progress (server contract UNCHANGED)
                     ▼
              Go backend (internal/** FROZEN)
```

Primary trace: tap "New backup" (sticky bar) → D-07 confirm sheet (fail tone, safe action focused) → POST starts run → useBackupWatch fires and correlates the new run by baseline-id → deep-link navigates to the existing runs surface and opens the run-detail sheet (D-05) → live progress streams through the gated `useProgress` (D-10).

### Recommended Project Structure

```text
web/src/
├── components/
│   ├── SelectionTree.tsx          # MODIFIED: additive interactionMode prop (D-01/D-02)
│   ├── InfoBubble.tsx             # MODIFIED: tap migration via TapPopover (D-09)
│   ├── FilterPopover.tsx          # MODIFIED: tap migration (D-09)
│   ├── ColorPickerPopover.tsx     # MODIFIED: tap migration (D-09)
│   └── mobile/
│       ├── BottomSheet.tsx        # MODIFIED: additive — full-height variant, footer slot,
│       │                          #   ≥44px close, inset-clamped side padding
│       ├── TapPopover.tsx         # NEW: D-09 primitive
│       └── ConfirmSheet.tsx       # NEW: fail-tone sheet body rendered by useConfirm below bp
├── lib/
│   ├── useConfirm.tsx             # MODIFIED: presentation swap only (D-07)
│   ├── useVisibilityGate.ts       # NEW: D-10 hook
│   └── useMediaQuery.ts           # UNCHANGED (breakpoint authority); maybe add
│                                  #   useIsCoarsePointer here if planner adopts OQ-3
├── pages/
│   ├── Dashboard.tsx              # Home adaptation (SCRN-01) + run-detail content seam (D-05)
│   ├── Containers.tsx             # stacked detail (D-04), tree touch mode, sticky Save bar
│   └── Files.tsx                  # same tree, file-set editor reuse
└── e2e/
    └── maquette-screens.spec.ts   # NEW: touch geometry + screen coverage
```

### Pattern 1: SelectionTree touch interaction mode (D-01 + D-02) — the milestone's hardest work

**What:** One additive prop (`interactionMode?: "pointer" | "touch"`, default `"pointer"`) branches ONLY the render/handler layer of the row. The APG state model is untouched.

**The verified desktop seam (what changes and what must not):**

Current desktop behavior, quoted from `web/src/components/SelectionTree.tsx` (session code read):

- Line 485 — row click expands: `onClick={spec.expandable ? () => toggleExpansion(spec.path) : undefined}`
- Lines 511-521 — checkbox is decorative-but-alive: `aria-hidden="true" tabIndex={-1} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(spec.path)}`
- Line 477 — roving tabindex: `tabIndex={tabTarget === spec.path ? 0 : -1}`
- Lines 423-430 — Space is the ONLY keyboard selector, through `onToggle`, guarded with `!spec.unreachable && !busyPaths?.has(spec.path)`
- Lines 455-460 — muted tone: `spec.unreachable || state === "excluded" ? "text-carbon-textMuted" : state === "unchecked" ? "text-carbon-textSub" : "text-carbon-text"`
- Line 702 — tree viewport: `className="h-[clamp(12rem,55vh,32rem)] overflow-y-auto"`
- APG verified external: "Only one treeitem in the entire tree should have tabindex='0' at any given time" [VERIFIED: Context7 /w3c/wai-aria-practices — TreeView pattern] — the existing roving model is pattern-conformant; do not touch it.

**Touch-mode transformation (interaction layer only):**

| Desktop | Touch (`interactionMode="touch"`) |
|---------|-----------------------------------|
| row `onClick` → `toggleExpansion` | row `onClick` → `onToggle(spec.path)` (same guard as Space: `!spec.unreachable && !busyPaths?.has(spec.path)`) |
| checkbox `stopPropagation` + native input toggle | checkbox purely presentational: add `pointer-events-none` (tap falls through to row) |
| chevron affordance implicit in row click | chevron is a real `<button aria-label>` ≥44×44px, right-aligned, `onClick` with `stopPropagation` → `toggleExpansion` |
| hover styles | none; active/checked states carry the affordance; `touch-action: manipulation` on rows [VERIFIED: Context7/MDN — `manipulation` = alias for `pan-x pan-y pinch-zoom`, disables double-tap zoom, removes click delay] |
| row height text-driven | ≥44px row min-height (full-row target) |

**Pointer-event rules (from `.planning/research/PITFALLS.md` Pitfall 2, milestone-verified):** activation on click only (never pointerdown — that breaks scrolling and fires on scroll-start); on `pointerup`, if the tapped treeitem is not the roving-tabindex target, call `focusNode(path)` so tap moves the roving target; NEVER `preventDefault()` on `touchstart` (kills scrolling). `focusNode` (SelectionTree.tsx:356-361) already sets focusPath + scrollIntoView + focus — reuse it.

**Byte-identical invariants (assert these stay true):** `role="tree"`/`treeitem`/`group`, `aria-checked` true/mixed/false, roving tabindex computation, Space-through-onToggle, cascade semantics, `onToggleCaches`/`excludeCaches` props (104-108), `blockedMessage` (115-121), notice rows (603-648), CACHEDIR sub-row (651-691), exclusions disclosure (553-576).

**When to use:** every tree mount below the breakpoint; drive the prop with pointer capability, not width (see Pitfall 9).

### Pattern 2: Sticky-in-flow action bars (D-03 + D-06)

**What:** `sticky bottom-0` as the LAST child inside the page column; `main#bv-main` is the scroller: `<main id="bv-main" className="flex-1 flex flex-col overflow-y-auto p-6 min-w-0">` [VERIFIED: session code read, Layout.tsx:295]. MDN semantics [VERIFIED: Context7/MDN]: sticky offsets relative to the nearest scrolling ancestor and containing block and requires at least one inset property — `bottom-0` inside the `overflow-y-auto` main is exactly that.

**When to use:** Home New-backup zone (D-06); container-detail Save bar (D-03).

**Mechanics:**
- Bar classes: `sticky bottom-0` + `bg-carbon-sidebar` (same token as BottomNav per 05-UI-REVIEW pillar 3) + `border-t border-carbon-border` + `pb-[var(--safe-area-bottom)]` [VERIFIED: safe-area property names quoted from index.css:228-231].
- The page column must not have an ancestor with `overflow: hidden` between bar and scroller — Phase 5 verified `.glim-page-enter` wrappers are clean; keep it that way.
- `PAGE_SHELL` is `max-w-6xl` — on a 360-430px phone this is full-width, so the bar spans edge-to-edge naturally; no negative-margin trick needed below the breakpoint.
- Sticky bars stick within their PARENT's box: the bar must be a direct child of the page column (not nested in a card), so it pins while siblings scroll and stops at the column end.

### Pattern 3: Locally stacked container detail (D-04)

**What:** `const [openContainer, setOpenContainer] = useState<Container | null>(null)` inside `Containers()`. List renders when null; detail (tree + sticky Save bar + back row) renders when set. The list stays mounted (or is merely hidden) so scroll position survives Back.

**Key invariants:** the existing FoldersEditor queue (`Containers.tsx:836`) and `fileSetEditorKey(set)` = `` `${set.id}:${set.path}:${set.selectedPaths ? "set" : "null"}` `` [VERIFIED: session code read, Files.tsx:1125] remount contract must not be disturbed; the zero-include client guard — `if (next.includes.size === 0) { setBlockedPath(hostPath); setRowShake(...); return; }` [VERIFIED: session code read, Containers.tsx:1169-1200] — routes the empty-deselect refusal to the blocked-path UI, which D-03 surfaces in sheet copy.

**When to use:** `/containers` only. File sets keep their existing page structure (SCRN-03 is the same tree, not the same navigation).

### Pattern 4: Full-screen run-detail BottomSheet (D-05)

**What:** BottomSheet gains an additive full-height variant (D-05 "full-screen"): today the panel is `max-h-[85dvh]` [VERIFIED: session code read, BottomSheet.tsx:194]; add a `fullHeight`-style prop rendering `h-dvh` instead. Content is EXTRACTED from the existing desktop run-detail surface (no duplication — D-05 mandates the planner map the exact source; research seam below).

**Frozen-API Data Adaptations (SCRN-05) — required because the frozen `Run` record cannot support the spec verbatim:**

`Run` interface fields [VERIFIED: session code read, web/src/lib/api.ts:341-358]: `id`, `targetId`, `kind`, `status`, `startedAt`, `finishedAt`, `snapshotId`, `bytes`, `error`, `acknowledged`, `target`, `domain`. There are NO per-file new/changed/unchanged counts and NO per-file exclusion log lines on the record.

Substitutes (per 06-UI-SPEC.md Frozen-API Data Adaptations — binding):
- Data volume tile: `humanBytes(run.bytes)`
- Duration tile: `formatDuration(finishedAt − startedAt)`
- Snapshot tile: monospace `snapshotId.slice(0, 8)`
- Activity log: reuse `buildLogLines` (existing desktop log builder) — this is a STATED DEVIATION vs SCRN-05's verbatim "new/changed/unchanged triad + exclusion-reason log" wording; the spec already accepts it, but the plan must record it again as a deviation note.

**Deep-link:** the backup trigger navigates to the existing runs surface and opens the sheet (local state set after `useNavigate`) — no new route.

### Pattern 5: TapPopover primitive (D-09)

**What:** hand-rolled `web/src/components/mobile/TapPopover.tsx`: trigger wraps `aria-expanded={open} aria-haspopup="dialog"` (in-repo precedent: FilterPopover trigger and ColorPickerPopover trigger at ColorPickerPopover.tsx:386-394 both use exactly this pair [VERIFIED: session code read]); panel `role="dialog"` with accessible name, positioned via `computeBubblePosition(trigger, bubble, viewport, margin = BUBBLE_VIEWPORT_MARGIN /* 8 */)` [VERIFIED: session code read, bubblePosition.ts] — clamp-then-flip already handles viewport edges.

**Anatomy (APG/aria pattern [VERIFIED: Context7 /w3c/wai-aria-practices]):** focus moves into the panel on open; Escape closes; focus restores to trigger on dismiss; transparent full-viewport backdrop consumes the outside tap (NOT a scrim — visually transparent); NO focus trap (a popover is not a modal — D-09).

**Consumers:** InfoBubble (migrate its hover/focus bubble to also `show()` on tap via `useTipBubble`'s manual API), FilterPopover, ColorPickerPopover. Desktop hover untouched — `hover:` is `@media (hover: hover)`-gated repo-wide [VERIFIED: 06-CONTEXT.md established patterns + 05-UI-REVIEW finding 5 rationale].

### Pattern 6: Confirm presentation swap (D-07 / PRIM-03)

**What:** `useConfirm` keeps its promise API and portal; the component rendered inside the portal switches on `useIsDesktop`: desktop keeps ConfirmDialog; below the breakpoint render ConfirmSheet (fail-tone BottomSheet body). The portal already defaults the tone to fail: `<ConfirmDialog ... tone={pending.tone ?? "fail"} ...>` [VERIFIED: session code read, useConfirm.tsx:155-170].

**Focus rule:** no destructive control default-focused. BottomSheet's existing open effect captures the trigger then focuses the close button (`closeRef.current?.focus()`, BottomSheet.tsx:100-112) — close = dismiss = the safe outcome, so the existing default already satisfies "focus lands on the safe action"; optionally focus the explicit Cancel instead. Reuse BottomSheet's `FOCUSABLE_SELECTOR` Tab-trap (lifted from useConfirm.tsx:78-149) so keyboard containment behavior is identical.

**Call sites inherit automatically:** BackupButton (`confirmStopThenFire`, STOP_ACK_KEY = "bv-container-stop-ack"), restore guards — zero per-site changes; that is the point of D-07.

**Absorb 05-UI-REVIEW findings at this reuse (top fix 1 + minor 6):** side padding becomes inset-clamped — `padding-inline: max(1rem, var(--safe-area-right)) max(1rem, var(--safe-area-left))` on the panel or body (today `px-4` fixed at BottomSheet.tsx:199/231 [VERIFIED: session code read]); close button `p-2` (~40px, BottomSheet.tsx:222) bumped to ≥44px hit box. Findings text [CITED: .planning/phases/05-mobile-shell-navigation-foundation/05-UI-REVIEW.md findings 1 and 6].

### Pattern 7: useVisibilityGate (D-10 / PRIM-04)

**What:** `useVisibilityGate()` returns `visible: boolean` (document visibilitychange-driven). Live-progress surfaces conditionally render their progress consumer on it; `useBackupWatch`'s poll timers (POLL_INTERVAL_MS=2000 setTimeout chain) are stopped while hidden.

**Why this is correct against the frozen singleton:** `useProgress` ref-counts the shared EventSource — a gated consumer that unmounts drops the count; at zero the source closes (`closeSource` also clears cached state so the reconnect replays the server snapshot [VERIFIED: session code read, progress.ts]). Re-subscribe on visible, and refetch `listRuns` FIRST so a run that finished in the background is reconciled by server state — never the client clock. `useBackupWatch` seeds the baseline BEFORE firing (`baselineIds.current = new Set(before.runs.filter(...))`, backupWatch.ts:226-236 [VERIFIED: session code read]) and matches the newest matching run not in the baseline — exactly the reconciliation D-10 requires.

**External verification [VERIFIED: developer.chrome.com/page-lifecycle (webReader) + Context7 Page Visibility]:** `visibilitychange` fires on tab switch, app switch, minimize; the HIDDEN state is "often the last state change that's reliably observable" on mobile (unload/pagehide unreliable); frozen-state guidance: "Stop any network polling or close any open Web Socket connections", then reopen on resume. The gate implements precisely this contract.

### Anti-Patterns to Avoid

- **Second tree / wrapper re-rendering a duplicate tree:** D-01 explicitly forbids; state-model drift is the failure mode. Prop on ONE component only.
- **`position: fixed` chrome:** contradicts the locked in-flow discipline; fights the Layout visualViewport keyboard mechanism and needs manual safe-area/width sync.
- **`preventDefault()` on `touchstart` in the tree:** kills scrolling; activation belongs on click (PITFALLS Pitfall 2).
- **Keying `interactionMode` off `useIsDesktop`:** landscape phones (≥48rem, user-locked desktop chrome) still have touch input — width is a chrome decision, not a pointer-capability decision.
- **Focus-trapping the popover:** D-09 says light focus handling; a trap makes Escape/outside-tap semantics modal for no reason.
- **New routes or touching router.tsx / api.ts / progress.ts / internal/**:** all frozen; violations fail the milestone contract outright.
- **Reading backup outcomes from the POST response:** house rule — `{ok:true,started:true}` then `useBackupWatch` correlation only.
- **Raw hex / off-token colors:** design bible accent `#FCC419` with on-accent ink never white; all surfaces via `carbon-*`/`accent*`/`status*` tokens; status colors on badges only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anchored popover positioning | Manual flip/clamp math | `computeBubblePosition` (`web/src/lib/bubblePosition.ts`) | Already clamp-then-flip with 8px viewport margin; proven by existing popovers |
| Focus trap / restore in sheets | Custom Tab walkers | BottomSheet `FOCUSABLE_SELECTOR` mechanics + useConfirm trap (same selector, useConfirm.tsx:78-149) | Phase 5 shipped 8 passing dom tests over these paths |
| Save serialization | New queue for mobile | FoldersEditor serialized queue (`Containers.tsx:836`, `Files.tsx:1129+`) | SCRN-03 mandates the desktop-identical path; latest-desc-wins + revert-by-set-difference already solved |
| Run-completion reconciliation | Timestamps/timeouts | `useBackupWatch` baseline-id correlation | House rule: never client clock; baseline seeded before firing |
| Breakpoint logic | New media queries per feature | `DESKTOP_QUERY` in useMediaQuery.ts:29 [VERIFIED verbatim: `export const DESKTOP_QUERY = "(min-width: 48rem)";`] | Single breakpoint authority (user-locked); Tailwind `md`/`max-md:` pinned to it by source-assert guard |
| Safe-area insets | env() ad hoc | Phase 5 custom properties (`--safe-area-*`, index.css:228-231) | Paired with viewport-fit=cover by the mobileShellSource contract — env() reads 0px without the directive |
| Humanized bytes/duration/snapshot formatting | New formatters | Existing `humanBytes` / `formatDuration` helpers | Already render run data on desktop (Dashboard) [CITED: 06-UI-SPEC.md Frozen-API Data Adaptations; confirm exact module at plan time] |
| Hit-target sizing math | Custom per-control px | 44px platform floor (iOS 44pt / Android 48dp; WCAG 2.5.5 AAA = 44×44 CSS px, AA floor 2.5.8 = 24×24) [VERIFIED: w3.org/WAI/WCAG22/Understanding/target-size-minimum.html] | One number, platform-standard |

**Key insight:** this phase's difficulty is interaction semantics, not infrastructure — every mechanism it needs already exists and is tested; the work is wiring them under a new pointer regime without perturbing the state models they guard.

## Common Pitfalls

### Pitfall 1: Checkbox double-fire / dead zone in touch mode
**What goes wrong:** the desktop checkbox is a real `<input>` with `onClick={(e) => e.stopPropagation()}` AND `onChange={() => onToggle(spec.path)}`. In touch mode with row-tap=toggle, tapping the glyph either fires the input's native toggle AND the row onClick (double toggle = no-op) or, if propagation stays stopped, does nothing (dead zone inside a "full-row target").
**Why it happens:** desktop semantics evolved so the row click means "expand"; the checkbox absorbed the toggle. Touch inverts the row, stranding the input's behavior.
**How to avoid:** in touch mode render the checkbox strictly presentational (`pointer-events-none`, keep `aria-hidden`), and let the row be the single toggle surface.
**Warning signs:** vitest twins where two taps produce zero state change; e2e tap on glyph coordinates flipping twice.

### Pitfall 2: Row tap doesn't move the roving tabindex
**What goes wrong:** tapping a row toggles it, but keyboard focus (and therefore subsequent Space/arrow behavior) stays on the previously focused item.
**How to avoid:** on activation of a non-tab-target row, call `focusNode(spec.path)` (SelectionTree.tsx:356-361 — sets focusPath, scrollIntoView, focus). APG: roving target must follow interaction.
**Warning signs:** manual test — tap row B, press Space → row A toggles.

### Pitfall 3: Sticky bar not sticking (or sticking at the wrong boundary)
**What goes wrong:** `sticky bottom-0` silently behaves static because an ancestor between the bar and `main#bv-main` gained `overflow`/`contain`, or the bar is nested inside a card so it "sticks" only within that card's box.
**How to avoid:** bar is a direct child of the page column; no `overflow-hidden` wrappers in between (Phase 5 verified `.glim-page-enter` clean — keep new wrappers clean too).
**Warning signs:** bar scrolls away with content; e2e `boundingBox()` of the bar changes while scrolling.

### Pitfall 4: Double-tap zoom on rapid tree taps
**What goes wrong:** fast repeated taps zoom the viewport instead of toggling rows.
**How to avoid:** `touch-action: manipulation` on rows (D-02) — verified alias for `pan-x pan-y pinch-zoom` that disables double-tap zoom without blocking scroll [VERIFIED: Context7/MDN].
**Warning signs:** iOS device zooms during the e2e real-device pass (Phase 8).

### Pitfall 5: Confirm sheet focuses the destructive action
**What goes wrong:** reusing BottomSheet naively could land initial focus on a destructive button if the confirm body places its primary (destructive) control first and someone "fixes" focus to the first control.
**How to avoid:** keep BottomSheet's existing capture-then-focus-close behavior (close = safe) or explicitly focus Cancel; never autoFocus the destructive control. One shared open effect, capture strictly BEFORE the focus move (Phase 5 decision).
**Warning signs:** dom test asserting initial focus target fails; screen-reader pass announces the destructive label first.

### Pitfall 6: Landscape phone gets the pointer-optimized tree
**What goes wrong:** `interactionMode` keyed off `useIsDesktop` gives a landscape phone (≥48rem CSS width — user-locked desktop chrome) the desktop tree: hover styles, 24px-ish targets, row-click-expands. Touch input still arrives.
**How to avoid:** drive `interactionMode` from pointer capability — `(pointer: coarse)` media query (add `useIsCoarsePointer` beside `useIsDesktop` in the same file, keeping `DESKTOP_QUERY` the only WIDTH authority). Hybrid touchpad laptops stay on pointer mode; that matches every existing desktop-first control.
**Warning signs:** 740×360 landscape e2e (Phase 5's coverage) taps failing hit-area assertions if mode is width-keyed.

### Pitfall 7: Stale SSE state after returning to the tab
**What goes wrong:** backgrounded tab's timers throttle (setTimeout ~10s in background tabs — milestone research, MDN-verified [CITED: .planning/research/FEATURES.md]); events queue/drop; on return the UI shows a stale mid-run state, or a finished run never resolves.
**How to avoid:** D-10 gate: hidden → unsubscribe (ref-count drops the EventSource) + stop poll timers; visible → `listRuns` refetch FIRST, then resubscribe; useBackupWatch's baseline-id match resolves the run that finished in the background. Server replays its snapshot on reconnect (closeSource behavior).
**Warning signs:** run stuck "running" after tab return until manual reload; duplicate EventSource connections in devtools (gate leaked a subscriber).

### Pitfall 8: Sheet content under display cutouts in landscape
**What goes wrong:** fixed `px-4` sheet padding puts content under Android gesture bars / iPhone notch edges (~47px insets) in landscape; the confirm sheet's sign-out/destructive row is the risky one.
**How to avoid:** absorb 05-UI-REVIEW finding 1 at every BottomSheet reuse: inset-clamped `max(1rem, var(--safe-area-left/right))` inline padding; keep `pb-[var(--safe-area-bottom)]`.
**Warning signs:** 05-UI-REVIEW already documented it for the More sheet — same defect reproduces in new sheets unless fixed once in the primitive.

### Pitfall 9: i18n parity misses for new keys
**What goes wrong:** new keys (`home.newBackup`, `home.newBackupConfirm`, `folders.handedToRestic`, `common.back`, `files.emptyRule`, plus a nav `aria-label` key — [VERIFIED verbatim key names from 06-UI-SPEC.md copywriting contract]) added to some locales only; parity pipeline fails late.
**How to avoid:** add every new key to ALL locale modules in the same commit; run the i18n parity check. Note: CONTEXT says 42-locale parity, 05-UI-REVIEW recorded "40/40 modules" for nav.more — confirm the actual module count at execution (Open Question 2).
**Warning signs:** `npm run build` or the i18n test failing on parity.

### Pitfall 10: `t()`-bypass and status-color-on-control lint failures
**What goes wrong:** new screens copy strings literally or color buttons by status; the 8 `bombvault/*` eslint house rules fail (user text translated; no status color on interactive controls; PAGE_SHELL on page roots).
**How to avoid:** four-status rule via badges only; accent confined to the reserved list; PAGE_SHELL on Home/Containers/Files roots.
**Warning signs:** eslint run; uiConventions.test.ts failures.

## Code Examples

### Touch-mode row skeleton (Pattern 1 seam)

```tsx
// Source: session code read of SelectionTree.tsx:477-521 + D-01/D-02; values quoted above are verbatim.
// interaction layer ONLY — state model (roles, aria-checked, roving tabindex, onToggle) untouched.
const touch = interactionMode === "touch";

<div
  role="treeitem"
  aria-checked={state}            // true | "mixed" | false — unchanged
  tabIndex={tabTarget === spec.path ? 0 : -1}   // unchanged (SelectionTree.tsx:477)
  onClick={touch
    ? (!spec.unreachable && !busyPaths?.has(spec.path))
      ? () => { focusNode(spec.path); onToggle(spec.path); }   // tap = toggle + roving move
      : undefined
    : spec.expandable ? () => toggleExpansion(spec.path) : undefined  // desktop, verbatim :485
  }
  className={touch ? "min-h-[44px] touch-manipulation select-none" : undefined}
>
  <input
    type="checkbox"
    aria-hidden="true"
    tabIndex={-1}
    // touch: purely presentational — no native toggle, no stopPropagation dead zone
    className={touch ? "pointer-events-none" : undefined}
    onChange={touch ? undefined : () => onToggle(spec.path)}     // desktop, verbatim :511-521
  />
  {touch && spec.expandable && (
    <button
      type="button"
      aria-label={t(expanded ? "common.collapse" : "common.expand")}
      className="ml-auto h-11 w-11 shrink-0"                    // ≥44×44 dedicated zone
      onClick={(e) => { e.stopPropagation(); toggleExpansion(spec.path); }}
    >
      <ChevronGlyph />
    </button>
  )}
</div>
```

### Sticky action bar (Patterns 2)

```tsx
// Source: D-03/D-06 + MDN sticky semantics (nearest scrolling ancestor = main#bv-main, Layout.tsx:295)
<div className={PAGE_SHELL}>                     // pageShell.ts:88, verbatim
  {/* ...scrolling content siblings... */}
  <div className="sticky bottom-0 -mx-6 px-6 bg-carbon-sidebar border-t border-carbon-border
                  pt-3 pb-[max(0.75rem,var(--safe-area-bottom))]">
    <button className="w-full min-h-[44px]">{t("home.newBackup")}</button>
  </div>
</div>
```

### Visibility gate (Pattern 7)

```tsx
// Source: D-10 + progress.ts ref-count behavior (frozen) + Page Lifecycle guidance (verified)
export function useVisibilityGate(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
// Consumer: {visible && <LiveRunProgress runId={...}/>}  ← unmount drops useProgress refcount
//   hidden: EventSource closes at zero refs; timers gated in useBackupWatch
//   visible: await listRuns() refetch FIRST (reconcile via baseline-id match), then remount resubscribes
```

### Confirm presentation swap (Pattern 6)

```tsx
// Source: D-07 + useConfirm.tsx portal (tone default "fail", :155-170) + BottomSheet focus mechanics
function ConfirmBody(props: ConfirmProps) {
  const isDesktop = useIsDesktop();              // presentation ONLY — promise API untouched
  return isDesktop ? <ConfirmDialog {...props} /> : <ConfirmSheet {...props} />;
}
// ConfirmSheet: BottomSheet full-bleed variant, statusFail tonality, consequence-naming copy,
// outcome-naming destructive label, initial focus on the SAFE action (never destructive),
// Tab containment via FOCUSABLE_SELECTOR, Escape + scrim + close all resolve settle(null-safe cancel)
```

### Touch e2e geometry assertion

```ts
// Source: Phase 5 harness (web/playwright.config.ts) + Playwright docs [VERIFIED: Context7]
// tap() requires hasTouch:true — mobile-iphone (iPhone 13 WebKit) and mobile-android (Pixel 5) have it.
const row = page.getByRole("treeitem", { name: /plex/i });
await row.tap();                                   // toggles the check (D-02)
await expect(row).toHaveAttribute("aria-checked", "true");
const box = await row.boundingBox();               // null when not visible — assert presence first
expect(box!.height).toBeGreaterThanOrEqual(44);    // hit-area geometry (D-02)
const chevron = row.getByRole("button", { name: /expand/i });
const cbox = await chevron.boundingBox();
expect(cbox!.width).toBeGreaterThanOrEqual(44);
expect(cbox!.height).toBeGreaterThanOrEqual(44);
// hit separation: chevron box must NOT intersect the row's text-label box horizontally beyond its zone
```

## Runtime State Inventory

Omitted — not a rename/refactor/migration phase. (Presentation-only milestone; no stored strings, service configs, OS registrations, secret keys, or build artifacts change identity.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 300ms tap delay + double-tap zoom | `touch-action: manipulation` | CSS standard, widely supported | Tree rows get instant taps without killing scroll |
| `unload`/`beforeunload` as session end | `visibilitychange` hidden as last reliable signal | Page Lifecycle era (documented 2018+, still current guidance) | D-10 gate keys off the reliable signal only |
| Fixed bottom chrome | Sticky-in-flow chrome | Phase 5 locked discipline | No viewport-position sync bugs, keyboard-safe |
| Per-feature media queries | ONE width authority + capability query for pointer | User-locked 2026-09-11 (width) + this research's recommendation (pointer) | Chrome vs input-mode decisions cleanly separated |

**Deprecated/outdated (do not use):** `position: fixed` for app chrome; `unload` handlers; hover-only affordances below the breakpoint; hover styles not gated by `(hover: hover)`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | iOS Safari suspends/drops EventSource connections when the page is hidden (platform-specific detail) | Pattern 7 / Pitfall 7 | LOW — the D-10 gate unsubscribes on hidden regardless, so correctness does not depend on the browser's exact suspension behavior |
| A2 | `(pointer: coarse)` is the right switch for `interactionMode`, including hybrid laptops staying on pointer mode | Pitfall 6 / Open Question 3 | MEDIUM — if the user disagrees (e.g., wants touch mode on hybrid touchscreens), the prop's driver changes but not its design; cheap to revisit |
| A3 | `humanBytes` / `formatDuration` helpers exist and are importable for the run-detail tiles | Don't Hand-Roll / Pattern 4 | LOW — UI-SPEC names them as the substitutes; exact module location confirmed at plan time |
| A4 | New locale keys must land in every locale module; module count is 40-42 (sources disagree) | Pitfall 9 | LOW — parity test catches any miss; count confirmed at execution |
| A5 | `tap()` inside the desktop-768 project is never needed (mouse project) | Validation Architecture | LOW — touch assertions are scoped to the two mobile projects |

## Open Questions (RESOLVED — all four closed at plan time, 2026-09-12)

1. **D-05 content extraction seam — which desktop component(s) hold run-detail content?** **(RESOLVED — plan 06-04)**
   - What we know: Dashboard.tsx owns run presentation helpers (`runKindLabel` 66-92, `runTargetText` 107-112, `statusLabel` 387-406, `statusTone` 340 — session code read) and the runs list; D-05 mandates the planner map the exact extraction source with no duplication.
   - What's unclear: whether the detail content lives as an expanded-row renderer, a dialog, or inline sections in Dashboard.
   - Recommendation: planner pins the extraction boundary as the FIRST task of the run-detail plan; extract content into a shared component consumed by both desktop surface and the full-screen sheet.
   - Resolution: 06-04 Task 1 pins the source — the six presentation helpers (`runKindLabel`, `runDomainLabel`, `isDomainOpRunKind`, `runTargetText`, `statusTone`, `statusLabel`) move verbatim from Dashboard.tsx into the new `web/src/lib/runDisplay.ts`, Dashboard imports them back (behavior-identical refactor), and the RunDetailSheet renders the detail content from the same helpers — no duplication, no second surface.

2. **Locale module count for new i18n keys (42 vs 40)?** **(RESOLVED — plans 06-01/04/05/06/07)**
   - What we know: CONTEXT says 42-locale parity; 05-UI-REVIEW verified "40/40 modules" for `nav.more`.
   - Recommendation: treat the parity test as the authority; add keys to every module present.
   - Resolution: parity/orphans tests are the authority, exactly as recommended. All Phase 6 plans add each new key to the en + de inline blocks in i18n.ts AND all 40 modules under `web/src/lib/locales/` in the same commit (42 surfaces total), and every plan's verify runs `i18n.parity.test.ts` + `i18n.orphans.test.ts`.

3. **What drives `interactionMode` — adopt `(pointer: coarse)`?** **(RESOLVED — user-locked as D-11, 2026-09-12; implemented by plan 06-01)**
   - What we know: D-01/D-02 don't pin the switch point; `useIsDesktop` is width-based and user-locked as the CHROME authority; landscape phones (≥48rem) still receive touch.
   - Recommendation: add `useIsCoarsePointer` (`(pointer: coarse)`) in `useMediaQuery.ts` beside the existing hook — width authority untouched; confirm with user at discuss/plan if A2 should be locked.
   - Resolution: locked as D-11 at /gsd-discuss-phase exactly per the recommendation — `POINTER_COARSE_QUERY = "(pointer: coarse)"` + `useIsCoarsePointer()` as an additive twin beside `useIsDesktop`; DESKTOP_QUERY remains the single width/chrome authority; hybrid fine-pointer devices stay on the pointer tree.

4. **Full-height run-detail sheet: `h-dvh` variant shape?** **(RESOLVED — plan 06-02 Task 1)**
   - What we know: BottomSheet panel is `max-h-[85dvh]` today; D-05 says full-screen.
   - Recommendation: additive prop on BottomSheet (e.g. fullHeight) switching the panel class to `h-dvh`; keep 85dvh default for all existing consumers (MoreSheet backward-compat).
   - Resolution: implemented as recommended — additive `fullHeight?: boolean` prop on BottomSheet rendering `h-dvh` instead of `max-h-[85dvh]`; default untouched so MoreSheet and every existing dom test pass unchanged; 06-04's RunDetailSheet is the fullHeight consumer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | SPA build/tests | ✓ | v24.16.0 (probed 2026-09-12) | — |
| npm | install/build | ✓ | 11.13.0 (probed) | — |
| web/node_modules | vitest, playwright, tsc, vite binaries | ✓ | present (probed .bin) | `npm ci` re-install |
| Playwright browsers | e2e incl. WebKit (mobile-iphone) | ✓ | chromium (6 builds), webkit-1944/2336/2359, firefox (probed ms-playwright cache) | — |
| Go toolchain | `just check` pre-push gate | ✓ | go1.25.0 windows/amd64 (probed) | — |
| just | Go chain runner | ✓ | present (probed) | run commands individually |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

Known local-run caveat (Phase 5, STATE.md): local Playwright runs use a manually started webServer (Windows teardown hang); CI keeps its own boot (`reuseExistingServer: !CI`).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 + @testing-library/react ^16.3.2 + jsdom ^30.0.1; @playwright/test 1.63.0 (4 projects: desktop-1280, desktop-768, mobile-iphone=iPhone 13 WebKit, mobile-android=Pixel 5 360×800) |
| Config file | web/vite.config.ts (vitest), web/playwright.config.ts (fresh-DB wipe-then-boot webServer, `reuseExistingServer: false` in repo config, APP_KEY 64 zeros, DATA_DIR ./.playwright-data, HTTP_ONLY) |
| Quick run command | `cd web && npx vitest run` |
| Full suite command | `cd web && npx playwright test` (plus `npm run build` gate after any web/ change) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRN-01 | Home renders trigger + status without scrolling past it; sticky bar pins | e2e (mobile projects) | `npx playwright test e2e/maquette-screens.spec.ts --project=mobile-android` | ❌ Wave 0 |
| SCRN-02 | Container list ⇄ stacked detail; back preserves list; save queue path fires | e2e + dom | same spec + `npx vitest run src/pages` | ❌ Wave 0 (e2e) / partial (queue dom tests exist) |
| SCRN-03 | Touch tree: tap toggles, chevron expands, ≥44px zones, roving-on-tap | dom twins + e2e geometry | `npx vitest run src/components/SelectionTree.dom.test.tsx`; playwright spec | ❌ Wave 0 (touch twins + spec) |
| SCRN-04/05 | Run-detail sheet opens via deep-link; tiles show bytes/duration/snapshot | e2e + dom | playwright spec; vitest run-detail component test | ❌ Wave 0 |
| PRIM-02 | TapPopover: tap opens, outside tap/Escape closes, focus restores | dom | `npx vitest run src/components/mobile/TapPopover.dom.test.tsx` | ❌ Wave 0 |
| PRIM-03 | Confirm below bp renders fail-tone sheet; destructive never default-focused | dom | `npx vitest run src/components/mobile/ConfirmSheet.dom.test.tsx` | ❌ Wave 0 |
| PRIM-04 | Gate unsubscribes on hidden; refetch+resubscribe on visible; run reconciles | unit (jsdom visibilitychange) + e2e | `npx vitest run src/lib/useVisibilityGate.test.ts` | ❌ Wave 0 |
| FLOW-03 | Trigger from Containers/Files uses BackupButton semantics (no new paths) | dom (existing BackupButton tests extend) + e2e | `npx vitest run src/components/BackupButton.dom.test.tsx` | ✅ exists (extend) |
| Regression | APG state model byte-identical in both modes | dom (existing suite unchanged must stay green) | `npx vitest run src/components/SelectionTree.dom.test.tsx` | ✅ exists |

### Sampling Rate

- **Per task commit:** `cd web && npx vitest run` (+ touched playwright spec for screen tasks)
- **Per wave merge:** `cd web && npm run build && npx playwright test`
- **Phase gate:** full suite green + `just check` before `/gsd-verify-work`; web/dist committed

### Wave 0 Gaps

- [ ] `web/src/components/SelectionTree.touch.dom.test.tsx` (or touch-mode twins inside existing dom test) — covers SCRN-03 state-model invariance + touch handlers
- [ ] `web/src/components/mobile/TapPopover.dom.test.tsx` — covers PRIM-02
- [ ] `web/src/components/mobile/ConfirmSheet.dom.test.tsx` — covers PRIM-03 focus rule + tone
- [ ] `web/src/lib/useVisibilityGate.test.ts` — covers PRIM-04 (jsdom visibilitychange mock)
- [ ] `web/e2e/maquette-screens.spec.ts` — covers SCRN-01..05 + FLOW-03 (tap + boundingBox geometry, MOBILE_PROJECTS pattern from mobile-shell.spec.ts; bootWithoutServerLook route-abort for localized boots)
- [ ] Framework install: none needed (infrastructure complete)

## Security Domain

(`security_enforcement: true`, ASVS level 1 per .planning/config.json)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | untouched this phase (login surface unchanged) |
| V3 Session Management | no | untouched (httpOnly cookie session, server-side) |
| V4 Access Control | no (no new API surface) | frozen client consumes existing endpoints only; server authorization unchanged |
| V5 Input Validation | yes (boundary verified unchanged) | Server-side boundary is FROZEN and already enforces: `resourceNameRe` name params, 1 MiB `MaxBytesReader`, `DisallowUnknownFields`, JSON-only, cross-site refusal (CLAUDE.md Validation contract). Frontend sends only existing typed payloads via frozen api.ts |
| V6 Cryptography | no | no crypto surface in phase |
| V7 Error handling/Logging | yes (display-only) | backend error text shown verbatim is the existing scrubbed/capped text (scrubError → truncateErr upstream); frontend never logs raw errors |
| V14 Configuration | no | no new env/config |

### Known Threat Patterns for this stack (touch SPA, destructive backup/restore domain)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via user/translated text | Tampering | React escaping everywhere; every string through `t()`; no `dangerouslySetInnerHTML` in new code |
| Accidental destructive tap (stop/restore) on touch | Tampering/Elevation of privilege | Fail-tone confirm sheet with safe-action default focus (D-07); ≥44px separated hit zones (D-02); no status-colored controls |
| Tap-outside click-through to background controls | Tampering | Transparent backdrop is a real event-consuming layer (pointer events land on backdrop, not content beneath); BottomSheet precedent: scrim aria-hidden sibling pattern |
| CSRF on state-changing triggers | Spoofing | Unchanged server-side cross-site refusal on mutating requests; no new endpoints |
| Focus-based disclosure in popovers | Information disclosure | Light focus handling per D-09 (focus in + restore; no trap) — content is non-sensitive metadata |

No new threats introduced: the phase adds no endpoints, no storage, no secrets, no elevated flows.

## Sources

### Primary (HIGH confidence)
- Context7 `/w3c/wai-aria-practices` — TreeView pattern (roving tabindex, Enter/Space activation, aria-checked mixed tri-state)
- Context7 `/microsoft/playwright` — `locator.tap()` hasTouch requirement, `boundingBox()` semantics
- Context7 MDN content — `touch-action: manipulation` (pan-x pan-y pinch-zoom alias, double-tap-zoom disable), `position: sticky` (nearest scrolling ancestor + inset requirement), Page Visibility API (visibilitychange, pause/resume pattern)
- W3C — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (SC 2.5.8 AA 24×24 + five exceptions; SC 2.5.5 AAA 44×44) — fetched this session
- developer.chrome.com — Page Lifecycle API (hidden = last reliably observable state on mobile; frozen guidance: stop polling, close connections, reopen on resume) — fetched this session
- Session code reads (verbatim quotes in document): SelectionTree.tsx (477, 485, 511-521, 455-460, 702, 356-361, 104-108, 115-121, 603-648, 651-691, 553-576), BottomSheet.tsx (100-112, 194, 199, 222, 231), useConfirm.tsx (78-149, 155-170), useMediaQuery.ts (29), pageShell.ts (88), Layout.tsx (295), index.css (228-231), bubblePosition.ts, useTipBubble.tsx (95-101), backupWatch.ts (226-236), progress.ts (ref-count/closeSource), api.ts (341-358 Run), Containers.tsx (836, 1169-1200), Files.tsx (1125), ColorPickerPopover.tsx (386-394), Dashboard.tsx (66-112, 340, 387-406), web/package.json, web/playwright.config.ts, web/e2e/mobile-shell.spec.ts
- In-repo planning contracts (read this session): 06-CONTEXT.md (D-01..D-10), 06-UI-SPEC.md (binding design contract), REQUIREMENTS.md, 05-UI-REVIEW.md, .planning/research/PITFALLS.md, .planning/research/FEATURES.md, STATE.md, design/mobile/README.md @0b64c7df (via git show, prior session)

### Secondary (MEDIUM confidence)
- .planning/research/FEATURES.md MDN-verified background-tab throttling (~10s setTimeout throttle, SSE exemption) — prior-session verification carried forward

### Tertiary (LOW confidence)
- iOS-Safari-specific EventSource suspension behavior — not directly sourced this session (websearch provider unavailable, BRAVE_API_KEY unset; web.dev page-lifecycle URL 404'd, re-sourced via developer.chrome.com which does not cover iOS specifics). Tagged A1; design is tolerant.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero installs; every library/asset version verified in-repo this session
- Architecture (touch tree seam): HIGH — the desktop interaction model was read line-by-line this session; the touch transformation is a bounded render-layer branch with the verified guard expressions
- Architecture (sticky/popover/confirm/gate): HIGH — each mechanism verified against both the in-repo implementation and external platform docs
- Pitfalls: HIGH — pitfalls 1, 3, 5, 7, 8 derive from code read this session; 2, 4 from milestone research; 6, 9 are analysis
- PRIM-04 platform specifics: MEDIUM-LOW (A1) — iOS EventSource suspension indirectly sourced; gate design does not depend on it

**Research date:** 2026-09-12
**Valid until:** 2026-10-12 (stable: in-repo contracts frozen; platform docs slow-moving)
