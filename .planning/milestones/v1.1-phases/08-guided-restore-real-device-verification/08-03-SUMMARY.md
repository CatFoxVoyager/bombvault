---
phase: 08-guided-restore-real-device-verification
plan: 03
subsystem: web-mobile-recovery
tags: [guided-restore, step-5-restore, d02-no-fork, d03-confirm-sheet, d04-visibility, verify-row, e2e-parity, narrow-viewport, d09-boundary]
requires:
  - "08-01 tracer: MobileRecoveryFlow scaffold + guided-restore.spec.ts staging discipline"
  - "08-02 config step: confirm-gate/parity e2e patterns reused for the restore-all choreography"
  - "desktop restoreAll handler (Recovery.tsx:1948-1986) - consumed verbatim, never forked"
  - "frozen read-only libs: progress.ts, activityLog.ts, backupWatch.ts (fireAndWaitRun), runDisplay.ts"
provides:
  - "Populated mobile step 5: restore-all secondary/tonal row behind the shared handler's own ConfirmSheet, re-hosted RestoreRow/FileSetRecoveryRow rows, per-target four-status Badge strip, integrity verify row, visibility-gated live progress/log, completion copy with ok/fail counts"
  - "Airtight sequential-restore e2e proof: staged runs domain where a POST serve flips running and a 700ms timer flips terminal, so a /api/runs serve that ALREADY observed target N terminal between POST N and POST N+1 is impossible for a same-tick parallel loop"
  - "SSE staging without a real stream: one fulfilled frame + retry:1000 keeps a progress entry alive through EventSource native reconnects"
  - "narrow-viewport recovery sweep (de/fr x 320/360) + the D-09 landscape boundary pair (740x360 mobile chrome / 844x390 desktop chrome)"
affects:
  - "08-05 (full-suite gate) runs these specs unfiltered"
  - "Recovery.tsx anti-shrink floor is calibrated against final step-5 geography (this plan is the last writer)"
tech-stack:
  added: []
  patterns:
    - "Mutable staged-wire fixtures: the /api/runs handler reads a live runState map the restore POST handlers advance, so fireAndWaitRun's terminal wait and the ordering assert observe the same truth"
    - "Ordering proof via serve-time snapshots: every /api/runs serve narrates its state into an events[] tape; between-POSTs terminal observation proves one-at-a-time without touching clocks"
    - "Exact-match localized walks: de 'Pruefen' is a substring of 'Verbinden & pruefen', so cross-locale role queries pin exact:true"
    - "Shared-page-header awareness: Recovery's h1 renders ABOVE the max-md split, so it is not a chrome needle; the sticky step bar is"
key-files:
  created: []
  modified:
    - web/src/pages/Recovery.tsx
    - web/src/components/mobile/RunDetailSheet.tsx
    - web/src/app/mobileShellSource.test.ts
    - web/e2e/guided-restore.spec.ts
    - web/e2e/narrow-viewport.spec.ts
decisions:
  - "restore-all consumes the desktop restoreAll handler verbatim (confirm -> sequential containers-then-VMs fireAndWaitRun, single-flight busy); mobile adds only the presentation, never a second fire path (D-02)"
  - "Verify row maps discovered domains through a locally-copied domain->checkDomain union (RunDetailSheet verifyDomainFor precedent); non-blocking by construction - nothing in step 5 consults verifyBusy"
  - "Live section split mirrors RunDetailSheet: anyRestoreInFlight ? (flowVisible ? live : null) : history - mounting is the subscription, hidden renders nothing, return reconciles from the refetched run record (D-04)"
  - "Cancelled restores render the NEUTRAL badge bucket (statusTone checks 'cancelled' before tone) - a cancel is a decision, never a failure tone"
  - "VM display name renders in rows; the wire only ever carries the raw libvirtName (asserted by the POST path, not the row text)"
metrics:
  duration: 150m
  completed: 2026-09-14
actuals:
  tokens: 19475
  tasks: 3
  commits: 3
requirements-progressed: []
requirements-completed: [SCRN-06, VERIFY-03]
status: complete
---

# Phase 08 Plan 03: Mobile review/restore step (populated step 5) Summary

Populated the guided-restore step-5 mobile body (restore-all behind the shared sequential handler, per-target rows + Badges, verify row, visibility-gated live section) and proved the whole choreography end to end: one-at-a-time ordering, ConfirmSheet anatomy, D-04 visibility reconciliation, cancelled-neutral rendering, de/fr narrow sweeps and the D-09 landscape boundary.

## Tasks Completed

| # | Task | Commit | Key files |
|---|------|--------|-----------|
| 1 | Populate mobile step 5 (restore-all row, per-target rows + Badges, verify row, live progress/log, completion, SSH-note degradation) | 4ef442f6 | web/src/pages/Recovery.tsx |
| 2 | RunDetailSheet stale-pointer refresh + mobileShellSource geography entry (MIXED_FILES, anti-shrink floor on final geography) | 7b5cf674 | web/src/components/mobile/RunDetailSheet.tsx, web/src/app/mobileShellSource.test.ts |
| 3 | Populated step-5 choreography e2e + narrow-viewport recovery sweep + D-09 boundary pair | f42b3e25 | web/e2e/guided-restore.spec.ts, web/e2e/narrow-viewport.spec.ts |

## What Was Built

