---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Mobile Interface
current_phase: 06
current_phase_name: Maquette Screens
status: executing
stopped_at: Completed 06-05-PLAN.md
last_updated: "2026-09-12T16:11:37.823Z"
last_activity: 2026-09-12
last_activity_desc: Phase 06 execution started
state_head: 19f05132fd15eb452666956fb3bae5f2a11ac6ce
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 13
  completed_plans: 11
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-11)

**Core value:** Every container, VM, and config on the host can be backed up consistently and restored completely — a dead server is rebuilt from the restic repo alone.
**Current focus:** Phase 06 — Maquette Screens

## Current Position

Phase: 06 (Maquette Screens) — EXECUTING
Plan: 6 of 7
Total Plans in Phase: 7
Status: Ready to execute
Last activity: 2026-09-12 — Phase 06 execution started
Last Activity Description: Phase 06 execution started

Progress: [███░░░░░░░] 25%

## Performance Metrics

**Velocity:**

- Total plans completed: 21 (all v1.0)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 P1 | 5 | - | - |
| v1.0 P2 | 3 | ~71m | ~24m |
| v1.0 P3 | 3 | ~63m | ~21m |
| v1.0 P4 | 4 | ~108m | ~27m |
| 5 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: 40m, 22min, 40min, 38min, 8min
- Trend: Stable

*Updated after each plan completion*

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01-01 | 37min | 2 tasks | 6 files |
| Phase 01 P01-02 | 19 min | 2 tasks | 3 files |
| Phase 01 P01-03 | 61min | 3 tasks | 12 files |
| Phase 01 P01-04 | 17min | 2 tasks | 5 files |
| Phase 01 P05 | 12min | 3 tasks | 8 files |
| Phase 02 P01 | 39m | 2 tasks | 47 files |
| Phase 02 P02 | 10m | 2 tasks | 2 files |
| Phase 02 P03 | 22m | 3 tasks | 6 files |
| Phase 03 P01 | 13min | 2 tasks | 9 files |
| Phase 03 P02 | 10min | 2 tasks | 46 files |
| Phase 03 P03 | 40m | 3 tasks | 48 files |
| Phase 04 P01 | 22min | 2 tasks | 10 files |
| Phase 04 P02 | 40min | 2 tasks | 4 files |
| Phase 04 P03 | 38 min | 3 tasks | 7 files |
| Phase 04 P04 | 8 min | 2 tasks | 3 files |
| Phase 05 P01 | 71min | 2 tasks | 5 files |
| Phase 05 P02 | 16min | 3 tasks | 7 files |
| Phase 05 P03 | 35min | 3 tasks | 45 files |
| Phase 05 P04 | 13min | 3 tasks | 5 files |
| Phase 05 P05 | 102 min | 3 tasks | 6 files |
| Phase 05 P06 | 39 min | 3 tasks | 5 files |
| Phase 06 P01 | 85min | 3 tasks | 48 files |
| Phase 06 P02 | 60min | 3 tasks | 7 files |
| Phase 06 P03 | 1h44m | 3 tasks | 7 files |
| Phase 06 P04 | 1h15m | 3 tasks | 10 files |
| Phase 06 P05 | 2h38m | 3 tasks | 14 files |

## Accumulated Context

### Decisions

Cleared at v1.0 milestone close — decisions live in `.planning/PROJECT.md` Key Decisions. v1.1 scope locked by user (2026-09-11): responsive SPA (no PWA, no native wrapper, no second route tree); full operational parity with desktop; bottom bar (Home, Containers, Files, Settings) + More sheet; search/filter + load-more lists; M3 + HIG platform-adaptive chrome; Playwright harness + real-device exit criterion + de/fr narrow-viewport sweeps.

