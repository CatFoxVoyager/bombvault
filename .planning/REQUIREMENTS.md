# Requirements: BombVault v1.1 — Mobile Interface

**Defined:** 2026-09-11
**Core Value:** Every container, VM, and config on the host can be backed up consistently and restored completely — a dead server is rebuilt from the restic repo alone.
**Design bible:** `design/mobile/README.md` + maquettes @0b64c7df (branch `mobile-design-concepts`) — locked carbon tokens, four-status rule, bottom bar + More sheet, platform mapping.
**Research:** `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY) — zero new npm dependencies, zero backend changes; presentation-only milestone.

**Scope decisions locked by the user (2026-09-11):** responsive SPA (no PWA, no native wrapper, no second route tree); full operational parity with desktop (everything the desktop UI does works on mobile); bottom bar (Home, Containers, Files, Settings) + "More" sheet for the remaining destinations; search/filter + load-more lists; M3 + HIG platform-adaptive chrome; Playwright harness + real-device exit criterion + de/fr narrow-viewport sweeps.

## v1.1 Requirements

### Mobile Shell

- [x] **SHELL-01**: responsive mobile shell — bottom nav + More sheet, safe areas, desktop intact
- [x] **SHELL-02**: Bottom bar with the 4 destinations (Home, Containers, Files, Settings): non-scrolling, accent-tinted active item, tap-on-active returns to top of view, touch targets ≥ 44px, in normal flow (flex sibling — never `position:fixed`)
- [x] **SHELL-03**: "More" sheet presenting the remaining destinations (Recovery, VMs, Flash, Config, Receiver, Fleet), derived with the bottom bar from ONE pure nav registry (`destinations(settings)`) feeding both Sidebar and MoreSheet so settings-gated tabs can never drift; sign-out reachable in mobile chrome
- [x] **SHELL-04**: Safe-area correctness: `viewport-fit=cover` + `env(safe-area-inset-*)` centralized as CSS custom properties; bottom bar, pinned action bars, and headers pad by insets; desktop reports 0 and is unaffected
- [x] **SHELL-05**: Viewport-height correctness: root sized with `dvh` (`svh` where chrome must stay visible), never `100vh`; Android keyboard handling via `interactive-widget=resizes-content` in the viewport meta (iOS handled explicitly, never assumed)
- [x] **SHELL-06**: Viewport meta extension + `theme-color` (carbon background) in `web/index.html`, below the untouched FOUC script
- [x] **SHELL-07**: Login on mobile: the two-step flow works untouched, inputs ≥ 16px effective font (no iOS focus-zoom), safe-area correct

### Shared Primitives

- [x] **PRIM-01**: Hand-rolled bottom-sheet primitive (no UI kit): focus-trapped, scroll-contained (`overscroll-behavior`), safe-area padded, thumb-reachable; reused by confirmations, pickers, and editors
- [x] **PRIM-02**: Tap-popover primitive below the breakpoint for hover-dependent affordances (InfoBubble, FilterPopover, ColorPickerPopover): tap-anchored, clearly dismissible; desktop hover behavior untouched
- [x] **PRIM-03**: Destructive confirmations render as bottom sheets with fail-tone styling, consequence-naming copy, and outcome-naming buttons; no default-focused destructive control; rides the existing `useConfirm` semantics (one confirm implementation, new presentation)
- [ ] **PRIM-04**: Visibility-aware refresh: live progress (SSE) pauses when the page is hidden and refetches/reconnects on visible; a run finishing while backgrounded is reconciled on return, never silently stale

### Maquette Screens

- [ ] **SCRN-01**: Home: instance identity header, Next run card, recent runs with four-status badges, repository health (incl. offsite-copy age in offsite blue), one primary thumb-zone action "New backup" with consequence-aware confirm and deep-link to the live run; glanceable in one screenful
- [ ] **SCRN-02**: Containers: summary line + one card per container (mount count, selection summary, four-status badge) → container detail; entry into the selection tree from there
- [x] **SCRN-03**: Touch selection tree: an interaction-layer variant of the ONE `SelectionTree` (never a fork) — full-row ≥ 44px targets, chevron/check hit-area separation, EXCLUDED rows muted, per-root CACHEDIR.TAG toggle with plain-language line, pinned live "handed to restic · n of m ticked" count, Save pinned in a bottom action bar; wired to the existing serialized save queue; semantics byte-identical (APG `aria-checked`/roving tabindex/Space-through-`onToggle` preserved); empty-deselect rule surfaced in copy
- [ ] **SCRN-04**: File sets: coverage cards ("n of m folders ticked"), status, last-run line; empty-selection rule in copy ("Use Delete set to remove it entirely"); the same touch tree inside
- [ ] **SCRN-05**: Run detail / Recovery: "Backup complete" + timestamp + duration + monospace snapshot id; stats triad (new/changed/unchanged, tabular numerals); activity log with mono timestamps naming exclusion reasons (unticked / CACHEDIR.TAG); verify integrity; browse snapshot files (touch rows); restore entry point
- [ ] **SCRN-06**: Guided restore mobile flow: full-screen step flow — preflight summary → confirmation naming overwrite consequences → optional dry-run/verify → live progress with log → completion; restore controls secondary-styled, away from the thumb's default path; guard chain unchanged server-side

### Operational Flows

- [ ] **FLOW-01**: Schedule editing parity: TimePicker / CadenceBuilder open as full-screen sheets with large targets; the human-readable effective-schedule preview stays visible on the invoking card
- [ ] **FLOW-02**: Notification + off-site replication configuration parity: editable on mobile via the sheet-editor pattern (no desktop-only settings)
- [ ] **FLOW-03**: Trigger backup from any domain surface: same `BackupButton` semantics (async-start, deep-link to run, consequence-aware confirm when containers stop/restart), mobile presentation

### Remaining Destinations

- [ ] **MORE-01**: VMs, Flash, Config, Receiver, Fleet in the mobile card language: block-level item cards with status + last run + offsite state, trigger + schedule entry points; Config surfaces the existing restore guard chain readably; Fleet peer cards (reachable, last contact, protection summary)
- [ ] **MORE-02**: Settings: stacked setting cards; editors as full-screen sheets; dark mode / language / accent work as today; the 7-tab Selector strip gets a defined mobile treatment

### List Ergonomics

- [ ] **LISTS-01**: Sticky search + filter chips above long lists (runs, containers, sets, logs) with load-more pagination (never infinite scroll); list rows ≥ 44px

### Platform-Adaptive Chrome

- [ ] **PLAT-01**: Android Material 3 expression (navpill bar treatment, FAB primary action, tonal chips) and iOS HIG expression (large title, circular checks) from the same codebase, per the design bible's platform mapping — same IA, translated chrome only

### Verification & Parity

- [x] **VERIFY-01**: Playwright smoke harness from the first phase: desktop-untouched assertions (viewport ≥ 48rem renders today's layout) + mobile device descriptors; responsive regressions fail CI
- [ ] **VERIFY-02**: Real-device pass as the milestone exit criterion: notched + SE-class iPhone Safari and Android Chrome, portrait + landscape, guided restore exercised on device
- [ ] **VERIFY-03**: i18n: every mobile string through the `t()` pipeline with 42-locale parity; de/fr narrow-viewport passes (320–360px) on the chrome and key screens
- [ ] **VERIFY-04**: Touch-target + hover audit: every interactive control ≥ 44px below the breakpoint; every hover-dependent affordance has a non-hover path (Tailwind v4 gates `hover:` behind `@media (hover: hover)`)
- [ ] **VERIFY-05**: Both themes verified on mobile; four-status language with text labels (never color alone, WCAG 1.4.1); semantic tokens only — never hard-coded design-bible hex values

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Tree Enhancements (carried over from v1.0)

- **TREE-07**: Search/filter within large trees (trigger: users report navigation pain on big mounts)
- **TREE-08**: Restore-side tree reusing the component over snapshot listings (different data source: snapshot `ls` vs live FS; keep component state model portable)

### Selection Enhancements (carried over from v1.0)

- **SELECT-05**: Per-folder size hints — on-demand "measure this folder" with cached results (background job + SQLite cache); never eager on expand
- **SELECT-06**: Backup-time coverage diff — warn when a sibling of a stored path is neither selected nor excluded (research recommendation; deferred 2026-09-09 by user decision — the Phase 3 narrowing note under SELECT-03 remains the sole future-children mitigation for v1)

### Mobile Enhancements (deferred from v1.1 scoping, 2026-09-11)

- **MOB-01**: Reorder fallback on mobile — explicit up/down controls where desktop drag-reorders (Dashboard order, backup order); desktop keeps drag
- **MOB-02**: Explicit refresh affordance on lists (visibility-aware auto-refresh ships in v1.1)
- **MOB-03**: Bundle budget enforcement + code-splitting decision (v1.1 measures baseline only in research; no budget gate)
- **MOB-04**: PWA installability (manifest, offline shell) — evaluate after the responsive milestone proves usage patterns
- **MOB-05**: Web push for failure alerts — server notification channels cover alerting today; iOS push machinery is a platform-scale change

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PWA / native wrapper (Capacitor/React Native) / App Store distribution | Locked decision: one responsive SPA; second codebase violates the no-state-library/no-UI-kit constraints; store overhead for a self-hosted tool behind self-signed TLS |
| Native push notifications | Server notification channels (webhook/Matrix/Healthchecks/Unraid/email) already alert wherever the user is; web push needs installed-PWA machinery (v2: MOB-05) |
| Hamburger drawer as primary navigation | Contradicts the locked design bible (bottom bar + More sheet) and the verified 3–5-destination bottom-nav convention |
| Drag-to-reorder on touch | Drag semantics conflict with scroll; mis-reorders in a backup-order UI are consequence-bearing (v2: MOB-01) |
| Infinite scroll | Unpredictable scroll position on return, refresh ambiguity — wrong for monitoring lists; load-more instead (LISTS-01) |
| A fifth status hue or a new mobile palette | Breaks the locked four-status rule and carbon token contract (design bible's own extension rule) |
| Desktop tables with horizontal scroll below the breakpoint | Pinch-zoom panning for data is the anti-pattern this milestone exists to kill; card stacks instead |
| m-dot host / second route tree / second bundle | Breaks single-URL deep links and doubles i18n across 42 locales (architecture research) |
| Confirm-in-confirm modal chains | Documented automation-bias failure; unreadable stacked sheets on small screens; one bottom sheet with consequence-naming copy instead |
| Per-subfolder retention or schedules from the tree | Already ruled out (fragments per-item tag retention identity; #91/#24 discipline) — unchanged |
| Junk-folder suggestions on mobile | Out of scope per PROJECT.md; an unproven heuristic must not debut on mobile (v1.0 decision) |
| Tree fanout into ExcludesEditor | Recorded follow-up from v1.0 Phase 3 verification, not this milestone |
| Per-subfolder selection for VMs | Zvol is block storage — no folder granularity (PROJECT.md) |
| SSE/polling kept alive in background tabs | Battery drain; browsers throttle timers while exempting SSE — the app must explicitly pause (PRIM-04 is the sanctioned behavior) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 5 | Complete |
| SHELL-02 | Phase 5 | Complete |
| SHELL-03 | Phase 5 | Complete |
| SHELL-04 | Phase 5 | Complete |
| SHELL-05 | Phase 5 | Complete |
| SHELL-06 | Phase 5 | Complete |
| SHELL-07 | Phase 5 | Complete |
| PRIM-01 | Phase 5 | Complete |
| VERIFY-01 | Phase 5 | Complete |
| SCRN-01 | Phase 6 | Pending |
| SCRN-02 | Phase 6 | Pending |
| SCRN-03 | Phase 6 | Complete |
| SCRN-04 | Phase 6 | Pending |
| SCRN-05 | Phase 6 | Pending |
| PRIM-02 | Phase 6 | Complete |
| PRIM-03 | Phase 6 | Complete |
| PRIM-04 | Phase 6 | Pending |
| FLOW-03 | Phase 6 | Pending |
| MORE-01 | Phase 7 | Pending |
| MORE-02 | Phase 7 | Pending |
| FLOW-01 | Phase 7 | Pending |
| FLOW-02 | Phase 7 | Pending |
| LISTS-01 | Phase 7 | Pending |
| PLAT-01 | Phase 7 | Pending |
| SCRN-06 | Phase 8 | Pending |
| VERIFY-02 | Phase 8 | Pending |
| VERIFY-03 | Phase 8 | Pending |
| VERIFY-04 | Phase 8 | Pending |
| VERIFY-05 | Phase 8 | Pending |
