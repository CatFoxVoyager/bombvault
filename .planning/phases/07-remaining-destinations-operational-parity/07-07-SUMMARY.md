---
phase: 07-remaining-destinations-operational-parity
plan: "07"
subsystem: web-settings-mobile-sheets
tags: [FLOW-01, FLOW-02, settings, mobile-sheets, bottomsheet, e2e, playwright, operational-parity]
requires:
  - 07-05 (mobile chip strip + stacked cards; one tab state, two presentations)
  - phase 5 (D-01 double gate, useIsDesktop, BottomSheet/StickyActionBar)
  - phase 6 (useConfirm mobile half -> ConfirmSheet, tap primitives)
provides:
  - NotifyCard fullHeight sheet re-host on the ONE setNotify write chain (entry row opens the sheet)
  - OffsiteTargetsSection mobile presentation: entry rows + fullHeight target editor sheet, wizard sheet, ConfirmSheet delete, Test-connection toast
  - Settings.tsx wizard sheet gate (desktop ternary behind wizardOpen && isDesktop, mobile sheet mount-gated on !isDesktop)
  - web/e2e/settings-editors.spec.ts — 12 scenarios over the four-project harness (full run: 24 passed / 24 skipped)
  - FLOW-02 closure audit + FLOW-01 schedule-derivation sweep evidence (tables below)
affects:
  - 07-08 (narrow-locale sweep — the sheets reuse existing keys only, no new i18n surface to sweep)
  - phase 8 real-device validation (fullHeight sheet ergonomics, StickyActionBar tap targets)
tech-stack:
  added: []
  patterns:
    - one form, two presentations (a local render fn shares ALL state and the one write chain between the desktop inline form and the mobile sheet body)
    - structural no-secret-surface assertion (zero password inputs on first open AND after an edit/reopen cycle)
    - regex route staging for id-bearing API paths (a Playwright glob `*` never crosses `/`)
key-files:
  created:
    - web/e2e/settings-editors.spec.ts
  modified:
    - web/src/pages/settings/NotifyCard.tsx
    - web/src/components/OffsiteTargetsSection.tsx
    - web/src/pages/Settings.tsx
decisions:
  - "Sheet state reuse: BottomSheet open={draft !== null} — no parallel sheet-open state; openNew/openEdit/closeEditor/saveDraft carry over unchanged (one state, two presentations)"
  - "Secret contract asserted structurally: OffsiteTarget carries NO secret fields (api.ts) and credentials are SELECTED, never typed, so the write-only truth is proven as zero password inputs + name-only credentials select across reopen cycles instead of the plan's blank+Set-badge scenario"
  - "Wizard sheet mount-gated in Settings.tsx (wizardOpen && !isDesktop) rather than forking OffsiteWizard; the desktop ternary stays byte-identical behind wizardOpen && isDesktop"
  - "FLOW-01 verdict recorded as evidence: code sweep found no client schedule derivation and no second helper anywhere in Settings surfaces; the e2e pins the preview language (Daily at 03:00 / Weekly (Sun) at 04:30 / Not scheduled) to the staged settings fixture"
metrics:
  duration: 2h43m
  completed: 2026-09-13
  tasks: 3
status: complete
actuals:
  tokens: 17473
  tasks: 3
  commits: 4
---

# Phase 7 Plan 7: Operational Editors & Completion Sweep Summary

NotifyCard and the offsite target CRUD/wizard re-hosted as fullHeight mobile BottomSheets on the existing write chains (setNotify, the four offsite CRUD fns), plus the FLOW-01/02 completion sweeps proving every Settings section is mobile-operable and every schedule preview rides the shared server-derived sources.

## Tasks Completed

| Task | Name | Commit | Key files |
| ---- | ---- | ------ | --------- |
| 1 | NotifyCard sheet re-host + e2e spec (tracer) | 29af57a7 | web/src/pages/settings/NotifyCard.tsx, web/e2e/settings-editors.spec.ts |
| 2 | Offsite target CRUD + wizard sheets | d7efcf7e | web/src/components/OffsiteTargetsSection.tsx, web/src/pages/Settings.tsx, spec |
| 3 | FLOW-01/02 completion sweep + desktop dual-direction | 2146872f | web/e2e/settings-editors.spec.ts |

Tracer feedback gate: Task 1's `<verify>` (notify sheet save via setNotify over the real binary) re-ran clean end-to-end before Task 2 began.

## FLOW-02 Closure Audit (per-section operability)

Walked every TAB_ORDER section (general, storage, schedules, offsite, notifications, integrity, system). 07-05 made the tab set mobile-navigable and stacked every card below md; the two sections whose desktop interaction pattern did not survive the phone (inline expandable editors) are exactly the two this plan re-hosted:

| Section | Mobile presentation | Status | Fixed in |
| ------- | ------------------- | ------ | -------- |
| general | stacked cards (portability, language, theme, accent, about) | operable | 07-05 |
| storage | stacked cards (paths, flash zip export, advanced rclone/cloud) | operable | 07-05 |
| schedules | stacked cadence Cards + shared ScheduleRow previews | operable | 07-05 |
| offsite | entry rows -> fullHeight target editor/wizard sheets; rclone/cloud cards stacked | **re-hosted this plan** | Task 2 (d7efcf7e) |
| notifications | NotifyCard entry row -> fullHeight sheet; digest card stacked | **re-hosted this plan** | Task 1 (29af57a7) |
| integrity | stacked cards (tamper test, drills, integrity score) | operable | 07-05 |
| system | stacked cards (widget/metrics tokens, VM SSH, about) | operable | 07-05 |

