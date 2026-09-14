---
phase: 08-guided-restore-real-device-verification
plan: 05
subsystem: testing
tags: [uat, real-device, d-11, verify-02, device-matrix, redeploy-runbook, honest-labeling]

requires:
  - "08-01..08-04: the shipped mobile recovery flow + sweep surfaces the device session validates"
  - "STATE.md phase-7 behavior_unverified items (WR-01, WR-02) - exact wording inherited"
  - "07-UI-REVIEW.md Top Fix 1 (Settings 44px bleed, landed 08-04) - verified by touch feel"
provides:
  - "08-UAT.md: the D-11 real-device verification artifact (device matrix, checklist, runbook)"
  - "Six-cell device matrix with per-cell D-09 48rem landscape math and EMPTY pass/fail columns"
  - "Inherited checklist naming origins: WR-01, WR-02, UI-review fix 1, both themes, four-status text, ForeignRestoreCard + 08-04 sub-floor items as known surfaces"
  - "Rebuild + redeploy runbook: web/dist before binary build (Pitfall 4), BombVault-test only, placeholder coordinates"
affects:
  - "v1.1 milestone close (the D-11 device session is the milestone exit criterion)"
  - "orchestrator tail gate (full e2e suite once, D-10) and the post-phase human pause"
tech-stack:
  added: []
  patterns:
    - "Honest-labeling UAT artifact: verdicts pre-derived (expected chrome per cell) but never pre-filled; the session records pass/fail in place"
    - "Checklist inheritance by NAME with origin column - silent drops of carried debts are the failure mode the table prevents"
key-files:
  created:
    - .planning/phases/08-guided-restore-real-device-verification/08-UAT.md
  modified: []
key-decisions:
  - "Ledger complete = all declarer plans done; the device session remains the milestone exit criterion, orchestrator-owned - 08-UAT.md states producing it does NOT satisfy VERIFY-02 (the pass happens on real hardware after the --no-transition stop)"
  - "Both landscape cells pre-state expected chrome via the 48rem math (notched 844 >= 768 -> DESKTOP chrome is a PASS; SE 667 < 768 -> MOBILE) so the session derives, never judges from landscape intuition (Pitfall 5)"
  - "Checklist superset: the plan's six mandated rows plus the 08-04 recorded sub-floor D-11 items (Selector tabs 37.6px, ColorPickerSwatch swatches 28px, native selects) as known surfaces - the session sees decisions, not gaps"
  - "Runbook order is load-bearing: web/dist rebuild BEFORE the binary build (the binary embeds all:dist - a stale build invalidates every observation, Pitfall 4); PROD BombVault explicitly never touched; coordinates as <server-ip>/<app-key> placeholders only"
patterns-established:
  - "UAT artifact convention: phase artifact beside the planning docs (07-UI-REVIEW.md convention), draft status + empty verdict cells, session fills in place"
requirements-completed: [VERIFY-02, VERIFY-05]
actuals:
  tokens: 3343
  tasks: 2
  commits: 3
coverage:
  - id: D1
    description: "08-UAT.md device matrix (six cells) + inherited checklist with named origins"
    requirement: VERIFY-02
    verification:
      - kind: other
        ref: "command: test -f 08-UAT.md && grep gates (landscape>=2, WR-01>=1, ForeignRestoreCard>=1) - all PASS"
        status: pass
      - kind: other
        ref: "acceptance-criteria loop: six cells named with pass/fail columns; both landscape cells state 667/844 math; all six checklist rows present; honest-labeling paragraph present - all PASS"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rebuild + BombVault-test redeploy runbook with placeholder-only coordinates"
    requirement: VERIFY-02
    verification:
      - kind: other
        ref: "command: grep 'server-ip' >=1 AND IP-regex ==0 on 08-UAT.md - PASS"
        status: pass
      - kind: other
        ref: "acceptance-criteria loop: rebuild listed BEFORE binary build with stale-SPA why-note; BombVault-test only redeploy target; PROD never touched; git status clean of other files - all PASS"
        status: pass
    human_judgment: false
  - id: D3
    description: "Execution of the device session itself (the real-world satisfaction of VERIFY-02)"
    requirement: VERIFY-02
    verification: []
    human_judgment: true
    rationale: "No real hardware exists in the harness and Playwright documents no real-Safari emulation fidelity; the D-11 device session is the orchestrator-owned human checkpoint after the phase tail gate - it cannot be automated or pre-judged"
duration: 5min
completed: 2026-09-14
status: complete
---

# Phase 8 Plan 5: Real-Device UAT Artifact Summary

