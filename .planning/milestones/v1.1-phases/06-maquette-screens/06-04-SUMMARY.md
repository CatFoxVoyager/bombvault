---
phase: 06-maquette-screens
plan: 04
subsystem: ui
tags: [run-detail, sheet, visibility-gate, scrn-05, prim-04]
requirements-completed: [SCRN-05, PRIM-04]
requires:
  - 06-01/06-02 mobile primitives (BottomSheet fullHeight + footer, touch conventions)
  - 06-03 shared run presentation contract (status vocabulary, D-05 component-local hosting)
  - FROZEN web/src/lib/progress.ts (ref-count + closeSource reconnect-replay contract — consumed, never modified)
  - FROZEN web/src/lib/api.ts Run record (the Frozen-API Data Adaptations substitutes)
provides:
  - RunDetailSheet (web/src/components/mobile/RunDetailSheet.tsx) — SCRN-05, hosted `<RunDetailSheet run open onClose/>` by 06-05/06-06
  - lib/runDisplay.ts — the ONE run-presentation helper module (six helpers extracted verbatim from Dashboard)
  - lib/useVisibilityGate.ts — the ONE Page-Visibility hook + isPageVisible() (PRIM-04/D-10 consumer-side gate)
  - backupWatch poll-chain visibility gating (hidden silence, return-refetch-first reconcile)
  - web/e2e/run-detail-visibility.spec.ts (mobile projects; real-binary poll-gate contract)
  - i18n keys run.statVolume + run.statSnapshot in en/de + all 40 locale modules
affects: [06-05, 06-06, 06-07, phase-8 real-device validation]
tech-stack:
  added: []
  patterns:
    - subscription-as-mount — `{visible && <LiveRunSection/>}` so unmount IS the SSE unsubscribe (frozen singleton ref-count)
    - useSyncExternalStore for a browser-API store (visibilitychange), mirroring the useMediaQuery convention
    - poll-chain visibility gate with a busy-ref re-entrancy guard so the visibility-restart edge can never double the chain
    - Frozen-API honest substitutes — humanBytes / formatDuration / mono slice tiles, zero invented counts