No desktop-only Settings interaction remains below the breakpoint — FLOW-02 is closed.

## FLOW-01 Completion Sweep Findings

Code sweep (all Settings schedule-bearing surfaces + the shared derivations):

- `getScheduleNext()` (api.ts, GET /api/schedule/next) is the only next-fire source; callers: Dashboard, VMs, Config, ActivityLog. Dashboard's `nextBackupFireAt` only FILTERS the server's ScheduleNext list (job === "backup", the #177/#186 everything-gate) — it derives no time.
- `EffectiveScheduleLine` renders the server-computed effectiveSchedule (#199); callers: Settings file-set rows (:655), Files, Config.
- `ScheduleRow`/`scheduleStatus`/`cadenceLabel` (ScheduleBadge.tsx) are shared FORMATTING of stored cadence strings at all nine badge call sites (five domains, Everything, Self-Backup, digest, tamper test, drills via RestoreChecksSection).
- No second derivation helper exists (grep nextFire/computeNext/cadenceNext: empty). No client clock math in Settings surfaces; the phase's only `Date.now()` (IntegrityCard.tsx:202) stamps a MANUAL tamper-test action with its wall-clock time — an action timestamp, not schedule derivation.
- The sweep e2e pins the contract in the browser: a staged ACTIVE cadence resolves ("Daily at 03:00", "Weekly (Sun) at 04:30"), a staged "off" reads "Not scheduled", across the Schedules/Integrity/Notifications tabs.

## Deviations from Plan

**1. [Plan-assumption] Secret-badge scenario reinterpreted as a structural no-secret assertion (Task 2)**
- Found during: Task 2
- Issue: the plan's truth 3 / e2e item assumed secret fields with blank + `*Set` badge inside the target editor. OffsiteTarget carries NO secret fields (api.ts, verbatim: "Carries NO secret fields"); credentials are a name-only SELECT over stored cred sets, never typed. There is no field the scenario could target.
- Fix: the write-only contract is asserted structurally — zero `input[type="password"]` and a present credentials combobox on first open AND on reopen after an edit (spec header item 7 documents the reasoning). Intent preserved: no mobile path captures, prefills, or echoes a secret.
- Files: web/e2e/settings-editors.spec.ts (in d7efcf7e)

**2. [Line-number drift] "Ziel hinzufügen" seam at Settings.tsx:3892 (Task 2)**
- Found during: Task 2
- Issue: the plan cited a Settings.tsx line for the add-target seam that had drifted; the real seam is OffsiteTargetsSection's add Button.
- Fix: implemented at the component seam (the add entry row) — behavior identical to the plan's intent.
- Files: web/src/components/OffsiteTargetsSection.tsx

**3. [Plan allowance] Settings.tsx untouched in Task 1 (tracer)**
- Found during: Task 1
- Issue: the plan listed Settings.tsx among Task 1's files (entry row wiring).
- Fix: the notify entry row state kept component-local inside NotifyCard per the plan's own allowance; Settings.tsx only changed in Task 2 (wizard gate). Plan files_modified all still landed this plan.

**4. [Harness note, not a code deviation] Playwright route staging uses a regex for id-bearing paths**
- Found during: Task 2 verification
- Issue: glob `**/api/offsite/targets*` silently misses `/targets/{id}` and `/targets/{id}/test` (a glob `*` never crosses `/`), letting writes fall through to the real binary (3 e2e failures).
- Fix: regex route `/\/api\/offsite\/targets/` with an explanatory comment at the staging site; harness discipline only, no production code.

## Authentication Gates

None — no auth-gated steps in this plan.

## Known Stubs

None. All sheets render live data from the staged/real API reads; no placeholder states, no unwired components.

## Threat Model Compliance

T-07-24..27 (no secret capture/prefill/echo on mobile; single write chain per domain; no captured full-object PUT; boundary copy unchanged) — enforced by design (sheets re-host the desktop form JSX; writes ride setNotify + the four CRUD fns only) and by the spec's body assertions (create POST carries only form fields; edit PUT carries the user's captured draft, not concurrent server values; zero password inputs across reopen cycles). No new security-relevant surface beyond the plan's threat model.

## Verification

- `vitest run src/pages/Settings`: 102/102 passed (13 files).
- `tsc --noEmit -p tsconfig.json`: clean; eslint on touched src files: clean.
- Full Playwright spec (four projects): **24 passed / 24 skipped** (12.6m) — 11 mobile scenarios on both phone projects + the desktop dual-direction scenario on both desktop projects, with correct project skips.
- Desktop identity: all pre-existing Settings dom suites pass unchanged (jsdom answers desktop; the mobile gates never mount there).

## Self-Check: PASSED

- Files exist: web/e2e/settings-editors.spec.ts, web/src/pages/settings/NotifyCard.tsx, web/src/components/OffsiteTargetsSection.tsx, web/src/pages/Settings.tsx — all found.
- Commits exist: 29af57a7, d7efcf7e, 2146872f — all found on docker-folders.
