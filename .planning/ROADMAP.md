# Roadmap: BombVault

## Milestones

- ✅ **v1.0 Tree-Based Sub-Folder Backup Selection** — Phases 1-4 (shipped 2026-09-11)
- 🚧 **v1.1 Mobile Interface** — Phases 5-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 (Phases 1-4) — SHIPPED 2026-09-11</summary>

- [x] **Phase 1: Selection Engine & Restore Safety** (5 plans) — Selections normalize losslessly into the unchanged flat `backupPaths` set, node listings are cheap and containment-safe, and restores survive selection changes — the risky keystone (maximal-roots ↔ restic positional targets) proven end-to-end before any UI. Full details: `.planning/milestones/v1.0-phases/01-selection-engine-restore-safety/`
- [x] **Phase 2: Container Panel Tree Selection** (3 plans) — In the container panel, users can unfold any discovered mount or custom path and pick subfolders with cascade semantics, mixed-state parents, and full keyboard access — and what they see on reopen is exactly what they left. Full details: `.planning/milestones/v1.0-phases/02-container-panel-tree-selection/`
- [x] **Phase 3: Selection Trust & Controls** (3 plans) — Users can see and control exactly what a selection will back up — per-mount effective-selection preview with narrowing note, reviewable exclusions, defined deselect-everything semantics, and a per-root CACHEDIR.TAG toggle. Full details: `.planning/milestones/v1.0-phases/03-selection-trust-controls/`
- [x] **Phase 4: File Sets Parity** (4 plans) — Choosing what a File Set covers uses the same collapsible tree with the same cascade/mixed-state/persistence semantics — file sets gain sub-folder granularity with zero second implementation of selection. Full details: `.planning/milestones/v1.0-phases/04-file-sets-parity/`

</details>

### 🚧 v1.1 Mobile Interface (Phases 5-8)

**Milestone Goal:** The BombVault SPA becomes fully operational on mobile — a dedicated responsive layout following the locked design bible (`design/mobile/README.md` + maquettes @0b64c7df), with the desktop layout untouched above the 48rem breakpoint and full operational parity below it. Presentation-only: zero new npm dependencies, zero backend changes; `router.tsx`, `web/src/lib/api.ts`, and `internal/**` stay frozen.

- [x] **Phase 5: Mobile Shell & Navigation Foundation** - One quarantined breakpoint decision swaps the Sidebar for the bottom bar + More sheet with safe-area, viewport-height, and keyboard correctness; desktop renders unchanged; the Playwright harness gates responsive regressions from day one (completed 2026-09-12)
- [x] **Phase 6: Maquette Screens** - Home (glanceable, thumb-zone backup trigger), Containers (touch selection tree), File sets (same tree), and Run detail — with tap-popovers, fail-tone sheet confirmations, and visibility-aware live progress working on touch (completed 2026-09-12)
- [ ] **Phase 7: Remaining Destinations & Operational Parity** - VMs, Flash, Config, Receiver, Fleet, and Settings in the mobile card language; schedule/notification/replication editing as full-screen sheets; sticky search + load-more lists; M3/HIG platform-adaptive chrome
- [ ] **Phase 8: Guided Restore & Real-Device Verification** - The guided restore flow end-to-end on mobile, closed out by the milestone exit criterion: real-device pass, i18n narrow-viewport sweeps, touch-target/hover audit, and both themes verified

## Phase Details

### Phase 5: Mobile Shell & Navigation Foundation

**Goal**: Below the 48rem breakpoint the SPA presents a working mobile shell — bottom bar, More sheet, safe-area- and keyboard-correct viewport — while the desktop layout above the breakpoint renders unchanged, and the Playwright harness makes responsive regressions fail CI from here on.
**Depends on**: Nothing (first phase of milestone v1.1; builds on the four shipped v1.0 phases)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, SHELL-07, PRIM-01, VERIFY-01
**Success Criteria** (what must be TRUE):

  1. On a phone-width viewport the user navigates the entire app from mobile chrome: the four bottom-bar destinations work (tap-on-active returns to the top of the view), the More sheet reaches Recovery, VMs, Flash, Config, Receiver, Fleet, and sign-out, and the destination set always matches the desktop sidebar for the same settings (one shared nav registry)
  2. On a notched phone in portrait and landscape, the bottom bar, headers, and pinned bars clear the notch and home indicator, the layout resizes correctly with browser chrome and the Android keyboard (no content lost under bars, no `100vh` trap), and the two-step login completes without iOS focus-zoom
  3. The More sheet behaves as a proper touch surface — focus-trapped, scroll-contained, safe-area padded, thumb-reachable, clearly dismissible — as the first consumer of the hand-rolled bottom-sheet primitive
  4. At desktop width (≥48rem) every page renders today's desktop layout unchanged, asserted per-page by the new Playwright harness, and a mobile-shell or desktop-layout regression fails CI

