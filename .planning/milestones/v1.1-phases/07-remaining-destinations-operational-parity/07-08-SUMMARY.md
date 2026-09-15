---
phase: 07-remaining-destinations-operational-parity
plan: 08
subsystem: ui
tags: [playwright, e2e, design-tokens, tailwind, source-guards, i18n, mobile-shell]

# Dependency graph
requires:
  - phase: 06-mobile-interface-foundation
    provides: mobile primitives (BottomSheet/RunDetailSheet/SelectionTree) and the D-01 double gate the carried fixes and battery build on
  - phase: "07-01..07-07"
    provides: the six destination surfaces, guards, and sweeps this plan seals
provides:
  - carried 06-UI-REVIEW fixes landed and test-pinned (stat-triad typography, file-wide font-medium purge, SelectionTree chevron aria-label)
  - phase-7 spacing/weight source-assert guard (12px/.5 stops + font-medium) in mobileShellSource.test.ts with anti-shrink marker asserts
  - desktop-untouched battery extended to the six phase routes in BOTH directions (desktop markers present / mobile chrome absent at >=48rem, and the inverse on mobile projects)
  - de/fr narrow-viewport sweeps (320/360px) over the six routes, the Files editor header, and the Dashboard log block with page-pan, clip, chip-strip and Files-wrap contracts
  - fresh committed web/dist (the binary embeds this phase's interface) and the full closing gate green (vitest + four-project Playwright + Go chain)
affects: [phase 8 real-device validation, VERIFY-03/VERIFY-04 readiness, future guard/battery consumers]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 25700
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "visible-filtered class-combo locator as mobile paint proof (glim-hue + glim-content-fade) where both DOM halves share row components"
    - "geometry-only narrow sweeps: documentElement AND #bv-main scrollWidth, per-control bounding-box clip check with sanctioned inline-scroller exemption"

key-files:
  created: []
  modified:
    - web/src/components/mobile/RunDetailSheet.tsx (Task 1: stat triad text-heading font-semibold tabular-nums + font-medium purge)
    - web/src/components/SelectionTree.tsx (Task 1: chevron aria-label {path} expand/collapse form)
    - web/src/app/mobileShellSource.test.ts (Task 2: phase-7 spacing/weight sweep, explicit file list, marker-scoped regions)
    - web/e2e/desktop-untouched.spec.ts (Task 2: six-route dual-direction battery)
    - web/e2e/narrow-viewport.spec.ts (Task 3: phase-7 sweep matrix {de,fr} x {320,360})
    - web/e2e/platform-chrome.spec.ts (Task 3: MobileVMCard paint proof + vmsEnabled gate staging)
    - web/e2e/destination-settings.spec.ts (Task 3: Notifications entry-row assertion)
    - web/e2e/touch-tree.spec.ts (Task 3: aria-level scoping)
    - web/dist/index.html (Task 3: fresh build committed)

key-decisions:
  - "/vms mobile paint proof asserts MobileVMCard's glim-hue + glim-content-fade combo: the desktop half's VMRow carries glim-stagger-row but sits display:none under max-md:hidden, so a .glim-stagger-row locator resolves to the hidden desktop row below md"
  - "Closing-gate e2e fixes retarget stale locators to the phase's current DOM contracts (Notifications entry row, aria-level=1 scoping, route-layer vmsEnabled staging) — never weakened assertions"
  - "Go chain on this Windows box ran as gofmt + go vet + go build + go test (all green); golangci-lint, hadolint, just, restic not installed locally — CI runs the full chain on push"

patterns-established:
  - "Narrow-sweep geometry contracts: no horizontal pan on documentElement AND #bv-main; no control clip past the viewport unless inside a genuinely-overflowing inline x-scroller; named regressions asserted per control"
  - "Anti-shrink guard scoping: region-scoped sweep files must assert BOTH mount markers exist, so a deleted marker fails the suite"

requirements-completed: [MORE-01, MORE-02, FLOW-01, FLOW-02, LISTS-01, PLAT-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Carried 06-UI-REVIEW fixes: RunDetailSheet stat triad renders text-heading font-semibold tabular-nums, zero font-medium in the phase-6 component set, SelectionTree chevron aria-label carries the {path} expand/collapse form"
    requirement: MORE-01
    verification:
      - kind: unit
        ref: "tests/web/src/components/mobile/RunDetailSheet.dom.test.tsx (pinned new classes, vitest run pass)"
        status: pass
      - kind: other
        ref: "grep -c font-medium on RunDetailSheet.tsx + SelectionTree.tsx returns 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase-7 spacing/weight guard live in mobileShellSource.test.ts: explicit file list, 12px/.5-stop and font-medium absence needles, marker-scoped regions with anti-shrink asserts"
    requirement: LISTS-01
    verification:
      - kind: unit
        ref: "tests/web/src/app/mobileShellSource.test.ts (vitest full run, 2x green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "desktop-untouched battery covers the six phase routes in both directions at >=48rem (desktop markers present, mobile chrome absent; inverse on mobile projects)"
    requirement: PLAT-01
    verification:
      - kind: e2e
        ref: "playwright:web/e2e/desktop-untouched.spec.ts (both full four-project runs green)"
        status: pass
    human_judgment: false
  - id: D4
    description: "de/fr narrow-viewport sweeps at 320/360px over /vms /flash /config /receiver /fleet /settings + Files editor header (carried fix) + Dashboard log block: no horizontal pan, nothing clipped, Settings chip strip single-line + scrollable"
    requirement: MORE-02
    verification:
      - kind: e2e
        ref: "playwright:web/e2e/narrow-viewport.spec.ts narrow sweep matrix (ok 555-572 in the final four-project run)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full four-project Playwright gate green under the Windows discipline (manual orphan/server cleanup, no output piping)"
    requirement: FLOW-02
    verification:
      - kind: e2e
        ref: "command: playwright test -> 287 passed / 0 failed / 285 project-skips (final run)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Full vitest suite green including i18n parity + orphans (42-table agreement) and the source-assert guards"
    requirement: FLOW-01
    verification:
      - kind: unit
        ref: "command: vitest run -> 109 files / 2446 tests passed (2x: pre- and post- spec fixes)"
        status: pass
    human_judgment: false
  - id: D7
    description: "npm run build green with web/dist committed fresh (asset hashes reproduced identically on rebuild); Go chain gofmt/vet/build/test green"
    requirement: PLAT-01
    verification:
      - kind: other
        ref: "command: tsc --noEmit && vite build -> index-DsLFo9AY.js reproduced; go vet/build/test exit 0"
        status: pass
    human_judgment: true
    rationale: "golangci-lint, hadolint and just are not installed on this Windows machine, so the literal `just check` chain ran in reduced form (gofmt + go vet + go build + go test, all green); the full lint chain is proven by CI on push. A human should accept the reduced local chain."

# Metrics
duration: 1h 15m (resume session; prior executor interrupted mid-Task-3)
completed: 2026-09-14
status: complete
---

# Phase 7 Plan 08: Phase Close — Carried Fixes, Guards, Batteries, Narrow Sweeps, Full Gate Summary

**Carried 06-UI-REVIEW fixes landed and pinned, the spacing/weight discipline and six-route dual-direction desktop battery are machine-enforced, de/fr 320-360px sweeps cover every phase surface, and the phase closes green end-to-end (vitest 2446/2446, Playwright 287/0 on four projects, fresh committed web/dist, Go chain green).**

## Performance

- **Duration:** 1h 15m (resume session; see Execution Interruption below)
- **Started:** 2026-09-14T01:35Z (resume; original run started earlier on 2026-09-13)
- **Completed:** 2026-09-14T02:50Z
- **Tasks:** 3 of 3
- **Files modified:** 17 across the three task commits (5 in Task 1, 12 in Task 2, 5 in Task 3)

## Execution Interruption and Resume

The prior executor was killed mid-Task-3 by a session restart. On resume, the working tree held
uncommitted Task-3 work (the narrow-viewport sweep matrix, three spec fixes, a rebuilt dist) plus a
leftover `console.log("STAGGER-PROBE", ...)` debug block in platform-chrome.spec.ts that had left the
material test with no assertion at all. This session verified the carried work, replaced the debug
block with the real paint-proof assertion, ran every gate, and committed Task 3 atomically. Nothing
from the prior executor's Task-3 work was discarded.

## Accomplishments

- Carried 06-UI-REVIEW fixes are fixed at their sources and pinned by tests: the stat triad
  (`text-heading font-semibold tabular-nums`), a file-wide `font-medium` purge across the phase-6
  component set (400/600 only), and the SelectionTree chevron's `{path} expand/collapse` aria-label.
- The phase-7 spacing/weight discipline is machine-enforced: the `mobileShellSource.test.ts` sweep
  asserts absence of the 12px stops, the .5 stops, and `font-medium` across the explicit phase-7
  file list — file-wide on wholly-phase-7 files, marker-delimited (with anti-shrink marker asserts)
  where desktop halves legitimately carry legacy values.
- The desktop-untouched battery covers the six phase routes in BOTH directions: desktop markers
  present and mobile chrome absent at >=48rem on desktop-1280/desktop-768, with per-route inverse
  assertions on the mobile projects.
- The de/fr narrow-viewport sweeps grew to the full phase surface matrix ({de, fr} x {320px, 360px} x
  six routes + Files editor header + Dashboard log block) with three geometry contracts: no
  horizontal pan (documentElement AND #bv-main), no control clipped outside a sanctioned inline
  scroller, and the named regressions (Settings chip strip single-line + scrollable; Files editor
  header controls inside the viewport).
- The phase is sealed green: vitest 109 files / 2446 tests (guards, dom suites, i18n parity +
  orphans), the full four-project Playwright run 287 passed / 0 failed / 285 project-skips,
  `tsc --noEmit && vite build` reproduced the committed dist hashes exactly, and the Go chain
  (gofmt, vet, build, test) is green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Carried fixes — stat triad, font-medium purge, chevron aria-label** - `3b263857` (feat)
2. **Task 2: Phase-7 guard sweep + desktop battery extension to the six routes** - `cd29170b` (feat)
3. **Task 3: Full phase gate — narrow sweeps, four-project run, vitest, build + dist, Go chain** - `da66b120` (test)

## Files Created/Modified

- `web/src/components/mobile/RunDetailSheet.tsx` - stat triad typography contract + weight purge, pinned by its dom test
- `web/src/components/SelectionTree.tsx` - chevron aria-label {path} expand/collapse form
- `web/src/app/mobileShellSource.test.ts` - the phase-7 sweep (explicit file list, needles, marker regions)
- `web/e2e/desktop-untouched.spec.ts` - six-route dual-direction desktop identity battery
- `web/e2e/narrow-viewport.spec.ts` - the {de,fr} x {320,360} phase-surface sweep matrix (+ bootSeededPage path param)
- `web/e2e/platform-chrome.spec.ts` - MobileVMCard paint proof + vmsEnabled route-layer gate staging
- `web/e2e/destination-settings.spec.ts` - Notifications tab entry-row assertion (07-07 sheet editor)
- `web/e2e/touch-tree.spec.ts` - `[aria-level="1"]` treeitem scoping
- `web/dist/index.html` (+ assets) - the fresh build the binary embeds

## Decisions Made

- The /vms mobile paint proof asserts `div.glim-hue.glim-content-fade` filtered to visible: the
  mobile block renders MobileVMCard, whose class combo no desktop-half element carries; the desktop
  half's VMRow is the only `glim-stagger-row` carrier and sits display:none under `max-md:hidden`,
  so a `.glim-stagger-row` locator can never see a visible row at 360px.
- Stale pre-existing specs caught by the closing gate were retargeted to the phase's current DOM
  contracts, never weakened: the Notifications entry row + fullHeight sheet (07-07's replacement of
  the title card), `[aria-level="1"]` scoping (the lazy-browse child shares the row's accessible
  name text), and route-layer `vmsEnabled` staging (a fresh harness DB can never hold a VM).
- The Go chain ran as gofmt + go vet + go build + go test (all green): golangci-lint, hadolint,
  just and restic are not installed on this Windows machine. CI runs the full chain on push; the
  Windows reduced suite ran green (cached).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] platform-chrome /vms paint-proof locator resolved to the desktop half's hidden row**
- **Found during:** Task 3 (first full four-project run: 2 failures, mobile-android only)
- **Issue:** The spec's `.glim-stagger-row` first() locator (and its comment's premise that "the
  desktop half never renders it") was wrong twice over: the D-01 gate keeps the desktop half
  always-rendered under `max-md:hidden`, and the mobile block renders MobileVMCard — not VMRow — so
  no visible `.glim-stagger-row` can exist at 360px. The prior executor's leftover STAGGER-PROBE
  `console.log` debug block (which had also left the material test with no assertion) was debugging
  exactly this and was replaced with the real paint proof.
- **Fix:** Assert `div.glim-hue.glim-content-fade` filtered to visible (MobileVMCard's signature,
  carried by no desktop-half element), with the corrected DOM story in the comment; removed the
  debug block.
- **Files modified:** web/e2e/platform-chrome.spec.ts
- **Verification:** spec run on mobile-android: 3 passed; then the full four-project run: 287/0.
- **Committed in:** da66b120

**2. [Rule 1 - Bug] touch-tree treeitem locators ambiguous after Expand renders the lazy child**
- **Found during:** Task 3 (prior executor's working tree, verified on resume)
- **Issue:** Name-only `getByRole("treeitem", { name: /appdata\/plex/ })` re-resolves to TWO
  elements once the lazy-browse child renders (its accessible name contains the same path text) —
  strict-mode violation on every later assertion.
- **Fix:** Scoped to `[aria-level="1"]` filtered by the path text — the row under test is always
  the top-level item.
- **Files modified:** web/e2e/touch-tree.spec.ts
- **Verification:** touch-tree spec green in both full four-project runs.
- **Committed in:** da66b120

**3. [Rule 1 - Bug] destination-settings Notifications tab asserted a retired title card**
- **Found during:** Task 3 (prior executor's working tree, verified on resume)
- **Issue:** 07-07's NotifyCard sheet editor replaced the Notifications tab's mobile title card with
  the D-01 entry row + fullHeight sheet; the old `cardHeading` assertion could never pass.
- **Fix:** The Notifications branch asserts the entry row (button "Notifications Never"); all other
  tabs keep the cardHeading contract.
- **Files modified:** web/e2e/destination-settings.spec.ts
- **Verification:** settings-editors + destination-settings specs green in both full runs.
- **Committed in:** da66b120

---

**Total deviations:** 3 auto-fixed (Rule 1 x3; deviations 2-3 landed by the prior executor inside
Task 3's uncommitted work and verified on resume). **Impact on plan:** scope grew only inside the
plan's own gate surface (e2e specs the closing gate exercises); no production code changed beyond
Task 1/2's committed scope.

## Issues Encountered

- Windows Playwright teardown wedge hit on every run (the recorded mode: bombvault.exe survives;
  Playwright's summary prints only after the server is killed manually). Applied the recorded
  discipline: no output piping, orphan checks, per-run manual kill, and the failed-spec re-run to
  distinguish failure from flake. Also found a stale bombvault.exe from the interrupted prior
  session holding port 3000 (killed before the first run).
- `just`, `golangci-lint`, `hadolint` and `restic` are not installed on this Windows machine, so the
  Go chain ran in its runnable form (gofmt + go vet + go build + go test — all green). Recorded as a
  decision, not silently skipped.
- npm script shells on Windows lost node from PATH ("'node' n'est pas reconnu" — the repo's
  documented failure mode); worked around by invoking the `.bin` sh shims directly from bash (the
  same discipline as the harness's absolute `process.execPath` splicing).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 7 is complete (8 of 8 plans). Ready for `/gsd-verify-phase 7`: the guards, batteries, narrow
sweeps, and the fresh committed web/dist are exactly the evidence VERIFY-03/VERIFY-04 and the phase
8 real-device validation stand on. No blockers; the Windows wedge modes remain environmental
(discipline recorded in STATE.md).

---
*Phase: 07-remaining-destinations-operational-parity*
*Completed: 2026-09-14*

## Self-Check: PASSED

- Files exist: RunDetailSheet.tsx, SelectionTree.tsx, mobileShellSource.test.ts,
  desktop-untouched.spec.ts, narrow-viewport.spec.ts, platform-chrome.spec.ts,
  destination-settings.spec.ts, touch-tree.spec.ts, web/dist/index.html — all found.
- Commits exist: 3b263857 (Task 1), cd29170b (Task 2), da66b120 (Task 3) — all found on docker-folders.