**Task 1 - the populated step 5** (`Recovery.tsx`, mobile block only; desktop bytes untouched): a secondary/tonal full-width restore-all row (min-h-[2.75rem]) that calls the desktop `restoreAll` callback verbatim - its own `confirm(t(containers.restoreSelectedConfirm))` rides the one useConfirm/ConfirmSheet (destructive top, safe cancel thumb-default, D-03), then the sequential containers-then-VMs `fireAndWaitRun` loop under `restoreAllBusy` single-flight (D-02). Per-target rows re-host the existing RestoreRow/FileSetRecoveryRow with their own confirm paths; the Badge strip reconciles each target's newest restore run into the four-status buckets. The verify row fires `checkDomain` through the locally-copied mapping, busy label `integrity.checking`, results as Badge + text (backend reason verbatim), non-blocking. The live section (`MobileRestoreLiveSection`/`MobileRestoreHistoryLog`) renders through the ONE log style (RunDetailSheet's LogList pattern), gated on `useVisibilityGate` so hiding unmounts the subscription and returning reconciles from the refetched run record (D-04). Completion renders `t(recovery.restoreAllResult)` with both counts; a cancelled restore is the NEUTRAL terminal; VM-without-SSH degrades to the `vmSshNote` advisory.

**Task 2 - pointer hygiene + the rot-loudly floor**: RunDetailSheet's two stale "phase 8 ships at /recovery" comments now state the shipped fact; `Recovery.tsx` joined mobileShellSource's MIXED_FILES with the tailAnchor on the in-file mobile function, isdMounts 1, and a minChars floor calibrated AFTER step 5 populated - the last writer sets the floor, so any future regression of the mobile block fails the guard loudly.

**Task 3 - the choreography e2e**: `stagePopulatedRecoveryDomain` stages 2 containers + 1 VM (display name != libvirtName, deliberately) with a MUTABLE /api/runs fixture - each restore POST serve flips its run to running and a 700ms-later timer flips it terminal. That delay IS the one-at-a-time proof: `assertSequentialBetween` demands a /api/runs serve that ALREADY observed target N terminal strictly between POST N and POST N+1, which a same-tick parallel loop can never produce. Tests cover: ConfirmSheet anatomy + consequence copy + cancel-fires-nothing (restore-all and per-row, the row copy naming the target); the confirm path's exact POST order/bodies (`{snapshotId:"latest",confirm:true,leaveStopped:true}`) including the VM POST on the raw libvirt name; the verify row's checking state and scoped result rows; a staged long run with one SSE frame (`retry:1000` + a single active data frame keeps the entry alive through native reconnects) proving hide unmounts the section AND pauses the runs poll (counter flat across a 4.6s hidden window), reshow remounts, and a terminal flip while hidden reconciles from the server record (ok badge + history line, no live section); the cancelled-neutral Badge (class-level tone assert); and desktop populated leakage needles (no Verify control, no progressbar, no chip at >=48rem). `narrow-viewport.spec.ts` gained the recovery step-5 sweep for de/fr x 320/360 (localized exact-label walk onto populated rows, then the no-pan/no-clip contracts) and the D-09 landscape boundary pair: 740x360 keeps the mobile chrome (chip + sticky bar), 844x390 gets the desktop chrome - the width-only 48rem switch asserted as the contract.

## Verification Evidence

- `tsc --noEmit` clean; `vite build` + `go build -o bombvault.exe ./cmd/bombvault` before every Playwright run (the binary embeds the SPA).
- Filtered Playwright run of exactly the two touched specs (D-10): first full pass **98 passed / 6 failed**; all 6 failures were in the NEW tests' own assert mechanics (see stabilization below), zero product failures. After fixes, the affected tests reran **6 passed / 6 skipped (project guards), exit 0** - `web/pw-task3-fix.log`.
- Windows discipline honored: output to log files (never piped through tail); two teardown hangs cleared by killing only command-line-matched orphans (repo-path bombvault.exe, playwright node workers) - user processes untouched.

### E2E first-run stabilization (test-code fixes, no product change)

1. Desktop populated test used `.tap()` - desktop projects carry no `hasTouch`; switched to `.click()`.
2. Verify-row test asserted bare `getByText("Containers")` - strict-mode violation (5 matches: nav slot, etc.); scoped to the verify result rows (`div.flex.items-start.gap-2.text-xs` filtered by result text, then `toContainText` the domain).
3. The 740x360 boundary test asserted the h1 count 0 - but Recovery's h1 is shared page chrome rendered ABOVE the `max-md:hidden` split; replaced with the genuinely mobile-only sticky step bar as the chrome needle (with the why-comment).

## Deviations from Plan

None - plan executed exactly as written. The three items above are in-task test stabilization (the task was to land passing tests), not plan deviations; no product bug required a Rule 1-3 fix and no architectural question arose.

## Requirements

- **SCRN-06** (guided restore flow) - completed: the flow is fully populated end to end and proven on device emulation in three locales.
- **VERIFY-03** - completed: this plan was the last declarer of the shared ID; both released at the shared-ID gate.

## Self-Check: PASSED

- Commits 4ef442f6, 7b5cf674, f42b3e25 present on docker-folders (verified via git log).
- Key files modified as listed; no tracked deletions in any task commit; working tree clean of tracked modifications after the Task 3 commit.
- 08-03-SUMMARY.md written to `.planning/phases/08-guided-restore-real-device-verification/`.
