---
phase: 06-maquette-screens
fixed_at: 2026-09-12T20:11:32Z
review_path: .planning/phases/06-maquette-screens/06-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-09-12T20:11:32Z
**Source review:** .planning/phases/06-maquette-screens/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (critical_warning scope; IN-01 and IN-02 are out of scope and untouched)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: Run detail sheet's live progress never activates for VM and file-set runs

**Files modified:** `web/src/components/mobile/RunDetailSheet.tsx`, `web/src/components/mobile/RunDetailSheet.dom.test.tsx`, `web/dist/index.html`
**Commit:** 779bfd5e
**Applied fix:** `progressKeyFor` now returns `${run.domain}:${run.target}` for the container/vm/files domains — the run NAME the backend publishes SSE under (`"vm:"+name`, `"files:"+set.Name` in internal/api/service.go; restores included), verified against the publish sites before editing — instead of `run.targetId` (the 32-hex row id for vm/files, which matches no published key). The function's doc comment now carries the why-paragraph citing the publish sites and the container id==name coincidence. The dom test's vm fixture was reshaped to the backend contract (`targetId` 32-hex, `target: "win11"`; it had enshrined targetId==name) and two new live-section tests pin the name-keyed channel for the vm and files domains (32-hex targetId + named target, frame emitted under `vm:win11` / `files:docs`, progressbar valuenow asserted). Rebuilt `web/dist/index.html` committed in the same commit (go:embed rule).

### WR-01: CheckDraw "fresh success" animation fires for transitions the user never witnessed

**Files modified:** `web/src/components/mobile/RunDetailSheet.tsx`, `web/src/components/mobile/RunDetailSheet.dom.test.tsx`, `web/dist/index.html`
**Commit:** e52b1f87
**Applied fix:** Both halves of the suggested fix, matching the component's structure. The transition watcher now gates `setFreshOk(true)` on an `openRef` mirror of the `open` prop (house ref-mirror pattern; the effect keeps keying on `run.status` alone), while `prevStatusRef` still updates unconditionally so a flip landing behind a closed sheet is consumed and never re-detected on reopen. `setFreshOk(false)` was added to the close-reset effect, so every open starts from a clean gate. The gate block was relocated above the close-reset effect so the state it resets is declared before the reset site. Two new dom tests pin the contract: a witnessed running-to-success flip draws the check exactly once and the next open starts clean; a flip landing while closed never animates on reopen (observable via CheckDraw's `.glim-check-draw` path).

### WR-02: FLOW-03 deep-link latch is never re-armed on a new trigger press

**Files modified:** `web/src/pages/Dashboard.tsx`, `web/src/pages/Containers.tsx`, `web/src/pages/Files.tsx`, `web/dist/index.html`
**Commit:** 6399720d
**Applied fix:** All three hosts re-arm `sheetDismissed` when a run with a DIFFERENT id correlates, via a `lastCorrelatedRun` ref beside the latch: same-id calls are poll refreshes of the same watch (latch honored, the stated purpose), a different id is a new fire (latch re-armed, sheet deep-links). Applied to Dashboard's `onRun` (the everything watch), the container detail's BackupButton `onRunCorrelated`, and the Files file-set row's `onRunCorrelated`. Rebuilt `web/dist/index.html` committed in the same commit.

## Verification

All gates ran in the **main checkout** (branch `docker-folders`) — `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created and no cleanup tail applies.

- vitest `src/components/mobile/RunDetailSheet.dom.test.tsx`: baseline 17/17 pass before edits; 19/19 after CR-01; 21/21 after WR-01.
- vitest host-page suites after WR-02 (`Containers.excludesAssistant`, `Containers.tree`, `Dashboard.protectionCard`, `Dashboard.ransomwareCard`, `Files.tree`): 5 files, 65/65 pass.
- `tsc --noEmit`: green before each of the three commits.
- `vite build`: green before each of the three commits; the rebuilt tracked `web/dist/index.html` committed in each fix commit.
- eslint on all five changed source files: clean.
- Frozen files untouched: `web/src/app/router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**`, `package.json`/`package-lock.json` (zero diff). No new i18n strings (no locale changes needed). No Playwright run (orchestrator owns the e2e re-gate).

## Notes and Deviations

- **WR-02 shape:** the review's snippet placed the re-arm inside the `setSheetRun` updater. Applied equivalently but with the side effect outside the updater — a `lastCorrelatedRun` ref compared before the `setState` call — because React may double-invoke updaters (StrictMode) and updaters are expected to be pure. Predicate and behavior are identical (same id → suppressed; different id → re-armed and opened).
- **WR-01 shape:** review suggested an `openRef` and the close-reset addition; both applied as suggested, plus reordering the gate block above the close-reset effect so `setFreshOk` is declared before the effect that resets it.
- The two Info findings (IN-01 stale "26 locales" comments in `web/src/lib/runDisplay.ts`, IN-02 `flushRef` not nulled at unmount) are out of scope for this iteration and were not touched.

---

_Fixed: 2026-09-12T20:11:32Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