**Plans**: 6/6 plans executed

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Playwright harness foundation: legitimacy-gated exact-pinned @playwright/test, 4-project webServer config over the compiled binary, /api/health smoke
- [x] 05-02-PLAN.md — ONE nav registry (navModel) + Sidebar rewired to consume it + useMediaQuery breakpoint hook with the jsdom matchMedia stub
- [x] 05-03-PLAN.md — PRIM-01 BottomSheet primitive (lifted useConfirm mechanics) + nav.more across all locales + IconEllipsis glyph
- [x] 05-04-PLAN.md — Viewport correctness: safe-area custom properties, extended meta + theme-color mirror (FOUC bytes untouched), mobile-correct login, source-assert guards

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-05-PLAN.md — Mobile shell slice: Layout chrome switch (h-dvh) + BottomNav + MoreSheet + Layout-level iOS keyboard mechanism, first mobile e2e smoke

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-06-PLAN.md — E2E gate: desktop-untouched 10-route loop, exactly-5-slots, narrow-viewport de/fr backstop, lint.yml playwright job, web/dist phase close

**UI hint**: yes

### Phase 6: Maquette Screens

**Goal**: The design bible's core surfaces are fully operational on a phone — glanceable Home with backup triggering, Containers with touch folder selection, File sets with the same tree, and Run detail — with tap-popovers, fail-tone sheet confirmations, and visibility-aware live progress working below the breakpoint.
**Depends on**: Phase 5
**Requirements**: SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, PRIM-02, PRIM-03, PRIM-04, FLOW-03
**Success Criteria** (what must be TRUE):

  1. From Home on a phone the user reads instance identity, next run, recent runs with four-status badges, and repository health (offsite-copy age in offsite blue) in one glance, and starts a backup from the thumb-zone action — passing a consequence-aware confirmation and deep-linking into the live run; triggering from container and file-set surfaces behaves identically
  2. On a container the user unfolds a mount and ticks/unticks subfolders by touch — full-row ≥44px targets, chevron/check hit-area separation, muted excluded rows, the live "handed to restic · n of m ticked" count, Save pinned in a bottom action bar — and the edit saves through the same serialized queue with desktop-identical semantics; the file-set screen embeds the same tree with coverage cards and its empty-selection copy
  3. The user opens a finished run and reads completion time, duration, monospace snapshot id, the new/changed/unchanged triad, and an activity log naming exclusion reasons (unticked / CACHEDIR.TAG); verify-integrity and browse-snapshot-files work as touch rows, with the restore entry point reachable
  4. Hover-dependent affordances (info bubbles, filter and color pickers) work by tap below the breakpoint while desktop hover behavior is untouched; destructive confirmations present as fail-tone bottom sheets with consequence-naming buttons and no default-focused destructive control; live progress pauses when the page is hidden and reconciles a run that finished in the background on return

**Plans**: 7/7 plans executed

Plans:
**Wave 1** *(parallel — no shared files; i18n.ts + locales/ are single-owner this wave: 06-01 adds the only new keys — 06-02/06-03 consume existing keys and declare that prohibition)*

- [x] 06-01-PLAN.md — Touch selection tree seam: useIsCoarsePointer + interactionMode, full-row ≥44px targets, chevron/check separation, roving-on-tap in FoldersEditor (SCRN-03)
- [x] 06-02-PLAN.md — PRIM-03: ConfirmSheet fail-tone presentation + BottomSheet fullHeight/footer extensions + Layout scroller rhythm (PRIM-03)
- [x] 06-03-PLAN.md — PRIM-02: TapPopover anchored primitive + InfoBubble/FilterPopover/ColorPickerPopover tap migrations (PRIM-02)

**Wave 2** *(after 06-02)*

- [x] 06-04-PLAN.md — SCRN-05: runDisplay helper extraction, RunDetailSheet with honest stat tiles + activity log, useVisibilityGate live-progress reconcile (SCRN-05, PRIM-04)

**Wave 3** *(after 06-01/06-02/06-03/06-04)*

- [x] 06-05-PLAN.md — SCRN-02/03/04: stacked container detail + StickyActionBar + full-height touch tree, file sets coverage cards + emptyRule, FLOW-03 trigger rows (SCRN-02, SCRN-03, SCRN-04, FLOW-03)

**Wave 4** *(after 06-02/06-04/06-05)*

- [x] 06-06-PLAN.md — SCRN-01: glanceable mobile Dashboard blocks + thumb-zone New-backup trigger with confirm deep-link into the run sheet (SCRN-01, FLOW-03)

**Wave 5** *(phase gate — after all)*

- [x] 06-07-PLAN.md — Phase close: labeled mobile nav landmark, max-md leakage e2e pass, full suites green + web/dist committed