- [Phase 05]: webServer.command must be an absolute path: Playwright spawns the command INSIDE its cwd option, so the planned ../bombvault with cwd=repo root would resolve outside the repo — Verified against installed playwright/lib/runner/index.js:841,877; absolute join(repoRoot, bombvault[.exe]) keeps cwd=repo root so DATA_DIR lands at repo root as planned
- [Phase 5]: navModel registry imports icon components from ../components/navGlyphs — documented load-bearing exception to 'lib imports nothing from components'; single source of label+icon data is the point of SHELL-03
- [Phase 5]: destinations(settings: Settings | null): null = every gate off (pre-boot Sidebar state), preserving the old ?? false defaults; labelKey typed TranslationKey so bad nav keys are compile errors
- [Phase 5]: DESKTOP_QUERY = (min-width: 48rem) lives ONLY in web/src/lib/useMediaQuery.ts, pinned to Tailwind md by a node-env source-assert guard that fails with the why; useIsDesktop on useSyncExternalStore (theme.ts subscribe shape)
- [Phase 5]: jsdom matchMedia gap filled by a guarded desktop-default stub via vitest setupFiles — installs only when window exists AND matchMedia is absent, so node suites are untouched and per-file stubs keep winning
- [Phase 5]: BottomSheet scrim is aria-hidden with panel-as-sibling, NOT the plan's inert attribute - Playwright probe: inert elements are skipped in hit-testing in Chromium AND WebKit, so a scrim click passes through to background content and the target===currentTarget close path can never fire
- [Phase 5]: slide-up entrance is a motion-safe-only transition flip (translate-y-full -> translate-y-0 after a double rAF), not the glim-modal-in pop - a 10px pop is the wrong motion for a bottom-anchored surface; glim-modal-card class deliberately not carried
- [Phase 5]: trigger capture and initial focus-in share ONE open effect with capture strictly BEFORE the focus move; no autoFocus attribute anywhere (React applies it during commit, which would make the sheet's own close button the captured trigger)
- [Phase 5]: IconEllipsis lands as a gen_glyphs.py EXTRA_NAV entry + verbatim hand emission - navGlyphs.tsx is generated ('do not hand-edit'), so regeneration survival requires the generator entry; full regen needs the unavailable Streamline source folder
- [Phase 05]: Safe-area custom properties and the viewport-fit=cover meta are guarded as ONE contract - env() reads 0px everywhere without the directive, so mobileShellSource.test.ts pins both halves and dropping either fails CI — SHELL-04's pairing is the kind of silent-0px drift a behavior test cannot see; source asserts make the drift loud
- [Phase 05]: FOUC script bytes in web/index.html are pinned by an inline byte constant in mobileShellSource.test.ts (T-05-03), proven live by mutation (red -> restored -> green); lines 1-33 sha256-identical through this plan — First-paint theme logic is security-adjacent; any edit must be a deliberate act that updates EXPECTED_FOUC_SCRIPT in the same commit
- [Phase 05]: theme-color mirrors from paint() (the single choke point) as #161616/#f4f4f4 with a null guard; banned viewport literals are FILE-WIDE byte bans - the guard suite's negative needles are their only sanctioned appearance — setTheme/applyStoredTheme/system-flip all funnel through paint() so one write covers every path; the file-wide ban is what makes the SHELL-05 discipline future-proof
- [Phase 05]: landscape >=768px RESOLVED by user decision (2026-09-11): the width-only DESKTOP_QUERY stays the single breakpoint authority — landscape phones at >=48rem CSS width intentionally get the desktop chrome (Sidebar rail), no height-aware query, no custom Tailwind variant; the 740x360 rotated e2e remains the landscape coverage; phase 8 real-device validation re-tests landscape UX and may reopen this as a gap plan — UI-SPEC "no landscape side rail in BOTH orientations" holds below the 48rem width switch
- [Phase 5]: Landscape e2e asserted at 740x360 (sub-breakpoint); the width-only 48rem DESKTOP_QUERY gives landscape phones >=768px the desktop rail - UI-SPEC 'no landscape side rail' needs a height-aware query decision (05-05 deviation 4)
- [Phase 5]: BottomNav derives slots internally from settings+authEnabled via the ONE registry; scrollMainToTop lives in Layout and is passed down to bar and sheet rows (05-05)
- [Phase 5]: 05-06: bar exactness asserted against fresh-DB registry derivation (4 slots: Dashboard, Containers, Settings + More) not the plan's literal 5 - files_enabled defaults false; exactness is the substance (Rule 1)
- [Phase 5]: 05-06: localized e2e boots cut the display-prefs reconciliation via route.abort - server-look (#191) otherwise clobbers the locale seed and parallel workers clobber each other (Rule 1)
- [Phase 5]: 05-06: local Playwright runs use a manually started webServer (Windows teardown hang); CI keeps its own boot via reuseExistingServer: !CI (Rule 3)
- [Phase 06]: touch interaction is a render/handler-only prop (interactionMode) on the ONE SelectionTree - APG state model shared verbatim; pointer axis is a SECOND media axis ((pointer: coarse) hook), DESKTOP_QUERY stays the only width literal (D-11)
- [Phase 06]: touch checkbox is readOnly + pointer-events-none (one live toggle surface); touch chevron carries bv-convention-exception vs one-icon-badge-size (mandated 44px tap target)
- [Phase 06]: e2e container domain staged at Playwright route layer (harness has no Docker; fresh DB can never hold a container) - Go JSON shapes field-for-field + advanced seed + Saved-toast pacing
- [Phase 06]: D-07 landed: useConfirm's portal branches on useIsDesktop - ConfirmDialog desktop byte-identical, ConfirmSheet (fail/warn-toned BottomSheet, destructive top / safe cancel thumb-default, no autoFocus) below 48rem; zero per-call-site changes
- [Phase 06]: BottomSheet grew closed tone union + fullHeight + footer (all additive, absent = Phase 5 sheet); 05-UI-REVIEW findings 1+6 absorbed once at the primitive (inset-clamped physical sides, 44px close with exception marker)
- [Phase 06]: TapPopover PRIM-02: portaled dialog + consuming backdrop (z-40 under z-50), computeBubblePosition anchoring, light focus restore; controlled AND uncontrolled open
- [Phase 06]: InfoBubble tap path is OPEN-ONLY (Android fires focus before click; a click-toggle would re-hide what focus just opened); re-tap deliberately not a close
- [Phase 06]: ColorPickerPopover rides TapPopover controlled; its outside-mousedown dismissal is desktop-only (document mousedown mid-tap would unmount the backdrop between mousedown and click - T-06-03)
- [Phase 06]: Mobile picker width lives on a wrapper div: .glim-picker width:100% is unlayered author CSS that beats Tailwind v4 layered utilities on the same element
- [Phase 06]: 06-04: SCRN-05 renders the Frozen-API substitutes only (humanBytes/formatDuration/mono-slice tiles + buildLogLines); per-file triad is a recorded v2 data candidate
- [Phase 06]: 06-04: PRIM-04 is a consumer-side gate (useVisibilityGate + isPageVisible) around the frozen progress singleton — hidden unmounts/unsubscribes and stops poll chains; visible refetches listRuns FIRST (baseline-id reconcile)
- [Phase 06]: 06-04: backupWatch gates the hook poll chain only (busy-ref guard against the visibility-restart edge); fireAndWaitRun bulk loop deliberately ungated; sheet-host e2e deferred to 06-05 with component-level DOM coverage in its place
- [Phase 06]: Save bar is a publish contract: editor owns the queue and passes a stable setState + flushRef; the bar derives everything and its Save press only flushes the desktop-identical queue (zero new save mechanism)
- [Phase 06]: FLOW-03 seam lives in the hook: useBackupWatch optional onRun (ref-mirrored) reports the baseline-id-correlated run every poll; BackupButton/FileSetBackupButton onRunCorrelated passthrough; consumers host RunDetailSheet component-locally with a dismissal latch; desktop omits and is unchanged
- [Phase 06]: Desktop >=48rem identity is asserted in e2e: desktop-1280 scenario proves no stacked view, no Save-bar count line, no w-full.bg-accent trigger on /containers or /files; full dom suite green

### Pending Todos

None yet.

### Blockers/Concerns

Research flags for planning (`.planning/research/SUMMARY.md`): Phase 5 Playwright harness setup (config, device descriptors, CI wiring into `lint.yml`) has no in-repo precedent; Phase 6 touch SelectionTree variant is the milestone's hardest work (pointer semantics, roving-tabindex-on-tap, hit areas) — targeted research recommended at plan time. Design bible reference: `design/mobile/README.md` + maquettes @0b64c7df (branch `mobile-design-concepts`).

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| deferred_items | 02/deferred-items.md: Pre-existing eslint warnings (2) — ActivityLog.tsx:234, Sidebar.tsx:567 | acknowledged | 2026-09-11 | v1.0 |
| deferred_items | 03/deferred-items.md: Stacked-descriptor failure-revert window (plan 02 queue) | acknowledged | 2026-09-11 | v1.0 |
| v2 (REQUIREMENTS.md) | SELECT-06 backup-time coverage diff | Tracked in REQUIREMENTS.md v2 | 2026-09-09 | — |
| v2 (REQUIREMENTS.md) | TREE-07 search/filter, TREE-08 restore-side tree, SELECT-05 size hints | Tracked in REQUIREMENTS.md v2 | 2026-09-09 | — |

## Session Continuity

Last session: 2026-09-12T16:11:37.661Z
Stopped at: Completed 06-05-PLAN.md
Resume file: None

## Operator Next Steps

- Review `.planning/ROADMAP.md`, then start Phase 5 with /gsd-plan-phase 5