key-files:
  created:
    - web/src/lib/runDisplay.ts
    - web/src/components/mobile/RunDetailSheet.tsx
    - web/src/components/mobile/RunDetailSheet.dom.test.tsx
    - web/src/lib/useVisibilityGate.ts
    - web/src/lib/useVisibilityGate.test.ts
    - web/e2e/run-detail-visibility.spec.ts
  modified:
    - web/src/pages/Dashboard.tsx
    - web/src/components/ActivityLog.tsx
    - web/src/lib/backupWatch.ts
    - web/src/lib/i18n.ts
    - web/src/lib/locales/*.ts (40 modules)
    - web/dist/index.html
decisions:
  - Recorded deviation vs SCRN-05 verbatim wording (the UI-SPEC Frozen-API Data Adaptations contract, restated at the component header): no per-file new/changed/unchanged counts and no exclusion-reason lines exist anywhere on the frozen Run/progress wire; the sheet renders ONLY the contracted substitutes (humanBytes(run.bytes), formatDuration(finishedAt−startedAt), mono snapshotId.slice(0,8)) plus the existing buildLogLines output. Per-file triad is a recorded v2 data candidate (needs an API-bearing milestone); numbers are never fabricated
  - glyphFor/glyphLabelKey/colorFor EXPORTED from ActivityLog ([Rule 2]) so the sheet renders the ONE log vocabulary over buildLogLines output — a second private copy in the sheet would be exactly the forked-vocabulary drift the two-half doctrine forbids
  - Footer action rows are hand-rolled buttons (SheetActionRow) with the Button engine's tonal token classes, not Button itself — disclosures need aria-expanded/aria-controls, which the Button engine does not pass through; min-h-[2.75rem] keeps the 44px floor over glim-btn's 2rem
  - The live ProgressBar uses the inline variant deliberately — the default variant pins absolute to the nearest positioned ancestor, which inside the sheet would be the fixed panel itself (over the footer)
  - backupWatch's gate covers the hook's poll chain only; fireAndWaitRun's bulk loop is deliberately not gated (plain promise loop with its own deadline; the plan scopes the gate to the hook's chain at backupWatch.ts:285)
  - i18n new keys landed in ALL 42 tables (en+de inline + 40 modules) in the Task 2 commit, per the plan's explicit declaration and the 06-01 precedent — parity and orphans ratchets stay one-directional
metrics:
  duration: 1h15m
  completed: 2026-09-12
  tasks: 3
  commits: 3
actuals:
  tokens: 25200
  tasks: 3
  commits: 3
status: complete
---

# Phase 6 Plan 4: RunDetailSheet + visibility gate Summary

SCRN-05 as the D-05 full-height BottomSheet over the frozen Run record (honest substitute stat tiles, the shared mono activity log, verify/browse/restore touch rows), plus PRIM-04's D-10 visibility gate that pauses the sheet's SSE consumer and backupWatch's poll chain while the page hides and reconciles both from server state on return.

## Accomplishments

- **lib/runDisplay.ts (Task 1)**: six run-presentation helpers (runDomainLabel, runKindLabel, isDomainOpRunKind, runTargetText, statusTone, statusLabel) extracted VERBATIM from Dashboard.tsx into the one shared module — load-bearing comments carried, including statusTone's KNOWN LIMITATION block. Dashboard consumes the module; desktop renders unchanged (full suite green at the pre-change count).
- **RunDetailSheet (Task 2, SCRN-05)**: fullHeight BottomSheet hosted component-locally (`<RunDetailSheet run open onClose/>`, no route — D-05). Status headline (shared chip + formatTs; CheckDraw only on a fresh running→success transition observed while open, per CheckDraw's own never-at-mount contract), failed path with the backend's scrubbed reason verbatim and the lib/runReason dir contract, the honest stat triad (tabular-nums; muted "—" fallback, never blank), the existing buildLogLines output through ActivityLog's mono pattern verbatim (idle dashboard furniture filtered), live section for in-flight runs (inline ProgressBar + 1s live tail, subscription-as-mount), and domain-honest footer rows: Verify (checkDomain, integrity.* labels, inline IntegrityCard-style result) and Browse (disclosure mounting SnapshotFileTree) only where APIs exist; restore entry as the secondary tonal row in the scroll body, never accent. New keys run.statVolume + run.statSnapshot across all 42 tables.
- **Visibility gate (Task 3, PRIM-04/D-10)**: lib/useVisibilityGate.ts (useSyncExternalStore over visibilitychange; windowless default VISIBLE; isPageVisible() for non-React consumers). RunDetailSheet renders its live section conditionally on the gate — hiding unmounts the consumer, which IS the unsubscribe (frozen singleton closes the shared EventSource and drops cached state); return remounts into the backend's snapshot replay. backupWatch's poll chain stops scheduling while hidden and, on visible, refetches listRuns FIRST (baseline-id reconcile) before resuming cadence; baseline seeding untouched.
- **e2e**: run-detail-visibility.spec.ts (mobile projects) drives the REAL BackupButton on the route-staged Containers page and pins visible-polling-alive, hidden-silence across 2+ missed intervals, and the immediate return refetch resolving a background-finished run (success toast with the recorded snapshot id).

## Verification

- `vitest run src/lib/useVisibilityGate.test.ts src/lib/backupWatch.test.ts src/components/mobile/RunDetailSheet.dom.test.tsx` — 23/23
- `vitest run` (full) — 103 files / 2371 tests green (baseline 2349 + 8 plan tests + 14 sheet tests)
- `tsc --noEmit` clean; eslint clean on touched files (sole warning is the pre-existing deferred ActivityLog one)
- `playwright test e2e/run-detail-visibility.spec.ts` — mobile-android 10.9s PASS, mobile-iphone (WebKit) 12.1s PASS
- Frozen check: no progress.ts / api.ts / router.tsx / internal/** path in any plan diff

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's e2e assumed a RunDetailSheet host that no earlier plan provides**
- **Found during:** Task 3
- **Issue:** The e2e action reads "start/choose a run, open the sheet" — but D-05 makes the sheet component-local BY DESIGN (no route; router.tsx frozen) and no surface mounts it until 06-05/06-06, so the sheet-host e2e was unexecutable as written.
- **Fix:** Split the coverage honestly (recorded in the spec header's SCOPE NOTE): the e2e drives the OTHER consumer this plan wires — backupWatch's gated poll chain through the real BackupButton on the route-staged Containers page (the touch-tree staging precedent) — and the sheet's live-section gate is pinned at component level by three new DOM tests (real progress.ts singleton across a real EventSource boundary, real visibilitychange events, real closeSource/resubscribe semantics). The sheet's own host e2e lands with 06-05.
- **Files modified:** web/e2e/run-detail-visibility.spec.ts (spec header), web/src/components/mobile/RunDetailSheet.dom.test.tsx
- **Commit:** 7fef0269

**2. [Rule 2 - Missing critical functionality] ActivityLog glyph vocabulary exported instead of forked**
- **Found during:** Task 2
- **Issue:** The sheet must render the SAME glyph/aria-label/colour vocabulary over buildLogLines output; glyphFor/glyphLabelKey/colorFor were module-private, so composing the sheet would have meant a second private copy (forked-vocabulary drift).
- **Fix:** Exported the three functions with comments citing the shared-vocabulary rationale; the pre-existing deferred eslint warning in ActivityLog shifted line (234→239) — left alone, out of scope.
- **Files modified:** web/src/components/ActivityLog.tsx
- **Commit:** b318ec84

### Planned deviation (recorded, not a fix)

- SCRN-05's verbatim per-file triad + exclusion-reason log lines are replaced by the UI-SPEC Frozen-API Data Adaptations substitutes; the deviation is restated verbatim in the component header comment and in Task 2's commit message. Flagged by the spec as a v2 data candidate (needs a runs-schema extension, i.e. an API-bearing milestone) — explicitly not built here.

### Scope interpretation

- The plan explicitly declares the two new i18n keys for "all 40 locale modules" while a wave-level note suggested locales were out of scope; the binding plan text was followed (same-commit parity across all 42 tables, the 06-01 precedent). i18n.parity + i18n.orphans green.

## Known Stubs

None. Every surface this plan ships renders real server-derived state; nothing is placeholder, unwired, or mocked in product code (e2e route-staging mocks live only in the test harness, mirroring the Go JSON shapes, per the touch-tree precedent).

## Handoff to 06-05 (container detail stacked view)

- **Hosting contract:** `<RunDetailSheet run={...} open onClose={...}/>` from web/src/components/mobile/RunDetailSheet.tsx — component-local open state, no route. On useBackupWatch correlation (baseline-id match), open the sheet for the NEW run: the sheet's live section (visibility-gated) renders the progress bar + live tail automatically.
- **The pending host e2e:** run-detail-visibility.spec.ts's SCOPE NOTE defers the sheet's own background/return e2e to 06-05 — once the container detail surface hosts the sheet, extend that spec (or a sibling) to open the sheet on a running run and assert the live section unmounts on hidden / reconciles on visible end-to-end.
- **Run record freshness is the consumer's job:** the sheet is a pure view over `run` — completion while open arrives only through a refetched record (listRuns), never extrapolated; wire onDone/correlation to refetch.
- **Progress keys:** container `container:<name>`, files `files:<name>`, vm `vm:<name>`, flash `flash`, config `config`; "everything" publishes no key of its own (sheet shows terminal content there).
- **Shared helpers ready:** lib/runDisplay.ts (title/status composition), ActivityLog's exported glyphFor/glyphLabelKey/colorFor, useVisibilityGate/isPageVisible for any other surface that needs pause-while-hidden.
- **Windows Playwright playbook (reconfirmed):** the runner wedges at webServer teardown — `taskkill //F //IM bombvault.exe` unsticks it; the test itself passes in ~11-12s. Rebuild `bombvault.exe` (go build ./cmd/bombvault) AFTER any web/dist change or the e2e runs the STALE embedded SPA (this plan hit exactly that once: the gate-less build failed the hidden-silence assertion as designed).

## Self-Check: PASSED

All created files exist on disk (runDisplay.ts, RunDetailSheet.tsx + dom suite, useVisibilityGate.ts + test, run-detail-visibility.spec.ts, and the modified Dashboard/ActivityLog/backupWatch); all three task commits verified in git history (50ecf6c0, b318ec84, 7fef0269); all 40 locale modules carry the two new keys.