**UI hint**: yes

### Phase 7: Remaining Destinations & Operational Parity

**Goal**: Every remaining destination — VMs, Flash, Config, Receiver, Fleet, Settings — operates in the same mobile card language with sheet editors, schedule/notification/replication parity, list ergonomics, and the design bible's platform-adaptive chrome, closing the "no desktop-only settings" contract.
**Depends on**: Phase 6
**Requirements**: MORE-01, MORE-02, FLOW-01, FLOW-02, LISTS-01, PLAT-01
**Success Criteria** (what must be TRUE):

  1. The user opens VMs, Flash, Config, Receiver, and Fleet on a phone and gets block-level item cards with status, last run, and offsite state; can trigger backups and reach schedule entry points from each; Config surfaces the existing restore guard chain readably, and Fleet peers show reachability, last contact, and protection summary
  2. The user edits a schedule on the phone: TimePicker / CadenceBuilder open as full-screen sheets with large targets, and the human-readable effective-schedule preview stays visible on the invoking card
  3. Notification channels and off-site replication targets are fully editable on mobile — no desktop-only settings remain
  4. Settings works on the phone — stacked setting cards, full-screen sheet editors, dark mode / language / accent as today, a defined treatment for the 7-tab Selector strip — and long lists (runs, containers, sets, logs) offer sticky search + filter chips with load-more pagination and ≥44px rows
  5. On Android the app presents the Material 3 expression (navpill bar, FAB primary action, tonal chips) and on iOS the HIG expression (large title, circular checks) — same information architecture, translated chrome only

**Plans**: 1/8 plans executed

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Platform chrome layer: data-platform attribute, custom-property variants, Fab
- [x] 07-02-PLAN.md — Shared mobile-block foundations + the phase's i18n pre-seed (MobileSectionLabel, useLoadMore, ListToolbar)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 07-03-PLAN.md — VMs + Flash mobile blocks: cards, trigger deep-link, CadenceBuilder sheets, load-more
- [ ] 07-04-PLAN.md — Config + Receiver + Fleet mobile blocks: guard-chain restore sheet, inventory/scorecard viewers, write-only editors
- [ ] 07-05-PLAN.md — Settings mobile block: tonal chip strip + stacked cards on the shared tab state
- [ ] 07-06-PLAN.md — List ergonomics retrofit: Containers, Files sets, ActivityLog on mobile

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 07-07-PLAN.md — Operational editors: notify + offsite CRUD/wizard fullHeight sheets, FLOW-01/02 completion sweep

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 07-08-PLAN.md — Phase close: carried fixes, spacing/weight guard, six-route desktop battery, de/fr narrow sweeps, full green gate

**UI hint**: yes

### Phase 8: Guided Restore & Real-Device Verification

**Goal**: The milestone's exit criteria are met — the guided restore flow runs end-to-end from a phone on proven primitives, and the whole mobile app passes the real-device, i18n, touch-target, and theme verification sweep on both platforms.
**Depends on**: Phase 7
**Requirements**: SCRN-06, VERIFY-02, VERIFY-03, VERIFY-04, VERIFY-05
**Success Criteria** (what must be TRUE):

  1. The user completes a guided restore on the phone: preflight summary → confirmation naming overwrite consequences → optional dry-run/verify → live progress with log → completion — restore controls secondary-styled and away from the thumb's default path, with the server guard chain unchanged
  2. The real-device pass succeeds as the milestone exit criterion: notched iPhone Safari, SE-class iPhone Safari, and Android Chrome, portrait and landscape, including a guided restore exercised on device
  3. Every mobile string ships through the `t()` pipeline with 42-locale parity, and German and French pass narrow-viewport (320-360px) checks on the shell and key screens
  4. Every interactive control below the breakpoint is ≥44px and every hover-dependent affordance has a non-hover path; both themes are verified on mobile with four-status language carried by text labels (never color alone) and semantic tokens only — no hard-coded design-bible hex values

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Selection Engine & Restore Safety | v1.0 | 5/5 | Complete | 2026-09-11 |
| 2. Container Panel Tree Selection | v1.0 | 3/3 | Complete | 2026-09-11 |
| 3. Selection Trust & Controls | v1.0 | 3/3 | Complete | 2026-09-11 |
| 4. File Sets Parity | v1.0 | 4/4 | Complete | 2026-09-11 |
| 5. Mobile Shell & Navigation Foundation | v1.1 | 6/6 | Complete    | 2026-09-12 |
| 6. Maquette Screens | v1.1 | 7/7 | Complete    | 2026-09-12 |
| 7. Remaining Destinations & Operational Parity | v1.1 | 1/8 | In Progress|  |
| 8. Guided Restore & Real-Device Verification | v1.1 | 0/TBD | Not started | - |