**08-UAT.md: the D-11 protocol a human executes on real hardware - six-cell device matrix with per-cell 48rem landscape derivations, origin-named inherited checklist (WR-01/WR-02/fix 1/themes/four-status/ForeignRestoreCard), and the dist-rebuild + BombVault-test-only redeploy runbook; VERIFY-02 stays honestly open until the session runs.**

## Performance

- **Duration:** ~5min
- **Started:** 2026-09-14T15:22:14Z
- **Completed:** 2026-09-14T15:28:01Z
- **Tasks:** 2
- **Files modified:** 1 (new artifact only; zero code files)

## Accomplishments

- Created `08-UAT.md` with the six-cell device matrix: every cell pre-derives its expected chrome from the single 48rem authority (notched landscape 844px -> DESKTOP chrome recorded as a pass; SE landscape 667px -> MOBILE), and carries safe-area, keyboard, and Procedure R (the on-device guided-restore chain: attach -> discover -> restore-all behind ConfirmSheet -> progress/log -> completion -> kit).
- Inherited checklist with origins named: WR-01 multi-row chip-hide and WR-02 Files save-bar-under-search (phase-7 behavior_unverified, exact STATE.md wording), UI-review fix 1 verified by touch feel (landed 08-04), both themes, four-status text labels, ForeignRestoreCard desktop-only as a KNOWN surface - plus the 08-04 sub-floor items so nothing silently drops.
- Honest labeling throughout: empty pass/fail columns, an explicit "this artifact does not satisfy VERIFY-02" paragraph, and a session-record section that defines how verdicts get filled (never pre-filled).
- Runbook: SPA rebuild BEFORE the binary build with the stale-embedded-SPA why-note, BombVault-test-only redeploy (PROD never touched), placeholder-only coordinates (`<server-ip>`/`<app-key>`), session order, and optional Pitfall 6/7 probes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write 08-UAT.md - device matrix and checklist** - `2d45c208` (docs)
2. **Task 2: Append the rebuild + BombVault-test redeploy runbook** - `ad2d31bd` (docs)

**Plan metadata:** see final docs commit below.

## Files Created/Modified

- `.planning/phases/08-guided-restore-real-device-verification/08-UAT.md` - the D-11 real-device verification artifact (matrix, checklist, runbook, session record)

## Decisions Made

- Checklist superset: added the 08-04 recorded D-11 sub-floor items (Selector tabs, ColorPickerSwatch swatches, native selects) as known-surface rows alongside the plan's six mandated rows - the session sees the recorded decision instead of filing a gap, and carried debts cannot silently drop.
- Android landscape cell derives from the measured CSS width (740px-class -> mobile; 800px+ -> desktop) rather than hardcoding a single expectation, since Android CSS widths vary by device class.
- The visibility hide/reconcile probe is an ADDITIONAL once-per-device probe on top of Procedure R, which runs in full in every cell (the plan requires the restore chain per cell).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. (The git-status snapshot visible at session start showed `web/dist/index.html` and `web/e2e/desktop-untouched.spec.ts` as modified; both were already committed by prior plans before this executor started - the tracked tree was clean on arrival and this plan added only 08-UAT.md.)

## Authentication Gates

None.

## User Setup Required

None for this plan. The D-11 device session (operator-owned, after the orchestrator's tail gate) executes 08-UAT.md: rebuild + redeploy BombVault-test, then run the matrix and checklist on real hardware with the placeholder coordinates filled outside the repo.

## Next Phase Readiness

- All five phase-8 plans are complete; the phase now awaits the orchestrator's tail gate (full e2e suite once, D-10) and the D-11 human pause.
- VERIFY-02's ledger completion records that every DECLARING plan is finished - the device session remains the milestone exit criterion and is orchestrator-owned; 08-UAT.md says so in its honest-labeling header.
- After the session: fill the empty cells in place, flip the Status line, and file any Notes-flagged failure as a gap item with its cell of origin.

## Self-Check: PASSED

- Files on disk: 08-UAT.md FOUND, 08-05-SUMMARY.md FOUND.
- Commits: `2d45c208` and `ad2d31bd` present in git log (grep "08-05" >= 1).
- All Task 1 + Task 2 acceptance criteria re-run after completion: six matrix rows, 667/844 landscape math, all six checklist rows, honest-labeling paragraph, `server-ip` >= 1 with zero literal-IP lines, rebuild-before-binary why-note, BombVault-test-only/PROD-untouched wording, tracked git status containing only this plan's files - ALL PASS.
- Plan-level verification: `git diff --name-only HEAD~2 HEAD` returns only `08-UAT.md` (no code files modified, D-12/D-10 untouched).

---
*Phase: 08-guided-restore-real-device-verification*
*Completed: 2026-09-14*
